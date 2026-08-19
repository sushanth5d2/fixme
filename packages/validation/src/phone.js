"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidIndianMobile = isValidIndianMobile;
exports.normalizeMobile = normalizeMobile;
function isValidIndianMobile(mobile) {
    const cleaned = mobile.replace(/\s|-/g, '');
    const withoutCountryCode = cleaned.startsWith('+91')
        ? cleaned.slice(3)
        : cleaned.startsWith('91') && cleaned.length === 12
            ? cleaned.slice(2)
            : cleaned;
    return /^[6-9]\d{9}$/.test(withoutCountryCode);
}
function normalizeMobile(mobile) {
    const cleaned = mobile.replace(/\s|-/g, '');
    if (cleaned.startsWith('+91'))
        return cleaned.slice(3);
    if (cleaned.startsWith('91') && cleaned.length === 12)
        return cleaned.slice(2);
    return cleaned;
}
//# sourceMappingURL=phone.js.map