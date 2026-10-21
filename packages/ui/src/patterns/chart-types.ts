/** Chart data types and the shared cartesian chart props. */
import type * as React from "react";
import type { TimeInput } from "../lib/time";

/* ------------------------------------------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------------------------------------*/

export type ChartValue = number | string | Date | null | undefined;
export type ChartDatum = Record<string, ChartValue>;

export interface ChartSeries {
  key: string;
  label?: string;
  /** Token name (primary, success, warning, destructive, info, muted) or any CSS color. */
  color?: string;
  /** Area and line charts: bridge null values for this series. Overrides the chart's `connectNulls`. */
  connectNulls?: boolean;
}

/**
 * How the index axis places points. `"category"` (default) spaces them evenly by position in `data`;
 * `"time"` places them by time (the `index` field holds a Date, epoch ms or ISO string) and `"linear"` by
 * number, so unevenly spaced samples keep their real spacing. Bar charts always use categories.
 */
export type ChartXAxisType = "category" | "time" | "linear";

/** Options for the index (category / time) axis. */
export interface ChartXAxisOptions {
  hide?: boolean;
  /** Scale type. Default `"category"`. Ignored by `BarChart`, whose bars are categorical. */
  type?: ChartXAxisType;
  /**
   * Fixed axis range for `"time"` / `"linear"` (e.g. the last 24 h even when data starts later). Either end may be
   * `"auto"` to fit the data. Points outside are clipped and can't be hovered.
   */
  domain?: [TimeInput | "auto", TimeInput | "auto"];
  /**
   * Break the line between consecutive samples further apart than this (ms for `"time"`, axis units for
   * `"linear"`), so a period with no data shows as a gap instead of a straight line.
   */
  maxGap?: number;
  /** Approximate maximum number of tick labels. */
  tickCount?: number;
  /**
   * Label for a data point (tooltip, table, category ticks). On a `"time"` axis the value is passed as a `Date`;
   * generated time/linear tick labels are passed with `index` -1.
   */
  formatter?: (value: ChartValue, index: number) => string;
  /** Column header in the screen-reader table. Defaults to the `index` key. */
  label?: string;
  /** Gutter width in px when the axis is vertical (horizontal bar layout). */
  width?: number;
}

/** Options for the value axis. */
export interface ChartYAxisOptions {
  hide?: boolean;
  tickCount?: number;
  formatter?: (value: number) => string;
  /** Fixed lower bound, or "auto" to fit the data (default includes 0). */
  min?: number | "auto";
  /** Fixed upper bound (default fits the data, rounded to a nice tick). */
  max?: number | "auto";
  /** `[min, max]` in one prop, matching `xAxis.domain`. `min`/`max` win when both are given. */
  domain?: [number | "auto", number | "auto"];
  /** Gutter width in px when the axis is vertical. */
  width?: number;
}

/**
 * A threshold or target line. By default it is horizontal at a value (`axis: "y"`); with `axis: "x"` it is
 * vertical at an index value (a time or number), which needs a `"time"` or `"linear"` x axis.
 */
export type ChartReferenceLine = {
  label?: string;
  color?: string;
  /** Default true. */
  dashed?: boolean;
} & ({ axis?: "y"; value: number } | { axis: "x"; value: TimeInput });

export type ChartCurve = "linear" | "monotone" | "step";

/* ------------------------------------------------------------------------------------------------
 * Cartesian base
 * ----------------------------------------------------------------------------------------------*/

export interface CartesianChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** Rows to plot, one per index value. */
  data: ChartDatum[];
  /** Key of the x (category / time) value in each datum. */
  index: string;
  /** Series to draw: each has a `key` (the field in each row), a `label` and an optional colour. */
  series: ChartSeries[];
  /** BCP 47 locale for the default number and date formatting. Pass one explicitly when the server and the browser must agree (SSR). Defaults to the runtime locale. */
  locale?: string;
  /** Formats values in the tooltip and on the value axis. Receives the value and the series key. Default is the localized number. */
  valueFormatter?: (value: number, seriesKey: string) => string;
  /** Plot height in px (legend excluded). Default 240. */
  height?: number;
  /** Index axis options (drawn vertically in horizontal bar layout). */
  xAxis?: ChartXAxisOptions;
  /** Value axis options. */
  yAxis?: ChartYAxisOptions;
  /** Gridlines along value ticks ("horizontal"), category ticks ("vertical"), both, or none. Default horizontal. */
  grid?: boolean | "horizontal" | "vertical" | "both";
  /** Default: shown below for 2+ series. */
  legend?: boolean | "top" | "bottom";
  /** Allow toggling/isolating series from the legend. Default true. */
  legendInteractive?: boolean;
  /**
   * Shows a tooltip with every series at the hovered index.
   * @default true
   */
  tooltip?: boolean;
  /** CSS transitions on data changes (disabled under prefers-reduced-motion). Default true. */
  animate?: boolean;
  /** Content shown instead of the plot when there is no data. */
  emptyState?: React.ReactNode;
  /** Accessible name. Defaults to a description built from the series. */
  label?: string;
  /** Horizontal threshold / target lines. */
  referenceLines?: ChartReferenceLine[];
  /** Controlled list of hidden series keys (toggled from the legend). Use with `onHiddenSeriesChange`. */
  hiddenSeries?: string[];
  /** Initially hidden series keys when uncontrolled. */
  defaultHiddenSeries?: string[];
  /** Called with the hidden series keys when a legend entry is toggled. */
  onHiddenSeriesChange?: (hidden: string[]) => void;
  /** Called with the hovered index (or `null` when the pointer leaves); use it to sync other views. */
  onActiveIndexChange?: (index: number | null) => void;
  /** Data is on its way: with no data, a placeholder plot (and legend) of the same size; with data, the root is marked busy. */
  loading?: boolean;
}
