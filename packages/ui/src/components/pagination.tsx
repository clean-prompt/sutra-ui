import * as React from "react";
import { RiArrowDownSLine, RiArrowLeftLine, RiArrowRightLine, RiMoreLine } from "@remixicon/react";
import { cn, focusRing, type Size } from "../lib/cn";
import { Button } from "./button";
import { useControllableState } from "../hooks/use-controllable-state";
import { clamp } from "../lib/math";

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

/** Memoized pagination range helper. */
export function usePagination(options: UsePaginationOptions) {
  const { page, totalPages, siblingCount, boundaryCount } = options;
  return React.useMemo(
    () => getPaginationRange({ page, totalPages, siblingCount, boundaryCount }),
    [page, totalPages, siblingCount, boundaryCount]
  );
}

const itemSize: Record<Size, string> = {
  sm: "h-8 min-w-8 text-xs",
  md: "h-9 min-w-9 text-sm",
  lg: "h-10 min-w-10 text-sm",
};

export interface PaginationItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  page?: number;
  isActive?: boolean;
  size?: Size;
}

/** A single page number button. */
export const PaginationItem = React.forwardRef<HTMLButtonElement, PaginationItemProps>(
  ({ page, isActive, size = "md", className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-current={isActive ? "page" : undefined}
      aria-label={page != null ? `Page ${page}` : undefined}
      data-active={isActive || undefined}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-control border border-transparent px-2 font-medium tabular-nums text-muted-foreground transition-[color,background-color,border-color,box-shadow] duration-150",
        "hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        "data-[active]:border-border data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-xs",
        itemSize[size],
        focusRing,
        className
      )}
      {...props}
    >
      {children ?? page}
    </button>
  )
);
PaginationItem.displayName = "PaginationItem";

/** Gap marker between page ranges. */
export const PaginationEllipsis = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & { size?: Size }>(
  ({ className, size = "md", ...props }, ref) => (
    <span
      ref={ref}
      aria-hidden
      className={cn("inline-flex items-center justify-center text-muted-foreground", itemSize[size], className)}
      {...props}
    >
      <RiMoreLine className="size-4" />
    </span>
  )
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export interface PaginationNavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: Size;
  /** Hide the text label and render only the arrow. */
  iconOnly?: boolean;
}

const navSize = { sm: "sm", md: "md", lg: "lg" } as const;
const navIconSize = { sm: "icon-sm", md: "icon", lg: "icon-lg" } as const;

/** Previous page button. */
export const PaginationPrev = React.forwardRef<HTMLButtonElement, PaginationNavButtonProps>(
  ({ size = "md", iconOnly, children, ...props }, ref) => (
    <Button
      ref={ref}
      variant="secondary"
      size={iconOnly ? navIconSize[size] : navSize[size]}
      aria-label="Previous page"
      {...props}
    >
      <RiArrowLeftLine />
      {!iconOnly && <span className={cn(children == null && "max-sm:sr-only")}>{children ?? "Previous"}</span>}
    </Button>
  )
);
PaginationPrev.displayName = "PaginationPrev";

/** Next page button. */
export const PaginationNext = React.forwardRef<HTMLButtonElement, PaginationNavButtonProps>(
  ({ size = "md", iconOnly, children, ...props }, ref) => (
    <Button
      ref={ref}
      variant="secondary"
      size={iconOnly ? navIconSize[size] : navSize[size]}
      aria-label="Next page"
      {...props}
    >
      {!iconOnly && <span className={cn(children == null && "max-sm:sr-only")}>{children ?? "Next"}</span>}
      <RiArrowRightLine />
    </Button>
  )
);
PaginationNext.displayName = "PaginationNext";

export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  /** Current page (1-based). */
  page?: number;
  defaultPage?: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  siblingCount?: number;
  boundaryCount?: number;
  variant?: "numbered" | "simple" | "dots" | "load-more";
  size?: Size;
  /** Rows per page; enables the page size selector together with `pageSizeOptions`. */
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeLabel?: React.ReactNode;
  /** load-more: spinner on the button. */
  loading?: boolean;
  loadMoreLabel?: React.ReactNode;
  disabled?: boolean;
}

/** Page navigation: numbered, simple, dots or load-more, with an optional page-size selector. */
export const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  (
    {
      page: pageProp,
      defaultPage = 1,
      totalPages,
      onPageChange,
      siblingCount = 1,
      boundaryCount = 1,
      variant = "numbered",
      size = "md",
      pageSize,
      pageSizeOptions,
      onPageSizeChange,
      pageSizeLabel = "Rows per page",
      loading,
      loadMoreLabel = "Load more",
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const [rawPage, setPage] = useControllableState({ value: pageProp, defaultValue: defaultPage, onChange: onPageChange });
    const total = Math.max(1, totalPages);
    const page = clamp(rawPage, 1, total);
    const items = usePagination({ page, totalPages: total, siblingCount, boundaryCount });
    const go = (p: number) => {
      const next = clamp(p, 1, total);
      if (next !== page) setPage(next);
    };
    const canPrev = page > 1 && !disabled;
    const canNext = page < total && !disabled;

    const pageSizeSelect =
      pageSize != null && pageSizeOptions && pageSizeOptions.length > 0 ? (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">{pageSizeLabel}</span>
          <span className="relative inline-flex">
            <select
              value={pageSize}
              disabled={disabled}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className={cn(
                "appearance-none rounded-control border border-input bg-background pl-2.5 pr-7 font-medium tabular-nums text-foreground shadow-xs transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50",
                size === "sm" ? "h-8 text-xs" : size === "lg" ? "h-10 text-sm" : "h-9 text-sm",
                focusRing
              )}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <RiArrowDownSLine className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </span>
        </label>
      ) : null;

    const pageLabel = (
      <span className="whitespace-nowrap text-sm text-muted-foreground" aria-live="polite">
        Page <span className="font-medium text-foreground tabular-nums">{page}</span> of{" "}
        <span className="font-medium text-foreground tabular-nums">{total}</span>
      </span>
    );

    let body: React.ReactNode;
    if (variant === "load-more") {
      body = (
        <div className="flex w-full flex-col items-center gap-2">
          <Button
            variant="secondary"
            size={size}
            loading={loading}
            disabled={!canNext}
            onClick={() => go(page + 1)}
          >
            {loadMoreLabel}
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {page} of {total} pages loaded
          </span>
        </div>
      );
    } else if (variant === "simple") {
      body = (
        <div className="flex w-full items-center justify-between gap-3">
          <PaginationPrev size={size} disabled={!canPrev} onClick={() => go(page - 1)} />
          {pageLabel}
          <PaginationNext size={size} disabled={!canNext} onClick={() => go(page + 1)} />
        </div>
      );
    } else if (variant === "dots") {
      body = (
        <div className="flex items-center gap-3">
          <PaginationPrev size="sm" iconOnly disabled={!canPrev} onClick={() => go(page - 1)} />
          <div className="flex items-center gap-1.5">
            {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                disabled={disabled}
                onClick={() => go(p)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 ease-out-quart",
                  p === page ? "w-6 bg-primary" : "w-2 bg-border-strong hover:bg-muted-foreground",
                  focusRing
                )}
              />
            ))}
          </div>
          <PaginationNext size="sm" iconOnly disabled={!canNext} onClick={() => go(page + 1)} />
        </div>
      );
    } else {
      body = (
        <div className="flex w-full items-center justify-between gap-3">
          <PaginationPrev size={size} disabled={!canPrev} onClick={() => go(page - 1)} />
          <ul className="hidden items-center gap-0.5 sm:flex">
            {items.map((item) =>
              typeof item === "number" ? (
                <li key={item}>
                  <PaginationItem
                    page={item}
                    size={size}
                    isActive={item === page}
                    disabled={disabled}
                    onClick={() => go(item)}
                  />
                </li>
              ) : (
                <li key={item}>
                  <PaginationEllipsis size={size} />
                </li>
              )
            )}
          </ul>
          <span className="sm:hidden">{pageLabel}</span>
          <PaginationNext size={size} disabled={!canNext} onClick={() => go(page + 1)} />
        </div>
      );
    }

    return (
      <nav
        ref={ref}
        role="navigation"
        aria-label="Pagination"
        className={cn(
          "flex w-full flex-col items-center gap-3",
          pageSizeSelect && "sm:flex-row sm:justify-between",
          variant === "dots" && !pageSizeSelect && "justify-center",
          className
        )}
        {...props}
      >
        {pageSizeSelect}
        <div className={cn("flex min-w-0", pageSizeSelect ? "sm:flex-1 sm:justify-end" : "w-full justify-center")}>
          {body}
        </div>
      </nav>
    );
  }
);
Pagination.displayName = "Pagination";
