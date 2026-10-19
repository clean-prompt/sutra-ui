import * as React from "react";
import { RiArrowDownSLine, RiArrowLeftLine, RiArrowRightLine, RiMoreLine } from "@remixicon/react";
import { cn, focusRing, type Size } from "../lib/cn";
import { Button } from "./button";
import { useControllableState } from "../hooks/use-controllable-state";
import { clamp } from "../lib/math";
import { usePagination } from "../hooks/use-pagination";
import { getPageWindow, type PageWindow } from "../lib/pagination";
import { Skeleton } from "./progress";
import { Input } from "./input";
import { useMergedRefs } from "../hooks/use-merged-refs";

export { getPaginationRange, type PaginationRangeItem, type UsePaginationOptions, type PageWindow } from "../lib/pagination";
export { usePagination } from "../hooks/use-pagination";

const itemSize: Record<Size, string> = {
  sm: "h-8 min-w-8 text-xs",
  md: "h-9 min-w-9 text-sm",
  lg: "h-10 min-w-10 text-sm",
};

export interface PaginationItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Page number this item represents and selects when clicked (1-based). */
  page?: number;
  /** Marks the current page (`aria-current="page"`). */
  active?: boolean;
  /** Legacy name of `active`. @deprecated Use `active`. */
  isActive?: boolean;
  /** Item height and text size; match the other pagination controls. */
  size?: Size;
}

/** A single page number button. */
export const PaginationItem = React.forwardRef<HTMLButtonElement, PaginationItemProps>(
  ({ page, active: activeProp, isActive, size = "md", className, children, ...props }, ref) => {
    const active = activeProp ?? isActive;
    return (
      <button
        ref={ref}
        type="button"
        aria-current={active ? "page" : undefined}
        aria-label={page != null ? `Page ${page}` : undefined}
        data-active={active || undefined}
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
    );
  }
);
PaginationItem.displayName = "PaginationItem";

export interface PaginationEllipsisProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size of the ellipsis, matching the neighbouring items. */
  size?: Size;
  /** Which gap this marks (before or after the current range); handed to `onJump`. Default `"end"`. */
  direction?: "start" | "end";
  /** Makes the ellipsis a button that reports the gap it marks, so the app can offer a way to jump to a page (see `Pagination pageJump`). */
  onJump?: (direction: "start" | "end") => void;
  /** Accessible name of the jump button. Default "Jump to a page". */
  jumpLabel?: string;
}

/** Gap marker between page ranges. With `onJump` it is a button that offers a jump to a page; without it, a decorative marker. */
export const PaginationEllipsis = React.forwardRef<HTMLSpanElement, PaginationEllipsisProps>(
  ({ className, size = "md", direction = "end", onJump, jumpLabel = "Jump to a page", ...props }, ref) =>
    onJump ? (
      <span ref={ref} data-slot="pagination-ellipsis" className={cn("inline-flex", itemSize[size], className)} {...props}>
        <button
          type="button"
          aria-label={jumpLabel}
          title={jumpLabel}
          onClick={() => onJump(direction)}
          className={cn(
            "inline-flex size-full items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground",
            focusRing
          )}
        >
          <RiMoreLine aria-hidden className="size-4" />
        </button>
      </span>
    ) : (
      <span
        ref={ref}
        aria-hidden
        className={cn("inline-flex items-center justify-center text-muted-foreground", itemSize[size], className)}
        {...props}
      >
        <RiMoreLine aria-hidden className="size-4" />
      </span>
    )
);
PaginationEllipsis.displayName = "PaginationEllipsis";

interface PaginationJumpProps {
  direction: "start" | "end";
  size: Size;
  total: number;
  onGo: (page: number) => void;
}

/** An ellipsis that turns into a small page field in place: Enter jumps, Escape or leaving the field cancels. */
function PaginationJump({ direction, size, total, onGo }: PaginationJumpProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [invalid, setInvalid] = React.useState(false);
  const wrapRef = React.useRef<HTMLSpanElement>(null);
  const restoreFocus = React.useRef(false);

  React.useEffect(() => {
    if (!editing && restoreFocus.current) {
      restoreFocus.current = false;
      wrapRef.current?.querySelector("button")?.focus();
    }
  }, [editing]);

  if (!editing) {
    return (
      <PaginationEllipsis
        ref={wrapRef}
        size={size}
        direction={direction}
        onJump={() => {
          setDraft("");
          setInvalid(false);
          setEditing(true);
        }}
      />
    );
  }
  const submit = () => {
    const n = Number.parseInt(draft, 10);
    if (!Number.isFinite(n)) {
      setInvalid(true);
      return;
    }
    setEditing(false);
    onGo(clamp(n, 1, total));
  };
  return (
    <Input
      autoFocus
      size={size}
      inputMode="numeric"
      autoComplete="off"
      data-slot="pagination-jump"
      aria-label={`Go to page, 1 to ${total}`}
      placeholder="Page"
      value={draft}
      invalid={invalid}
      onChange={(e) => {
        setDraft(e.target.value.replace(/\D/g, "").slice(0, String(total).length));
        setInvalid(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          restoreFocus.current = true;
          setEditing(false);
        }
      }}
      onBlur={() => setEditing(false)}
      className="w-16 px-1.5 text-center tabular-nums"
    />
  );
}

export interface PaginationNavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button height and text size; match the other pagination controls. */
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
      <RiArrowLeftLine className="rtl:-scale-x-100" aria-hidden />
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
      <RiArrowRightLine className="rtl:-scale-x-100" aria-hidden />
    </Button>
  )
);
PaginationNext.displayName = "PaginationNext";

export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  /** Current page (1-based). */
  page?: number;
  /**
   * Initial page (1-based) when uncontrolled.
   * @default 1
   */
  defaultPage?: number;
  /** Total number of pages (not rows); drives which page buttons are shown. */
  totalPages: number;
  /** Called with the new 1-based page when the user changes page. */
  onPageChange?: (page: number) => void;
  /**
   * Pages shown on each side of the current page before collapsing into an ellipsis.
   * @default 1
   */
  siblingCount?: number;
  /**
   * Pages always shown at the start and end of the range.
   * @default 1
   */
  boundaryCount?: number;
  /**
   * Layout: numbered page buttons, prev/next only, a dot indicator, or a "load more" button.
   * @default "numbered"
   */
  variant?: "numbered" | "simple" | "dots" | "load-more";
  /** Control height and text size. */
  size?: Size;
  /** Rows per page; enables the page size selector together with `pageSizeOptions`. */
  pageSize?: number;
  /** Choices for the page size selector (needs `pageSize`); each is a rows-per-page count. */
  pageSizeOptions?: number[];
  /** Called with the chosen rows-per-page count; update `pageSize` and usually reset the page. */
  onPageSizeChange?: (pageSize: number) => void;
  /**
   * Label of the page size selector.
   * @default "Rows per page"
   */
  pageSizeLabel?: React.ReactNode;
  /** load-more: spinner on the button. */
  loading?: boolean;
  /**
   * Text of the load-more button.
   * @default "Load more"
   */
  loadMoreLabel?: React.ReactNode;
  /**
   * numbered: activating an ellipsis turns it into a page field (Enter jumps to that page, Escape cancels), so a long
   * range can be crossed in one step. Opt-in; the page list is shown from the `@lg` container width up.
   */
  pageJump?: boolean;
  /** Disables every control. */
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
      pageJump = false,
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
    // After a jump the field is gone: put focus on the page it landed on (the ellipsis it came from may no longer exist).
    const [jumps, setJumps] = React.useState(0);
    const navRef = React.useRef<HTMLElement>(null);
    const mergedRef = useMergedRefs<HTMLElement>(ref, navRef);
    React.useEffect(() => {
      if (jumps > 0) navRef.current?.querySelector<HTMLElement>("[aria-current=page]")?.focus();
    }, [jumps]);
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
                "appearance-none rounded-control border border-input bg-background ps-2.5 pe-7 font-medium tabular-nums text-foreground shadow-xs transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50",
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
            <RiArrowDownSLine aria-hidden className="pointer-events-none absolute end-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
          <ul className="hidden items-center gap-0.5 @lg:flex">
            {items.map((item) =>
              typeof item === "number" ? (
                <li key={item}>
                  <PaginationItem
                    page={item}
                    size={size}
                    active={item === page}
                    disabled={disabled}
                    onClick={() => go(item)}
                  />
                </li>
              ) : (
                <li key={item}>
                  {pageJump && !disabled ? (
                    <PaginationJump
                      direction={item === "ellipsis-start" ? "start" : "end"}
                      size={size}
                      total={total}
                      onGo={(target) => {
                        go(target);
                        setJumps((n) => n + 1);
                      }}
                    />
                  ) : (
                    <PaginationEllipsis size={size} />
                  )}
                </li>
              )
            )}
          </ul>
          <span className="@lg:hidden">{pageLabel}</span>
          <PaginationNext size={size} disabled={!canNext} onClick={() => go(page + 1)} />
        </div>
      );
    }

    return (
      <nav
        ref={mergedRef}
        role="navigation"
        aria-label="Pagination"
        className={cn(
          "flex w-full items-center gap-3",
          // With a page-size select the row wraps (select, then the pager) when the width is short, instead of keying off the viewport.
          pageSizeSelect ? "flex-wrap justify-center" : "flex-col",
          variant === "dots" && !pageSizeSelect && "justify-center",
          className
        )}
        {...props}
      >
        {pageSizeSelect}
        {/* A container, so the page list and the "Page x of y" label follow the width this row gets, not the viewport. */}
        <div className={cn("@container flex min-w-0", pageSizeSelect ? "grow basis-72 justify-end" : "w-full justify-center")}>
          {body}
        </div>
      </nav>
    );
  }
);
Pagination.displayName = "Pagination";

export interface PaginationStatusProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Current page (1-based). */
  page: number;
  /** Rows per page; with `page` and `total` it gives the "1–10 of 245" window. */
  pageSize: number;
  /** Total number of rows. */
  total: number;
  /** Custom text from the row window, e.g. `({ from, to, total }) => \`Rows ${from} to ${to} of ${total}\``. */
  format?: (window: PageWindow) => React.ReactNode;
  /** Locale for the numbers. */
  locale?: string | string[];
  /** Shown when there are no rows. Default "No results". */
  emptyState?: React.ReactNode;
  /** Rows are being fetched: a placeholder while the total is 0, otherwise the numbers stay and the line is marked busy. */
  loading?: boolean;
}

/** "1–10 of 245": which rows the current page shows. Announced politely when the page changes. */
export const PaginationStatus = React.forwardRef<HTMLDivElement, PaginationStatusProps>(
  ({ page, pageSize, total, format, locale, emptyState, loading = false, className, ...props }, ref) => {
    const window = getPageWindow(page, pageSize, total);
    const number = (n: number) => {
      try {
        return new Intl.NumberFormat(locale).format(n);
      } catch {
        return String(n);
      }
    };
    let content: React.ReactNode;
    if (window.total === 0) {
      content = loading ? (
        <>
          <Skeleton shape="text" className="inline-block h-3.5 w-24 align-middle" />
          <span className="sr-only">Loading…</span>
        </>
      ) : (
        (emptyState ?? "No results")
      );
    } else {
      content = format ? format(window) : `${number(window.from)}–${number(window.to)} of ${number(window.total)}`;
    }
    return (
      <div
        ref={ref}
        data-slot="pagination-status"
        aria-live="polite"
        aria-busy={loading || undefined}
        className={cn("text-sm tabular-nums text-muted-foreground", className)}
        {...props}
      >
        {content}
      </div>
    );
  }
);
PaginationStatus.displayName = "PaginationStatus";
