import * as React from "react";
import { cn } from "../../lib/cn";
import { StackedMeter } from "../../primitives/meter";
import { SegmentedControl } from "../../primitives/segmented-control";
import { StatCard, StatGroup } from "../../patterns/stat-card";
import { BarChart } from "../../patterns/chart-cartesian";
import { useControllableState } from "../../hooks/use-controllable-state";
import { formatDuration } from "../../lib/duration";
import { formatTokenCount } from "../../lib/token-count";

/* ------------------------------------------------------------------ */
/* UsageSummary                                                        */
/* ------------------------------------------------------------------ */

export interface UsageDay {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  requests: number;
  tokens?: number;
  /** Total queue/warm-up wait in ms. */
  waitMs?: number;
  /** Total generation time in ms. */
  generateMs?: number;
  /** Requests per model id. */
  models?: Record<string, number>;
  /** Count per finish reason (stop, length, error, cancelled…). */
  finishReasons?: Record<string, number>;
}

export type UsageRange = "7" | "30" | "90";

export interface UsageSummaryProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Daily records, oldest first. */
  days: UsageDay[];
  range?: UsageRange;
  defaultRange?: UsageRange;
  onRangeChange?: (range: UsageRange) => void;
}

/** Latency: "850ms", "1.5s", "2.3m", "1.2h". */
const formatLatency = (ms: number) => formatDuration(ms, { style: "decimal", ms: true, maxUnit: "h" });

const finishLabels: Record<string, string> = { stop: "Completed", length: "Hit length limit", error: "Errored", cancelled: "Canceled", canceled: "Canceled", tool_calls: "Tool calls" };

/** Usage dashboard: range switch, KPI tiles, daily bars, per-model bars, wait vs generate and finish reasons. */
export const UsageSummary = React.forwardRef<HTMLDivElement, UsageSummaryProps>(
  ({ days, range: rangeProp, defaultRange = "7", onRangeChange, className, ...props }, ref) => {
    const uid = React.useId();
    const [range, setRange] = useControllableState<UsageRange>({ value: rangeProp, defaultValue: defaultRange, onChange: onRangeChange });
    const slice = days.slice(-Number(range));
    const totals = slice.reduce(
      (a, d) => {
        a.requests += d.requests;
        a.tokens += d.tokens ?? 0;
        a.wait += d.waitMs ?? 0;
        a.gen += d.generateMs ?? 0;
        for (const [k, v] of Object.entries(d.models ?? {})) a.models[k] = (a.models[k] ?? 0) + v;
        for (const [k, v] of Object.entries(d.finishReasons ?? {})) a.finish[k] = (a.finish[k] ?? 0) + v;
        return a;
      },
      { requests: 0, tokens: 0, wait: 0, gen: 0, models: {} as Record<string, number>, finish: {} as Record<string, number> }
    );
    const avgLatency = totals.requests ? (totals.wait + totals.gen) / totals.requests : 0;
    const perModel = Object.entries(totals.models).sort((a, b) => b[1] - a[1]);
    const modelMax = perModel[0]?.[1] ?? 0;
    const finishTotal = Object.values(totals.finish).reduce((a, b) => a + b, 0);
    const chartData = slice.map((d) => ({ day: d.date.slice(5), requests: d.requests }));

    return (
      <div ref={ref} data-range={range} className={cn("space-y-5", className)} {...props}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">Usage</p>
          <SegmentedControl
            className="max-w-full overflow-x-auto scrollbar-none"
            aria-label="Time range"
            size="sm"
            value={range}
            onValueChange={(v) => v && setRange(v as UsageRange)}
            options={[
              { value: "7", label: "7 days" },
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
            ]}
          />
        </div>
        <StatGroup columns={4}>
          <StatCard size="sm" label="Requests" value={totals.requests.toLocaleString("en-US")} data-stat="requests" />
          <StatCard size="sm" label="Tokens" value={formatTokenCount(totals.tokens)} data-stat="tokens" />
          <StatCard size="sm" label="Avg latency" value={formatLatency(avgLatency)} data-stat="latency" />
          <StatCard size="sm" label="Active days" value={String(slice.filter((d) => d.requests > 0).length)} data-stat="days" />
        </StatGroup>
        <section aria-label="Requests per day">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Requests per day</p>
          <BarChart data={chartData} index="day" series={[{ key: "requests", label: "Requests", color: "primary" }]} height={160} label="Requests per day" legend={false} />
        </section>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <section aria-labelledby={`${uid}-models`} className="space-y-2">
            <p id={`${uid}-models`} className="text-xs font-medium text-muted-foreground">
              By model
            </p>
            <ul className="space-y-2">
              {perModel.map(([name, n]) => (
                <li key={name} className="space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate text-foreground">{name}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">{n.toLocaleString("en-US")}</span>
                  </div>
                  <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${modelMax ? (n / modelMax) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
              {perModel.length === 0 ? <li className="text-sm text-muted-foreground">No requests in this range</li> : null}
            </ul>
          </section>
          <section className="space-y-4">
            <StackedMeter
              label="Wait vs. generate"
              valueText={formatLatency(totals.wait + totals.gen)}
              valueFormatter={formatLatency}
              showPercent
              parts={[
                { label: "Waiting", value: totals.wait, color: "warning" },
                { label: "Generating", value: totals.gen, color: "primary" },
              ]}
            />
            <div>
              <p id={`${uid}-finish`} className="mb-1.5 text-xs font-medium text-muted-foreground">
                Finish reasons
              </p>
              <ul aria-labelledby={`${uid}-finish`} className="divide-y divide-border rounded-box border border-border text-sm">
                {Object.entries(totals.finish)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between gap-2 px-3 py-1.5">
                      <span className="text-foreground">{finishLabels[k] ?? k}</span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {v} · {finishTotal ? Math.round((v / finishTotal) * 100) : 0}%
                      </span>
                    </li>
                  ))}
                {finishTotal === 0 ? <li className="px-3 py-1.5 text-muted-foreground">—</li> : null}
              </ul>
            </div>
          </section>
        </div>
      </div>
    );
  }
);
UsageSummary.displayName = "UsageSummary";
