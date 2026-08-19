"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GSTIN_REGEX = void 0;
exports.isValidGSTIN = isValidGSTIN;
exports.normalizeGSTIN = normalizeGSTIN;
exports.GSTIN_REGEX = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
function isValidGSTIN(gstin) {
    if (!gstin)
        return false;
    const cleaned = gstin.trim().toUpperCase();
    return exports.GSTIN_REGEX.test(cleaned);
}
function normalizeGSTIN(gstin) {
    return gstin.trim().toUpperCase();
}
//# sourceMappingURL=gstin.js.map