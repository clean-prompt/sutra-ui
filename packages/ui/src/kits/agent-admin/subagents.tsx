import * as React from "react";
import {
  RiArrowRightSLine,
  RiCheckLine,
  RiCloseLine,
  RiExternalLinkLine,
  RiForbidLine,
  RiSendPlane2Line,
  RiStopFill,
  RiTimeLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { formatDuration } from "../../lib/duration";
import { formatCost, formatTokens } from "../../lib/format";
import { normalizeTaskStatus, type TaskStatusInput } from "../../lib/status";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useNow } from "../../hooks/use-now";
import { heatmapColor, heatmapLevel } from "../../patterns/heatmap";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";
import { StatusDot, type StatusDotProps } from "../../primitives/status-badge";

/* ------------------------------------------------------------------ */
/* Types + helpers                                                     */
/* ------------------------------------------------------------------ */

export type SubagentStatus = "running" | "done" | "failed" | "waiting";

/** What `status` accepts: the subagent states plus canonical `TaskStatus` values and legacy spellings. */
export type SubagentStatusInput = SubagentStatus | TaskStatusInput;

/** Resolved display status (`canceled` renders as a neutral, finished glyph). */
type SubagentDisplayStatus = SubagentStatus | "canceled";

const fromTaskStatus = { pending: "waiting", running: "running", succeeded: "done", failed: "failed", canceled: "canceled" } as const;

function resolveStatus(status: SubagentStatusInput | undefined): SubagentDisplayStatus {
  if (status === "done" || status === "waiting") return status;
  return fromTaskStatus[normalizeTaskStatus(status)];
}

export interface SubagentNode {
  id: string;
  name: string;
  /** Agent type, e.g. "researcher". */
  type?: string;
  task?: string;
  /** Accepts canonical `TaskStatus` values too (`succeeded` → done, `pending` → waiting). */
  status: SubagentStatusInput;
  /** Latest activity line (streamed). */
  activity?: string;
  startedAt?: number;
  endedAt?: number;
  /** Explicit elapsed time; overrides start / end. */
  elapsedMs?: number;
  tools?: number;
  tokens?: number;
  cost?: number;
  /** Activity level 0–1 (e.g. events per second, normalized). Drives the heat color. */
  heat?: number;
  /** Batch position, rendered "[3/9]". */
  batch?: { index: number; total: number };
  children?: SubagentNode[];
}

export interface SubagentRollup {
  tools: number;
  agents: number;
  tokens: number;
  cost: number;
}

/** Sum tools / tokens / cost over a node and its descendants, and count descendant agents. */
export function subagentRollup(node: SubagentNode): SubagentRollup {
  const out: SubagentRollup = { tools: node.tools ?? 0, agents: 0, tokens: node.tokens ?? 0, cost: node.cost ?? 0 };
  for (const c of node.children ?? []) {
    const r = subagentRollup(c);
    out.tools += r.tools;
    out.agents += r.agents + 1;
    out.tokens += r.tokens;
    out.cost += r.cost;
  }
  return out;
}

/** Elapsed ms for a node at `now`. */
export function subagentElapsed(node: SubagentNode, now: number): number {
  if (node.elapsedMs != null) return node.elapsedMs;
  if (node.startedAt == null) return 0;
  return Math.max(0, (node.endedAt ?? now) - node.startedAt);
}

/** "42s", "3m 05s", "1h 02m". */
export function formatSubagentElapsed(ms: number): string {
  return formatDuration(ms, { pad: true, round: "floor" });
}

/** "$0.123" under a dollar, "$1.23" above. */
function fmtCost(n: number) {
  const digits = n < 1 ? 3 : 2;
  return formatCost(n, { maxFraction: digits, minFraction: digits, tiny: 0.001 });
}

const statusLabel: Record<SubagentDisplayStatus, string> = { running: "Running", done: "Done", failed: "Failed", waiting: "Waiting", canceled: "Canceled" };
const statusRank: Record<SubagentDisplayStatus, number> = { running: 0, waiting: 1, failed: 2, canceled: 3, done: 4 };

export interface SubagentStatusGlyphProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: SubagentStatusInput;
}

const statusGlyph: Record<SubagentDisplayStatus, Pick<StatusDotProps, "tone" | "icon" | "variant">> = {
  running: { tone: "primary", icon: "spinner", variant: "hollow" },
  done: { tone: "success", icon: <RiCheckLine aria-hidden />, variant: "solid" },
  failed: { tone: "destructive", icon: <RiCloseLine aria-hidden />, variant: "solid" },
  canceled: { tone: "neutral", icon: <RiForbidLine aria-hidden />, variant: "hollow" },
  waiting: { tone: "neutral", icon: <RiTimeLine aria-hidden className="!size-3.5" />, variant: "hollow" },
};

/** Small status glyph (a StatusDot preset): spinner (running), check (done), cross (failed), clock (waiting), forbid (canceled). */
export const SubagentStatusGlyph = React.forwardRef<HTMLSpanElement, SubagentStatusGlyphProps>(function SubagentStatusGlyph(
  { status: statusProp, ...props },
  ref
) {
  const status = resolveStatus(statusProp);
  return <StatusDot ref={ref} {...statusGlyph[status]} label={statusLabel[status]} data-status={status} {...props} />;
});
SubagentStatusGlyph.displayName = "SubagentStatusGlyph";

/* ------------------------------------------------------------------ */
/* SubagentTree                                                        */
/* ------------------------------------------------------------------ */

export type SubagentSort = "none" | "status" | "elapsed" | "cost";

export interface SubagentTreeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  nodes: SubagentNode[];
  /** Expanded node ids. Default: every node with children. */
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (ids: string[]) => void;
  sort?: SubagentSort;
  defaultSort?: SubagentSort;
  onSortChange?: (sort: SubagentSort) => void;
  runningOnly?: boolean;
  defaultRunningOnly?: boolean;
  onRunningOnlyChange?: (on: boolean) => void;
  /** Sends steering text into a running subagent. Shows a Steer button on running nodes. */
  onSteer?: (id: string, text: string) => void;
  /** Stops a running subagent. */
  onStop?: (id: string) => void;
  /** Opens the subagent's transcript (Enter on a node without children, or the open button). */
  onOpen?: (id: string) => void;
  /** Reference time for elapsed. When omitted the tree ticks every second while anything runs. */
  now?: number;
  /** Hide sort / filter controls. */
  hideToolbar?: boolean;
  label?: string;
}

function collectIds(nodes: SubagentNode[], acc: string[] = []) {
  for (const n of nodes) {
    if (n.children?.length) {
      acc.push(n.id);
      collectIds(n.children, acc);
    }
  }
  return acc;
}

function hasRunning(n: SubagentNode): boolean {
  return resolveStatus(n.status) === "running" || (n.children ?? []).some(hasRunning);
}

interface FlatRow {
  node: SubagentNode;
  level: number;
  parentId: string | null;
  posinset: number;
  setsize: number;
  last: boolean;
  visibleChildren: SubagentNode[];
}

/** Nested delegation tree with rails, live activity, rollups, heat, sort / filter, steering and WAI-ARIA keyboard navigation. */
export const SubagentTree = React.forwardRef<HTMLDivElement, SubagentTreeProps>(
  (
    {
      nodes,
      expanded: expandedProp,
      defaultExpanded,
      onExpandedChange,
      sort: sortProp,
      defaultSort = "none",
      onSortChange,
      runningOnly: runningOnlyProp,
      defaultRunningOnly = false,
      onRunningOnlyChange,
      onSteer,
      onStop,
      onOpen,
      now: nowProp,
      hideToolbar,
      label = "Subagents",
      className,
      ...props
    },
    ref
  ) => {
    const [expanded, setExpanded] = useControllableState<string[]>({
      value: expandedProp,
      defaultValue: defaultExpanded ?? collectIds(nodes),
      onChange: onExpandedChange,
    });
    const [sort, setSort] = useControllableState<SubagentSort>({ value: sortProp, defaultValue: defaultSort, onChange: onSortChange });
    const [runningOnly, setRunningOnly] = useControllableState<boolean>({
      value: runningOnlyProp,
      defaultValue: defaultRunningOnly,
      onChange: onRunningOnlyChange,
    });
    const anyRunning = nodes.some(hasRunning);
    const tick = useNow({ active: nowProp == null && anyRunning });
    const now = nowProp ?? tick;

    const [focusId, setFocusId] = React.useState<string | null>(null);
    const [steering, setSteering] = React.useState<string | null>(null);
    const [steerText, setSteerText] = React.useState("");
    const itemRefs = React.useRef(new Map<string, HTMLLIElement>());

    const arrange = React.useCallback(
      (list: SubagentNode[]) => {
        let out = runningOnly ? list.filter(hasRunning) : list;
        if (sort !== "none") {
          out = [...out].sort((a, b) => {
            if (sort === "status") return statusRank[resolveStatus(a.status)] - statusRank[resolveStatus(b.status)];
            if (sort === "elapsed") return subagentElapsed(b, now) - subagentElapsed(a, now);
            return subagentRollup(b).cost - subagentRollup(a).cost;
          });
        }
        return out;
      },
      [runningOnly, sort, now]
    );

    const rows = React.useMemo(() => {
      const out: FlatRow[] = [];
      const walk = (list: SubagentNode[], level: number, parentId: string | null) => {
        const arranged = arrange(list);
        arranged.forEach((n, i) => {
          const visibleChildren = arrange(n.children ?? []);
          out.push({ node: n, level, parentId, posinset: i + 1, setsize: arranged.length, last: i === arranged.length - 1, visibleChildren });
          if (visibleChildren.length && expanded.includes(n.id)) walk(n.children ?? [], level + 1, n.id);
        });
      };
      walk(nodes, 1, null);
      return out;
    }, [nodes, arrange, expanded]);

    const activeId = focusId && rows.some((r) => r.node.id === focusId) ? focusId : (rows[0]?.node.id ?? null);

    const focus = (id: string) => {
      setFocusId(id);
      itemRefs.current.get(id)?.focus();
    };
    const toggle = (id: string, open?: boolean) => {
      const isOpen = expanded.includes(id);
      const next = open ?? !isOpen;
      if (next === isOpen) return;
      setExpanded(next ? [...expanded, id] : expanded.filter((x) => x !== id));
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLLIElement>, row: FlatRow) => {
      if (e.target !== e.currentTarget) return;
      const idx = rows.findIndex((r) => r.node.id === row.node.id);
      const hasKids = row.visibleChildren.length > 0;
      const open = expanded.includes(row.node.id);
      let handled = true;
      switch (e.key) {
        case "ArrowDown":
          if (rows[idx + 1]) focus(rows[idx + 1]!.node.id);
          break;
        case "ArrowUp":
          if (rows[idx - 1]) focus(rows[idx - 1]!.node.id);
          break;
        case "Home":
          if (rows[0]) focus(rows[0].node.id);
          break;
        case "End":
          if (rows.length) focus(rows[rows.length - 1]!.node.id);
          break;
        case "ArrowRight":
          if (hasKids && !open) toggle(row.node.id, true);
          else if (hasKids && rows[idx + 1]) focus(rows[idx + 1]!.node.id);
          break;
        case "ArrowLeft":
          if (hasKids && open) toggle(row.node.id, false);
          else if (row.parentId) focus(row.parentId);
          break;
        case "Enter":
        case " ":
          if (hasKids) toggle(row.node.id);
          else onOpen?.(row.node.id);
          break;
        default:
          handled = false;
      }
      if (handled) e.preventDefault();
    };

    const submitSteer = (id: string) => {
      const text = steerText.trim();
      if (!text) return;
      onSteer?.(id, text);
      setSteerText("");
      setSteering(null);
      requestAnimationFrame(() => itemRefs.current.get(id)?.focus());
    };

    const renderLevel = (parentId: string | null): React.ReactNode => {
      const levelRows = rows.filter((r) => r.parentId === parentId);
      return levelRows.map((row) => {
        const n = row.node;
        const hasKids = row.visibleChildren.length > 0;
        const open = hasKids && expanded.includes(n.id);
        const roll = subagentRollup(n);
        const status = resolveStatus(n.status);
        const heat = n.heat ?? (status === "running" ? 0.5 : 0);
        const level = heatmapLevel(heat * 100, 0, 100, 4);
        const color = heatmapColor(heat * 100, { scale: "warning", steps: 4 });
        const elapsed = subagentElapsed(n, now);
        const running = status === "running";
        return (
          <li
            key={n.id}
            ref={(el) => {
              if (el) itemRefs.current.set(n.id, el);
              else itemRefs.current.delete(n.id);
            }}
            role="treeitem"
            aria-level={row.level}
            aria-posinset={row.posinset}
            aria-setsize={row.setsize}
            aria-expanded={hasKids ? open : undefined}
            aria-selected={activeId === n.id}
            aria-label={`${n.name}, ${statusLabel[status]}`}
            tabIndex={activeId === n.id ? 0 : -1}
            data-node={n.id}
            data-status={status}
            onFocus={(e) => {
              if (e.target === e.currentTarget) setFocusId(n.id);
            }}
            onKeyDown={(e) => onKeyDown(e, row)}
            className={cn(
              "relative outline-none",
              row.level > 1 && "pl-5",
              row.level > 1 &&
                "before:absolute before:left-0 before:top-0 before:border-l before:border-border-strong after:absolute after:left-0 after:top-[1.125rem] after:w-3.5 after:border-t after:border-border-strong",
              row.level > 1 && (row.last ? "before:h-[1.125rem]" : "before:h-full"),
              "focus-visible:[&>[data-row]]:ring-[3px] focus-visible:[&>[data-row]]:ring-ring/35"
            )}
          >
            <div
              data-row
              data-heat={level}
              className={cn(
                `subagent-heat-${level}`,
                "group relative flex flex-col gap-1 rounded-lg border border-transparent py-1.5 pl-2 pr-2 hover:bg-accent",
                activeId === n.id && "bg-accent/60"
              )}
            >
              <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full" style={{ backgroundColor: color }} />
              <div className="flex min-w-0 items-center gap-2">
                {hasKids ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden
                    onClick={() => toggle(n.id)}
                    className="-ml-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-xs text-muted-foreground hover:text-foreground"
                  >
                    <RiArrowRightSLine aria-hidden className={cn("size-4 transition-transform", open && "rotate-90")} />
                  </button>
                ) : (
                  <span className="size-4 shrink-0" aria-hidden />
                )}
                <SubagentStatusGlyph status={n.status} />
                {n.batch && (
                  <span className="font-mono text-2xs tabular-nums text-muted-foreground">
                    [{n.batch.index}/{n.batch.total}]
                  </span>
                )}
                <span className="truncate text-sm font-medium text-foreground">{n.name}</span>
                {n.type && <span className="shrink-0 rounded-xs bg-muted px-1 text-2xs text-muted-foreground">{n.type}</span>}
                <span className="ml-auto flex shrink-0 items-center gap-2 text-2xs tabular-nums text-muted-foreground">
                  <span title="Tools">{roll.tools} tools</span>
                  {roll.agents > 0 && <span title="Child agents">{roll.agents} agents</span>}
                  {roll.tokens > 0 && <span title="Tokens">{formatTokens(roll.tokens, { trimZeros: false })} tok</span>}
                  {roll.cost > 0 && <span title="Cost">{fmtCost(roll.cost)}</span>}
                  <span title="Elapsed" className="min-w-10 text-right">
                    {formatSubagentElapsed(elapsed)}
                  </span>
                </span>
              </div>
              {n.task && <p className="truncate pl-6 text-xs text-muted-foreground">{n.task}</p>}
              {n.activity && (
                <p
                  data-slot="subagent-activity"
                  className={cn("truncate pl-6 font-mono text-2xs", running ? "text-shimmer" : "text-muted-foreground")}
                >
                  {n.activity}
                </p>
              )}
              {running && (onSteer || onStop) && (
                <div className="flex flex-wrap items-center gap-1.5 pl-6">
                  {onSteer && steering !== n.id && (
                    <Button size="xs" variant="ghost" onClick={() => setSteering(n.id)} aria-label={`Steer ${n.name}`}>
                      Steer
                    </Button>
                  )}
                  {onStop && (
                    <Button size="xs" variant="ghost" leadingIcon={<RiStopFill aria-hidden />} onClick={() => onStop(n.id)} aria-label={`Stop ${n.name}`}>
                      Stop
                    </Button>
                  )}
                </div>
              )}
              {steering === n.id && (
                <form
                  className="flex items-center gap-1.5 pl-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitSteer(n.id);
                  }}
                >
                  <input
                    autoFocus
                    value={steerText}
                    onChange={(e) => setSteerText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setSteering(null);
                        itemRefs.current.get(n.id)?.focus();
                      }
                    }}
                    aria-label={`Message to ${n.name}`}
                    placeholder="Nudge this subagent…"
                    className={cn(
                      "h-7 min-w-0 flex-1 rounded-control border border-input bg-background px-2 text-xs shadow-xs placeholder:text-muted-foreground",
                      focusRing
                    )}
                  />
                  <Button type="submit" size="icon-xs" aria-label="Send" disabled={!steerText.trim()}>
                    <RiSendPlane2Line aria-hidden />
                  </Button>
                </form>
              )}
            </div>
            {open && (
              <ul role="group" className="ml-2">
                {renderLevel(n.id)}
              </ul>
            )}
          </li>
        );
      });
    };

    const sortOptions: { value: SubagentSort; label: string }[] = [
      { value: "none", label: "Default" },
      { value: "status", label: "Status" },
      { value: "elapsed", label: "Elapsed" },
      { value: "cost", label: "Cost" },
    ];

    return (
      <div ref={ref} data-slot="subagent-tree" className={cn("flex flex-col gap-2", className)} {...props}>
        {!hideToolbar && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div role="group" aria-label="Sort by" className="inline-flex items-center gap-0.5 rounded-control bg-muted p-0.5">
              {sortOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={sort === o.value}
                  onClick={() => setSort(o.value)}
                  className={cn(
                    "h-6 rounded-control px-2 font-medium text-muted-foreground transition-colors",
                    sort === o.value && "bg-background text-foreground shadow-xs",
                    focusRing
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground">
              <input
                type="checkbox"
                checked={runningOnly}
                onChange={(e) => setRunningOnly(e.target.checked)}
                className="size-3.5 accent-[var(--primary)]"
              />
              Running only
            </label>
          </div>
        )}
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{runningOnly ? "Nothing running" : "No subagents"}</p>
        ) : (
          <ul role="tree" aria-label={label} className="flex flex-col">
            {renderLevel(null)}
          </ul>
        )}
      </div>
    );
  }
);
SubagentTree.displayName = "SubagentTree";

/* ------------------------------------------------------------------ */
/* RunTicker                                                           */
/* ------------------------------------------------------------------ */

export interface RunTickerActivity {
  id: string;
  text: React.ReactNode;
  icon?: React.ReactNode;
}

export interface RunTickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  activities: RunTickerActivity[];
  /** Label before the reel. */
  label?: React.ReactNode;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Shows a spinner while true. */
  running?: boolean;
}

/** One-line rolling activity reel: each new line pushes the previous one up and out. Click to see every line. */
export const RunTicker = React.forwardRef<HTMLDivElement, RunTickerProps>(
  ({ activities, label, expanded: expandedProp, defaultExpanded = false, onExpandedChange, running = true, className, ...props }, ref) => {
    const [expanded, setExpanded] = useControllableState({ value: expandedProp, defaultValue: defaultExpanded, onChange: onExpandedChange });
    const latest = activities[activities.length - 1];
    const [outgoing, setOutgoing] = React.useState<RunTickerActivity | null>(null);
    const prevRef = React.useRef<RunTickerActivity | undefined>(latest);
    const listId = React.useId();

    React.useEffect(() => {
      const prev = prevRef.current;
      prevRef.current = latest;
      if (prev && latest && prev.id !== latest.id) {
        setOutgoing(prev);
        const t = setTimeout(() => setOutgoing(null), 320);
        return () => clearTimeout(t);
      }
    }, [latest]);

    return (
      <div ref={ref} data-slot="run-ticker" className={cn("flex flex-col rounded-box border border-border bg-card text-sm", className)} {...props}>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded(!expanded)}
          className={cn("flex h-9 w-full min-w-0 items-center gap-2 rounded-box px-3 text-left hover:bg-accent/50", focusRing)}
        >
          {running ? <Spinner size="xs" label="" className="shrink-0 text-primary" /> : <RiCheckLine aria-hidden className="size-4 shrink-0 text-success" />}
          {label != null && <span className="shrink-0 font-medium text-foreground">{label}</span>}
          <span className="relative h-5 min-w-0 flex-1 overflow-hidden" aria-live="polite">
            {outgoing && (
              <span
                key={`out-${outgoing.id}`}
                aria-hidden
                data-ticker="out"
                className="absolute inset-0 flex items-center gap-1.5 truncate text-muted-foreground animate-out fade-out-0 fill-mode-forwards duration-300 motion-safe:slide-out-to-top-full"
              >
                {outgoing.icon}
                <span className="truncate">{outgoing.text}</span>
              </span>
            )}
            {latest && (
              <span
                key={latest.id}
                data-ticker="current"
                className={cn(
                  "absolute inset-0 flex items-center gap-1.5 truncate text-muted-foreground",
                  outgoing && "animate-in fade-in-0 duration-300 motion-safe:slide-in-from-bottom-full"
                )}
              >
                {latest.icon}
                <span className="truncate">{latest.text}</span>
              </span>
            )}
          </span>
          <span className="shrink-0 rounded-full bg-muted px-1.5 text-2xs font-medium tabular-nums text-muted-foreground">
            {activities.length} {activities.length === 1 ? "activity" : "activities"}
          </span>
          <RiArrowRightSLine aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} />
        </button>
        {expanded && (
          <ol id={listId} aria-label="All activity" className="scrollbar-thin max-h-60 overflow-y-auto border-t border-border px-3 py-2">
            {activities.map((a, i) => (
              <li key={a.id} className="flex items-center gap-2 py-0.5 text-xs text-muted-foreground">
                <span className="w-6 shrink-0 text-right font-mono text-2xs tabular-nums opacity-60">{i + 1}</span>
                {a.icon}
                <span className="min-w-0 truncate">{a.text}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }
);
RunTicker.displayName = "RunTicker";

/* ------------------------------------------------------------------ */
/* DelegateToolBody                                                    */
/* ------------------------------------------------------------------ */

export interface DelegateTask {
  id: string;
  /** Goal handed to the child agent. */
  title: React.ReactNode;
  agent?: string;
  /** Accepts canonical `TaskStatus` values too. */
  status: SubagentStatusInput;
  /** Result summary or latest activity. */
  summary?: React.ReactNode;
  elapsedMs?: number;
}

export interface DelegateToolBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  tasks: DelegateTask[];
  /** Opens the child's transcript. */
  onOpen?: (id: string) => void;
}

/** Body for a "delegate" tool call: one row per child task with status and an open button. */
export const DelegateToolBody = React.forwardRef<HTMLDivElement, DelegateToolBodyProps>(
  ({ tasks, onOpen, className, ...props }, ref) => {
    const statuses = tasks.map((t) => resolveStatus(t.status));
    const running = statuses.filter((s) => s === "running").length;
    const done = statuses.filter((s) => s === "done").length;
    const failed = statuses.filter((s) => s === "failed").length;
    return (
      <div ref={ref} data-slot="delegate-tool-body" className={cn("flex flex-col gap-1.5", className)} {...props}>
        <p className="text-xs text-muted-foreground">
          Delegated {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          {running > 0 && ` · ${running} running`}
          {done > 0 && ` · ${done} done`}
          {failed > 0 && ` · ${failed} failed`}
        </p>
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
          {tasks.map((t, i) => (
            <li key={t.id} data-status={statuses[i]} className="flex items-start gap-2.5 px-3 py-2">
              <SubagentStatusGlyph status={t.status} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm text-foreground">
                  <span className="font-mono text-2xs tabular-nums text-muted-foreground">
                    [{i + 1}/{tasks.length}]
                  </span>
                  <span className="truncate">{t.title}</span>
                </p>
                {(t.agent || t.summary) && (
                  <p className="truncate text-xs text-muted-foreground">
                    {t.agent && <span className="font-medium">{t.agent}</span>}
                    {t.agent && t.summary ? " · " : ""}
                    {t.summary}
                  </p>
                )}
              </div>
              {t.elapsedMs != null && (
                <span className="mt-0.5 shrink-0 text-2xs tabular-nums text-muted-foreground">{formatSubagentElapsed(t.elapsedMs)}</span>
              )}
              {onOpen && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Open task ${i + 1}`}
                  onClick={() => onOpen(t.id)}
                  className="shrink-0"
                >
                  <RiExternalLinkLine aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }
);
DelegateToolBody.displayName = "DelegateToolBody";
