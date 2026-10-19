/* Pagination range math. Pure. */

export type PaginationRangeItem = number | "ellipsis-start" | "ellipsis-end";

export interface UsePaginationOptions {
  page: number;
  totalPages: number;
  /** Pages shown on each side of the current page. Default 1. */
  siblingCount?: number;
  /** Pages always shown at the start and end. Default 1. */
  boundaryCount?: number;
}

function range(start: number, end: number) {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

/** Pure range computation: [1, "ellipsis-start", 4, 5, 6, "ellipsis-end", 10]. */
export function getPaginationRange({
  page,
  totalPages,
  siblingCount = 1,
  boundaryCount = 1,
}: UsePaginationOptions): PaginationRangeItem[] {
  const total = Math.max(0, Math.floor(totalPages));
  if (total === 0) return [];
  const current = Math.min(Math.max(1, page), total);
  // boundary + siblings + current + 2 ellipses
  const slots = boundaryCount * 2 + siblingCount * 2 + 3;
  if (total <= slots) return range(1, total);

  const startPages = range(1, Math.min(boundaryCount, total));
  const endPages = range(Math.max(total - boundaryCount + 1, boundaryCount + 1), total);

  const siblingsStart = Math.max(
    Math.min(current - siblingCount, total - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2
  );
  const siblingsEnd = Math.min(
    Math.max(current + siblingCount, boundaryCount + siblingCount * 2 + 2),
    endPages.length > 0 ? endPages[0]! - 2 : total - 1
  );

  const items: PaginationRangeItem[] = [...startPages];
  if (siblingsStart > boundaryCount + 2) items.push("ellipsis-start");
  else if (boundaryCount + 1 < total - boundaryCount) items.push(boundaryCount + 1);
  items.push(...range(siblingsStart, siblingsEnd));
  if (siblingsEnd < total - boundaryCount - 1) items.push("ellipsis-end");
  else if (total - boundaryCount > boundaryCount) items.push(total - boundaryCount);
  items.push(...endPages);
  return items;
}

export interface PageWindow {
  /** The page used, clamped into 1..pageCount (1 when there are no rows). */
  page: number;
  pageCount: number;
  /** 1-based number of the first row on the page; 0 when there are no rows. */
  from: number;
  /** 1-based number of the last row on the page; 0 when there are no rows. */
  to: number;
  total: number;
}

/** Which rows a page covers: `getPageWindow(2, 10, 45)` is rows 11 to 20 of 45. Pure; bad input gives an empty window. */
export function getPageWindow(page: number, pageSize: number, total: number): PageWindow {
  const rows = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const size = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 1;
  const pageCount = Math.ceil(rows / size);
  if (rows === 0) return { page: 1, pageCount: 0, from: 0, to: 0, total: 0 };
  const current = Math.min(Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1), pageCount);
  return { page: current, pageCount, from: (current - 1) * size + 1, to: Math.min(rows, current * size), total: rows };
}
