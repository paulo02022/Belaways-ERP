export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const paginate = <T>(items: T[], page = 1, pageSize = 20): PaginatedResult<T> => {
  const safePage = Math.max(page, 1);
  const safePageSize = Math.min(Math.max(pageSize, 1), 5000);
  const start = (safePage - 1) * safePageSize;
  const total = items.length;

  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages: Math.max(Math.ceil(total / safePageSize), 1),
  };
};
