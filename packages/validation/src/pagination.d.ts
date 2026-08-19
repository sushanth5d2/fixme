export interface PaginationQuery {
    page?: number;
    limit?: number;
}
export interface NormalizedPagination {
    page: number;
    limit: number;
    skip: number;
}
export declare function normalizePagination(query: PaginationQuery): NormalizedPagination;
//# sourceMappingURL=pagination.d.ts.map