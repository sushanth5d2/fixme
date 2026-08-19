import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from './constants';

/**
 * Validates password strength.
 * Rules:
 * - Minimum 8, maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */
export function isValidPassword(password: string): boolean {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return false;
  }
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  return hasUppercase && hasLowercase && hasDigit && hasSpecial;
}

export const PASSWORD_REQUIREMENTS =
  `Password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters ` +
  'and include at least one uppercase letter, one lowercase letter, one digit, ' +
  'and one special character.';
