/** Chart chrome: the responsive ChartContainer, ChartTooltip and ChartLegend. */
import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { useElementWidth } from "../hooks/use-resize-observer";
import { useMergedRefs } from "../hooks/use-merged-refs";

function useChartWidth(ref: React.RefObject<HTMLElement | null>, fallback: number) {
  const measured = Math.round(useElementWidth(ref));
  return measured > 0 ? measured : fallback;
}

/* ------------------------------------------------------------------------------------------------
 * ChartContainer
 * ----------------------------------------------------------------------------------------------*/

export interface ChartSize {
  width: number;
  height: number;
}

export interface ChartTableData {
  columns: string[];
  rows: React.ReactNode[][];
}

export interface ChartContainerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Accessible name announced for the chart image. */
  label: string;
  height?: number;
  /** Width used before the container is measured (and in jsdom). */
  defaultWidth?: number;
  /** Rendered as a visually hidden `<table>` after the chart for screen readers. */
  table?: ChartTableData;
  children: React.ReactNode | ((size: ChartSize) => React.ReactNode);
}

/** Responsive chart frame: measures its width, exposes `role="img"` and a screen-reader data table. */
export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ label, height = 240, defaultWidth = 600, table, children, className, style, ...props }, ref) => {
    const innerRef = React.useRef<HTMLDivElement>(null);
    const width = useChartWidth(innerRef, defaultWidth);
    const mergedRef = useMergedRefs(ref, innerRef);
    return (
      <>
        <div
          ref={mergedRef}
          role="img"
          aria-label={label}
          data-slot="chart"
          dir="ltr"
          className={cn("relative w-full select-none", className)}
          style={{ height, ...style }}
          {...props}
        >
          {typeof children === "function" ? children({ width, height }) : children}
        </div>
        {table ? (
          // The wrapper clips the table: a bare absolutely positioned `<table class="sr-only">` keeps its content width and widens the page.
          <div className="sr-only">
            <table>
              <caption>{label}</caption>
              <thead>
                <tr>
                  {table.columns.map((c, i) => (
                    <th key={i} scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) =>
                      j === 0 ? (
                        <th key={j} scope="row">
                          {cell}
                        </th>
                      ) : (
                        <td key={j}>{cell}</td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </>
    );
  }
);
ChartContainer.displayName = "ChartContainer";

/* ------------------------------------------------------------------------------------------------
 * ChartTooltip
 * ----------------------------------------------------------------------------------------------*/

export interface ChartTooltipItem {
  key: string;
  label: React.ReactNode;
  color: string;
  value: React.ReactNode;
}

export interface ChartTooltipProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  items: ChartTooltipItem[];
  footer?: React.ReactNode;
}

/** Floating readout card listing series values at one position. Absolutely positioned, no portal. */
export const ChartTooltip = React.forwardRef<HTMLDivElement, ChartTooltipProps>(
  ({ label, items, footer, className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="chart-tooltip"
      className={cn(
        "pointer-events-none absolute z-10 min-w-36 rounded-box border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg",
        className
      )}
      {...props}
    >
      {label !== undefined && label !== "" ? (
        <div className="mb-1.5 font-medium text-muted-foreground">{label}</div>
      ) : null}
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-mono font-semibold tabular-nums text-foreground">{item.value}</span>
            <span className="ms-auto ps-3 text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
      {footer ? <div className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">{footer}</div> : null}
    </div>
  )
);
ChartTooltip.displayName = "ChartTooltip";

/* ------------------------------------------------------------------------------------------------
 * ChartLegend
 * ----------------------------------------------------------------------------------------------*/

export interface ChartLegendItem {
  key: string;
  label: React.ReactNode;
  color: string;
}

export interface ChartLegendProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "hidden"> {
  items: ChartLegendItem[];
  /** Keys currently hidden. */
  hidden?: string[];
  /** Makes entries toggle buttons. Alt/⌥-click, Alt+Enter or double-click isolates a series. */
  onHiddenChange?: (hidden: string[]) => void;
  align?: "start" | "center" | "end";
  /** Swatch shape: "square" for bars/areas, "line" for line charts. */
  marker?: "square" | "line" | "dot";
}

/** Series legend; interactive entries toggle and isolate series. */
export const ChartLegend = React.forwardRef<HTMLDivElement, ChartLegendProps>(
  ({ items, hidden = [], onHiddenChange, align = "start", marker = "square", className, ...props }, ref) => {
    const prevHidden = React.useRef<string[]>(hidden);
    const interactive = !!onHiddenChange;

    const isolate = (key: string, from: string[]) => {
      const others = items.map((i) => i.key).filter((k) => k !== key);
      const alreadyIsolated = !from.includes(key) && others.every((k) => from.includes(k));
      onHiddenChange?.(alreadyIsolated ? [] : others);
    };
    const toggle = (key: string) =>
      onHiddenChange?.(hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key]);

    const swatch = (color: string, off: boolean) => (
      <span
        aria-hidden
        className={cn(
          "shrink-0 border-2",
          marker === "line" ? "h-0.5 w-3 rounded-full border-0" : marker === "dot" ? "size-2.5 rounded-full" : "size-2.5 rounded-[3px]"
        )}
        style={{
          borderColor: color,
          backgroundColor: off ? "transparent" : color,
          ...(marker === "line" && off ? { opacity: 0.4 } : null),
        }}
      />
    );

    return (
      <div
        ref={ref}
        role={interactive ? "group" : "list"}
        aria-label={interactive ? "Toggle series" : "Legend"}
        data-slot="chart-legend"
        className={cn(
          "flex flex-wrap items-center gap-x-1 gap-y-1 text-xs",
          align === "center" ? "justify-center" : align === "end" ? "justify-end" : "justify-start",
          className
        )}
        {...props}
      >
        {items.map((item) =>
          interactive ? (
            <button
              key={item.key}
              type="button"
              aria-pressed={!hidden.includes(item.key)}
              title="Click to toggle · Alt-click or double-click to isolate"
              onClick={(e) => {
                if (e.altKey) return isolate(item.key, hidden);
                if (e.detail === 2) return isolate(item.key, prevHidden.current);
                prevHidden.current = hidden;
                toggle(item.key);
              }}
              onKeyDown={(e) => {
                if (e.altKey && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  isolate(item.key, hidden);
                }
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                focusRing,
                hidden.includes(item.key) && "text-muted-foreground/60 line-through decoration-muted-foreground/40"
              )}
            >
              {swatch(item.color, hidden.includes(item.key))}
              {item.label}
            </button>
          ) : (
            <span key={item.key} role="listitem" className="inline-flex items-center gap-1.5 px-2 py-1 text-muted-foreground">
              {swatch(item.color, false)}
              {item.label}
            </span>
          )
        )}
      </div>
    );
  }
);
ChartLegend.displayName = "ChartLegend";
