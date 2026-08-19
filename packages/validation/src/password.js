"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSWORD_REQUIREMENTS = void 0;
exports.isValidPassword = isValidPassword;
const constants_1 = require("./constants");
function isValidPassword(password) {
    if (password.length < constants_1.PASSWORD_MIN_LENGTH || password.length > constants_1.PASSWORD_MAX_LENGTH) {
        return false;
    }
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    return hasUppercase && hasLowercase && hasDigit && hasSpecial;
}
exports.PASSWORD_REQUIREMENTS = `Password must be ${constants_1.PASSWORD_MIN_LENGTH}–${constants_1.PASSWORD_MAX_LENGTH} characters ` +
    'and include at least one uppercase letter, one lowercase letter, one digit, ' +
    'and one special character.';
//# sourceMappingURL=password.js.map