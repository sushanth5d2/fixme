import { UserRole, UserStatus } from './enums';
import { Timestamps } from './common';
export interface User extends Timestamps {
    id: string;
    email: string;
    mobile: string;
    role: UserRole;
    status: UserStatus;
    isEmailVerified: boolean;
    isMobileVerified: boolean;
    lastLoginAt: string | null;
}
export interface PublicUserProfile {
    id: string;
    role: UserRole;
}
//# sourceMappingURL=user.d.ts.map