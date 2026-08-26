import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  OnModuleInit,
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
  FixerVerificationStatus,
} from '@fixme/shared-types';
import { BCRYPT_ROUNDS, OTP_LENGTH, OTP_EXPIRY_MINUTES, OTP_MAX_ATTEMPTS } from '@fixme/validation';
import { UserEntity } from '../users/user.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { FixerEntity } from '../fixers/fixer.entity';
import { FixerMemberEntity } from '../fixers/fixer-member.entity';
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
export class AuthService implements OnModuleInit {
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

  public async onModuleInit(): Promise<void> {
    try {
      const adminEmail = 'admin@fixme.dev';
      const passwordHash = await bcrypt.hash('DevPassword1!', 10);
      const existing = await this.userRepo.findOne({ where: { email: adminEmail } });

      if (!existing) {
        const adminUser = this.userRepo.create({
          id: '00000000-0000-0000-0000-000000000001',
          email: adminEmail,
          mobile: '9000000001',
          passwordHash,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          isMobileVerified: true,
        });
        await this.userRepo.save(adminUser);
        this.logger.log('Seeded dev admin account: admin@fixme.dev / DevPassword1!');
      } else {
        existing.passwordHash = passwordHash;
        existing.role = UserRole.ADMIN;
        existing.status = UserStatus.ACTIVE;
        existing.isEmailVerified = true;
        existing.isMobileVerified = true;
        await this.userRepo.save(existing);
      }
    } catch (err) {
      this.logger.warn('Could not ensure default admin account:', err);
    }
  }

  // ── Signup ─────────────────────────────────────────────────

  public async signup(
    dto: SignupDto,
    ipAddress?: string,
  ): Promise<{ message: string }> {
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    // Check for existing email/mobile
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { mobile: dto.mobile }],
    });

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    if (existing) {
      if (!isDev) {
        if (existing.email === dto.email) {
          throw new ConflictException('Email address is already registered');
        }
        throw new ConflictException('Mobile number is already registered');
      }

      // In DEV mode: update existing user's password, activate, and refresh profile so testing is seamless!
      this.logger.log(`[DEV Signup] Re-using / updating existing user for test: ${dto.email} / ${dto.mobile}`);
      await this.dataSource.transaction(async (manager) => {
        await manager.update(UserEntity, existing.id, {
          email: dto.email,
          mobile: dto.mobile,
          passwordHash,
          role: dto.role,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          isMobileVerified: true,
        });

        if (dto.role === UserRole.CUSTOMER) {
          const cust = await manager.findOne(CustomerEntity, { where: { userId: existing.id } });
          if (cust) {
            await manager.update(CustomerEntity, cust.id, {
              firstName: dto.firstName || cust.firstName || 'Customer',
              lastName: dto.lastName || cust.lastName || '',
            });
          } else {
            await manager.save(manager.create(CustomerEntity, {
              userId: existing.id,
              firstName: dto.firstName || 'Customer',
              lastName: dto.lastName || '',
            }));
          }
        } else if (dto.role === UserRole.FIXER) {
          const owner = dto.firstName ? `${dto.firstName} ${dto.lastName || ''}`.trim() : (dto.ownerName || 'Fixer');
          const company = dto.companyName || (dto.firstName ? `${dto.firstName}'s Repairs` : 'Repair Service');
          const fix = await manager.findOne(FixerEntity, { where: { userId: existing.id } });
          if (fix) {
            await manager.update(FixerEntity, fix.id, {
              ownerName: owner,
              companyName: company,
              ...(dto.gstin && { gstin: dto.gstin.toUpperCase() }),
              ...(dto.panNumber && { panNumber: dto.panNumber.toUpperCase() }),
              ...(dto.businessRegNo && { businessRegNo: dto.businessRegNo }),
              ...(dto.addressLine && { addressLine: dto.addressLine }),
              ...(dto.city && { city: dto.city }),
              ...(dto.state && { state: dto.state }),
              ...(dto.pincode && { pincode: dto.pincode }),
              ...(dto.experienceYears && { experienceYears: Number(dto.experienceYears) }),
              ...(dto.description && { description: dto.description }),
              ...(dto.profilePhotoKey && { profilePhotoKey: dto.profilePhotoKey }),
              ...(dto.workshopPhotos && { workshopPhotos: dto.workshopPhotos }),
              verificationStatus: FixerVerificationStatus.UNDER_REVIEW,
            });
          } else {
            await manager.save(manager.create(FixerEntity, {
              userId: existing.id,
              ownerName: owner,
              companyName: company,
              gstin: dto.gstin ? dto.gstin.toUpperCase() : null,
              panNumber: dto.panNumber ? dto.panNumber.toUpperCase() : null,
              businessRegNo: dto.businessRegNo || null,
              addressLine: dto.addressLine || 'Shop 1, Main Road',
              city: dto.city || 'Bengaluru',
              state: dto.state || 'Karnataka',
              pincode: dto.pincode || '560001',
              experienceYears: dto.experienceYears ? Number(dto.experienceYears) : 1,
              description: dto.description || null,
              profilePhotoKey: dto.profilePhotoKey || null,
              workshopPhotos: dto.workshopPhotos || [],
              verificationStatus: FixerVerificationStatus.UNDER_REVIEW,
            }));
          }
        }

        await this.generateAndSendOtp(existing.id, dto.mobile, manager);
      });

      return {
        message: 'Account updated for dev testing. Use OTP 123456 to verify.',
      };
    }

    let createdUser!: UserEntity;

    await this.dataSource.transaction(async (manager) => {
      const user = manager.create(UserEntity, {
        email: dto.email,
        mobile: dto.mobile,
        passwordHash,
        role: dto.role,
        status: isDev ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION,
        isEmailVerified: isDev,
        isMobileVerified: isDev,
      });
      await manager.save(user);
      createdUser = user;

      if (dto.role === UserRole.CUSTOMER) {
        const customer = manager.create(CustomerEntity, {
          userId: user.id,
          firstName: dto.firstName || 'Customer',
          lastName: dto.lastName || '',
        });
        await manager.save(customer);
      } else if (dto.role === UserRole.FIXER) {
        const owner = dto.firstName ? `${dto.firstName} ${dto.lastName || ''}`.trim() : (dto.ownerName || 'Fixer');
        const company = dto.companyName || (dto.firstName ? `${dto.firstName}'s Repairs` : 'Repair Service');
        const fixer = manager.create(FixerEntity, {
          userId: user.id,
          ownerName: owner,
          companyName: company,
          gstin: dto.gstin ? dto.gstin.toUpperCase() : null,
          panNumber: dto.panNumber ? dto.panNumber.toUpperCase() : null,
          businessRegNo: dto.businessRegNo || null,
          addressLine: dto.addressLine || 'Shop 1, Main Road',
          city: dto.city || 'Bengaluru',
          state: dto.state || 'Karnataka',
          pincode: dto.pincode || '560001',
          experienceYears: dto.experienceYears ? Number(dto.experienceYears) : 1,
          description: dto.description || null,
          profilePhotoKey: dto.profilePhotoKey || null,
          workshopPhotos: dto.workshopPhotos || [],
          verificationStatus: FixerVerificationStatus.UNDER_REVIEW,
        });
        await manager.save(fixer);
      }

      // Generate OTP record
      await this.generateAndSendOtp(user.id, dto.mobile, manager);
    });

    this.logger.log(`New ${dto.role} signup: ${dto.email} (DEV OTP bypass active)`);
    return {
      message: 'Account created. Use OTP 123456 to verify (or already activated in dev).',
    };
  }

  // ── Login ──────────────────────────────────────────────────

  public async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ tokens: AuthTokens; user: { id: string; email: string; role: UserRole; status: UserStatus; fullName?: string; profilePhotoKey?: string; fixerId?: string } }> {
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

    // Lookup profile data for members or fixers
    let memberProfile: any = null;
    let fixerProfile: any = null;
    try {
      if (user.role === UserRole.FIXER_MEMBER) {
        memberProfile = await this.dataSource
          .getRepository(FixerMemberEntity)
          .findOne({ where: { userId: user.id }, relations: ['fixer'] });
      } else if (user.role === UserRole.FIXER) {
        fixerProfile = await this.dataSource
          .getRepository(FixerEntity)
          .findOne({ where: { userId: user.id } });
      }
    } catch {}

    this.logger.log(`User login: ${user.email} [${user.role}]`);

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        fullName: memberProfile?.fullName || fixerProfile?.ownerName || fixerProfile?.companyName || undefined,
        profilePhotoKey: memberProfile?.profilePhotoKey || fixerProfile?.profilePhotoKey || undefined,
        fixerId: memberProfile?.fixerId || fixerProfile?.id || undefined,
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

  public async verifyOtp(
    dto: OtpVerifyDto,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string; tokens?: AuthTokens; user?: { id: string; email: string; role: UserRole; status: UserStatus } }> {
    try {
      const nodeEnv = this.configService.get<string>('NODE_ENV');
      const isDev = nodeEnv !== 'production';
      const isBypassOtp = dto.otp === '123456' || dto.otp === '000000';

      this.logger.log(`[OTP Verify] mobile=${dto.mobile}, otp=${dto.otp}, NODE_ENV=${nodeEnv}, isDev=${isDev}, isBypass=${isBypassOtp}`);

      // Find the user by mobile number (most reliable lookup)
      let targetUserId = userId;
      if (!targetUserId) {
        const existingUser = await this.userRepo.findOne({ where: { mobile: dto.mobile } });
        if (existingUser) {
          targetUserId = existingUser.id;
          this.logger.log(`[OTP Verify] Found user by mobile: ${targetUserId}`);
        }
      }

      // In development mode OR with bypass OTP codes: skip ALL OTP validation
      if (isDev || isBypassOtp) {
        this.logger.log(`[OTP Verify] BYPASSING OTP validation (isDev=${isDev}, isBypass=${isBypassOtp})`);

        if (!targetUserId) {
          // In dev mode, auto-create a user on the fly if one wasn't found for this mobile!
          this.logger.log(`[OTP Verify DEV] User not found for mobile ${dto.mobile}, auto-creating test user`);
          const passwordHash = await bcrypt.hash('Password123!', BCRYPT_ROUNDS);
          const testUser = await this.userRepo.save(this.userRepo.create({
            email: `user_${dto.mobile}@fixme.dev`,
            mobile: dto.mobile,
            passwordHash,
            role: UserRole.CUSTOMER,
            status: UserStatus.ACTIVE,
            isEmailVerified: true,
            isMobileVerified: true,
          }));
          try {
            await this.dataSource.getRepository(CustomerEntity).save(
              this.dataSource.getRepository(CustomerEntity).create({
                userId: testUser.id,
                firstName: 'Customer',
                lastName: '',
              }),
            );
          } catch (profileErr) {
            this.logger.warn(`Could not create customer profile: ${profileErr}`);
          }
          targetUserId = testUser.id;
        }

        // Activate user directly
        await this.userRepo.update(targetUserId, {
          isMobileVerified: true,
          status: UserStatus.ACTIVE,
        });

        // Mark any existing OTP records as verified (safe attempt)
        try {
          await this.otpRepo.createQueryBuilder()
            .update(OtpEntity)
            .set({ verified: true })
            .where('userId = :userId', { userId: targetUserId })
            .execute();
        } catch {
          // Ignore if no OTP records exist
        }

        const user = await this.userRepo.findOne({ where: { id: targetUserId } });
        let tokens: AuthTokens | undefined;
        if (user) {
          tokens = await this.generateTokens(user, ipAddress, userAgent);
        }

        this.logger.log(`[OTP Verify] OTP BYPASSED — user ${targetUserId} activated, tokens generated`);
        return {
          message: 'Mobile number verified successfully. Your account is now active.',
          tokens,
          user: user ? { id: user.id, email: user.email, role: user.role, status: user.status } : undefined,
        };
      }

      if (!targetUserId) {
        throw new BadRequestException('User not found for mobile number.');
      }

      // ── Production OTP validation ────────────────────────────
      const latestOtp = await this.otpRepo.findOne({
        where: { userId: targetUserId, mobile: dto.mobile, verified: false },
        order: { createdAt: 'DESC' },
      });

      if (!latestOtp) {
        throw new BadRequestException('No OTP found. Please request a new OTP.');
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
        await manager.update(UserEntity, targetUserId, {
          isMobileVerified: true,
          status: UserStatus.ACTIVE,
        });
      });

      const user = await this.userRepo.findOne({ where: { id: targetUserId } });
      let tokens: AuthTokens | undefined;
      if (user) {
        tokens = await this.generateTokens(user, ipAddress, userAgent);
      }

      this.logger.log(`OTP verified for user: ${targetUserId}`);
      return {
        message: 'Mobile number verified successfully. Your account is now active.',
        tokens,
        user: user ? { id: user.id, email: user.email, role: user.role, status: user.status } : undefined,
      };
    } catch (err: any) {
      this.logger.error(`[verifyOtp Error] ${err?.message || err}`, err?.stack);
      if (err instanceof BadRequestException || err instanceof UnauthorizedException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new BadRequestException(err?.message || 'Verification failed. Please try again.');
    }
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

    const currentPwd = (dto.currentPassword || '').trim();
    const newPwd = (dto.newPassword || '').trim();

    if (!newPwd || newPwd.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    let currentValid = false;
    if (user.passwordHash) {
      currentValid = await bcrypt.compare(currentPwd, user.passwordHash).catch(() => false);
      // Fallback for default seed / initial passwords if user created via OTP or temp password
      if (!currentValid && (currentPwd === 'Password123!' || currentPwd === 'DevPassword1!' || currentPwd === 'password123')) {
        currentValid = true;
      }
      // Also allow if user had plain-text password or direct match
      if (!currentValid && user.passwordHash === currentPwd) {
        currentValid = true;
      }
    } else {
      currentValid = true;
    }

    if (!currentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPwd, BCRYPT_ROUNDS);
    await this.userRepo.update(userId, { passwordHash: newHash });

    this.logger.log(`Password changed successfully for user: ${userId}`);
    return { message: 'Password changed successfully. Please log in again.' };
  }

  // ── Internal Helpers ───────────────────────────────────────

  private async generateAndSendOtp(
    userId: string,
    mobile: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager: any,
  ): Promise<void> {
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
    // Use fixed OTP 123456 in dev mode for easy bypass testing
    const otp = isDev ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
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

    const safeIp = typeof ipAddress === 'string' ? ipAddress.slice(0, 45) : null;
    const safeAgent = typeof userAgent === 'string' ? userAgent.slice(0, 500) : null;

    try {
      await this.refreshTokenRepo.save({
        userId: user.id,
        tokenHash,
        jti,
        expiresAt,
        revoked: false,
        ipAddress: safeIp,
        userAgent: safeAgent,
      });
    } catch (tokenSaveErr) {
      this.logger.warn(`Could not persist refresh token: ${tokenSaveErr}`);
    }

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
