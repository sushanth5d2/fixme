import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request } from 'express';
import { ApiErrorResponse } from '@fixme/shared-types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  public catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const requestId =
      (request.headers['x-request-id'] as string | undefined) ?? 'unknown';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: Array<{ field?: string; message: string }> = [];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'object' && response !== null) {
        const resp = response as Record<string, unknown>;
        const rawMessage = resp['message'];

        // Handle class-validator ValidationPipe errors (array of strings)
        if (Array.isArray(rawMessage)) {
          errorCode = 'VALIDATION_ERROR';
          const validationMessages = rawMessage as string[];
          message = validationMessages.join('; ');
          details = validationMessages.map((msg) => ({ message: msg }));
        } else {
          message = typeof rawMessage === 'string' ? rawMessage : exception.message;
          errorCode =
            typeof resp['error'] === 'string'
              ? resp['error']
              : this.statusToCode(statusCode);
        }
      } else {
        message = response as string;
        errorCode = this.statusToCode(statusCode);
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    // Log all errors for immediate debugging
    if (statusCode >= 500) {
      this.logger.error(
        `[API Error ${statusCode}] ${request.method} ${request.url} [${requestId}]: ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[API Error ${statusCode}] ${request.method} ${request.url} [${requestId}]: ${message}${
          details.length > 0 ? ` | Details: ${JSON.stringify(details)}` : ''
        }`,
      );
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details.length > 0 ? { details } : {}),
      },
      requestId,
    };

    httpAdapter.reply(ctx.getResponse(), errorResponse, statusCode);
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
    };
    return map[status] ?? 'INTERNAL_ERROR';
  }
}
