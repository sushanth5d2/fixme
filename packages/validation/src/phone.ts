/**
 * Validates Indian mobile number format.
 * Accepts 10-digit numbers starting with 6–9.
 * With or without country code +91.
 */
export function isValidIndianMobile(mobile: string): boolean {
  const cleaned = mobile.replace(/\s|-/g, '');
  const withoutCountryCode = cleaned.startsWith('+91')
    ? cleaned.slice(3)
    : cleaned.startsWith('91') && cleaned.length === 12
      ? cleaned.slice(2)
      : cleaned;
  return /^[6-9]\d{9}$/.test(withoutCountryCode);
}

/**
 * Normalizes mobile number to 10-digit format.
 */
export function normalizeMobile(mobile: string): string {
  const cleaned = mobile.replace(/\s|-/g, '');
  if (cleaned.startsWith('+91')) return cleaned.slice(3);
  if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned.slice(2);
  return cleaned;
}
