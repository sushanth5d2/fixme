import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './constants';

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface NormalizedPagination {
  page: number;
  limit: number;
  skip: number;
}

export function normalizePagination(query: PaginationQuery): NormalizedPagination {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(query.limit ?? DEFAULT_PAGE_SIZE)),
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
