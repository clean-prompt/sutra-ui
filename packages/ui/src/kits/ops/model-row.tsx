import * as React from "react";
import { RiDownload2Line, RiPushpin2Fill, RiCheckLine, RiCloseLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { type Tone } from "../../lib/tone";
import { useControllableState } from "../../hooks/use-controllable-state";
import { formatDuration } from "../../lib/duration";
import { clamp } from "../../lib/math";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { Progress } from "../../primitives/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, type TableSortDirection } from "../../primitives/table";
import { ModelStatePill, modelStateRank, normalizeModelState, type ModelState, type ModelStateInput } from "../ai/model-state";

export { ModelStatePill, type ModelState, type ModelStatePillProps } from "../ai/model-state";

/* ------------------------------------------------------------------ */
/* DownloadBadge                                                       */
/* ------------------------------------------------------------------ */

export type DownloadStatus = "downloading" | "cached" | "partial" | "failed" | "missing";

export interface DownloadBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children" | "color"> {
  status: DownloadStatus;
  /** 0–100 for downloading / partial. */
  progress?: number;
  /** Size text, e.g. "54 GB". */
  size?: string;
}

const downloadTone: Record<DownloadStatus, Tone> = {
  cached: "success",
  downloading: "info",
  partial: "warning",
  failed: "destructive",
  missing: "neutral",
};

/** Weights cache state on `Badge`: downloading 42% (with bar), cached, partial, failed, not downloaded. */
export const DownloadBadge = React.forwardRef<HTMLSpanElement, DownloadBadgeProps>(
  ({ className, status, progress, size, ...props }, ref) => {
    const pct = Math.round(clamp(progress ?? 0, 0, 100));
    const label =
      status === "downloading"
        ? `Downloading ${pct}%`
        : status === "cached"
          ? "Cached"
          : status === "partial"
            ? `Partial${progress != null ? ` ${pct}%` : ""}`
            : status === "failed"
              ? "Download failed"
              : "Not downloaded";
    const icon =
      status === "cached" ? <RiCheckLine aria-hidden /> : status === "failed" ? <RiCloseLine aria-hidden /> : status === "downloading" ? <RiDownload2Line aria-hidden /> : null;
    const bar = status === "downloading" || (status === "partial" && progress != null);
    return (
      <Badge
        ref={ref}
        size="sm"
        data-status={status}
        variant={status === "missing" ? "outline" : "soft"}
        tone={downloadTone[status]}
        className={cn("gap-1.5", status === "missing" && "border-dashed border-border-strong text-muted-foreground", className)}
        leadingIcon={icon}
        trailingIcon={
          bar || size ? (
            <>
              {bar ? (
                <Progress
                  value={pct}
                  size="xs"
                  aria-label="Download progress"
                  className="w-10 bg-current/20"
                  indicatorClassName="bg-current"
                />
              ) : null}
              {size ? <span className="font-normal opacity-75">{size}</span> : null}
            </>
          ) : undefined
        }
        {...props}
      >
        <span className="tabular-nums">{label}</span>
      </Badge>
    );
  }
);
DownloadBadge.displayName = "DownloadBadge";


/* ------------------------------------------------------------------ */
/* ModelRow / ModelTable                                               */
/* ------------------------------------------------------------------ */

export type ModelAction = "download" | "cancel" | "start" | "stop" | "sleep" | "wake" | "pin" | "unpin" | "test";

export interface ModelTestResult {
  ok: boolean;
  running?: boolean;
  latencyMs?: number;
  tokensPerSecond?: number;
  reply?: string;
  error?: string;
}

export interface ModelInfo {
  name: string;
  /** Group heading; defaults to the name prefix ("qwen3.6-27b" → "qwen3.6"). */
  family?: string;
  /** Lifecycle state; the legacy `"loading"` is accepted as `"starting"`. */
  state: ModelStateInput;
  download?: { status: DownloadStatus; progress?: number; size?: string };
  /** Parameter / quant / context summary, e.g. "27B · FP8 · 32k ctx". */
  info?: string;
  /** GPU indices the model runs on. */
  gpus?: number[];
  /** VRAM in GB (in use when serving, footprint otherwise). */
  vram?: number;
  coldStartMs?: number;
  wakeMs?: number;
  /** Doesn't fit current free VRAM: true or a reason. */
  blocked?: boolean | string;
  pinned?: boolean;
  /** Idle seconds (shown next to state). */
  idleSeconds?: number;
  /** Failure message. */
  error?: string;
}

/** `qwen3.6-27b-fp8` → `qwen3.6`, `gpt-oss-120b` → `gpt-oss`. */
export function modelFamily(name: string): string {
  const brand = (name.match(/^[a-z-]+/i)?.[0] || name).replace(/-$/, "");
  const version = name.slice(brand.length).match(/^(\d+(?:\.\d+)?)/)?.[1];
  return version ? `${brand}${version}` : brand;
}

/** Actions available for a model in its current state. */
export function modelActionsFor(model: Pick<ModelInfo, "state" | "download" | "pinned">): ModelAction[] {
  const cached = !model.download || model.download.status === "cached";
  const pin: ModelAction = model.pinned ? "unpin" : "pin";
  switch (normalizeModelState(model.state)) {
    case "downloading":
      return ["cancel"];
    case "starting":
      return ["stop"];
    case "ready":
      return ["test", "sleep", "stop", pin];
    case "sleeping":
      return ["wake", "stop", pin];
    case "failed":
      return cached ? ["start", pin] : ["download"];
    case "stopped":
      return cached ? ["start", pin] : ["download"];
  }
}

const actionLabel: Record<ModelAction, string> = {
  download: "Download",
  cancel: "Cancel",
  start: "Start",
  stop: "Stop",
  sleep: "Sleep",
  wake: "Wake",
  pin: "Pin",
  unpin: "Unpin",
  test: "Test",
};

const actionVariant: Partial<Record<ModelAction, "primary" | "secondary" | "ghost" | "destructive-soft" | "outline">> = {
  start: "primary",
  wake: "primary",
  download: "secondary",
  stop: "destructive-soft",
  cancel: "destructive-soft",
  test: "outline",
};

const fmtMs = (ms?: number) =>
  ms == null ? "—" : formatDuration(ms, { ms: true, space: true, decimals: 1, decimalsBelow: 60_000, maxUnit: "s" });
const fmtIdle = (s: number) => (s < 90 ? `${Math.round(s)}s` : s < 5400 ? `${Math.round(s / 60)}m` : `${(s / 3600).toFixed(1)}h`);

export interface ModelRowProps extends Omit<React.HTMLAttributes<HTMLTableRowElement>, "children"> {
  model: ModelInfo;
  onAction?: (model: ModelInfo, action: ModelAction) => void;
  /** Action currently in flight for this model. */
  pendingAction?: ModelAction | null;
  testResult?: ModelTestResult | null;
  onDismissTest?: () => void;
  /** Column count for the test-result row. Default 6. */
  colSpan?: number;
}

/** One model table row (+ optional smoke-test result row). Use inside `ModelTable` or a `Table`. */
export const ModelRow = React.forwardRef<HTMLTableRowElement, ModelRowProps>(
  ({ className, model, onAction, pendingAction, testResult, onDismissTest, colSpan = 6, ...props }, ref) => {
    const actions = modelActionsFor(model);
    const state = normalizeModelState(model.state);
    const blockedReason = model.blocked ? (typeof model.blocked === "string" ? model.blocked : "Won't fit in free VRAM") : null;
    return (
      <>
        <TableRow ref={ref} data-model={model.name} data-state={model.state} className={cn("group/model", className)} {...props}>
          <TableCell>
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-sm font-medium text-foreground">{model.name}</span>
                {model.pinned ? (
                  <span className="inline-flex items-center text-primary" title="Pinned">
                    <RiPushpin2Fill aria-hidden className="size-3" />
                    <span className="sr-only">Pinned</span>
                  </span>
                ) : null}
                {blockedReason ? (
                  <span className="rounded-xs bg-warning-soft px-1.5 py-0.5 text-2xs font-medium text-warning-soft-foreground" title={blockedReason} data-blocked="">
                    won't fit
                  </span>
                ) : null}
              </div>
              {model.info ? <span className="text-2xs text-muted-foreground">{model.info}</span> : null}
              {state === "failed" && model.error ? <span className="truncate text-2xs text-destructive">{model.error}</span> : null}
            </div>
          </TableCell>
          <TableCell>
            <ModelStatePill
              state={model.state}
              detail={
                state === "downloading" && model.download?.progress != null
                  ? `${Math.round(model.download.progress)}%`
                  : model.idleSeconds != null && (state === "ready" || state === "sleeping")
                    ? `idle ${fmtIdle(model.idleSeconds)}`
                    : undefined
              }
            />
          </TableCell>
          <TableCell>{model.download ? <DownloadBadge {...model.download} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
          <TableCell className="whitespace-nowrap">
            <div className="flex flex-col gap-0.5 font-mono text-xs tabular-nums">
              <span>{model.vram != null ? `${Number(model.vram.toFixed(1))} GB` : "—"}</span>
              {model.gpus?.length ? <span className="text-2xs text-muted-foreground">GPU {model.gpus.join(", ")}</span> : null}
            </div>
          </TableCell>
          <TableCell className="whitespace-nowrap">
            <div className="flex flex-col gap-0.5 text-2xs tabular-nums text-muted-foreground">
              <span>
                cold <span className="font-mono text-foreground">{fmtMs(model.coldStartMs)}</span>
              </span>
              <span>
                wake <span className="font-mono text-foreground">{fmtMs(model.wakeMs)}</span>
              </span>
            </div>
          </TableCell>
          <TableCell align="right" className="whitespace-nowrap">
            <div className="inline-flex items-center gap-1" role="group" aria-label={`${model.name} actions`}>
              {actions.map((a) => {
                const disabled = !onAction || (a === "start" && !!model.blocked) || (pendingAction != null && pendingAction !== a);
                return (
                  <Button
                    key={a}
                    size="xs"
                    variant={actionVariant[a] ?? "ghost"}
                    disabled={disabled}
                    loading={pendingAction === a}
                    onClick={() => onAction?.(model, a)}
                    aria-label={`${actionLabel[a]} ${model.name}`}
                    title={a === "start" && blockedReason ? blockedReason : undefined}
                    leadingIcon={a === "pin" || a === "unpin" ? <RiPushpin2Fill aria-hidden /> : undefined}
                  >
                    {actionLabel[a]}
                  </Button>
                );
              })}
            </div>
          </TableCell>
        </TableRow>
        {testResult ? (
          <TableRow data-test-result={testResult.ok ? "ok" : "error"}>
            <TableCell colSpan={colSpan} className="bg-subtle py-2">
              <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className={cn("inline-flex items-center gap-1 font-semibold", testResult.running ? "text-muted-foreground" : testResult.ok ? "text-success" : "text-destructive")}>
                  {testResult.running ? (
                    "Testing…"
                  ) : testResult.ok ? (
                    <>
                      <RiCheckLine aria-hidden className="size-3.5" /> Smoke test passed
                    </>
                  ) : (
                    <>
                      <RiCloseLine aria-hidden className="size-3.5" /> Smoke test failed
                    </>
                  )}
                </span>
                {testResult.latencyMs != null ? (
                  <span className="text-muted-foreground">
                    latency <span className="font-mono text-foreground tabular-nums">{fmtMs(testResult.latencyMs)}</span>
                  </span>
                ) : null}
                {testResult.tokensPerSecond != null ? (
                  <span className="text-muted-foreground">
                    <span className="font-mono text-foreground tabular-nums">{Number(testResult.tokensPerSecond.toFixed(1))}</span> tok/s
                  </span>
                ) : null}
                {testResult.reply ? <q className="min-w-0 flex-1 truncate italic text-foreground">{testResult.reply}</q> : null}
                {testResult.error ? <span className="min-w-0 flex-1 truncate font-mono text-destructive">{testResult.error}</span> : null}
                {onDismissTest ? (
                  <button type="button" onClick={onDismissTest} className="ml-auto text-muted-foreground hover:text-foreground" aria-label={`Dismiss test result for ${model.name}`}>
                    <RiCloseLine aria-hidden className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </TableCell>
          </TableRow>
        ) : null}
      </>
    );
  }
);
ModelRow.displayName = "ModelRow";

export type ModelFilter = "all" | "serving" | "cached" | "missing";
export type ModelSortKey = "name" | "state" | "vram";

const stateRank = (m: ModelInfo) => modelStateRank[normalizeModelState(m.state)];
const serving: ModelState[] = ["ready", "starting", "sleeping"];

const filterTest: Record<ModelFilter, (m: ModelInfo) => boolean> = {
  all: () => true,
  serving: (m) => serving.includes(normalizeModelState(m.state)),
  cached: (m) => !m.download || m.download.status === "cached",
  missing: (m) => !!m.download && m.download.status !== "cached",
};

export interface ModelTableProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  models: ModelInfo[];
  onAction?: (model: ModelInfo, action: ModelAction) => void;
  /** name → action in flight. */
  pendingActions?: Record<string, ModelAction | null | undefined>;
  /** name → smoke-test result. */
  testResults?: Record<string, ModelTestResult | null | undefined>;
  onDismissTest?: (name: string) => void;
  /** Group rows by family. Default true. */
  grouped?: boolean;
  groupBy?: (model: ModelInfo) => string;
  filter?: ModelFilter;
  defaultFilter?: ModelFilter;
  onFilterChange?: (filter: ModelFilter) => void;
  /** Hide the filter bar. */
  hideFilters?: boolean;
  defaultSort?: { key: ModelSortKey; direction: "asc" | "desc" } | null;
  emptyState?: React.ReactNode;
}

/** Model registry table: family groups, filters, sorting, state-dependent actions and smoke-test rows. */
export const ModelTable = React.forwardRef<HTMLDivElement, ModelTableProps>(
  (
    {
      className,
      models,
      onAction,
      pendingActions,
      testResults,
      onDismissTest,
      grouped = true,
      groupBy = (m) => m.family ?? modelFamily(m.name),
      filter: filterProp,
      defaultFilter = "all",
      onFilterChange,
      hideFilters,
      defaultSort = null,
      emptyState = "No models match this filter",
      ...props
    },
    ref
  ) => {
    const [filter, setFilter] = useControllableState<ModelFilter>({ value: filterProp, defaultValue: defaultFilter, onChange: onFilterChange });
    const [sort, setSort] = React.useState(defaultSort);
    const shown = models.filter(filterTest[filter]);
    const sorted = sort
      ? [...shown].sort((a, b) => {
          const va = sort.key === "name" ? a.name : sort.key === "state" ? stateRank(a) : (a.vram ?? 0);
          const vb = sort.key === "name" ? b.name : sort.key === "state" ? stateRank(b) : (b.vram ?? 0);
          return (va < vb ? -1 : va > vb ? 1 : 0) * (sort.direction === "asc" ? 1 : -1);
        })
      : shown;
    const sections: { group: string | null; items: ModelInfo[] }[] = [];
    if (grouped) {
      const map = new Map<string, ModelInfo[]>();
      for (const m of sorted) {
        const g = groupBy(m);
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(m);
      }
      for (const [group, items] of map) sections.push({ group, items });
    } else sections.push({ group: null, items: sorted });

    const dirFor = (key: ModelSortKey): TableSortDirection => (sort?.key === key ? sort.direction : false);
    const toggle = (key: ModelSortKey) =>
      setSort(sort?.key === key ? { key, direction: sort.direction === "asc" ? "desc" : "asc" } : { key, direction: key === "vram" ? "desc" : "asc" });
    const counts: Record<ModelFilter, number> = {
      all: models.length,
      serving: models.filter(filterTest.serving).length,
      cached: models.filter(filterTest.cached).length,
      missing: models.filter(filterTest.missing).length,
    };
    const filterLabel: Record<ModelFilter, string> = { all: "All", serving: "Serving", cached: "Downloaded", missing: "Not downloaded" };

    return (
      <div ref={ref} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
        {!hideFilters ? (
          <div role="group" aria-label="Filter models" className="flex flex-wrap gap-1">
            {(Object.keys(filterLabel) as ModelFilter[]).map((f) => (
              <Button key={f} size="xs" variant={filter === f ? "secondary" : "ghost"} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {filterLabel[f]}
                <span className="ml-1 tabular-nums text-muted-foreground">{counts[f]}</span>
              </Button>
            ))}
          </div>
        ) : null}
        <Table density="compact">
          <caption className="sr-only">Models</caption>
          <TableHeader>
            <TableRow>
              <TableHead sortDirection={dirFor("name")} onSort={() => toggle("name")}>
                Model
              </TableHead>
              <TableHead sortDirection={dirFor("state")} onSort={() => toggle("state")}>
                State
              </TableHead>
              <TableHead>Weights</TableHead>
              <TableHead sortDirection={dirFor("vram")} onSort={() => toggle("vram")}>
                GPU / VRAM
              </TableHead>
              <TableHead>Timings</TableHead>
              <TableHead align="right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  {emptyState}
                </TableCell>
              </TableRow>
            ) : (
              sections.map((s) => (
                <React.Fragment key={s.group ?? "all"}>
                  {s.group != null ? (
                    <TableRow data-group={s.group}>
                      <TableCell colSpan={6} className="bg-subtle py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground" role="rowheader">
                        {s.group} <span className="font-normal">· {s.items.length}</span>
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {s.items.map((m) => (
                    <ModelRow
                      key={m.name}
                      model={m}
                      onAction={onAction}
                      pendingAction={pendingActions?.[m.name] ?? null}
                      testResult={testResults?.[m.name] ?? null}
                      onDismissTest={onDismissTest ? () => onDismissTest(m.name) : undefined}
                    />
                  ))}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  }
);
ModelTable.displayName = "ModelTable";
