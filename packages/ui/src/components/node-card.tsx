import * as React from "react";
import {
  RiCpuLine,
  RiRefreshLine,
  RiServerLine,
  RiTimeLine,
  RiErrorWarningLine,
} from "@remixicon/react";
import { cn } from "../lib/cn";
import { pluralize } from "../lib/format";
import { toPercent } from "../lib/math";
import { Button } from "./button";
import { CopyButton } from "./copy-button";
import { toneClasses } from "../lib/tone";
import { Meter, meterLevel, meterLevelTone, type MeterThresholds } from "./meter";
import { Gauge } from "./gauge";
import { Sparkline, type SparklineColor } from "./sparkline";
import { StatusDot, type StatusBadgeStatus } from "./status-badge";

export type NodeStatus = "online" | "offline" | "connecting" | "error";

const nodeStatusDot: Record<NodeStatus, StatusBadgeStatus> = {
  online: "online",
  offline: "offline",
  connecting: "processing",
  error: "error",
};

const nodeStatusLabel: Record<NodeStatus, string> = {
  online: "Online",
  offline: "Offline",
  connecting: "Connecting",
  error: "Error",
};

const trim = (n: number) => (Math.abs(n) >= 100 || Number.isInteger(n) ? Math.round(n).toString() : n.toFixed(1));

/* ------------------------------------------------------------------ */
/* Metric tile                                                         */
/* ------------------------------------------------------------------ */

export interface NodeMetric {
  key?: string;
  label: string;
  /** Current value; `null` = no sample. */
  value: number | null;
  /** Default 100 (percent). For memory pass the total. */
  max?: number;
  unit?: string;
  /** Text next to the label, defaults to "42%" or "12.3 / 64 GB". */
  valueText?: React.ReactNode;
  thresholds?: MeterThresholds | false;
  icon?: React.ReactNode;
  caption?: React.ReactNode;
}

export interface NodeMetricTileProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">, Omit<NodeMetric, "key"> {}

/** Compact metric tile: label, value and a threshold-colored Meter. */
export const NodeMetricTile = React.forwardRef<HTMLDivElement, NodeMetricTileProps>(
  ({ className, label, value, max = 100, unit, valueText, thresholds, icon, caption, ...props }, ref) => {
    const pct = value == null ? 0 : toPercent(value, max);
    const level = value == null ? "ok" : meterLevel(pct, thresholds ?? undefined);
    const text =
      valueText ??
      (value == null ? "—" : max === 100 && !unit ? `${trim(value)}%` : `${trim(value)} / ${trim(max)}${unit ? ` ${unit}` : ""}`);
    return (
      <div ref={ref} className={cn("min-w-0 rounded-md border border-border bg-subtle p-2.5", className)} {...props}>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground [&_svg]:size-3">
            {icon}
            <span className="truncate">{label}</span>
          </span>
          <span
            className={cn(
              "font-mono text-xs font-semibold tabular-nums",
              level === "ok" ? "text-foreground" : toneClasses.text[meterLevelTone(level)!]
            )}
          >
            {text}
          </span>
        </div>
        <div
          role="meter"
          aria-label={label}
          aria-valuenow={value ?? 0}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuetext={value == null ? "No data" : typeof text === "string" ? text : `${Math.round(pct)}%`}
          className="relative h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <span
            className={cn(
              "block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
              toneClasses.dot[meterLevelTone(level) ?? "primary"]
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {caption ? <div className="mt-1 truncate text-2xs text-muted-foreground">{caption}</div> : null}
      </div>
    );
  }
);
NodeMetricTile.displayName = "NodeMetricTile";

/* ------------------------------------------------------------------ */
/* Mini chart                                                          */
/* ------------------------------------------------------------------ */

export interface NodeMiniChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "color"> {
  label: string;
  data: number[];
  value?: React.ReactNode;
  color?: SparklineColor;
  height?: number;
  min?: number;
  max?: number;
}

/** Compact labelled area sparkline for node history (CPU, network …). */
export const NodeMiniChart = React.forwardRef<HTMLDivElement, NodeMiniChartProps>(
  ({ className, label, data, value, color = "primary", height = 36, min = 0, max, ...props }, ref) => (
    <div ref={ref} className={cn("min-w-0 rounded-md border border-border bg-subtle px-2.5 pt-2", className)} {...props}>
      <div className="flex items-center justify-between text-2xs">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {value != null ? <span className="font-mono tabular-nums text-foreground">{value}</span> : null}
      </div>
      <Sparkline data={data} type="area" responsive height={height} color={color} min={min} max={max} label={`${label} history`} highlightLast />
    </div>
  )
);
NodeMiniChart.displayName = "NodeMiniChart";

/* ------------------------------------------------------------------ */
/* NodeCard                                                            */
/* ------------------------------------------------------------------ */

export interface NodeMemory {
  used: number;
  total: number;
}

export interface NodeCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  name: React.ReactNode;
  /** Hostname / IP / role line under the name. */
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Badges next to the name (e.g. "Priority"). */
  badges?: React.ReactNode;
  status: NodeStatus;
  statusLabel?: string;
  uptime?: React.ReactNode;
  /** CPU percent. */
  cpu?: number | null;
  /** RAM in GB (`{used,total}`) or percent. */
  ram?: NodeMemory | number | null;
  /** GPU utilization percent (average). */
  gpu?: number | null;
  /** VRAM in GB. */
  vram?: NodeMemory | null;
  /** Node has no GPU: GPU tiles are replaced with a "No GPU" note. */
  noGpu?: boolean;
  /** Custom metric tiles (replaces cpu/ram/gpu/vram). */
  metrics?: NodeMetric[];
  thresholds?: MeterThresholds;
  /** Mini chart slot (e.g. `<NodeMiniChart/>`). */
  chart?: React.ReactNode;
  /** Core grid slot (e.g. `<HeatmapGrid shape="bar"/>`). */
  coreGrid?: React.ReactNode;
  /** Footer actions. */
  footer?: React.ReactNode;
  /** Error message (status="error"). */
  error?: React.ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  headingAs?: "h2" | "h3" | "h4" | "div";
}

/** Server / node status card: identity, status dot, uptime, metric tiles, chart, core grid and actions. */
export const NodeCard = React.forwardRef<HTMLDivElement, NodeCardProps>(
  (
    {
      className,
      name,
      description,
      icon,
      badges,
      status,
      statusLabel,
      uptime,
      cpu,
      ram,
      gpu,
      vram,
      noGpu,
      metrics: metricsProp,
      thresholds,
      chart,
      coreGrid,
      footer,
      error,
      onRetry,
      retrying,
      headingAs: HeadingTag = "h3",
      ...props
    },
    ref
  ) => {
    const headingId = React.useId();
    const metrics: NodeMetric[] =
      metricsProp ??
      [
        cpu !== undefined ? { key: "cpu", label: "CPU", value: cpu, icon: <RiCpuLine aria-hidden /> } : null,
        ram !== undefined
          ? typeof ram === "number" || ram === null
            ? { key: "ram", label: "RAM", value: ram }
            : { key: "ram", label: "RAM", value: ram.used, max: ram.total, unit: "GB" }
          : null,
        !noGpu && gpu !== undefined ? { key: "gpu", label: "GPU", value: gpu } : null,
        !noGpu && vram !== undefined
          ? vram === null
            ? { key: "vram", label: "VRAM", value: null }
            : { key: "vram", label: "VRAM", value: vram.used, max: vram.total, unit: "GB" }
          : null,
      ].filter((m): m is NonNullable<typeof m> => m !== null);

    const connecting = status === "connecting";
    const offline = status === "offline";
    const label = statusLabel ?? nodeStatusLabel[status];

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={headingId}
        aria-busy={connecting || undefined}
        data-status={status}
        className={cn(
          "flex min-w-0 flex-col overflow-hidden rounded-box border border-border bg-card text-card-foreground shadow-xs",
          status === "error" && "border-destructive/40",
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-3 p-4 pb-3">
          <div
            aria-hidden
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-5",
              toneClasses.soft[status === "online" ? "primary" : "neutral"]
            )}
          >
            {icon ?? <RiServerLine aria-hidden />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <HeadingTag id={headingId} className="truncate text-sm font-semibold text-foreground">
                {name}
              </HeadingTag>
              {badges}
            </div>
            {description ? <div className="truncate font-mono text-xs text-muted-foreground">{description}</div> : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
              <StatusDot status={nodeStatusDot[status]} pulse={connecting || status === "online"} label="" />
              <span data-node-status="">{label}</span>
            </span>
            {uptime && !connecting ? (
              <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
                <RiTimeLine aria-hidden className="size-3" />
                <span className="sr-only">Uptime</span>
                {uptime}
              </span>
            ) : null}
          </div>
        </div>

        {status === "error" ? (
          <div role="alert" className="mx-4 mb-4 flex items-start gap-2 rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground">
            <RiErrorWarningLine aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Can't reach this node</p>
              {error ? <p className="mt-0.5 text-xs opacity-90">{error}</p> : null}
            </div>
            {onRetry ? (
              <Button size="xs" variant="outline" onClick={onRetry} loading={retrying} leadingIcon={<RiRefreshLine aria-hidden />}>
                Retry
              </Button>
            ) : null}
          </div>
        ) : connecting ? (
          <div className="grid grid-cols-2 gap-2 px-4 pb-4" data-node-skeleton="">
            <span className="sr-only">Connecting to node…</span>
            {Array.from({ length: Math.max(metrics.length, 4) }, (_, i) => (
              <div key={i} aria-hidden className="h-[58px] animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : (
          <div className={cn("flex flex-col gap-3 px-4 pb-4", offline && "opacity-60")}>
            {metrics.length || noGpu ? (
              <div className="grid grid-cols-2 gap-2">
                {metrics.map(({ key, ...m }) => (
                  <NodeMetricTile key={key ?? m.label} {...m} thresholds={m.thresholds ?? thresholds} />
                ))}
                {noGpu ? (
                  <div className="col-span-2 flex items-center justify-center rounded-md border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground">
                    No GPU on this node
                  </div>
                ) : null}
              </div>
            ) : null}
            {chart}
            {coreGrid ? <div className="rounded-md border border-border bg-subtle p-2.5">{coreGrid}</div> : null}
          </div>
        )}

        {footer ? (
          <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-border bg-subtle px-4 py-2.5">{footer}</div>
        ) : null}
      </div>
    );
  }
);
NodeCard.displayName = "NodeCard";

export interface NodeGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Minimum card width in px before wrapping. Default 300. */
  minCardWidth?: number;
  gap?: "sm" | "md" | "lg";
}

/** Responsive auto-fill grid for node / GPU cards. */
export const NodeGrid = React.forwardRef<HTMLDivElement, NodeGridProps>(
  ({ className, minCardWidth = 300, gap = "md", style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("grid", gap === "sm" ? "gap-2" : gap === "lg" ? "gap-6" : "gap-4", className)}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minCardWidth}px), 1fr))`, ...style }}
      {...props}
    />
  )
);
NodeGrid.displayName = "NodeGrid";

/* ------------------------------------------------------------------ */
/* GpuCard                                                             */
/* ------------------------------------------------------------------ */

export interface GpuCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  index: number;
  model?: React.ReactNode;
  /** VRAM used, GB. */
  memoryUsed: number;
  /** VRAM total, GB. */
  memoryTotal: number;
  /** Utilization percent. */
  utilization?: number | null;
  /** Temperature °C. */
  temperature?: number | null;
  /** Running processes on this GPU. */
  processes?: number;
  /** Power draw W. */
  power?: number | null;
  powerLimit?: number;
  /** Temperature thresholds in °C. Default warn 75, danger 85. */
  temperatureThresholds?: { warn: number; danger: number };
  footer?: React.ReactNode;
}

/** One GPU: model, VRAM bar, utilization, temperature gauge and process count. */
export const GpuCard = React.forwardRef<HTMLDivElement, GpuCardProps>(
  (
    {
      className,
      index,
      model,
      memoryUsed,
      memoryTotal,
      utilization,
      temperature,
      processes,
      power,
      powerLimit,
      temperatureThresholds = { warn: 75, danger: 85 },
      footer,
      ...props
    },
    ref
  ) => {
    const headingId = React.useId();
    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={headingId}
        className={cn("flex min-w-0 flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs", className)}
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div id={headingId} className="text-sm font-semibold text-foreground">
              GPU {index}
            </div>
            {model ? <div className="truncate text-xs text-muted-foreground">{model}</div> : null}
          </div>
          <Gauge
            value={temperature ?? null}
            max={100}
            unit="°C"
            size="sm"
            label="Temp"
            valueFormatter={(v) => `${Math.round(v)}`}
            thresholds={{ warn: temperatureThresholds.warn, danger: temperatureThresholds.danger }}
            ariaValueText={temperature == null ? "No temperature reading" : `${Math.round(temperature)} °C`}
          />
        </div>
        <Meter
          label="VRAM"
          value={memoryUsed}
          max={memoryTotal}
          size="sm"
          valueText={(v, max) => `${trim(v)} / ${trim(max)} GB`}
        />
        <Meter label="Utilization" value={utilization ?? null} size="sm" thresholds={false} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {processes != null ? (
            <span data-gpu-processes="">
              <span className="font-mono font-medium text-foreground tabular-nums">{processes}</span> {pluralize(processes, "process", "processes")}
            </span>
          ) : null}
          {power != null ? (
            <span>
              <span className="font-mono font-medium text-foreground tabular-nums">{Math.round(power)}</span>
              {powerLimit ? ` / ${powerLimit}` : ""} W
            </span>
          ) : null}
        </div>
        {footer}
      </div>
    );
  }
);
GpuCard.displayName = "GpuCard";

/* ------------------------------------------------------------------ */
/* ResourceHero                                                        */
/* ------------------------------------------------------------------ */

export interface ResourceHeroChip {
  label: string;
  value: React.ReactNode;
}

export interface ResourceHeroProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  name: React.ReactNode;
  icon?: React.ReactNode;
  status?: NodeStatus;
  statusLabel?: string;
  /** Endpoint URL with a copy button. */
  endpoint?: string;
  uptime?: React.ReactNode;
  /** "N of M ready" counter. */
  ready?: { ready: number; total: number; noun?: string };
  /** Config chips (key → value). */
  chips?: ResourceHeroChip[];
  actions?: React.ReactNode;
  description?: React.ReactNode;
}

/** Endpoint / service header: name, status, copyable endpoint, uptime, readiness and config chips. */
export const ResourceHero = React.forwardRef<HTMLDivElement, ResourceHeroProps>(
  (
    { className, name, icon, status = "online", statusLabel, endpoint, uptime, ready, chips, actions, description, ...props },
    ref
  ) => {
    const allReady = ready ? ready.ready >= ready.total : true;
    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-4 rounded-box border border-border bg-card p-5 shadow-xs sm:p-6", className)}
        {...props}
      >
        <div className="flex flex-wrap items-start gap-4">
          {icon ? (
            <div aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground [&_svg]:size-6">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{name}</h2>
              <span className="inline-flex items-center gap-1.5 rounded-control bg-muted px-2 py-0.5 text-xs font-medium">
                <StatusDot status={nodeStatusDot[status]} pulse={status !== "offline"} label="" />
                {statusLabel ?? nodeStatusLabel[status]}
              </span>
            </div>
            {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
            {endpoint ? (
              <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded-control border border-border bg-subtle py-0.5 pl-2.5 pr-0.5">
                <code className="truncate font-mono text-xs text-foreground">{endpoint}</code>
                <CopyButton value={endpoint} size="xs" label="Copy endpoint" copiedLabel="Endpoint copied" className="rounded-control" />
              </div>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {uptime || ready || chips?.length ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-sm">
            {uptime ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground">Uptime</span>
                <span className="font-mono font-medium tabular-nums">{uptime}</span>
              </div>
            ) : null}
            {ready ? (
              <div className="flex items-baseline gap-1.5" data-ready="">
                <span className={cn("font-mono font-semibold tabular-nums", allReady ? "text-success" : "text-warning-soft-foreground")}>
                  {ready.ready} of {ready.total}
                </span>
                <span className="text-xs text-muted-foreground">{ready.noun ?? "ready"}</span>
              </div>
            ) : null}
            {chips?.length ? (
              <ul className="flex flex-wrap gap-1.5" aria-label="Configuration">
                {chips.map((c) => (
                  <li key={c.label} className="inline-flex items-center gap-1 rounded-control border border-border bg-subtle px-2 py-0.5 text-xs">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="font-mono font-medium text-foreground">{c.value}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }
);
ResourceHero.displayName = "ResourceHero";
