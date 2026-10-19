import * as React from "react";
import { RiArrowDownSLine, RiCloseLine, RiNotification3Line } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { accentClasses, accentStyle, type Accent } from "../../lib/accent";
import { pluralize } from "../../lib/format";
import { formatMemory } from "../../lib/system-monitor";
import { splitDuration } from "../../lib/duration";
import { toMs, type TimeInput } from "../../lib/time";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useNow } from "../../hooks/use-now";
import { Button } from "../../primitives/button";
import { ConfirmDialog } from "../../primitives/dialog";
import { Monogram } from "../../primitives/monogram";
import { Skeleton } from "../../primitives/progress";
import { StatusBadge } from "../../primitives/status-badge";

/* ------------------------------------------------------------------ */
/* Types and formatters                                                */
/* ------------------------------------------------------------------ */

export type AgentProcessKind = "command" | "server" | "browser" | "tool-server" | "other";

export type AgentProcessSessionStatus = "waiting" | "working" | "idle" | "done" | "error";

/** A process an agent session started (a test runner, a dev server, a browser, an MCP server …). */
export interface AgentProcess {
  pid?: number;
  name: string;
  kind: AgentProcessKind;
  /** CPU percent. */
  cpu?: number;
  /** Port the process listens on. */
  port?: number;
  /** Resident memory, bytes. */
  memoryBytes?: number;
}

export interface AgentProcessSession {
  id: string;
  /** Agent name ("Claude Code", "Codex"). Used as the title when `title` is absent. */
  agent: string;
  /** Agent logo (decorative). Defaults to a monogram of `agent`. */
  icon?: React.ReactNode;
  /** Session title ("Checkout flow tests"). */
  title?: string;
  /** Project or folder the session works in. */
  project?: string;
  /** Where it runs ("in Terminal"). */
  host?: string;
  status: AgentProcessSessionStatus;
  /** When the current status began (shown as "idle 48 min"). */
  statusSince?: TimeInput;
  /** When the session started (shown as "running 48 min"). */
  startedAt?: TimeInput;
  /** Total memory, bytes. Defaults to the sum of the processes' memory. */
  memoryBytes?: number;
  processes?: AgentProcess[];
  /** Overrides the status pill text. */
  statusLabel?: React.ReactNode;
}

/** Labels for each process kind ("tool-server" → "tool server"). */
export const agentProcessKindLabels: Record<AgentProcessKind, string> = {
  command: "command",
  server: "server",
  browser: "browser",
  "tool-server": "tool server",
  other: "process",
};

/** Coarse elapsed time for agent sessions: "<1 min", "48 min", "2 hr 5 min", "3 d 4 hr" (floored). */
export function formatAgentRunTime(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  const { days: d, hours: h, minutes: m } = splitDuration(ms);
  if (d) return h ? `${d} d ${h} hr` : `${d} d`;
  if (h) return m ? `${h} hr ${m} min` : `${h} hr`;
  return m ? `${m} min` : "<1 min";
}

/** Memory text such as "411 MB" or "1.2 GB". */

/** The session's memory: its own figure, or the sum of its processes' memory (undefined when nothing is known). */
export function agentSessionMemory(session: Pick<AgentProcessSession, "memoryBytes" | "processes">): number | undefined {
  if (typeof session.memoryBytes === "number" && Number.isFinite(session.memoryBytes)) return session.memoryBytes;
  let total: number | undefined;
  for (const p of session.processes ?? []) {
    if (typeof p.memoryBytes === "number" && Number.isFinite(p.memoryBytes)) total = (total ?? 0) + p.memoryBytes;
  }
  return total;
}

const cpuFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

function processDetail(p: AgentProcess): string[] {
  const parts: string[] = [agentProcessKindLabels[p.kind] ?? p.kind];
  if (typeof p.cpu === "number" && Number.isFinite(p.cpu)) {
    parts.push(`${cpuFormat.format(p.cpu >= 10 ? Math.round(p.cpu) : p.cpu)}% CPU`);
  }
  if (typeof p.port === "number" && Number.isFinite(p.port)) parts.push(`port ${p.port}`);
  return parts;
}

function sinceText(value: TimeInput | undefined, now: number): string | undefined {
  const ms = toMs(value);
  return ms === undefined ? undefined : formatAgentRunTime(now - ms);
}

/* ------------------------------------------------------------------ */
/* Status pill                                                         */
/* ------------------------------------------------------------------ */

function statusPill(session: AgentProcessSession, now: number) {
  const since = sinceText(session.statusSince, now);
  switch (session.status) {
    case "waiting":
      return (
        <StatusBadge tone="primary" icon={<RiNotification3Line />} className={accentClasses.soft}>
          {session.statusLabel ?? "Waiting for you"}
        </StatusBadge>
      );
    case "working":
      return (
        <StatusBadge tone="success" icon="dot" pulse>
          {session.statusLabel ?? (since ? `working ${since}` : "working")}
        </StatusBadge>
      );
    case "error":
      return (
        <StatusBadge tone="destructive" icon="dot">
          {session.statusLabel ?? "error"}
        </StatusBadge>
      );
    case "done":
      return (
        <StatusBadge tone="neutral" icon={null}>
          {session.statusLabel ?? (since ? `done ${since} ago` : "done")}
        </StatusBadge>
      );
    case "idle":
    default:
      return (
        <StatusBadge tone="neutral" icon={null}>
          {session.statusLabel ?? (since ? `idle ${since}` : "idle")}
        </StatusBadge>
      );
  }
}

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

const processRowWidths = [
  ["w-28", "w-24"],
  ["w-20", "w-28"],
  ["w-32", "w-20"],
  ["w-24", "w-24"],
] as const;

/** Placeholder process rows in the card's row layout. */
function AgentProcessRowSkeletons({ count }: { count: number }) {
  return (
    <ul aria-hidden data-slot="agent-process-skeleton" className="flex flex-col">
      {Array.from({ length: Math.max(0, count) }, (_, i) => {
        const [name, detail] = processRowWidths[i % processRowWidths.length]!;
        return (
          <li key={i} className="flex min-h-9 items-center gap-3 py-1 text-sm">
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <Skeleton shape="text" className={name} />
              <Skeleton shape="text" className={detail} />
            </span>
            <Skeleton shape="text" className="w-12 shrink-0" />
          </li>
        );
      })}
    </ul>
  );
}

/** A whole session in the card's layout: logo, title, pill, subtitle, memory, the "Started" label and process rows. */
function AgentProcessCardSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center">
          <Skeleton shape="circle" className="size-8" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex h-[22px] items-center gap-2">
            <Skeleton shape="text" className="w-36" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="mt-0.5 flex h-5 items-center">
            <Skeleton shape="text" className="w-48 max-w-full" />
          </div>
        </div>
        <Skeleton shape="text" className="w-14 shrink-0" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex h-5 items-center text-sm">
          <Skeleton shape="text" className="w-20" />
        </div>
        <AgentProcessRowSkeletons count={rows} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AgentProcessCard                                                    */
/* ------------------------------------------------------------------ */

export interface AgentProcessCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The session. May be left out while `loading` (the whole card is a placeholder). */
  session?: AgentProcessSession;
  /**
   * Waiting for data: with no `session` the whole card is a placeholder; with a session whose `processes` are not
   * known yet the header is real and the process rows are placeholders (no Quit button).
   */
  loading?: boolean;
  /** Placeholder process rows while loading. Default 3. */
  loadingRows?: number;
  /** Called after the "Quit Session…" confirmation. May return a promise (the dialog waits). */
  onQuit?: (sessionId: string) => void | Promise<void>;
  /** Adds a stop button to each process row. */
  onStopProcess?: (sessionId: string, process: AgentProcess) => void;
  /** Makes the title a button. */
  onOpen?: (sessionId: string) => void;
  /** Reference time for durations. Default: the clock, refreshed every 30 s. */
  now?: TimeInput;
  /** Default violet. */
  accent?: Accent;
  /** Lets the process list collapse behind the "Started · N" toggle. */
  collapsible?: boolean;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

/** One agent session: logo, title, status pill, "agent · project · running 48 min", memory and the processes it started. */
export const AgentProcessCard = React.forwardRef<HTMLElement, AgentProcessCardProps>(
  (
    {
      session,
      onQuit,
      onStopProcess,
      onOpen,
      now: nowProp,
      accent = "violet",
      collapsible = false,
      expanded: expandedProp,
      defaultExpanded = true,
      onExpandedChange,
      loading,
      loadingRows = 3,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const now = useNow({ fixed: nowProp, interval: 30_000 });
    const [expandedState, setExpanded] = useControllableState({
      value: expandedProp,
      defaultValue: defaultExpanded,
      onChange: onExpandedChange,
    });
    const expanded = !collapsible || expandedState;
    const titleId = React.useId();
    const listId = React.useId();

    if (!session) {
      if (!loading) return null;
      return (
        <div
          ref={ref as React.Ref<HTMLDivElement>}
          aria-busy
          data-slot="agent-process-card-skeleton"
          className={cn("flex flex-col gap-3 py-4", className)}
          style={accentStyle(accent, style)}
          {...props}
        >
          <AgentProcessCardSkeleton rows={loadingRows} />
          <span className="sr-only">Loading agent session…</span>
        </div>
      );
    }

    const processesPending = Boolean(loading) && session.processes === undefined;
    const title = session.title || session.agent;
    const processes = session.processes ?? [];
    const memory = agentSessionMemory(session);
    const runtime =
      session.status !== "done" && session.status !== "error" ? sinceText(session.startedAt, now) : undefined;
    const subtitle = [
      session.title ? session.agent : undefined,
      session.project,
      session.host,
      runtime ? `running ${runtime}` : undefined,
      processes.length === 0 && !processesPending ? "Nothing started" : undefined,
    ].filter(Boolean);

    const startedLabel = `Started · ${processes.length}`;

    return (
      <article
        ref={ref}
        aria-busy={loading || undefined}
        aria-labelledby={titleId}
        data-status={session.status}
        className={cn("flex flex-col gap-3 py-4", className)}
        style={accentStyle(accent, style)}
        {...props}
      >
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center text-foreground [&_svg]:size-7">
            {session.icon ?? <Monogram name={session.agent} size="sm" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {onOpen ? (
                <button
                  type="button"
                  id={titleId}
                  onClick={() => onOpen(session.id)}
                  className={cn(
                    "min-w-0 truncate rounded-xs text-left text-sm font-semibold text-foreground hover:underline",
                    focusRing
                  )}
                >
                  {title}
                </button>
              ) : (
                <span id={titleId} className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {title}
                </span>
              )}
              {statusPill(session, now)}
            </div>
            {subtitle.length > 0 && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle.join(" · ")}</p>}
          </div>
          {memory !== undefined ? (
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              <span className="sr-only">Memory </span>
              {formatMemory(memory)}
            </span>
          ) : processesPending ? (
            <Skeleton shape="text" className="w-14 shrink-0" />
          ) : null}
        </div>

        {processesPending && (
          <div className="flex flex-col gap-1">
            <div aria-hidden className="flex h-5 items-center text-sm">
              <Skeleton shape="text" className="w-20" />
            </div>
            <AgentProcessRowSkeletons count={loadingRows} />
            <span className="sr-only">Loading processes…</span>
          </div>
        )}

        {processes.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              {collapsible ? (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={listId}
                  onClick={() => setExpanded(!expandedState)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-xs text-sm font-medium text-muted-foreground hover:text-foreground",
                    focusRing
                  )}
                >
                  {startedLabel}
                  <RiArrowDownSLine aria-hidden className={cn("size-4 transition-transform", !expanded && "-rotate-90")} />
                </button>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">{startedLabel}</span>
              )}
              {onQuit && (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="secondary">
                      Quit Session…
                    </Button>
                  }
                  title="Quit this session?"
                  description={`It will stop ${processes.length} ${pluralize(processes.length, "process", "processes")} it started.`}
                  confirmLabel="Quit Session"
                  tone="destructive"
                  onConfirm={() => onQuit(session.id)}
                />
              )}
            </div>
            {expanded && (
              <ul id={listId} aria-label={`Processes started by ${title}`} className="flex flex-col">
                {processes.map((p, i) => (
                  <li
                    key={p.pid ?? `${p.name}-${i}`}
                    data-kind={p.kind}
                    className="group flex min-h-9 items-center gap-3 py-1 text-sm"
                    title={p.pid !== undefined ? `PID ${p.pid}` : undefined}
                  >
                    <span className="flex min-w-0 flex-1 items-baseline gap-2">
                      <span className="truncate text-foreground">{p.name}</span>
                      <span className="shrink-0 truncate text-muted-foreground">{processDetail(p).join(" · ")}</span>
                    </span>
                    {typeof p.memoryBytes === "number" && (
                      <span className="shrink-0 tabular-nums text-muted-foreground">{formatMemory(p.memoryBytes)}</span>
                    )}
                    {onStopProcess && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Stop ${p.name}`}
                        onClick={() => onStopProcess(session.id, p)}
                        className="shrink-0"
                      >
                        <RiCloseLine aria-hidden className="size-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </article>
    );
  }
);
AgentProcessCard.displayName = "AgentProcessCard";

/* ------------------------------------------------------------------ */
/* AgentProcessList                                                    */
/* ------------------------------------------------------------------ */

export interface AgentProcessListProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    Pick<AgentProcessCardProps, "onQuit" | "onStopProcess" | "onOpen" | "now" | "accent" | "collapsible"> {
  sessions: AgentProcessSession[];
  /** Ids of the sessions whose process list is open (with `collapsible`). Default: all. */
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (expanded: string[]) => void;
  /** Accessible name of the list. Default "Agent sessions". */
  label?: string;
  emptyState?: React.ReactNode;
  /** Waiting for sessions: with none yet, `loadingRows` placeholder sessions stand in; sessions without `processes` show placeholder rows. */
  loading?: boolean;
  /** Placeholder sessions while loading with none. Default 3. */
  loadingRows?: number;
}

/**
 * Running agent sessions and the processes each one started, separated by rules; "Quit Session…" confirms first.
 * A session that starts waiting for the user is announced once (politely); durations never sit in a live region.
 */
export const AgentProcessList = React.forwardRef<HTMLDivElement, AgentProcessListProps>(
  (
    {
      sessions,
      onQuit,
      onStopProcess,
      onOpen,
      now,
      accent = "violet",
      collapsible,
      expanded: expandedProp,
      defaultExpanded,
      onExpandedChange,
      label = "Agent sessions",
      emptyState = "No agent sessions",
      loading,
      loadingRows = 3,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [expandedIds, setExpandedIds] = useControllableState<string[] | undefined>({
      value: expandedProp,
      defaultValue: defaultExpanded,
      onChange: onExpandedChange as ((v: string[] | undefined) => void) | undefined,
    });
    const isExpanded = (id: string) => (expandedIds ? expandedIds.includes(id) : true);
    const toggle = (id: string, open: boolean) => {
      const current = expandedIds ?? sessions.map((s) => s.id);
      setExpandedIds(open ? [...current.filter((x) => x !== id), id] : current.filter((x) => x !== id));
    };

    const announcement = useWaitingAnnouncement(sessions);

    return (
      <div
        ref={ref}
        aria-busy={loading || undefined}
        className={cn("rounded-box border border-border bg-card px-5 text-card-foreground", className)}
        style={accentStyle(accent, style)}
        {...props}
      >
        {sessions.length === 0 && loading ? (
          <>
            <ul aria-hidden className="flex flex-col divide-y divide-border">
              {Array.from({ length: Math.max(1, loadingRows) }, (_, i) => (
                <li key={i} data-slot="agent-process-list-skeleton" className="py-4">
                  <AgentProcessCardSkeleton rows={2} />
                </li>
              ))}
            </ul>
            <span className="sr-only">Loading agent sessions…</span>
          </>
        ) : sessions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{emptyState}</div>
        ) : (
          <ul aria-label={label} className="flex flex-col divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.id}>
                <AgentProcessCard
                  session={s}
                  onQuit={onQuit}
                  onStopProcess={onStopProcess}
                  onOpen={onOpen}
                  now={now}
                  accent={accent}
                  collapsible={collapsible}
                  expanded={collapsible ? isExpanded(s.id) : undefined}
                  onExpandedChange={(open) => toggle(s.id, open)}
                  loading={loading && s.processes === undefined ? true : undefined}
                />
              </li>
            ))}
          </ul>
        )}
        <span role="status" aria-live="polite" className="sr-only">
          {announcement}
        </span>
      </div>
    );
  }
);
AgentProcessList.displayName = "AgentProcessList";

/** Text for the live region: set only when a session newly enters "waiting", never on mount or re-render. */
function useWaitingAnnouncement(sessions: AgentProcessSession[]): string {
  const [text, setText] = React.useState("");
  const prevRef = React.useRef<Map<string, AgentProcessSessionStatus> | null>(null);
  const key = sessions.map((s) => `${s.id}:${s.status}`).join("|");
  React.useEffect(() => {
    const current = new Map(sessions.map((s) => [s.id, s.status] as const));
    const prev = prevRef.current;
    prevRef.current = current;
    if (!prev) return;
    const newlyWaiting = sessions.filter((s) => s.status === "waiting" && prev.get(s.id) !== "waiting");
    if (newlyWaiting.length > 0) {
      setText(newlyWaiting.map((s) => `${s.title || s.agent} is waiting for you`).join(". "));
    }
    // `key` captures every id/status change; `sessions` identity alone changes on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return text;
}
