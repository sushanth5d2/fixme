"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePagination = normalizePagination;
const constants_1 = require("./constants");
function normalizePagination(query) {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const limit = Math.min(constants_1.MAX_PAGE_SIZE, Math.max(1, Math.floor(query.limit ?? constants_1.DEFAULT_PAGE_SIZE)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
//# sourceMappingURL=pagination.js.map