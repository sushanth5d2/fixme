"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BCRYPT_ROUNDS = exports.QUOTE_SIGNED_URL_EXPIRY_SECONDS = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.ALLOWED_CHAT_ATTACHMENT_MIME_TYPES = exports.ALLOWED_DOCUMENT_MIME_TYPES = exports.ALLOWED_VIDEO_MIME_TYPES = exports.ALLOWED_PHOTO_MIME_TYPES = exports.MAX_CHAT_ATTACHMENT_SIZE_BYTES = exports.MAX_DOCUMENT_SIZE_BYTES = exports.MAX_PROFILE_PHOTO_SIZE_BYTES = exports.MAX_VIDEO_SIZE_BYTES = exports.MAX_PHOTO_SIZE_BYTES = exports.MAX_REPAIR_VIDEOS = exports.MAX_REPAIR_PHOTOS = exports.REFRESH_TOKEN_EXPIRY = exports.ACCESS_TOKEN_EXPIRY = exports.LOGIN_RATE_WINDOW_MINUTES = exports.LOGIN_MAX_ATTEMPTS = exports.OTP_MAX_ATTEMPTS = exports.OTP_EXPIRY_MINUTES = exports.OTP_LENGTH = exports.PASSWORD_MAX_LENGTH = exports.PASSWORD_MIN_LENGTH = void 0;
exports.PASSWORD_MIN_LENGTH = 8;
exports.PASSWORD_MAX_LENGTH = 128;
exports.OTP_LENGTH = 6;
exports.OTP_EXPIRY_MINUTES = 10;
exports.OTP_MAX_ATTEMPTS = 3;
exports.LOGIN_MAX_ATTEMPTS = 5;
exports.LOGIN_RATE_WINDOW_MINUTES = 15;
exports.ACCESS_TOKEN_EXPIRY = '15m';
exports.REFRESH_TOKEN_EXPIRY = '7d';
exports.MAX_REPAIR_PHOTOS = 10;
exports.MAX_REPAIR_VIDEOS = 3;
exports.MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;
exports.MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
exports.MAX_PROFILE_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
exports.MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
exports.MAX_CHAT_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;
exports.ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
exports.ALLOWED_VIDEO_MIME_TYPES = ['video/mp4'];
exports.ALLOWED_DOCUMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
exports.ALLOWED_CHAT_ATTACHMENT_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'application/pdf',
];
exports.DEFAULT_PAGE_SIZE = 20;
exports.MAX_PAGE_SIZE = 100;
exports.QUOTE_SIGNED_URL_EXPIRY_SECONDS = 900;
exports.BCRYPT_ROUNDS = 12;
//# sourceMappingURL=constants.js.map