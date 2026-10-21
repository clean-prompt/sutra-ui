import * as React from "react";
import { getPaginationRange, type PaginationOptions } from "../lib/pagination";

/** Memoized pagination range helper. */
export function usePagination(options: PaginationOptions) {
  const { page, totalPages, siblingCount, boundaryCount } = options;
  return React.useMemo(
    () => getPaginationRange({ page, totalPages, siblingCount, boundaryCount }),
    [page, totalPages, siblingCount, boundaryCount]
  );
}
