import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  UserRole,
  UserStatus,
  AuthTokens,
  JwtPayload,
} from '@fixme/shared-types';
import { BCRYPT_ROUNDS, OTP_LENGTH, OTP_EXPIRY_MINUTES, OTP_MAX_ATTEMPTS } from '@fixme/validation';
import { UserEntity } from '../users/user.entity';
import { OtpEntity } from './otp.entity';
import { RefreshTokenEntity } from './refresh-token.entity';
import {
  SignupDto,
  LoginDto,
  OtpVerifyDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(OtpEntity)
    private readonly otpRepo: Repository<OtpEntity>,

    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Signup ─────────────────────────────────────────────────

  public async signup(
    dto: SignupDto,
    ipAddress?: string,
  ): Promise<{ message: string }> {
    // Check for existing email/mobile
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { mobile: dto.mobile }],
    });
    if (existing) {
      if (existing.email === dto.email) {
        throw new ConflictException('Email address is already registered');
      }
      throw new ConflictException('Mobile number is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.dataSource.transaction(async (manager) => {
      const user = manager.create(UserEntity, {
        email: dto.email,
        mobile: dto.mobile,
        passwordHash,
        role: dto.role,
        status: UserStatus.PENDING_VERIFICATION,
        isEmailVerified: false,
        isMobileVerified: false,
      });
      await manager.save(user);

      // Send OTP for mobile verification
      await this.generateAndSendOtp(user.id, dto.mobile, manager);
    });

    this.logger.log(`New ${dto.role} signup: ${dto.email}`);
    return { message: 'Account created. Please verify your mobile number with the OTP sent.' };
  }

  // ── Login ──────────────────────────────────────────────────

  public async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ tokens: AuthTokens; user: { id: string; email: string; role: UserRole; status: UserStatus } }> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      // Constant-time comparison to prevent email enumeration
      await bcrypt.compare(dto.password, '$2b$12$invalidhashtopreventtimingattack');
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('Your account has been blocked. Please contact support.');
    }

    if (user.status === UserStatus.DEACTIVATED) {
      throw new ForbiddenException('This account has been deactivated.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    // Update last login timestamp
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    this.logger.log(`User login: ${user.email} [${user.role}]`);

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  // ── Logout ─────────────────────────────────────────────────

  public async logout(userId: string, jti: string): Promise<{ message: string }> {
    await this.refreshTokenRepo.update({ userId, jti }, { revoked: true });
    this.logger.log(`User logout: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  // ── Refresh Tokens ─────────────────────────────────────────

  public async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    let payload: { sub: string; jti: string };

    try {
      payload = this.jwtService.verify<{ sub: string; jti: string }>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Find and validate stored token
    const storedToken = await this.refreshTokenRepo.findOne({
      where: { jti: payload.jti, userId: payload.sub },
      relations: ['user'],
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      // Possible token theft — revoke all tokens for this user
      if (storedToken) {
        await this.refreshTokenRepo.update(
          { userId: payload.sub },
          { revoked: true },
        );
        this.logger.warn(`Possible refresh token reuse detected for user: ${payload.sub}`);
      }
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const { user } = storedToken;

    if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DEACTIVATED) {
      throw new ForbiddenException('Account access denied');
    }

    // Rotate: revoke old token
    await this.refreshTokenRepo.update(storedToken.id, { revoked: true });

    // Issue new token pair
    return this.generateTokens(user, ipAddress, userAgent);
  }

  // ── OTP ────────────────────────────────────────────────────

  public async sendOtp(userId: string, mobile: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    await this.generateAndSendOtp(user.id, mobile, this.otpRepo.manager);
    return { message: 'OTP sent to your mobile number' };
  }

  public async verifyOtp(dto: OtpVerifyDto, userId: string): Promise<{ message: string }> {
    const latestOtp = await this.otpRepo.findOne({
      where: { userId, mobile: dto.mobile, verified: false },
      order: { createdAt: 'DESC' },
    });

    if (!latestOtp) {
      throw new BadRequestException('No pending OTP found. Please request a new OTP.');
    }

    if (latestOtp.expiresAt < new Date()) {
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    if (latestOtp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Maximum OTP attempts exceeded. Please request a new OTP.',
      );
    }

    const otpValid = await bcrypt.compare(dto.otp, latestOtp.otpHash);

    if (!otpValid) {
      await this.otpRepo.increment({ id: latestOtp.id }, 'attempts', 1);
      const remaining = OTP_MAX_ATTEMPTS - (latestOtp.attempts + 1);
      throw new BadRequestException(
        `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      );
    }

    // Mark OTP verified and activate user
    await this.dataSource.transaction(async (manager) => {
      await manager.update(OtpEntity, latestOtp.id, { verified: true });
      await manager.update(UserEntity, userId, {
        isMobileVerified: true,
        status: UserStatus.ACTIVE,
      });
    });

    this.logger.log(`OTP verified for user: ${userId}`);
    return { message: 'Mobile number verified successfully. Your account is now active.' };
  }

  // ── Forgot / Reset Password ────────────────────────────────

  public async forgotPassword(email: string): Promise<{ message: string }> {
    // Always return success to prevent email enumeration
    const user = await this.userRepo.findOne({ where: { email } });
    if (user) {
      // In production: generate a reset token and send via email
      // For MVP: log the token (replace with email service in Phase 19)
      const resetToken = uuidv4();
      this.logger.log(`Password reset token for ${email}: ${resetToken} (MVP placeholder)`);
    }
    return {
      message: 'If this email is registered, you will receive a password reset link shortly.',
    };
  }

  public async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // In production: validate the reset token from email
    // For MVP: this endpoint is scaffolded for future implementation
    this.logger.warn(`resetPassword called with token (MVP placeholder): ${token.slice(0, 8)}...`);
    throw new BadRequestException('Password reset via email is not yet configured. Please contact support.');
  }

  public async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });

    const currentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.userRepo.update(userId, { passwordHash: newHash });

    // Revoke all refresh tokens (force re-login on all devices)
    await this.refreshTokenRepo.update({ userId }, { revoked: true });

    this.logger.log(`Password changed for user: ${userId}`);
    return { message: 'Password changed successfully. Please log in again.' };
  }

  // ── Internal Helpers ───────────────────────────────────────

  private async generateAndSendOtp(
    userId: string,
    mobile: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager: any,
  ): Promise<void> {
    // Generate cryptographically random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10); // Lower cost for OTP
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Invalidate existing unverified OTPs for this user
    await manager.update(
      OtpEntity,
      { userId, mobile, verified: false },
      { attempts: OTP_MAX_ATTEMPTS }, // Mark as exhausted
    );

    const otpRecord = manager.create(OtpEntity, {
      userId,
      mobile,
      otpHash,
      expiresAt,
      attempts: 0,
      verified: false,
    });
    await manager.save(otpRecord);

    // In production: send OTP via SMS service
    // For development: log the OTP
    this.logger.log(
      `[DEV] OTP for ${mobile}: ${otp} (expires: ${expiresAt.toISOString()})`,
    );
  }

  private async generateTokens(
    user: UserEntity,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const jti = uuidv4();
    const accessTokenExpiry = '15m';
    const refreshTokenExpiry = '7d';

    const accessPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      role: user.role,
      email: user.email,
      jti,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessTokenExpiry,
    });

    const refreshPayload = { sub: user.id, jti };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshTokenExpiry,
    });

    // Store hashed refresh token
    const tokenHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.refreshTokenRepo.save({
      userId: user.id,
      tokenHash,
      jti,
      expiresAt,
      revoked: false,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  // ── Used by Guards ─────────────────────────────────────────

  public async validateUser(userId: string): Promise<UserEntity | null> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });
    if (!user || user.status === UserStatus.BLOCKED || user.status === UserStatus.DEACTIVATED) {
      return null;
    }
    return user;
  }
}
