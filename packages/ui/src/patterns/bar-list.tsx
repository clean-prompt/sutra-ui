import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { clamp } from "../lib/math";
import { accentClasses, accentStyle, type Accent } from "../lib/accent";
import { useControllableState } from "../hooks/use-controllable-state";

export interface BarListItem {
  id: string | number;
  name: React.ReactNode;
  /** Second line under the name ("96 processes"). */
  description?: React.ReactNode;
  /** Leading icon or logo (decorative: the name labels the row). */
  icon?: React.ReactNode;
  value: number;
  /** Text shown for the value; defaults to `valueFormatter(value)`. */
  valueLabel?: React.ReactNode;
  /** Makes the row a link. */
  href?: string;
  /** Makes the row a button (when there is no `href`). */
  onClick?: (item: BarListItem, event: React.MouseEvent<HTMLElement>) => void;
}

export interface BarListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  items: BarListItem[];
  /** Value of a full bar. Default: the largest value. */
  max?: number;
  valueFormatter?: (value: number) => React.ReactNode;
  /** Bar colour. Default primary. */
  accent?: Accent;
  /** Column headers above the list ("App" / "CPU"). */
  header?: { label?: React.ReactNode; value?: React.ReactNode };
  /** Subtle background on the first row (the leader). */
  highlightFirst?: boolean;
  /** "desc" ranks by value (default); "none" keeps the given order. */
  sort?: "desc" | "none";
  /** Show only the first `limit` rows until expanded. */
  limit?: number;
  /** Show a "Show all" / "Show less" toggle when rows are hidden. Default true. */
  showAllToggle?: boolean;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Toggle text; receives the number of rows in total. */
  showAllLabel?: (total: number) => React.ReactNode;
  showLessLabel?: React.ReactNode;
  /** Accessible name of the list. */
  label?: string;
  emptyState?: React.ReactNode;
}

const defaultFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const defaultValueFormatter = (v: number) => defaultFormat.format(v);

/** Ranked rows with a proportional bar under each value: top apps by CPU, pages by views, … */
export const BarList = React.forwardRef<HTMLDivElement, BarListProps>(
  (
    {
      items,
      max: maxProp,
      valueFormatter = defaultValueFormatter,
      accent,
      header,
      highlightFirst,
      sort = "desc",
      limit,
      showAllToggle = true,
      expanded: expandedProp,
      defaultExpanded = false,
      onExpandedChange,
      showAllLabel = (total) => `Show all (${total})`,
      showLessLabel = "Show less",
      label,
      emptyState,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const listId = React.useId();
    const [expanded, setExpanded] = useControllableState({
      value: expandedProp,
      defaultValue: defaultExpanded,
      onChange: onExpandedChange,
    });
    const sorted = React.useMemo(
      () => (sort === "desc" ? items.map((item, i) => ({ item, i })).sort((a, b) => b.item.value - a.item.value || a.i - b.i).map((x) => x.item) : items),
      [items, sort]
    );
    const largest = sorted.reduce((m, it) => (Number.isFinite(it.value) ? Math.max(m, it.value) : m), 0);
    const max = maxProp ?? largest;
    const hasMore = limit !== undefined && limit >= 0 && sorted.length > limit;
    const visible = hasMore && !expanded ? sorted.slice(0, limit) : sorted;

    return (
      <div ref={ref} data-slot="bar-list" style={accentStyle(accent, style)} className={cn("flex flex-col gap-1 text-sm", className)} {...props}>
        {header && (header.label || header.value) ? (
          <div data-slot="bar-list-header" className="flex items-center justify-between gap-4 px-3 pb-1 text-xs font-medium text-muted-foreground">
            <span>{header.label}</span>
            <span>{header.value}</span>
          </div>
        ) : null}
        {sorted.length === 0 ? (
          <div data-slot="bar-list-empty" className="px-3 py-6 text-center text-muted-foreground">
            {emptyState ?? "No data"}
          </div>
        ) : (
          <ul id={listId} role="list" aria-label={label} className="m-0 flex list-none flex-col gap-0.5 p-0">
            {visible.map((item, i) => {
              const pct = max > 0 && Number.isFinite(item.value) ? clamp((item.value / max) * 100, 0, 100) : 0;
              const rowClass = cn(
                "flex w-full items-center gap-3 rounded-box px-3 py-2.5 text-left",
                highlightFirst && i === 0 && "bg-muted/60",
                (item.href !== undefined || item.onClick) && cn("transition-colors hover:bg-muted", focusRing)
              );
              const content = (
                <>
                  {item.icon ? (
                    <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center [&_img]:size-8 [&_svg]:size-5">
                      {item.icon}
                    </span>
                  ) : null}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium text-foreground">{item.name}</span>
                    {item.description ? <span className="truncate text-xs text-muted-foreground">{item.description}</span> : null}
                  </span>
                  <span className="flex w-28 shrink-0 flex-col items-end gap-1.5 sm:w-44 lg:w-64">
                    <span data-slot="bar-list-value" className="font-semibold tabular-nums text-foreground">
                      {item.valueLabel ?? valueFormatter(item.value)}
                    </span>
                    <span aria-hidden data-slot="bar-list-track" className={cn("block h-1 w-full overflow-hidden rounded-full", accentClasses.track)}>
                      <span
                        data-slot="bar-list-bar"
                        className={cn("block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none", accentClasses.solid)}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  </span>
                </>
              );
              return (
                <li key={item.id} data-slot="bar-list-item" data-highlighted={(highlightFirst && i === 0) || undefined}>
                  {item.href !== undefined ? (
                    <a href={item.href} onClick={item.onClick ? (e) => item.onClick!(item, e) : undefined} className={rowClass}>
                      {content}
                    </a>
                  ) : item.onClick ? (
                    <button type="button" onClick={(e) => item.onClick!(item, e)} className={rowClass}>
                      {content}
                    </button>
                  ) : (
                    <div className={rowClass}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {hasMore && showAllToggle ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded(!expanded)}
            className={cn("self-start rounded-control px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground", focusRing)}
          >
            {expanded ? showLessLabel : showAllLabel(sorted.length)}
          </button>
        ) : null}
      </div>
    );
  }
);
BarList.displayName = "BarList";
