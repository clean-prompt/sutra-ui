import * as React from "react";
import { cn } from "../lib/cn";
import { isSafeHref } from "../lib/validate";
import { Badge } from "../primitives/badge";
import { Skeleton } from "../primitives/progress";

/** Props handed to `renderLink` so a router link can render a cell. Spread them onto your Link. */
export interface DividedGridLinkProps {
  href: string;
  className: string;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  target?: string;
  rel?: string;
  "data-slot": "divided-grid-cell";
}

interface CellContextValue {
  /** Zero-based position among the grid's cells. */
  index: number;
  numbered: boolean;
  renderLink?: (props: DividedGridLinkProps) => React.ReactElement;
}

const CellContext = React.createContext<CellContextValue | null>(null);

export interface DividedGridItemProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "onSelect" | "children"> {
  /** Cell heading. */
  title: React.ReactNode;
  /** Up to three lines; longer text is clamped. */
  description?: React.ReactNode;
  /** Icon shown in a small tile above the title (decorative: the title names the cell). */
  icon?: React.ReactNode;
  /** A short label next to the title ("New", "Beta"). Text is shown in a `Badge`; pass a node to style it yourself. */
  badge?: React.ReactNode;
  /** Small muted line at the bottom of the cell ("12 MB limit"). */
  meta?: React.ReactNode;
  /** Makes the cell a link. Unsafe URLs (`javascript:`) are ignored and the cell stays static. */
  href?: string;
  /** Link `target` when `href` is set. */
  target?: string;
  /** Link `rel` when `href` is set. */
  rel?: string;
  /** Called when the cell is clicked (after `onClick`, unless that prevented the default). Alone it makes the cell a button; with `href` it runs before the link opens. */
  onSelect?: (event: React.MouseEvent<HTMLElement>) => void;
  /** Disables the cell: dimmed and not interactive. */
  disabled?: boolean;
}

const cellBase = "relative flex h-full w-full flex-col items-stretch gap-3 p-5 text-start";
const cellInteractive =
  "cursor-pointer no-underline transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
const cellDisabled = "cursor-not-allowed opacity-50";

function cellNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

/** One cell of a `DividedGrid`: icon tile, title, description, badge and meta. A link, a button or static, depending on `href` and `onSelect`. */
export const DividedGridItem = React.forwardRef<HTMLElement, DividedGridItemProps>(
  ({ title, description, icon, badge, meta, href, target, rel, onSelect, onClick, disabled, className, ...props }, ref) => {
    const ctx = React.useContext(CellContext);

    const isLink = href !== undefined && isSafeHref(href);
    const actionable = onSelect !== undefined || onClick !== undefined;
    const interactive = !disabled && (isLink || actionable);
    const classes = cn(cellBase, interactive && cellInteractive, disabled && cellDisabled, className);

    const content = (
      <>
        {icon || ctx?.numbered ? (
          <span className="flex items-start justify-between gap-3">
            {icon ? (
              <span
                aria-hidden
                data-slot="divided-grid-icon"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-foreground [&_svg]:size-5"
              >
                {icon}
              </span>
            ) : null}
            {ctx?.numbered ? (
              <span aria-hidden data-slot="divided-grid-number" className={cn("font-mono text-xs tabular-nums text-muted-foreground", icon && "ms-auto")}>
                {cellNumber(ctx.index)}
              </span>
            ) : null}
          </span>
        ) : null}
        <span className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-base font-semibold leading-snug text-foreground">
              {title}
            </span>
            {badge ? (
              <span data-slot="divided-grid-badge" className="inline-flex">
                {typeof badge === "string" || typeof badge === "number" ? (
                  <Badge variant="outline" size="sm">
                    {badge}
                  </Badge>
                ) : (
                  badge
                )}
              </span>
            ) : null}
          </span>
          {description ? (
            <span data-slot="divided-grid-description" className="line-clamp-3 text-sm text-muted-foreground">
              {description}
            </span>
          ) : null}
        </span>
        {meta ? (
          <span data-slot="divided-grid-meta" className="mt-auto pt-1 text-xs text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </>
    );

    const common = {
      "data-slot": "divided-grid-cell" as const,
      "data-disabled": disabled || undefined,
      ...props,
    };
    const handleClick = actionable && !disabled
      ? (event: React.MouseEvent<HTMLElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented) onSelect?.(event);
        }
      : undefined;

    if (isLink && !disabled) {
      if (ctx?.renderLink) {
        return (
          <>
            {ctx.renderLink({
              href,
              className: classes,
              children: content,
              onClick: handleClick,
              target,
              rel: target === "_blank" ? (rel ?? "noreferrer noopener") : rel,
              "data-slot": "divided-grid-cell",
            })}
          </>
        );
      }
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target={target}
          rel={target === "_blank" ? (rel ?? "noreferrer noopener") : rel}
          onClick={handleClick}
          className={classes}
          {...common}
        >
          {content}
        </a>
      );
    }
    if (isLink) {
      // A disabled link can't be followed or focused; the role keeps it announced as a (dimmed) link.
      return (
        <div ref={ref as React.Ref<HTMLDivElement>} role="link" aria-disabled="true" className={classes} {...common}>
          {content}
        </div>
      );
    }
    if (actionable) {
      return (
        <button ref={ref as React.Ref<HTMLButtonElement>} type="button" disabled={disabled} onClick={handleClick} className={classes} {...common}>
          {content}
        </button>
      );
    }
    return (
      <div ref={ref as React.Ref<HTMLDivElement>} aria-disabled={disabled || undefined} className={classes} {...common}>
        {content}
      </div>
    );
  }
);
DividedGridItem.displayName = "DividedGridItem";

/* ------------------------------------------------------------------ */
/* DividedGrid                                                         */
/* ------------------------------------------------------------------ */

export type DividedGridColumns = 1 | 2 | 3 | 4;

export interface DividedGridItemData extends Omit<DividedGridItemProps, "id"> {
  /** Stable key. Default: the position. */
  id?: string | number;
}

export interface DividedGridProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** `DividedGridItem`s. Anything else is wrapped in a cell as it is. */
  children?: React.ReactNode;
  /** Data-driven alternative to `children`; both can be mixed (items first). */
  items?: DividedGridItemData[];
  /** Columns at the widest size: 1 → 2 → `columns` as the space grows. Default 3. */
  columns?: DividedGridColumns;
  /** What `columns` measures: the viewport (default) or the grid's own width (CSS container queries, cells stay at least about 200px wide), for grids beside a sidebar. */
  query?: "viewport" | "container";
  /** Show "01", "02" … in each cell. */
  numbered?: boolean;
  /** Router link renderer for cells with an `href`. */
  renderLink?: (props: DividedGridLinkProps) => React.ReactElement;
  /** Accessible name of the list. */
  label?: string;
  /** Shown instead of the cells when there are none (and nothing is loading). */
  emptyState?: React.ReactNode;
  /** Data is on its way: with no cells, placeholder cells stand in; with cells, the root is marked busy. */
  loading?: boolean;
  /** Placeholder cells shown while loading with no cells. Default: two rows. */
  loadingCells?: number;
}

const columnClasses: Record<"viewport" | "container", Record<DividedGridColumns, string>> = {
  viewport: {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  },
  container: {
    1: "grid-cols-1",
    2: "grid-cols-1 @md:grid-cols-2",
    3: "grid-cols-1 @md:grid-cols-2 @min-[40rem]:grid-cols-3",
    4: "grid-cols-1 @md:grid-cols-2 @min-[50rem]:grid-cols-4",
  },
};

const cellClass = "border-b border-e border-border";

function SkeletonCell() {
  return (
    <li aria-hidden className={cellClass}>
      <div className={cellBase}>
        <Skeleton className="size-10 rounded-md" />
        <span className="flex flex-col gap-2">
          <Skeleton shape="text" className="h-4" width="45%" />
          <Skeleton shape="text" lines={2} className="h-3" />
        </span>
      </div>
    </li>
  );
}

/**
 * One bordered, rounded box whose cells are separated by hairlines instead of being separate cards: a tool grid, a feature
 * list, a set of options. Works for any number of cells: the box clips the last column's and row's lines, so a short last row
 * leaves no stray divider.
 */
export const DividedGrid = React.forwardRef<HTMLDivElement, DividedGridProps>(
  (
    { children, items, columns = 3, query = "viewport", numbered = false, renderLink, label, emptyState, loading, loadingCells, className, ...props },
    ref
  ) => {
    const cells = [
      ...(items ?? []).map(({ id, ...item }, i) => <DividedGridItem key={id ?? `item-${i}`} {...item} />),
      ...React.Children.toArray(children),
    ];
    const skeleton = !!loading && cells.length === 0;
    const placeholderCount = Math.max(1, Math.floor(loadingCells ?? columns * 2));
    const listClass = cn("-me-px -mb-px grid list-none p-0", columnClasses[query][columns]);

    return (
      <div
        ref={ref}
        data-slot="divided-grid"
        aria-busy={loading || undefined}
        className={cn("overflow-hidden rounded-box border border-border bg-card text-card-foreground", query === "container" && "@container", className)}
        {...props}
      >
        {skeleton ? (
          <>
            <span className="sr-only">{`Loading ${label ?? "items"}…`}</span>
            <ul aria-hidden data-slot="divided-grid-skeleton" className={listClass}>
              {Array.from({ length: placeholderCount }, (_, i) => (
                <SkeletonCell key={i} />
              ))}
            </ul>
          </>
        ) : cells.length === 0 ? (
          <div data-slot="divided-grid-empty" className="px-5 py-10 text-center text-sm text-muted-foreground">
            {emptyState ?? "No items"}
          </div>
        ) : (
          <ul role="list" aria-label={label} className={listClass}>
            {cells.map((cell, index) => (
              <li key={React.isValidElement(cell) && cell.key != null ? cell.key : index} className={cellClass}>
                <CellContext.Provider value={{ index, numbered, renderLink }}>{cell}</CellContext.Provider>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);
DividedGrid.displayName = "DividedGrid";
