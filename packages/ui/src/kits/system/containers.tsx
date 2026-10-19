import * as React from "react";
import {
  RiArrowDownSLine,
  RiBox3Line,
  RiCpuLine,
  RiGlobalLine,
  RiNotification3Line,
  RiStackLine,
  RiStopCircleLine,
  RiTempHotLine,
  RiUpload2Line,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { accentClasses, accentStyle, type Accent } from "../../lib/accent";
import { topWithOther } from "../../lib/breakdown";
import { pluralize } from "../../lib/format";
import { clamp } from "../../lib/math";
import {
  containerLimitRatio,
  containerTotals,
  describeContainerState,
  formatCpu,
  formatMemory,
  formatRate,
  groupContainers,
  splitValueUnit,
  summarizeContainers,
  type ContainerInfo,
} from "../../lib/system-monitor";
import type { TimeInput } from "../../lib/time";
import { useNow } from "../../hooks/use-now";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { ConfirmDialog } from "../../primitives/dialog";
import { StackedMeter } from "../../primitives/meter";
import { PortBadgeList } from "../../primitives/port-badge";
import { Progress, Skeleton } from "../../primitives/progress";
import { StatCard, StatGroup, StatValue } from "../../patterns/stat-card";

export {
  containerLimitRatio,
  containerTotals,
  describeContainerState,
  groupContainers,
  summarizeContainers,
  type ContainerInfo,
  type ContainerListEntry,
  type ContainerState,
  type ContainerSummaryData,
  type ContainerTotals,
} from "../../lib/system-monitor";

/** "86% of 240 MB". */
function limitText(memoryBytes: number, limitBytes: number, formatBytes: (b: number) => string): string {
  return `${Math.round((memoryBytes / limitBytes) * 100)}% of ${formatBytes(limitBytes)}`;
}

/* ------------------------------------------------------------------------------------------------
 * ContainerList
 * ----------------------------------------------------------------------------------------------*/

export interface ContainerListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  containers: ContainerInfo[];
  /** Stops a container (after confirmation). May return a promise; the dialog waits for it. */
  onStop?: (id: string) => void | Promise<void>;
  /** Warn when memory reaches this share of the container's limit. Default 0.8. */
  limitWarnAt?: number;
  /** Reference time for "Up 5 hours" (pass it for deterministic output). Default: the live clock, refreshed every 30 seconds. */
  now?: TimeInput;
  /** Categorical colour for icons, port badges and CPU bars. Default "cyan". */
  accent?: Accent;
  /** Expanded Compose groups (by name). Uncontrolled default: every group expanded. */
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (expanded: string[]) => void;
  /** Group subtitle lead. Default "Started together by Docker Compose". */
  groupDescription?: React.ReactNode;
  /** Memory text. Default decimal units ("312 MB"). */
  formatBytes?: (bytes: number) => string;
  /** Accessible name of the list. Default "Containers". */
  label?: string;
  emptyState?: React.ReactNode;
  /** Data is on its way. With no containers yet the list shows placeholder rows; with containers the root is only marked busy. */
  loading?: boolean;
  /** Placeholder container rows (under one placeholder group header) while loading. Default 3. */
  loadingRows?: number;
}

interface RowContext {
  now: TimeInput;
  limitWarnAt: number;
  cpuMax: number;
  formatBytes: (bytes: number) => string;
  onStop?: (id: string) => void | Promise<void>;
}

function CpuCell({ cpu, max }: { cpu: number; max: number }) {
  const pct = max > 0 && Number.isFinite(cpu) ? clamp((cpu / max) * 100, 0, 100) : 0;
  return (
    <span data-slot="container-cpu" className="flex w-24 shrink-0 items-center justify-end gap-2 tabular-nums text-muted-foreground sm:w-32">
      <span>{formatCpu(cpu)}</span>
      <span aria-hidden className={cn("hidden h-1 w-12 overflow-hidden rounded-full sm:block", accentClasses.track)}>
        <span className={cn("block h-full rounded-full", accentClasses.solid)} style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

function ContainerListSkeleton({ rows }: { rows: number }) {
  return (
    <ul aria-hidden className="m-0 flex list-none flex-col p-0">
      <li data-slot="container-skeleton-group" className="flex items-center gap-3 rounded-box px-3 py-3">
        <Skeleton className="size-8 shrink-0 rounded-md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Skeleton shape="text" className="w-36 max-w-full" />
          <Skeleton shape="text" className="h-[0.7em] w-56 max-w-full" />
        </div>
        <div className="flex w-24 shrink-0 justify-end pr-0 sm:w-32 sm:pr-14">
          <Skeleton shape="text" className="w-10" />
        </div>
        <div className="flex w-20 shrink-0 justify-end">
          <Skeleton shape="text" className="w-14" />
        </div>
      </li>
      {Array.from({ length: Math.max(0, rows) }, (_, i) => (
        <li key={i} data-slot="container-skeleton-row" className="flex items-center gap-3 rounded-box px-3 py-3 pl-6 sm:pl-9">
          <Skeleton className="size-4 shrink-0 rounded-xs" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Skeleton shape="text" className="w-40 max-w-full" />
            <Skeleton shape="text" className="h-[0.7em] w-24 max-w-full" />
          </div>
          <div className="flex w-24 shrink-0 items-center justify-end gap-2 sm:w-32">
            <Skeleton shape="text" className="w-8" />
            <Skeleton className="hidden h-1 w-12 rounded-full sm:block" />
          </div>
          <div className="flex w-20 shrink-0 justify-end">
            <Skeleton shape="text" className="w-14" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ContainerRow({ container, ctx, nested }: { container: ContainerInfo; ctx: RowContext; nested: boolean }) {
  const ratio = containerLimitRatio(container);
  const warn = ratio !== undefined && ratio >= ctx.limitWarnAt;
  const stoppable = container.state !== "exited";
  return (
    <li
      data-slot="container-row"
      data-state={container.state}
      className={cn(
        "group/row flex items-center gap-3 rounded-box px-3 py-3 transition-colors hover:bg-muted/50",
        nested && "pl-6 sm:pl-9",
        container.state === "exited" && "opacity-60"
      )}
    >
      <RiBox3Line aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">
          <span className="font-medium text-foreground">{container.name}</span>
          {container.image ? <span className="ml-1.5 text-muted-foreground">{container.image}</span> : null}
        </span>
        <span className="truncate text-xs text-muted-foreground">{describeContainerState(container, ctx.now)}</span>
      </span>
      <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        {container.ports && container.ports.length > 0 ? (
          <PortBadgeList ports={container.ports} label={`${container.name} ports`} size="md" />
        ) : null}
        {warn ? (
          <Badge
            data-slot="container-limit-warning"
            tone="warning"
            size="md"
            leadingIcon={<RiNotification3Line aria-hidden />}
            title="Memory use of its limit"
          >
            {limitText(container.memoryBytes, container.memoryLimitBytes!, ctx.formatBytes)}
            <span className="sr-only"> memory limit</span>
          </Badge>
        ) : null}
      </span>
      <CpuCell cpu={container.cpu} max={ctx.cpuMax} />
      <span data-slot="container-memory" className="w-20 shrink-0 text-right font-semibold tabular-nums text-foreground">
        {ctx.formatBytes(container.memoryBytes)}
      </span>
      {ctx.onStop ? (
        stoppable ? (
          <ConfirmDialog
            title={`Stop ${container.name}?`}
            description={`The container will be stopped${container.group ? ` (the rest of ${container.group} keeps running)` : ""}.`}
            confirmLabel="Stop"
            tone="destructive"
            onConfirm={() => ctx.onStop!(container.id)}
            trigger={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Stop ${container.name}`}
                className="shrink-0 text-muted-foreground opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <RiStopCircleLine aria-hidden />
              </Button>
            }
          />
        ) : (
          <span aria-hidden className="size-7 shrink-0" />
        )
      ) : null}
    </li>
  );
}

/** Docker containers grouped by Compose project: state, ports, a limit warning, CPU and memory per container. */
export const ContainerList = React.forwardRef<HTMLDivElement, ContainerListProps>(
  (
    {
      containers,
      onStop,
      limitWarnAt = 0.8,
      now: nowProp,
      accent = "cyan",
      expanded: expandedProp,
      defaultExpanded,
      onExpandedChange,
      groupDescription = "Started together by Docker Compose",
      formatBytes = formatMemory,
      label = "Containers",
      emptyState,
      loading = false,
      loadingRows = 3,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const skeleton = loading && containers.length === 0;
    const baseId = React.useId();
    const entries = groupContainers(containers);
    const groupNames = entries.flatMap((e) => (e.type === "group" ? [e.name] : []));
    // Uncontrolled state tracks collapsed groups, so groups that appear later start expanded.
    const [collapsed, setCollapsed] = useControllableState<string[]>({
      value: expandedProp === undefined ? undefined : groupNames.filter((n) => !expandedProp.includes(n)),
      defaultValue: defaultExpanded === undefined ? [] : groupNames.filter((n) => !defaultExpanded.includes(n)),
    });
    const toggle = (name: string) => {
      const isOpen = !collapsed.includes(name);
      const nextCollapsed = isOpen ? [...collapsed, name] : collapsed.filter((n) => n !== name);
      setCollapsed(nextCollapsed);
      onExpandedChange?.(groupNames.filter((n) => !nextCollapsed.includes(n)));
    };
    const liveNow = useNow({ active: nowProp === undefined && containers.length > 0, interval: 30_000 });
    const ctx: RowContext = {
      now: nowProp ?? liveNow,
      limitWarnAt,
      cpuMax: containers.reduce((m, c) => (Number.isFinite(c.cpu) ? Math.max(m, c.cpu) : m), 0),
      formatBytes,
      onStop,
    };

    return (
      <div
        ref={ref}
        data-slot="container-list"
        aria-busy={loading || undefined}
        style={accentStyle(accent, style)}
        className={cn("flex flex-col text-sm", className)}
        {...props}
      >
        {skeleton ? (
          <>
            <span className="sr-only">Loading containers…</span>
            <ContainerListSkeleton rows={loadingRows} />
          </>
        ) : entries.length === 0 ? (
          <div data-slot="container-empty" className="px-3 py-8 text-center text-muted-foreground">
            {emptyState ?? "No containers"}
          </div>
        ) : (
          <ul role="list" aria-label={label} className="m-0 flex list-none flex-col p-0">
            {entries.map((entry, gi) => {
              if (entry.type === "container") {
                return <ContainerRow key={entry.container.id} container={entry.container} ctx={ctx} nested={false} />;
              }
              const totals = containerTotals(entry.containers);
              const open = !collapsed.includes(entry.name);
              const listId = `${baseId}-g${gi}`;
              return (
                <li key={`group:${entry.name}`} data-slot="container-group" data-expanded={open} className="flex flex-col">
                  <div data-slot="container-group-header" className="flex items-center gap-3 rounded-box px-3 py-3">
                    <span aria-hidden className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", accentClasses.soft)}>
                      <RiStackLine />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={listId}
                        onClick={() => toggle(entry.name)}
                        className={cn("group/toggle inline-flex min-w-0 items-center gap-1 self-start rounded-xs text-left", focusRing)}
                      >
                        <span className="truncate">
                          <span className="font-medium text-foreground">{entry.name}</span>
                          <span className="ml-1.5 text-muted-foreground">
                            {totals.count} {pluralize(totals.count, "container")}
                          </span>
                        </span>
                        <RiArrowDownSLine
                          aria-hidden
                          className={cn("size-4 shrink-0 text-muted-foreground chevron-turn", !open && "-rotate-90")}
                        />
                      </button>
                      <span data-slot="container-group-description" className="truncate text-xs text-muted-foreground">
                        {groupDescription} · {totals.ports.length} {pluralize(totals.ports.length, "port")} · {totals.running} running
                      </span>
                    </span>
                    <span className="w-24 shrink-0 pr-0 text-right tabular-nums text-muted-foreground sm:w-32 sm:pr-14">
                      {formatCpu(totals.cpu)}
                    </span>
                    <span className="w-20 shrink-0 text-right font-semibold tabular-nums text-foreground">{formatBytes(totals.memoryBytes)}</span>
                    {onStop ? <span aria-hidden className="size-7 shrink-0" /> : null}
                  </div>
                  <ul id={listId} role="list" aria-label={`${entry.name} containers`} hidden={!open} className="m-0 flex list-none flex-col p-0">
                    {entry.containers.map((c) => (
                      <ContainerRow key={c.id} container={c} ctx={ctx} nested />
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
);
ContainerList.displayName = "ContainerList";

/* ------------------------------------------------------------------------------------------------
 * ContainerSummary
 * ----------------------------------------------------------------------------------------------*/

export interface ContainerSummaryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  containers: ContainerInfo[];
  /** Recent total-memory readings (bytes) for the Lowest / Peak rows. */
  history?: number[];
  /** Tint the "Closest to Its Limit" bar as a warning from this share. Default 0.8. */
  limitWarnAt?: number;
  /** Rows in the "By Container" breakdown before the rest fold into "Other". Default 6. */
  breakdownLimit?: number;
  /** Published ports shown before "+N". Default 4. */
  maxPorts?: number;
  /** Categorical colour for the tiles. Default "cyan". */
  accent?: Accent;
  /** Where the containers run, for the heading ("4 containers in Docker"). Default "Docker". */
  runtimeName?: string;
  formatBytes?: (bytes: number) => string;
  /** Data is on its way. With no containers yet the total, breakdown and tiles show placeholders; with containers the root is only marked busy. */
  loading?: boolean;
}

/** Container overview: total memory with lowest/peak, a per-container breakdown and CPU, limit, network and port tiles. */
export const ContainerSummary = React.forwardRef<HTMLDivElement, ContainerSummaryProps>(
  (
    {
      containers,
      history,
      limitWarnAt = 0.8,
      breakdownLimit = 6,
      maxPorts = 4,
      accent = "cyan",
      runtimeName = "Docker",
      formatBytes = formatMemory,
      loading = false,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const skeleton = loading && containers.length === 0;
    const headingId = React.useId();
    const summary = summarizeContainers(containers);
    const total = splitValueUnit(formatBytes(summary.memoryBytes));
    const readings = (history ?? []).filter((v) => Number.isFinite(v));
    const lowest = readings.length > 0 ? Math.min(...readings) : undefined;
    const peak = readings.length > 0 ? Math.max(...readings) : undefined;
    const parts = topWithOther(
      containers.map((c) => ({ key: c.id, label: c.name, value: c.memoryBytes })),
      {
        value: (p) => p.value,
        limit: breakdownLimit,
        other: (rest, sum) => ({ key: "__other", label: `${rest.length} more`, value: sum }),
      }
    );
    const closest = summary.closestToLimit;
    const net = summary.network;
    const netTotal = net ? splitValueUnit(formatRate(net.totalBps)) : undefined;

    return (
      <div
        ref={ref}
        data-slot="container-summary"
        aria-busy={loading || undefined}
        style={accentStyle(accent, style)}
        className={cn("flex flex-col gap-4", className)}
        {...props}
      >
        {skeleton ? <span className="sr-only">Loading containers…</span> : null}
        {skeleton ? (
          <div
            data-slot="container-summary-skeleton"
            aria-hidden
            className="flex flex-col gap-6 rounded-box border border-border bg-card p-5 text-card-foreground shadow-xs md:flex-row"
          >
            <div className="flex shrink-0 flex-col gap-2 md:w-56">
              <Skeleton shape="text" className="w-40" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 text-sm font-medium text-foreground">By Container</div>
              <Skeleton className="h-2 rounded-full" />
              <div className="mt-3 flex flex-col gap-2.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="size-2 shrink-0 rounded-[2px]" />
                    <Skeleton shape="text" className="w-28" />
                    <Skeleton shape="text" className="ml-auto w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
        <section
          aria-labelledby={headingId}
          className="flex flex-col gap-6 rounded-box border border-border bg-card p-5 text-card-foreground shadow-xs md:flex-row"
        >
          <div className="flex shrink-0 flex-col gap-1 md:w-56">
            <h3 id={headingId} className="text-sm font-normal text-muted-foreground">
              {summary.count} {pluralize(summary.count, "container")} in {runtimeName}
            </h3>
            <StatValue data-slot="container-summary-total" value={total.value} unit={total.unit} size="xl" font="sans" />
            {lowest !== undefined && peak !== undefined ? (
              <dl className="mt-auto grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 pt-4 text-sm">
                <dt className="text-muted-foreground">Lowest</dt>
                <dd className="text-right font-medium tabular-nums">{formatBytes(lowest)}</dd>
                <dt className="text-muted-foreground">Peak</dt>
                <dd className="text-right font-medium tabular-nums">{formatBytes(peak)}</dd>
              </dl>
            ) : null}
          </div>
          <StackedMeter
            className="min-w-0 flex-1"
            label="By Container"
            valueText=""
            parts={parts}
            legend="list"
            valueFormatter={formatBytes}
          />
        </section>
        )}

        <StatGroup columns={4}>
          <StatCard
            data-slot="container-summary-cpu"
            label="CPU"
            icon={<RiCpuLine />}
            accent={accent}
            valueFont="sans"
            loading={skeleton || undefined}
            value={formatCpu(summary.cpu)}
            hint={summary.topCpu ? `most in ${summary.topCpu.name}` : "Idle"}
          />
          <StatCard
            data-slot="container-summary-limit"
            label="Closest to Its Limit"
            icon={<RiTempHotLine />}
            accent={accent}
            valueFont="sans"
            loading={skeleton || undefined}
            value={closest ? closest.name : "—"}
            hint={closest ? undefined : "No memory limits set"}
          >
            {closest ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Progress
                  value={clamp(closest.ratio * 100, 0, 100)}
                  size="xs"
                  tone={closest.ratio >= limitWarnAt ? "warning" : undefined}
                  aria-label={`${closest.name} memory of its limit`}
                  className="w-24 shrink-0"
                  indicatorClassName={closest.ratio >= limitWarnAt ? undefined : accentClasses.solid}
                />
                <span className="tabular-nums">{limitText(closest.memoryBytes, closest.limitBytes, formatBytes)}</span>
              </div>
            ) : null}
          </StatCard>
          <StatCard
            data-slot="container-summary-network"
            label="Network"
            icon={<RiGlobalLine />}
            accent={accent}
            valueFont="sans"
            loading={skeleton || undefined}
            value={netTotal ? netTotal.value : "—"}
            unit={netTotal?.unit}
            hint={
              net ? (
                <span className="tabular-nums">
                  <span aria-hidden>↓</span>
                  <span className="sr-only">Received</span> {formatRate(net.rxBps)} · <span aria-hidden>↑</span>
                  <span className="sr-only">Sent</span> {formatRate(net.txBps)}
                </span>
              ) : undefined
            }
          />
          <StatCard
            data-slot="container-summary-ports"
            label="Published Ports"
            icon={<RiUpload2Line />}
            accent={accent}
            valueFont="sans"
            loading={skeleton || undefined}
            value={String(summary.ports.length)}
          >
            {summary.ports.length > 0 ? <PortBadgeList ports={summary.ports} max={maxPorts} label="Published ports" /> : null}
          </StatCard>
        </StatGroup>
      </div>
    );
  }
);
ContainerSummary.displayName = "ContainerSummary";
