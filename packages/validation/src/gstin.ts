/**
 * Validates Indian GSTIN format.
 * Format: 2-digit state code + 10-digit PAN + 1-digit entity + 1-digit Z + 1-digit check
 * Pattern: 2 digits + 5 letters + 4 digits + 1 letter + 1 digit/letter + Z + 1 digit/letter
 * Example: 29AAGCB1234N1Z5
 */
export const GSTIN_REGEX = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

export function isValidGSTIN(gstin: string): boolean {
  if (!gstin) return false;
  const cleaned = gstin.trim().toUpperCase();
  return GSTIN_REGEX.test(cleaned);
}


/**
 * Normalizes GSTIN to uppercase.
 */
export function normalizeGSTIN(gstin: string): string {
  return gstin.trim().toUpperCase();
}
