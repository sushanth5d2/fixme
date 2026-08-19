import { UserRole, UserStatus } from './enums';
import { Timestamps } from './common';
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface JwtPayload {
    sub: string;
    role: UserRole;
    email: string;
    iat: number;
    exp: number;
    jti: string;
}
export interface RefreshTokenPayload {
    sub: string;
    jti: string;
    iat: number;
    exp: number;
}
export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
}
export interface SignupDto {
    email: string;
    mobile: string;
    password: string;
    role: UserRole.CUSTOMER | UserRole.FIXER;
}
export interface LoginDto {
    email: string;
    password: string;
}
export interface OtpVerifyDto {
    mobile: string;
    otp: string;
}
export interface ForgotPasswordDto {
    email: string;
}
export interface ResetPasswordDto {
    token: string;
    newPassword: string;
}
export interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
export interface LoginResponse {
    tokens: AuthTokens;
    user: AuthUser;
}
export interface OtpRecord extends Timestamps {
    id: string;
    userId: string;
    mobile: string;
    otp: string;
    expiresAt: string;
    attempts: number;
    verified: boolean;
}
//# sourceMappingURL=auth.d.ts.map