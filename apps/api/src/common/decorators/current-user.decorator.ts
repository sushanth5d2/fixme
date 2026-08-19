import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@fixme/shared-types';
import { Request } from 'express';

/**
 * Extracts the authenticated user's JWT payload from the request.
 * @example @CurrentUser() user: JwtPayload
 * @example @CurrentUser('sub') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    const { user } = request;
    return data ? user?.[data] : user;
  },
);
