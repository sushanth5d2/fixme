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
export declare const ErrorCodes: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly CONFLICT: "CONFLICT";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly BAD_REQUEST: "BAD_REQUEST";
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly ACCOUNT_BLOCKED: "ACCOUNT_BLOCKED";
    readonly OTP_EXPIRED: "OTP_EXPIRED";
    readonly OTP_INVALID: "OTP_INVALID";
    readonly OTP_MAX_ATTEMPTS: "OTP_MAX_ATTEMPTS";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly TOKEN_INVALID: "TOKEN_INVALID";
    readonly INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION";
    readonly QUOTE_ALREADY_ACCEPTED: "QUOTE_ALREADY_ACCEPTED";
    readonly REVIEW_ALREADY_EXISTS: "REVIEW_ALREADY_EXISTS";
    readonly FIXER_NOT_VERIFIED: "FIXER_NOT_VERIFIED";
    readonly REQUEST_NOT_ELIGIBLE: "REQUEST_NOT_ELIGIBLE";
};
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
//# sourceMappingURL=api.d.ts.map