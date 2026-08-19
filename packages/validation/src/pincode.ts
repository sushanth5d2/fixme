/**
 * Validates Indian pincode format.
 * 6-digit number. First digit 1–9.
 */
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export function isValidPincode(pincode: string): boolean {
  return PINCODE_REGEX.test(pincode.trim());
}
