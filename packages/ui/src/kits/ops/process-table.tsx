import * as React from "react";
import { RiArrowRightSLine, RiCloseCircleLine, RiSkullLine } from "@remixicon/react";
import { cn, focusRing, normalizeDensity, type Density } from "../../lib/cn";
import { logicalArrow } from "../../lib/direction";
import { toneClasses } from "../../lib/tone";
import { formatDuration } from "../../lib/duration";
import { formatBytes, pluralize, type FormatBytesOptions } from "../../lib/format";
import { safeISO, toMs, type TimeInput } from "../../lib/time";
import {
  buildProcessTree,
  defaultProcessGroupKey,
  processGroupStartedAt,
  processGroupUser,
  sortProcessList,
  type ProcessColumn,
  type ProcessGroup,
  type ProcessSort,
  type ProcessTreeItem,
} from "../../lib/process-groups";
import { useAsyncAction } from "../../hooks/use-async-action";
import { useControllableState } from "../../hooks/use-controllable-state";
import { usePresence, type PresenceState } from "../../hooks/use-presence";
import { Button } from "../../primitives/button";
import { ConfirmDialog } from "../../primitives/dialog";
import { Monogram } from "../../primitives/monogram";
import { Skeleton } from "../../primitives/progress";
import { Spinner } from "../../primitives/spinner";
import { SimpleTooltip } from "../../primitives/tooltip";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow, type TableSortDirection } from "../../primitives/table";

export type KillSignal = "SIGTERM" | "SIGKILL";

/* ------------------------------------------------------------------ */
/* KillButton                                                          */
/* ------------------------------------------------------------------ */

export interface KillButtonProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Process id, shown in the confirm step and used in labels. */
  pid: number;
  /** Process name, used in labels. */
  name?: string;
  /**
   * Called with the chosen signal after the user confirms; may return a promise, and the button shows "Killing…"
   * until it settles.
   */
  onKill: (signal: KillSignal) => void | Promise<unknown>;
  /** External loading state (e.g. waiting for the process to exit). Shows "Killing…". */
  loading?: boolean;
  /** External busy state; shows "Killing…" while true. @deprecated Use `loading`. */
  pending?: boolean;
  /** Disables the button. */
  disabled?: boolean;
  /** Called when the confirm step opens / closes. */
  onConfirmingChange?: (signal: KillSignal | null) => void;
}

/** Two-mode kill control (SIGTERM / SIGKILL) with an inline "Kill 1234? Confirm / Cancel" step. */
export const KillButton = React.forwardRef<HTMLDivElement, KillButtonProps>(
  ({ className, pid, name, onKill, loading: loadingProp, pending: pendingProp, disabled, onConfirmingChange, ...props }, ref) => {
    const [confirming, setConfirmingState] = React.useState<KillSignal | null>(null);
    const kill = useAsyncAction((result: PromiseLike<unknown>) => result);
    const confirmRef = React.useRef<HTMLButtonElement>(null);
    const termRef = React.useRef<HTMLButtonElement>(null);
    const pending = (loadingProp ?? pendingProp) || kill.busy;

    const setConfirming = (s: KillSignal | null) => {
      setConfirmingState(s);
      onConfirmingChange?.(s);
    };

    React.useEffect(() => {
      if (confirming) confirmRef.current?.focus();
    }, [confirming]);

    const confirm = () => {
      if (!confirming) return;
      const signal = confirming;
      setConfirming(null);
      // Only an async kill shows "Killing…"; a synchronous one returns straight to the buttons.
      const result = onKill(signal);
      if (result && typeof (result as PromiseLike<unknown>).then === "function") void kill.run(result as PromiseLike<unknown>);
    };

    const cancel = () => {
      setConfirming(null);
      requestAnimationFrame(() => termRef.current?.focus());
    };

    const who = name ? `${name} (${pid})` : String(pid);

    if (pending) {
      return (
        <div ref={ref} role="status" className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)} {...props}>
          <Spinner size="xs" aria-hidden />
          <span>Killing…</span>
        </div>
      );
    }

    if (confirming) {
      return (
        <div
          ref={ref}
          role="group"
          aria-label={`Confirm kill ${who}`}
          className={cn("inline-flex items-center gap-1", className)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              cancel();
            }
          }}
          {...props}
        >
          <span className="whitespace-nowrap text-xs font-medium text-foreground">
            {confirming === "SIGKILL" ? "Force kill" : "Kill"} {pid}?
          </span>
          <Button ref={confirmRef} size="xs" variant={confirming === "SIGKILL" ? "destructive" : "destructive-soft"} onClick={confirm}>
            Confirm
          </Button>
          <Button size="xs" variant="ghost" onClick={cancel}>
            Cancel
          </Button>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("inline-flex items-center gap-1", className)} {...props}>
        <SimpleTooltip content="Terminate (SIGTERM)">
          <button
            ref={termRef}
            type="button"
            disabled={disabled}
            onClick={() => setConfirming("SIGTERM")}
            aria-label={`Terminate ${who} (SIGTERM)`}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-control border border-warning/30 bg-warning-soft text-warning-soft-foreground transition-colors hover:bg-warning/25 disabled:pointer-events-none disabled:opacity-50",
              focusRing
            )}
          >
            <RiCloseCircleLine aria-hidden className="size-3.5" />
          </button>
        </SimpleTooltip>
        <SimpleTooltip content="Force kill (SIGKILL)">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setConfirming("SIGKILL")}
            aria-label={`Force kill ${who} (SIGKILL)`}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-control border border-destructive/30 bg-destructive-soft text-destructive-soft-foreground transition-colors hover:bg-destructive/20 disabled:pointer-events-none disabled:opacity-50",
              focusRing
            )}
          >
            <RiSkullLine aria-hidden className="size-3.5" />
          </button>
        </SimpleTooltip>
      </div>
    );
  }
);
KillButton.displayName = "KillButton";

/* ------------------------------------------------------------------ */
/* ProcessTable                                                        */
/* ------------------------------------------------------------------ */

export interface ProcessInfo {
  pid: number;
  name: string;
  /** Full command line (shown truncated with a tooltip). */
  command?: string;
  user?: string;
  /** CPU percent. */
  cpu?: number | null;
  /** Resident memory, bytes. */
  memory?: number | null;
  /** GPU memory, bytes. */
  vram?: number | null;
  gpuIndex?: number;
  state?: "running" | "sleeping" | "idle" | "stopped" | "zombie" | (string & {});
  startedAt?: TimeInput;
  /** The owning app's name ("Google Chrome" for its helpers). `groupBy="app"` groups by it, falling back to `name`. */
  app?: string;
  /** App icon, shown on group rows. */
  icon?: React.ReactNode;
}

export type { ProcessColumn, ProcessSort };

/** An app group in a grouped `ProcessTable`: summed CPU and memory, process count and the processes. */
export type ProcessTableGroup = ProcessGroup<ProcessInfo>;

export interface ProcessQuitOptions {
  /** Force Quit (may lose unsaved work) rather than a normal Quit. */
  force: boolean;
}

/** Memory columns: 1536 → "1.5 KB" (base 1024). */
const PROCESS_BYTES: FormatBytesOptions = { decimals: 1, wholeAbove: 100 };

/**
 * Human bytes: 1536 → "1.5 KB" (base 1024).
 * @deprecated Use `formatBytes(bytes, { decimals: 1, wholeAbove: 100 })`.
 */
export function formatProcessBytes(bytes: number | null | undefined): string {
  return formatBytes(bytes, PROCESS_BYTES);
}

/** Elapsed time: "45s", "5m", "2h 5m", "3d 4h" (floored). */
const formatElapsed = (ms: number) => formatDuration(ms, { round: "floor", minUnit: ms < 60_000 ? "s" : "m" });

/** Sort processes by a column (stable, nulls last for desc). */
export function sortProcesses(processes: ProcessInfo[], sort: ProcessSort | null): ProcessInfo[] {
  return sortProcessList(processes, sort);
}

type Presence = PresenceState;

const pidOf = (p: ProcessInfo) => p.pid;
const treeKeyOf = (item: ProcessTreeItem<ProcessInfo>) => item.key;

const columnLabel: Record<ProcessColumn, string> = {
  pid: "PID",
  name: "Command",
  user: "User",
  cpu: "CPU",
  memory: "RAM",
  vram: "VRAM",
  state: "State",
  started: "Started",
};

const numeric: ProcessColumn[] = ["pid", "cpu", "memory", "vram"];
const alignFor = (col: ProcessColumn) => (numeric.includes(col) && col !== "pid" ? "right" : "left");
/** Numbers, sizes and relative times never wrap; only the name column may. */
const nowrapFor = (col: ProcessColumn) => (col === "name" ? undefined : "whitespace-nowrap");

/** Process states are domain-specific (not `TaskStatus`); only their colours come from the shared tones. */
const stateTone: Record<string, string> = {
  running: toneClasses.soft.success,
  sleeping: toneClasses.soft.neutral,
  idle: toneClasses.soft.neutral,
  stopped: toneClasses.soft.warning,
  zombie: toneClasses.soft.destructive,
};

/** Matches `TableCell` padding, for the group row's `<th scope="rowgroup">`. */
const groupHeadPadding: Record<Density, string> = {
  compact: "px-3 py-1.5",
  normal: "px-4 py-2.5",
  relaxed: "px-4 py-4",
};

/** Child rows indent their label past the group's disclosure chevron. */
const childIndent: Record<Density, string> = {
  compact: "ps-9",
  normal: "ps-10",
  relaxed: "ps-10",
};

/** Every tbody but the last keeps its bottom border when groups each get their own tbody. */
const groupBodyClass = "[&>tr:last-child>td]:border-b [&>tr:last-child>th]:border-b [&:last-of-type>tr:last-child>*]:border-b-0";

const presenceRowClass = (state: Presence) =>
  cn(
    state === "enter" && "animate-in fade-in-0 slide-in-from-top-1 duration-300 [&>td]:bg-primary-soft/40",
    state === "exit" && "pointer-events-none animate-out fade-out-0 opacity-0 duration-300 [&>td]:line-through"
  );

export interface ProcessTableProps extends Omit<React.HTMLAttributes<HTMLTableElement>, "children"> {
  /** Processes to list, each with a pid, name, CPU, memory and start time. */
  processes: ProcessInfo[];
  /** Visible columns, in order. */
  columns?: ProcessColumn[];
  /** Controlled sort column and direction; `null` keeps the given order. */
  sort?: ProcessSort | null;
  /** Initial sort when `sort` is not controlled. */
  defaultSort?: ProcessSort | null;
  /** Called with the sort (or `null`) when the user clicks a column header. */
  onSortChange?: (sort: ProcessSort | null) => void;
  /** Enables the kill column. */
  onKill?: (process: ProcessInfo, signal: KillSignal) => void | Promise<unknown>;
  /** Whether a given process can be killed (default all). */
  canKill?: (process: ProcessInfo) => boolean;
  /** PIDs with a kill in flight. */
  pendingPids?: number[];
  /** Shows the totals row with summed CPU and memory. Default true. */
  showTotals?: boolean;
  /** Command column truncation in characters for the visible text. Default 60. */
  commandMaxLength?: number;
  /** "now" for the started column. */
  now?: number;
  /** Maximum height of the scrolling body; a number is px. */
  maxHeight?: number | string;
  /** Shown when there are no processes. Default "No processes". */
  emptyState?: React.ReactNode;
  /** Row density. Default "compact". */
  density?: Density;
  /** Row exit animation duration ms. Default 250. */
  exitDuration?: number;
  /** Accessible table caption. */
  caption?: string;
  /**
   * Show apps instead of processes ("Google Chrome · 96 processes"). `"app"` groups by `ProcessInfo.app`,
   * falling back to the process name; a function returns a group key, or `undefined` to leave a process ungrouped.
   */
  groupBy?: "app" | ((process: ProcessInfo) => string | undefined);
  /** Display name for a group. Default: its key. */
  groupName?: (key: string, processes: ProcessInfo[]) => string;
  /** Expanded group keys (controlled). */
  expandedGroups?: string[];
  /** Initially expanded group keys. Default none. */
  defaultExpandedGroups?: string[];
  /** Called with the expanded group keys when the user expands or collapses a group. */
  onExpandedGroupsChange?: (keys: string[]) => void;
  /** Enables Quit… and Force Quit… on group rows; each asks for confirmation first. */
  onQuitGroup?: (group: ProcessTableGroup, options: ProcessQuitOptions) => void | Promise<unknown>;
  /** Whether a given group can be quit (default all). */
  canQuitGroup?: (group: ProcessTableGroup) => boolean;
  /** Waiting for the first sample: with no processes the header stays and the body is `loadingRows` placeholder rows (no totals). */
  loading?: boolean;
  /** Placeholder rows while loading with no processes. Default 5. */
  loadingRows?: number;
}

/** Placeholder widths per column (right-aligned columns push theirs to the end). */
const skeletonWidth: Record<ProcessColumn, string> = {
  pid: "w-10",
  name: "w-36",
  user: "w-14",
  cpu: "w-10",
  memory: "w-14",
  vram: "w-12",
  state: "w-14",
  started: "w-14",
};
const skeletonNameWidths = ["w-36", "w-28", "w-40", "w-24", "w-32"];

interface RowContext {
  /** The group a child row belongs to. */
  group?: ProcessTableGroup;
  id?: string;
}

type RenderRow = (p: ProcessInfo, state: Presence, ctx?: RowContext) => React.ReactNode;

function ProcessRows({
  items,
  exitDuration,
  renderRow,
  empty,
}: {
  items: ProcessInfo[];
  exitDuration: number;
  renderRow: RenderRow;
  empty: React.ReactNode;
}) {
  const rows = usePresence(items, pidOf, { exitDuration });
  if (rows.length === 0) return <>{empty}</>;
  return <TableBody>{rows.map(({ item, state }) => renderRow(item, state))}</TableBody>;
}

interface ProcessGroupBodyProps {
  group: ProcessTableGroup;
  state: Presence;
  expanded: boolean;
  exitDuration: number;
  idPrefix: string;
  renderRow: RenderRow;
  renderGroupRow: (group: ProcessTableGroup, state: Presence, expanded: boolean, childIds: string[]) => React.ReactNode;
}

function ProcessGroupBody({ group, state, expanded, exitDuration, idPrefix, renderRow, renderGroupRow }: ProcessGroupBodyProps) {
  const children = usePresence(group.processes, pidOf, { exitDuration });
  const childId = (p: ProcessInfo) => `${idPrefix}-p${p.pid}`;
  const visible = expanded ? children : [];
  return (
    <tbody data-group={group.key} className={groupBodyClass}>
      {renderGroupRow(
        group,
        state,
        expanded,
        visible.filter((c) => c.state !== "exit").map((c) => childId(c.item))
      )}
      {visible.map(({ item, state: childState }) =>
        renderRow(item, state === "exit" ? "exit" : childState, { group, id: childId(item) })
      )}
    </tbody>
  );
}

function ProcessTreeBodies({
  items,
  empty,
  exitDuration,
  expanded,
  idPrefix,
  renderRow,
  renderGroupRow,
}: Omit<ProcessGroupBodyProps, "group" | "state" | "expanded"> & { items: ProcessTreeItem<ProcessInfo>[]; expanded: Set<string>; empty: React.ReactNode }) {
  const rows = usePresence(items, treeKeyOf, { exitDuration });
  if (rows.length === 0) return <>{empty}</>;
  return (
    <>
      {rows.map(({ item, state }) =>
        item.type === "group" ? (
          <ProcessGroupBody
            key={item.key}
            group={item.group}
            state={state}
            expanded={expanded.has(item.group.key)}
            exitDuration={exitDuration}
            idPrefix={idPrefix}
            renderRow={renderRow}
            renderGroupRow={renderGroupRow}
          />
        ) : (
          <tbody key={item.key} className={groupBodyClass}>
            {renderRow(item.process, state)}
          </tbody>
        )
      )}
    </>
  );
}

/** Quit… / Force Quit… for an app group, each behind a ConfirmDialog. */
function ProcessGroupQuit({ group, onQuit }: { group: ProcessTableGroup; onQuit: NonNullable<ProcessTableProps["onQuitGroup"]> }) {
  const closing = `${group.count} ${pluralize(group.count, "process", "processes")} will close.`;
  const quit = (force: boolean) => async () => {
    await onQuit(group, { force });
  };
  return (
    <div className="inline-flex items-center gap-1" data-slot="process-group-quit">
      <ConfirmDialog
        title={`Quit ${group.name}?`}
        description={closing}
        confirmLabel="Quit"
        tone="warning"
        onConfirm={quit(false)}
        trigger={
          <Button size="xs" variant="ghost" aria-label={`Quit ${group.name}…`}>
            Quit…
          </Button>
        }
      />
      <ConfirmDialog
        title={`Force quit ${group.name}?`}
        description={`${closing} Unsaved work may be lost.`}
        confirmLabel="Force Quit"
        tone="destructive"
        onConfirm={quit(true)}
        trigger={
          <Button size="xs" variant="destructive-soft" aria-label={`Force Quit ${group.name}…`}>
            Force Quit…
          </Button>
        }
      />
    </div>
  );
}

/** Live process list: sortable columns, totals, animated add/remove, hover-revealed kill control, optional app grouping. */
export const ProcessTable = React.forwardRef<HTMLTableElement, ProcessTableProps>(
  (
    {
      className,
      processes,
      columns = ["pid", "name", "user", "cpu", "memory", "vram", "state", "started"],
      sort: sortProp,
      defaultSort = { key: "cpu", direction: "desc" },
      onSortChange,
      onKill,
      canKill,
      pendingPids,
      showTotals = true,
      commandMaxLength = 60,
      now: nowProp,
      maxHeight,
      emptyState = "No processes",
      density = "compact",
      exitDuration = 250,
      caption = "Processes",
      groupBy,
      groupName,
      expandedGroups: expandedProp,
      defaultExpandedGroups = [],
      onExpandedGroupsChange,
      onQuitGroup,
      canQuitGroup,
      loading,
      loadingRows = 5,
      ...props
    },
    ref
  ) => {
    const [sort, setSort] = useControllableState<ProcessSort | null>({ value: sortProp, defaultValue: defaultSort, onChange: onSortChange });
    const [expandedList, setExpandedList] = useControllableState<string[]>({
      value: expandedProp,
      defaultValue: defaultExpandedGroups,
      onChange: onExpandedGroupsChange,
    });
    const [confirmingPid, setConfirmingPid] = React.useState<number | null>(null);
    const idPrefix = React.useId().replace(/:/g, "");
    const grouped = groupBy !== undefined;
    const groupKey = groupBy === "app" ? defaultProcessGroupKey : groupBy;
    const sorted = React.useMemo(() => (grouped ? [] : sortProcesses(processes, sort)), [grouped, processes, sort]);
    const tree = React.useMemo(
      () => (grouped ? buildProcessTree(processes, { key: groupKey, name: groupName, sort }) : []),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [grouped, processes, sort, groupBy, groupName]
    );
    const expanded = React.useMemo(() => new Set(expandedList), [expandedList]);
    const now = nowProp ?? Date.now();
    const pending = new Set(pendingPids ?? []);
    const nDensity = normalizeDensity(density);
    const labelCol: ProcessColumn | undefined = columns.includes("name") ? "name" : columns[0];
    const hasActions = Boolean(onKill || (grouped && onQuitGroup));

    const toggleSort = (key: ProcessColumn) => {
      if (sort?.key !== key) setSort({ key, direction: numeric.includes(key) || key === "started" ? "desc" : "asc" });
      else setSort({ key, direction: sort.direction === "asc" ? "desc" : "asc" });
    };
    const dirFor = (key: ProcessColumn): TableSortDirection => (sort?.key === key ? sort.direction : false);

    const setGroupExpanded = (key: string, open: boolean) =>
      setExpandedList((prev) => (open ? (prev.includes(key) ? prev : [...prev, key]) : prev.filter((k) => k !== key)));

    const totals = {
      cpu: processes.reduce((s, p) => s + (p.cpu ?? 0), 0),
      memory: processes.reduce((s, p) => s + (p.memory ?? 0), 0),
      vram: processes.reduce((s, p) => s + (p.vram ?? 0), 0),
    };
    const colCount = columns.length + (hasActions ? 1 : 0);

    const renderCell = (p: ProcessInfo, col: ProcessColumn, group?: ProcessTableGroup) => {
      switch (col) {
        case "pid":
          return <span className="font-mono text-xs text-muted-foreground tabular-nums">{p.pid}</span>;
        case "name": {
          const cmd = p.command ?? p.name;
          const short = cmd.length > commandMaxLength ? `${cmd.slice(0, commandMaxLength - 1)}…` : cmd;
          return (
            <div className="min-w-0 max-w-[22rem]">
              <div className="truncate text-sm font-medium text-foreground">
                {p.name}
                {group && group.name !== p.name ? <span className="sr-only"> ({group.name})</span> : null}
              </div>
              {p.command && p.command !== p.name ? (
                <SimpleTooltip content={<span className="break-all font-mono">{cmd}</span>} contentClassName="max-w-md">
                  <div className="truncate font-mono text-2xs text-muted-foreground" data-command="">
                    <span aria-hidden>{short}</span>
                    <span className="sr-only">{cmd}</span>
                  </div>
                </SimpleTooltip>
              ) : null}
            </div>
          );
        }
        case "user":
          return <span className="font-mono text-xs">{p.user ?? "—"}</span>;
        case "cpu":
          return (
            <span className={cn("font-mono text-xs tabular-nums", (p.cpu ?? 0) >= 80 ? "font-semibold text-warning-soft-foreground" : "")}>
              {p.cpu == null ? "—" : `${p.cpu.toFixed(1)}%`}
            </span>
          );
        case "memory":
          return <span className="font-mono text-xs tabular-nums">{formatBytes(p.memory, PROCESS_BYTES)}</span>;
        case "vram":
          return p.vram ? (
            <span className="font-mono text-xs tabular-nums">
              {formatBytes(p.vram, PROCESS_BYTES)}
              {p.gpuIndex != null ? <span className="ms-1 text-2xs text-muted-foreground">G{p.gpuIndex}</span> : null}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        case "state":
          return p.state ? (
            <span className={cn("inline-flex rounded-control px-1.5 py-0.5 text-2xs font-medium", stateTone[p.state] ?? "bg-muted text-foreground")}>
              {p.state}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        case "started":
          return renderStarted(toMs(p.startedAt));
      }
    };

    const renderStarted = (ms: number | undefined) => {
      if (ms === undefined) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <time dateTime={safeISO(ms)} title={new Date(ms).toLocaleString()} className="font-mono text-xs text-muted-foreground tabular-nums">
          {formatElapsed(now - ms)} ago
        </time>
      );
    };

    const renderRow: RenderRow = (p, state, ctx) => {
      const killable = onKill && (canKill?.(p) ?? true);
      const isPending = pending.has(p.pid);
      return (
        <TableRow
          key={p.pid}
          id={ctx?.id}
          data-pid={p.pid}
          data-group={ctx?.group?.key}
          data-state={state === "idle" ? undefined : state}
          aria-hidden={state === "exit" || undefined}
          className={cn(
            "group/proc transition-[opacity,background-color]",
            presenceRowClass(state),
            p.state === "zombie" && "[&>td]:bg-destructive-soft/40",
            isPending && "opacity-60"
          )}
        >
          {columns.map((col) => (
            <TableCell key={col} align={alignFor(col)} className={cn(nowrapFor(col), ctx?.group && col === labelCol ? childIndent[nDensity] : undefined)}>
              {renderCell(p, col, ctx?.group)}
            </TableCell>
          ))}
          {hasActions ? (
            <TableCell align="right" className="w-px whitespace-nowrap">
              {killable && state !== "exit" ? (
                <KillButton
                  pid={p.pid}
                  name={p.name}
                  loading={isPending}
                  onKill={(signal) => onKill(p, signal)}
                  onConfirmingChange={(s) => setConfirmingPid(s ? p.pid : null)}
                  className={cn(
                    !isPending &&
                      confirmingPid !== p.pid &&
                      "opacity-0 transition-opacity focus-within:opacity-100 group-hover/proc:opacity-100 [@media(hover:none)]:opacity-100"
                  )}
                />
              ) : null}
            </TableCell>
          ) : null}
        </TableRow>
      );
    };

    const renderGroupCell = (group: ProcessTableGroup, col: ProcessColumn) => {
      switch (col) {
        case "cpu":
          return <span className={cn("font-mono text-xs font-medium tabular-nums", group.cpu >= 80 && "text-warning-soft-foreground")}>{group.cpu.toFixed(1)}%</span>;
        case "memory":
          return <span className="font-mono text-xs font-medium tabular-nums">{formatBytes(group.memory, PROCESS_BYTES)}</span>;
        case "vram":
          return group.vram ? (
            <span className="font-mono text-xs font-medium tabular-nums">{formatBytes(group.vram, PROCESS_BYTES)}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        case "user": {
          const user = processGroupUser(group);
          return user ? <span className="font-mono text-xs">{user}</span> : null;
        }
        case "started":
          return renderStarted(processGroupStartedAt(group));
        default:
          return null;
      }
    };

    const renderGroupRow = (group: ProcessTableGroup, state: Presence, open: boolean, childIds: string[]) => {
      const quittable = grouped && onQuitGroup && (canQuitGroup?.(group) ?? true);
      const count = `${group.count} ${pluralize(group.count, "process", "processes")}`;
      return (
        <TableRow
          data-group-row=""
          data-group-key={group.key}
          data-state={state === "idle" ? undefined : state}
          aria-hidden={state === "exit" || undefined}
          className={cn("group/proc transition-[opacity,background-color]", presenceRowClass(state))}
        >
          {columns.map((col) =>
            col === labelCol ? (
              <th
                key={col}
                scope="rowgroup"
                className={cn("border-b border-border text-start align-middle font-normal", groupHeadPadding[nDensity])}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={`${group.name}, ${count}`}
                  tabIndex={state === "exit" ? -1 : undefined}
                  aria-controls={open && childIds.length ? childIds.join(" ") : undefined}
                  onClick={() => setGroupExpanded(group.key, !open)}
                  onKeyDown={(e) => {
                    if (logicalArrow(e) === "ArrowRight" && !open) {
                      e.preventDefault();
                      setGroupExpanded(group.key, true);
                    } else if (logicalArrow(e) === "ArrowLeft" && open) {
                      e.preventDefault();
                      setGroupExpanded(group.key, false);
                    }
                  }}
                  className={cn("-mx-1 flex min-w-0 max-w-[22rem] items-center gap-2 rounded-xs px-1 text-start", focusRing)}
                >
                  <RiArrowRightSLine
                    aria-hidden
                    className={cn("size-4 shrink-0 text-muted-foreground chevron-turn rtl:-scale-x-100", open && "rotate-90 rtl:-rotate-90")}
                  />
                  {group.icon != null ? (
                    <span aria-hidden className="inline-flex size-6 shrink-0 items-center justify-center [&>img]:size-full [&>svg]:size-5">
                      {group.icon}
                    </span>
                  ) : (
                    <Monogram name={group.name} size="sm" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{group.name}</span>
                    <span className="block truncate text-2xs text-muted-foreground" data-slot="process-group-count">
                      {count}
                    </span>
                  </span>
                </button>
              </th>
            ) : (
              <TableCell key={col} align={alignFor(col)} className={nowrapFor(col)}>
                {renderGroupCell(group, col)}
              </TableCell>
            )
          )}
          {hasActions ? (
            <TableCell align="right" className="w-px whitespace-nowrap">
              {quittable && state !== "exit" ? (
                <div className="opacity-0 transition-opacity focus-within:opacity-100 group-hover/proc:opacity-100 has-[[data-state=open]]:opacity-100 [@media(hover:none)]:opacity-100">
                  <ProcessGroupQuit group={group} onQuit={onQuitGroup} />
                </div>
              ) : null}
            </TableCell>
          ) : null}
        </TableRow>
      );
    };

    const emptyBody = (
      <TableBody>
        <TableRow>
          <TableCell colSpan={colCount} className="py-8 text-center text-sm text-muted-foreground">
            {emptyState}
          </TableCell>
        </TableRow>
      </TableBody>
    );

    const skeletonBody = (
      <TableBody data-slot="process-table-skeleton">
        {Array.from({ length: Math.max(1, loadingRows) }, (_, r) => (
          <TableRow key={r}>
            {columns.map((col, c) => (
              <TableCell key={col} align={alignFor(col)}>
                <div className={cn("flex h-5 items-center", alignFor(col) === "right" && "justify-end")}>
                  <Skeleton
                    shape="text"
                    className={cn(
                      "shrink-0",
                      col === "name" ? skeletonNameWidths[r % skeletonNameWidths.length] : skeletonWidth[col],
                      col === "state" && "h-4 rounded-control"
                    )}
                  />
                </div>
                {r === 0 && c === 0 ? <span className="sr-only">Loading processes…</span> : null}
              </TableCell>
            ))}
            {hasActions ? <TableCell className="w-px" /> : null}
          </TableRow>
        ))}
      </TableBody>
    );

    return (
      <Table
        ref={ref}
        aria-busy={loading || undefined}
        density={density}
        stickyHeader={maxHeight !== undefined}
        maxHeight={maxHeight}
        className={className}
        {...props}
      >
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col} align={alignFor(col)} sortDirection={dirFor(col)} onSort={() => toggleSort(col)}>
                {grouped && col === "name" ? "Name" : columnLabel[col]}
              </TableHead>
            ))}
            {hasActions ? (
              <TableHead align="right">
                <span className="sr-only">Actions</span>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        {loading && processes.length === 0 ? (
          skeletonBody
        ) : grouped ? (
          <ProcessTreeBodies
              empty={emptyBody}
              items={tree}
              expanded={expanded}
              exitDuration={exitDuration}
              idPrefix={idPrefix}
              renderRow={renderRow}
              renderGroupRow={renderGroupRow}
            />
        ) : (
          <ProcessRows items={sorted} exitDuration={exitDuration} renderRow={renderRow} empty={emptyBody} />
        )}
        {showTotals && processes.length > 0 ? (
          <TableFooter>
            <TableRow data-totals="">
              {columns.map((col, i) => (
                <TableCell key={col} align={alignFor(col)} className="whitespace-nowrap font-medium">
                  {col === "cpu" ? (
                    <span className="font-mono text-xs tabular-nums">{totals.cpu.toFixed(1)}%</span>
                  ) : col === "memory" ? (
                    <span className="font-mono text-xs tabular-nums">{formatBytes(totals.memory, PROCESS_BYTES)}</span>
                  ) : col === "vram" ? (
                    <span className="font-mono text-xs tabular-nums">{totals.vram ? formatBytes(totals.vram, PROCESS_BYTES) : "—"}</span>
                  ) : i === 0 ? (
                    <span className="text-xs">
                      {processes.length} {pluralize(processes.length, "process", "processes")}
                    </span>
                  ) : null}
                </TableCell>
              ))}
              {hasActions ? <TableCell /> : null}
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    );
  }
);
ProcessTable.displayName = "ProcessTable";
