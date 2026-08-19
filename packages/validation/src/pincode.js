"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PINCODE_REGEX = void 0;
exports.isValidPincode = isValidPincode;
exports.PINCODE_REGEX = /^[1-9][0-9]{5}$/;
function isValidPincode(pincode) {
    return exports.PINCODE_REGEX.test(pincode.trim());
}
//# sourceMappingURL=pincode.js.map