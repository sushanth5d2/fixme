export interface Timestamps {
    createdAt: string;
    updatedAt: string;
}
export interface SoftDelete {
    deletedAt: string | null;
}
export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}
export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}
export interface Coordinates {
    latitude: number;
    longitude: number;
}
export interface LocationInfo extends Coordinates {
    address?: string;
    landmark?: string;
    pincode: string;
    city: string;
    state: string;
}
//# sourceMappingURL=common.d.ts.map