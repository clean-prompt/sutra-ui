import * as React from "react";
import { RiCloseCircleLine, RiSkullLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { Button } from "./button";
import { Spinner } from "./spinner";
import { SimpleTooltip } from "./tooltip";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow, type TableSortDirection } from "./table";

export type KillSignal = "SIGTERM" | "SIGKILL";

/* ------------------------------------------------------------------ */
/* KillButton                                                          */
/* ------------------------------------------------------------------ */

export interface KillButtonProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  pid: number;
  /** Process name, used in labels. */
  name?: string;
  onKill: (signal: KillSignal) => void | Promise<unknown>;
  /** External pending state (e.g. waiting for the process to exit). */
  pending?: boolean;
  disabled?: boolean;
  /** Called when the confirm step opens / closes. */
  onConfirmingChange?: (signal: KillSignal | null) => void;
}

/** Two-mode kill control (SIGTERM / SIGKILL) with an inline "Kill 1234? Confirm / Cancel" step. */
export const KillButton = React.forwardRef<HTMLDivElement, KillButtonProps>(
  ({ className, pid, name, onKill, pending: pendingProp, disabled, onConfirmingChange, ...props }, ref) => {
    const [confirming, setConfirmingState] = React.useState<KillSignal | null>(null);
    const [busy, setBusy] = React.useState(false);
    const confirmRef = React.useRef<HTMLButtonElement>(null);
    const termRef = React.useRef<HTMLButtonElement>(null);
    const mounted = React.useRef(true);
    React.useEffect(() => {
      // Set on every mount: React may unmount and remount (StrictMode, <Activity>).
      mounted.current = true;
      return () => {
        mounted.current = false;
      };
    }, []);
    const pending = pendingProp || busy;

    const setConfirming = (s: KillSignal | null) => {
      setConfirmingState(s);
      onConfirmingChange?.(s);
    };

    React.useEffect(() => {
      if (confirming) confirmRef.current?.focus();
    }, [confirming]);

    const confirm = async () => {
      if (!confirming) return;
      const signal = confirming;
      setConfirming(null);
      const result = onKill(signal);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        setBusy(true);
        try {
          await result;
        } finally {
          if (mounted.current) setBusy(false);
        }
      }
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
  startedAt?: Date | number | string;
}

export type ProcessColumn = "pid" | "name" | "user" | "cpu" | "memory" | "vram" | "state" | "started";

export interface ProcessSort {
  key: ProcessColumn;
  direction: "asc" | "desc";
}

/** Human bytes: 1536 → "1.5 KB" (base 1024). */
export function formatProcessBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (Math.abs(v) >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${i === 0 ? v : v >= 100 ? Math.round(v) : Number(v.toFixed(1))} ${units[i]}`;
}

const toMs = (t: Date | number | string) => (t instanceof Date ? t.getTime() : typeof t === "number" ? t : new Date(t).getTime());

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

const sortValue = (p: ProcessInfo, key: ProcessColumn): number | string => {
  switch (key) {
    case "pid":
      return p.pid;
    case "name":
      return p.name.toLowerCase();
    case "user":
      return (p.user ?? "").toLowerCase();
    case "cpu":
      return p.cpu ?? -1;
    case "memory":
      return p.memory ?? -1;
    case "vram":
      return p.vram ?? -1;
    case "state":
      return p.state ?? "";
    case "started":
      return p.startedAt != null ? toMs(p.startedAt) : 0;
  }
};

/** Sort processes by a column (stable, nulls last for desc). */
export function sortProcesses(processes: ProcessInfo[], sort: ProcessSort | null): ProcessInfo[] {
  if (!sort) return processes;
  const dir = sort.direction === "asc" ? 1 : -1;
  return processes
    .map((p, i) => [p, i] as const)
    .sort(([a, ia], [b, ib]) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      return (va < vb ? -1 : va > vb ? 1 : ia - ib) * (va === vb ? 1 : dir);
    })
    .map(([p]) => p);
}

type Presence = "enter" | "idle" | "exit";

/** Keeps removed rows briefly (state "exit") so they can animate out; new rows get "enter". */
function usePresence(items: ProcessInfo[], duration: number) {
  const seen = React.useRef<Set<number> | null>(null);
  const prevList = React.useRef<ProcessInfo[]>([]);
  const [exiting, setExiting] = React.useState<Map<number, { item: ProcessInfo; index: number }>>(new Map());

  const currentPids = new Set(items.map((p) => p.pid));
  const firstRender = seen.current === null;
  if (seen.current === null) seen.current = new Set(currentPids);

  React.useEffect(() => {
    const removed = new Map<number, { item: ProcessInfo; index: number }>();
    prevList.current.forEach((p, index) => {
      if (!currentPids.has(p.pid)) removed.set(p.pid, { item: p, index });
    });
    prevList.current = items;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (removed.size) {
      setExiting((prev) => new Map([...prev, ...removed]));
      timers.push(
        setTimeout(() => {
          setExiting((prev) => {
            const next = new Map(prev);
            for (const pid of removed.keys()) next.delete(pid);
            return next;
          });
        }, duration)
      );
    }
    for (const pid of currentPids) seen.current!.add(pid);
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const rows: { item: ProcessInfo; state: Presence }[] = items.map((item) => ({
    item,
    state: !firstRender && !seen.current!.has(item.pid) ? "enter" : "idle",
  }));
  for (const [pid, { item, index }] of exiting) {
    if (currentPids.has(pid)) continue;
    rows.splice(Math.min(index, rows.length), 0, { item, state: "exit" });
  }
  return rows;
}

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

const stateTone: Record<string, string> = {
  running: "bg-success-soft text-success-soft-foreground",
  sleeping: "bg-muted text-muted-foreground",
  idle: "bg-muted text-muted-foreground",
  stopped: "bg-warning-soft text-warning-soft-foreground",
  zombie: "bg-destructive-soft text-destructive-soft-foreground",
};

export interface ProcessTableProps extends Omit<React.HTMLAttributes<HTMLTableElement>, "children"> {
  processes: ProcessInfo[];
  /** Visible columns, in order. */
  columns?: ProcessColumn[];
  sort?: ProcessSort | null;
  defaultSort?: ProcessSort | null;
  onSortChange?: (sort: ProcessSort | null) => void;
  /** Enables the kill column. */
  onKill?: (process: ProcessInfo, signal: KillSignal) => void | Promise<unknown>;
  /** Whether a given process can be killed (default all). */
  canKill?: (process: ProcessInfo) => boolean;
  /** PIDs with a kill in flight. */
  pendingPids?: number[];
  showTotals?: boolean;
  /** Command column truncation in characters for the visible text. Default 60. */
  commandMaxLength?: number;
  /** "now" for the started column. */
  now?: number;
  maxHeight?: number | string;
  emptyState?: React.ReactNode;
  density?: "compact" | "normal" | "relaxed";
  /** Row exit animation duration ms. Default 250. */
  exitDuration?: number;
  /** Accessible table caption. */
  caption?: string;
}

/** Live process list: sortable columns, totals, animated add/remove and hover-revealed kill control. */
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
      ...props
    },
    ref
  ) => {
    const [sortState, setSortState] = React.useState<ProcessSort | null>(defaultSort);
    const sort = sortProp !== undefined ? sortProp : sortState;
    const setSort = (s: ProcessSort | null) => {
      if (sortProp === undefined) setSortState(s);
      onSortChange?.(s);
    };
    const [confirmingPid, setConfirmingPid] = React.useState<number | null>(null);
    const sorted = React.useMemo(() => sortProcesses(processes, sort), [processes, sort]);
    const rows = usePresence(sorted, exitDuration);
    const now = nowProp ?? Date.now();
    const pending = new Set(pendingPids ?? []);

    const toggleSort = (key: ProcessColumn) => {
      if (sort?.key !== key) setSort({ key, direction: numeric.includes(key) || key === "started" ? "desc" : "asc" });
      else setSort({ key, direction: sort.direction === "asc" ? "desc" : "asc" });
    };
    const dirFor = (key: ProcessColumn): TableSortDirection => (sort?.key === key ? sort.direction : false);

    const totals = {
      cpu: processes.reduce((s, p) => s + (p.cpu ?? 0), 0),
      memory: processes.reduce((s, p) => s + (p.memory ?? 0), 0),
      vram: processes.reduce((s, p) => s + (p.vram ?? 0), 0),
    };
    const colCount = columns.length + (onKill ? 1 : 0);

    const renderCell = (p: ProcessInfo, col: ProcessColumn) => {
      switch (col) {
        case "pid":
          return <span className="font-mono text-xs text-muted-foreground tabular-nums">{p.pid}</span>;
        case "name": {
          const cmd = p.command ?? p.name;
          const short = cmd.length > commandMaxLength ? `${cmd.slice(0, commandMaxLength - 1)}…` : cmd;
          return (
            <div className="min-w-0 max-w-[22rem]">
              <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
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
          return <span className="font-mono text-xs tabular-nums">{formatProcessBytes(p.memory)}</span>;
        case "vram":
          return p.vram ? (
            <span className="font-mono text-xs tabular-nums">
              {formatProcessBytes(p.vram)}
              {p.gpuIndex != null ? <span className="ml-1 text-2xs text-muted-foreground">G{p.gpuIndex}</span> : null}
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
        case "started": {
          if (p.startedAt == null) return <span className="text-xs text-muted-foreground">—</span>;
          const ms = toMs(p.startedAt);
          return (
            <time dateTime={new Date(ms).toISOString()} title={new Date(ms).toLocaleString()} className="font-mono text-xs text-muted-foreground tabular-nums">
              {formatElapsed(now - ms)} ago
            </time>
          );
        }
      }
    };

    return (
      <Table ref={ref} density={density} stickyHeader={maxHeight !== undefined} maxHeight={maxHeight} className={className} {...props}>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col} align={numeric.includes(col) && col !== "pid" ? "right" : "left"} sortDirection={dirFor(col)} onSort={() => toggleSort(col)}>
                {columnLabel[col]}
              </TableHead>
            ))}
            {onKill ? (
              <TableHead align="right">
                <span className="sr-only">Actions</span>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colCount} className="py-8 text-center text-sm text-muted-foreground">
                {emptyState}
              </TableCell>
            </TableRow>
          ) : (
            rows.map(({ item: p, state }) => {
              const killable = onKill && (canKill?.(p) ?? true);
              const isPending = pending.has(p.pid);
              return (
                <TableRow
                  key={p.pid}
                  data-pid={p.pid}
                  data-state={state === "idle" ? undefined : state}
                  aria-hidden={state === "exit" || undefined}
                  className={cn(
                    "group/proc transition-[opacity,background-color]",
                    state === "enter" && "animate-in fade-in-0 slide-in-from-top-1 duration-300 [&>td]:bg-primary-soft/40",
                    state === "exit" && "pointer-events-none animate-out fade-out-0 opacity-0 duration-300 [&>td]:line-through",
                    p.state === "zombie" && "[&>td]:bg-destructive-soft/40",
                    isPending && "opacity-60"
                  )}
                >
                  {columns.map((col) => (
                    <TableCell key={col} align={numeric.includes(col) && col !== "pid" ? "right" : "left"}>
                      {renderCell(p, col)}
                    </TableCell>
                  ))}
                  {onKill ? (
                    <TableCell align="right" className="w-px whitespace-nowrap">
                      {killable && state !== "exit" ? (
                        <KillButton
                          pid={p.pid}
                          name={p.name}
                          pending={isPending}
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
            })
          )}
        </TableBody>
        {showTotals && processes.length > 0 ? (
          <TableFooter>
            <TableRow data-totals="">
              {columns.map((col, i) => (
                <TableCell key={col} align={numeric.includes(col) && col !== "pid" ? "right" : "left"} className="font-medium">
                  {col === "cpu" ? (
                    <span className="font-mono text-xs tabular-nums">{totals.cpu.toFixed(1)}%</span>
                  ) : col === "memory" ? (
                    <span className="font-mono text-xs tabular-nums">{formatProcessBytes(totals.memory)}</span>
                  ) : col === "vram" ? (
                    <span className="font-mono text-xs tabular-nums">{totals.vram ? formatProcessBytes(totals.vram) : "—"}</span>
                  ) : i === 0 ? (
                    <span className="text-xs">
                      {processes.length} {processes.length === 1 ? "process" : "processes"}
                    </span>
                  ) : null}
                </TableCell>
              ))}
              {onKill ? <TableCell /> : null}
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    );
  }
);
ProcessTable.displayName = "ProcessTable";
