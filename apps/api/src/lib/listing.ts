export type PaginationInput = {
  page?: unknown;
  pageSize?: unknown;
};

export type Pagination = {
  page: number;
  pageSize: number;
  offset: number;
};

export function parsePagination(input: PaginationInput, defaults?: { pageSize?: number; maxPageSize?: number }) {
  const defaultPageSize = defaults?.pageSize ?? 20;
  const maxPageSize = defaults?.maxPageSize ?? 100;

  const pageRaw = Number(input.page);
  const pageSizeRaw = Number(input.pageSize);

  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const requestedPageSize = Number.isInteger(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : defaultPageSize;
  const pageSize = Math.min(requestedPageSize, maxPageSize);

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  } satisfies Pagination;
}

export function buildListMeta(params: { page: number; pageSize: number; total: number }) {
  return {
    page: params.page,
    pageSize: params.pageSize,
    total: params.total,
    totalPages: Math.max(1, Math.ceil(params.total / params.pageSize))
  };
}

export function normalizeSearch(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
