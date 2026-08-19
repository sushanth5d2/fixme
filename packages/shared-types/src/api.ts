// ============================================================
// Fix Me — Standard API Response Types
// ============================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
  requestId: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// Standard error codes
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  // Auth specific
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_BLOCKED: 'ACCOUNT_BLOCKED',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  // Business specific
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  QUOTE_ALREADY_ACCEPTED: 'QUOTE_ALREADY_ACCEPTED',
  REVIEW_ALREADY_EXISTS: 'REVIEW_ALREADY_EXISTS',
  FIXER_NOT_VERIFIED: 'FIXER_NOT_VERIFIED',
  REQUEST_NOT_ELIGIBLE: 'REQUEST_NOT_ELIGIBLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
