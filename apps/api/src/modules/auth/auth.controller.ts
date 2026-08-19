import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  SignupDto,
  LoginDto,
  OtpVerifyDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { JwtPayload } from '@fixme/shared-types';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new account (CUSTOMER or FIXER)' })
  @ApiResponse({ status: 201, description: 'Account created. OTP sent to mobile.' })
  @ApiResponse({ status: 409, description: 'Email or mobile already registered' })
  public async signup(
    @Body() dto: SignupDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.authService.signup(dto, req.ip);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful. Returns JWT tokens.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account blocked or deactivated' })
  public async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<ReturnType<AuthService['login']>> {
    return this.authService.login(dto, req.ip, req.headers['user-agent']);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Public() // Remove @Public so JWT is verified — we override below with UseGuards
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout — revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  // Cannot use @UseGuards(JwtAuthGuard) globally here because class is @Public
  // AuthController is @Public but specific endpoints need auth. Handle at module level.
  public async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request & { user?: JwtPayload },
  ): Promise<{ message: string }> {
    // Best-effort logout — even if token is expired, we try to revoke
    const userId = req.user?.sub;
    const jti = req.user?.jti;
    if (userId && jti) {
      return this.authService.logout(userId, jti);
    }
    return { message: 'Logged out' };
  }

  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access + refresh tokens' })
  @ApiResponse({ status: 200, description: 'New token pair returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  public async refreshTokens(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): ReturnType<AuthService['refreshTokens']> {
    return this.authService.refreshTokens(dto.refreshToken, req.ip, req.headers['user-agent']);
  }

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP resend for mobile verification' })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  public async sendOtp(
    @Body('mobile') mobile: string,
    @Body('userId') userId: string,
  ): Promise<{ message: string }> {
    return this.authService.sendOtp(userId, mobile);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP to activate account' })
  @ApiResponse({ status: 200, description: 'OTP verified, account activated' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  public async verifyOtp(
    @Body() dto: OtpVerifyDto,
    @Body('userId') userId: string,
  ): Promise<{ message: string }> {
    return this.authService.verifyOtp(dto, userId);
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Always returns success (prevents email enumeration)' })
  public async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  public async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 401, description: 'Invalid current password' })
  public async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(userId, dto);
  }
}
