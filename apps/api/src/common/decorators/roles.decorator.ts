import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@fixme/shared-types';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route to users with specific roles.
 * @example @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
