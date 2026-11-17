/** Default list page size for admin tables (users, packages, …). */
export const DEFAULT_PAGE_SIZE = 10;

export const MAX_PAGE_SIZE = 100;

export function parsePageParam(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function pageOffset(page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return (page - 1) * pageSize;
}

export function totalPages(total: number, pageSize = DEFAULT_PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function sliceForPage<T>(items: readonly T[], page: number, pageSize = DEFAULT_PAGE_SIZE) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}