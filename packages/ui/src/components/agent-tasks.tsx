import * as React from "react";
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
  RiEyeLine,
  RiExternalLinkLine,
  RiFocus3Line,
  RiStopCircleLine,
  RiTerminalBoxLine,
} from "@remixicon/react";
import { cn, focusRing, normalizeDensity, type Density } from "../lib/cn";
import { toneClasses, type Tone } from "../lib/tone";
import { normalizeTaskStatus, type TaskStatus, type TaskStatusInput } from "../lib/status";
import { useControllableState } from "../hooks/use-controllable-state";
import { useNow } from "../hooks/use-now";
import { formatDuration } from "../lib/duration";
import { formatCompact } from "../lib/format";
import { toMs, type TimeInput } from "../lib/time";
import { Button } from "./button";
import { TextShimmer } from "./text-shimmer";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** "8s", "1m 05s", "2h 03m". */
export function formatAgentElapsed(ms: number) {
  return formatDuration(ms, { pad: true, round: "floor", invalid: "0s" });
}

/** "980", "12.4k", "1.2M". */
export function formatAgentTokens(n: number) {
  return formatCompact(n, { wholeAbove: 100 });
}

/** Current time, re-rendered every `interval` ms while `active`. */
export function useAgentNow(active = true, interval = 1000) {
  return useNow({ active, interval });
}

/* ------------------------------------------------------------------ */
/* AgentTodoList                                                       */
/* ------------------------------------------------------------------ */

export type AgentTodoStatus = "pending" | "in_progress" | "completed";
/** Todo statuses accepted on input: the legacy `AgentTodoStatus` values plus canonical `TaskStatus` names. */
export type AgentTodoStatusInput = AgentTodoStatus | TaskStatusInput;

export interface AgentTodoItem {
  id: string;
  /** Imperative form: "Run the test suite". */
  content: React.ReactNode;
  /** Present-continuous form shown while in progress: "Running the test suite". */
  activeForm?: React.ReactNode;
  status: AgentTodoStatusInput;
}

const todoStatusLabel: Record<TaskStatus, string> = {
  pending: "Pending",
  running: "In progress",
  succeeded: "Completed",
  failed: "Failed",
  canceled: "Canceled",
};

/** Status glyph: empty circle, spinning ring or check. */
function TodoGlyph({ status, compact }: { status: TaskStatus; compact?: boolean }) {
  const size = compact ? "size-3.5" : "size-4";
  if (status === "succeeded") {
    return (
      <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-full bg-success text-success-foreground", size)}>
        <RiCheckLine aria-hidden className="size-[80%]" />
      </span>
    );
  }
  if (status === "running") {
    return (
      <span
        aria-hidden
        data-slot="todo-spinner"
        className={cn(
          "shrink-0 rounded-full border-2 border-primary/25 border-t-primary animate-spin motion-reduce:animate-none motion-reduce:border-primary",
          size
        )}
      />
    );
  }
  return <span aria-hidden className={cn("shrink-0 rounded-full border-[1.5px] border-border-strong", size)} />;
}

export interface AgentTodoListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  items: AgentTodoItem[];
  /** Header title. Default "Tasks". */
  title?: React.ReactNode;
  /** `compact` drops the card chrome for use inline in a transcript. Default "normal". */
  density?: Density;
  /** @deprecated Use `density` (`"compact"`). */
  variant?: "default" | "compact";
  /** Header toggles the list. Default true. */
  collapsible?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Thin progress bar under the header. Default true. */
  showProgress?: boolean;
}

/** Read-only agent task list with progress header, status glyphs and a shimmering active item. */
export const AgentTodoList = React.forwardRef<HTMLDivElement, AgentTodoListProps>(
  (
    {
      items,
      title = "Tasks",
      density,
      variant,
      collapsible = true,
      open: openProp,
      defaultOpen = true,
      onOpenChange,
      showProgress = true,
      className,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    const listId = React.useId();
    const titleId = React.useId();
    const done = items.filter((i) => normalizeTaskStatus(i.status) === "succeeded").length;
    const total = items.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const compact = density ? normalizeDensity(density) === "compact" : variant === "compact";
    const expanded = !collapsible || open;

    const headerInner = (
      <>
        <span id={titleId} className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>
          {title}
        </span>
        <span data-slot="todo-progress-text" className={cn("ml-auto tabular-nums text-muted-foreground", compact ? "text-2xs" : "text-xs")}>
          {done} of {total} done
        </span>
        {collapsible && (
          <RiArrowDownSLine
            aria-hidden
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", !open && "-rotate-90")}
          />
        )}
      </>
    );

    return (
      <div
        ref={ref}
        data-variant={compact ? "compact" : "default"}
        data-density={compact ? "compact" : "normal"}
        className={cn(compact ? "w-full" : "w-full rounded-box border border-border bg-card shadow-xs", className)}
        {...props}
      >
        {collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen(!open)}
            className={cn(
              "flex w-full items-center gap-2 text-left rounded-control",
              compact ? "py-1" : "px-3 py-2.5",
              focusRing
            )}
          >
            {headerInner}
          </button>
        ) : (
          <div className={cn("flex items-center gap-2", compact ? "py-1" : "px-3 py-2.5")}>{headerInner}</div>
        )}
        {showProgress && (
          <div className={cn(compact ? "mb-1.5" : "mx-3 mb-2")}>
            <div
              role="progressbar"
              aria-valuenow={done}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuetext={`${done} of ${total} done`}
              aria-labelledby={titleId}
              className="h-1 overflow-hidden rounded-full bg-muted"
            >
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
        {expanded && (
          <ul
            id={listId}
            aria-labelledby={titleId}
            className={cn("flex flex-col", compact ? "gap-1 pb-1" : "gap-1.5 px-3 pb-3")}
          >
            {items.map((item) => {
              const status = normalizeTaskStatus(item.status);
              const active = status === "running";
              return (
                <li
                  key={item.id}
                  data-status={item.status}
                  aria-current={active ? "step" : undefined}
                  className={cn("flex items-start gap-2", compact ? "text-xs" : "text-sm")}
                >
                  <span className={cn("flex items-center", compact ? "h-4" : "h-5")}>
                    <TodoGlyph status={status} compact={compact} />
                  </span>
                  <span className="min-w-0 flex-1">
                    {active ? (
                      <TextShimmer className="font-medium">{item.activeForm ?? item.content}</TextShimmer>
                    ) : (
                      <span className={cn(status === "succeeded" ? "text-muted-foreground line-through" : "text-foreground")}>
                        {item.content}
                      </span>
                    )}
                    <span className="sr-only"> ({todoStatusLabel[status]})</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
);
AgentTodoList.displayName = "AgentTodoList";

/* ------------------------------------------------------------------ */
/* AgentRoster                                                         */
/* ------------------------------------------------------------------ */

export type AgentRosterStatus = "running" | "waiting" | "done" | "failed";

export interface AgentRosterAgent {
  id: string;
  name: string;
  /** Agent type, e.g. "Explore" or "general-purpose". */
  type?: string;
  description?: React.ReactNode;
  status: AgentRosterStatus;
  startedAt: TimeInput;
  /** Freezes the elapsed time once the agent finishes. */
  endedAt?: TimeInput;
  tokens?: number;
  toolUses?: number;
}

const rosterStatusLabel: Record<AgentRosterStatus, string> = {
  running: "Running",
  waiting: "Waiting for input",
  done: "Done",
  failed: "Failed",
};

function RosterGlyph({ status }: { status: AgentRosterStatus }) {
  if (status === "running") {
    return (
      <span
        aria-hidden
        className="size-3.5 shrink-0 rounded-full border-2 border-primary/25 border-t-primary animate-spin motion-reduce:animate-none"
      />
    );
  }
  if (status === "waiting") {
    return (
      <span aria-hidden className="relative flex size-3.5 shrink-0 items-center justify-center">
        <span className="absolute size-2.5 rounded-full bg-warning/40 animate-ping motion-reduce:hidden" />
        <span className="size-2 rounded-full bg-warning" />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span aria-hidden className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
        <RiCloseLine aria-hidden className="size-3" />
      </span>
    );
  }
  return (
    <span aria-hidden className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
      <RiCheckLine aria-hidden className="size-3" />
    </span>
  );
}

const rosterTone: Record<AgentRosterStatus, Tone> = {
  running: "primary",
  waiting: "warning",
  failed: "destructive",
  done: "success",
};
const aggregateDot = (status: AgentRosterStatus) => toneClasses.dot[rosterTone[status]];

/** Aggregate status of a set of agents: waiting > running > failed > done. */
export function aggregateAgentStatus(agents: AgentRosterAgent[]): AgentRosterStatus {
  if (agents.some((a) => a.status === "waiting")) return "waiting";
  if (agents.some((a) => a.status === "running")) return "running";
  if (agents.some((a) => a.status === "failed")) return "failed";
  return "done";
}

export interface AgentRosterRowProps extends React.HTMLAttributes<HTMLLIElement> {
  agent: AgentRosterAgent;
  /** Reference time; the row ticks on its own when omitted. */
  now?: number;
  onOpenTranscript?: (id: string) => void;
  onStop?: (id: string) => void;
}

/** One subagent: status, name, description, live elapsed time, tokens and actions. */
export const AgentRosterRow = React.forwardRef<HTMLLIElement, AgentRosterRowProps>(
  ({ agent, now: nowProp, onOpenTranscript, onStop, className, ...props }, ref) => {
    const live = agent.status === "running" || agent.status === "waiting";
    const ticking = useAgentNow(nowProp === undefined && live && agent.endedAt == null);
    const now = nowProp ?? ticking;
    const start = toMs(agent.startedAt) ?? now;
    const end = toMs(agent.endedAt) ?? now;
    const elapsed = formatAgentElapsed(end - start);
    const meta = [
      elapsed,
      agent.toolUses != null ? `${agent.toolUses} tool ${agent.toolUses === 1 ? "use" : "uses"}` : null,
      agent.tokens != null ? `${formatAgentTokens(agent.tokens)} tokens` : null,
    ].filter(Boolean);
    return (
      <li
        ref={ref}
        data-status={agent.status}
        className={cn("group/agent flex items-start gap-2.5 rounded-control px-2 py-2 hover:bg-accent", className)}
        {...props}
      >
        <span className="flex h-5 items-center">
          <RosterGlyph status={agent.status} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{agent.name}</span>
            {agent.type && (
              <span className="shrink-0 rounded-xs bg-muted px-1.5 py-px font-mono text-2xs text-muted-foreground">{agent.type}</span>
            )}
            <span className="sr-only">, {rosterStatusLabel[agent.status]}</span>
          </div>
          {agent.description && <p className="truncate text-xs text-muted-foreground">{agent.description}</p>}
          <p className="mt-0.5 text-2xs tabular-nums text-muted-foreground">
            <span data-slot="agent-elapsed">{meta[0]}</span>
            {meta.slice(1).map((m) => (
              <span key={m as string}> · {m}</span>
            ))}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {onOpenTranscript && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Open transcript for ${agent.name}`}
              onClick={() => onOpenTranscript(agent.id)}
            >
              <RiExternalLinkLine aria-hidden />
            </Button>
          )}
          {onStop && live && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Stop ${agent.name}`}
              onClick={() => onStop(agent.id)}
              className="hover:text-destructive"
            >
              <RiStopCircleLine aria-hidden />
            </Button>
          )}
        </div>
      </li>
    );
  }
);
AgentRosterRow.displayName = "AgentRosterRow";

export interface AgentRosterPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  agents: AgentRosterAgent[];
  /** Default "Agents". */
  title?: React.ReactNode;
  /** Shown when there are no agents. Default "No agents running". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  emptyText?: React.ReactNode;
  now?: number;
  onOpenTranscript?: (id: string) => void;
  onStop?: (id: string) => void;
  /** Extra rows (e.g. `BackgroundTaskRow`s) rendered under the agents. */
  children?: React.ReactNode;
}

/** List of subagents with live elapsed time and per-agent actions. */
export const AgentRosterPanel = React.forwardRef<HTMLDivElement, AgentRosterPanelProps>(
  ({ agents, title = "Agents", emptyState, emptyText, now, onOpenTranscript, onStop, children, className, ...props }, ref) => {
    const titleId = React.useId();
    const running = agents.filter((a) => a.status === "running" || a.status === "waiting").length;
    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <div className="flex items-center gap-2 px-2 pb-1.5 pt-1">
          <span id={titleId} className="text-xs font-medium text-muted-foreground">
            {title}
          </span>
          <span className="ml-auto text-2xs tabular-nums text-muted-foreground">
            {running} active · {agents.length} total
          </span>
        </div>
        {agents.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">{emptyState ?? emptyText ?? "No agents running"}</p>
        ) : (
          <ul aria-labelledby={titleId} className="flex flex-col">
            {agents.map((a) => (
              <AgentRosterRow key={a.id} agent={a} now={now} onOpenTranscript={onOpenTranscript} onStop={onStop} />
            ))}
          </ul>
        )}
        {children}
      </div>
    );
  }
);
AgentRosterPanel.displayName = "AgentRosterPanel";

export interface AgentRosterPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  agents: AgentRosterAgent[];
  /** Override the "3 agents" text. */
  label?: React.ReactNode;
}

/** Compact "3 agents" trigger with an aggregate status dot. */
export const AgentRosterPill = React.forwardRef<HTMLButtonElement, AgentRosterPillProps>(
  ({ agents, label, className, ...props }, ref) => {
    const status = aggregateAgentStatus(agents);
    const live = status === "running" || status === "waiting";
    const text = label ?? `${agents.length} ${agents.length === 1 ? "agent" : "agents"}`;
    return (
      <button
        ref={ref}
        type="button"
        data-status={status}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-control border border-border bg-background px-2.5 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent",
          focusRing,
          className
        )}
        {...props}
      >
        <span aria-hidden className="relative flex size-2">
          {live && (
            <span className={cn("absolute inset-0 rounded-full opacity-60 animate-ping motion-reduce:hidden", aggregateDot(status))} />
          )}
          <span className={cn("relative size-2 rounded-full", aggregateDot(status))} />
        </span>
        {text}
        <span className="sr-only">, {rosterStatusLabel[status]}</span>
      </button>
    );
  }
);
AgentRosterPill.displayName = "AgentRosterPill";

export interface AgentRosterProps extends Omit<AgentRosterPanelProps, "title"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Panel title. */
  title?: React.ReactNode;
  pillLabel?: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}

/** Pill that opens a popover panel listing subagents and background tasks. The ref goes to the pill. */
export const AgentRoster = React.forwardRef<HTMLButtonElement, AgentRosterProps>(function AgentRoster({
  agents,
  open,
  defaultOpen,
  onOpenChange,
  pillLabel,
  align = "start",
  side = "bottom",
  className,
  ...panelProps
}, ref) {
  return (
    <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <AgentRosterPill ref={ref} agents={agents} label={pillLabel} />
      </PopoverTrigger>
      <PopoverContent align={align} side={side} padded={false} className={cn("w-96 max-w-[calc(100vw-2rem)] p-1.5", className)}>
        <AgentRosterPanel agents={agents} {...panelProps} />
      </PopoverContent>
    </Popover>
  );
});
AgentRoster.displayName = "AgentRoster";

/* ------------------------------------------------------------------ */
/* BackgroundTaskRow                                                   */
/* ------------------------------------------------------------------ */

export type BackgroundTaskStatus = "running" | "completed" | "failed" | "killed";
/** Statuses accepted on input: the domain `BackgroundTaskStatus` values plus canonical `TaskStatus` names. */
export type BackgroundTaskStatusInput = BackgroundTaskStatus | TaskStatusInput;

const bgStatusMeta: Record<TaskStatus | "killed", { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "neutral" },
  running: { label: "Running", tone: "primary" },
  succeeded: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "destructive" },
  canceled: { label: "Canceled", tone: "neutral" },
  killed: { label: "Killed", tone: "neutral" },
};

export interface BackgroundTaskRowProps extends React.HTMLAttributes<HTMLDivElement> {
  command: string;
  status: BackgroundTaskStatusInput;
  startedAt: TimeInput;
  endedAt?: TimeInput;
  exitCode?: number;
  /** Full or partial output; only the last `tailLines` lines are shown. */
  output?: string;
  /** Default 3. */
  tailLines?: number;
  now?: number;
  onKill?: () => void;
  onOpen?: () => void;
}

/** Background shell job: command, status, elapsed time, output tail and a kill action. */
export const BackgroundTaskRow = React.forwardRef<HTMLDivElement, BackgroundTaskRowProps>(
  (
    { command, status, startedAt, endedAt, exitCode, output, tailLines = 3, now: nowProp, onKill, onOpen, className, ...props },
    ref
  ) => {
    const lifecycle = status === "killed" ? "killed" : normalizeTaskStatus(status);
    const running = lifecycle === "running";
    const ticking = useAgentNow(nowProp === undefined && running && endedAt == null);
    const now = nowProp ?? ticking;
    const start = toMs(startedAt) ?? now;
    const end = toMs(endedAt) ?? now;
    const tail = output
      ? output
          .replace(/\n+$/, "")
          .split("\n")
          .slice(-Math.max(1, tailLines))
          .join("\n")
      : "";
    const meta = bgStatusMeta[lifecycle];
    return (
      <div
        ref={ref}
        data-status={status}
        className={cn("rounded-control border border-border bg-card px-2.5 py-2", className)}
        {...props}
      >
        <div className="flex items-center gap-2">
          <RiTerminalBoxLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground" title={command}>
            {command}
          </code>
          <span className={cn("shrink-0 rounded-xs px-1.5 py-px text-2xs font-medium", toneClasses.soft[meta.tone])}>
            {meta.label}
            {exitCode != null && !running ? ` (exit ${exitCode})` : ""}
          </span>
          <span data-slot="task-elapsed" className="shrink-0 text-2xs tabular-nums text-muted-foreground">
            {formatAgentElapsed(end - start)}
          </span>
          {onOpen && (
            <Button variant="ghost" size="icon-xs" aria-label={`View output of ${command}`} onClick={onOpen}>
              <RiEyeLine aria-hidden />
            </Button>
          )}
          {onKill && running && (
            <Button variant="ghost" size="icon-xs" aria-label={`Kill ${command}`} onClick={onKill} className="hover:text-destructive">
              <RiStopCircleLine aria-hidden />
            </Button>
          )}
        </div>
        {tail && (
          <pre
            aria-label={`Output of ${command}`}
            tabIndex={0}
            className={cn(
              "mt-1.5 overflow-x-auto rounded-xs bg-muted px-2 py-1 font-mono text-2xs leading-relaxed text-muted-foreground scrollbar-thin",
              focusRing
            )}
          >
            {tail}
          </pre>
        )}
      </div>
    );
  }
);
BackgroundTaskRow.displayName = "BackgroundTaskRow";

/* ------------------------------------------------------------------ */
/* Focus view                                                          */
/* ------------------------------------------------------------------ */

export type FocusViewKind = "user" | "assistant" | "tool" | "system";

export interface FocusViewContextValue {
  focused: boolean;
  setFocused: (focused: boolean) => void;
  toggle: () => void;
  /** Row kinds hidden while focused. */
  hiddenKinds: FocusViewKind[];
}

const FocusViewContext = React.createContext<FocusViewContextValue | null>(null);

/** Read the focus-view state. Returns an inert "not focused" value outside a provider. */
export function useFocusView(): FocusViewContextValue {
  return (
    React.useContext(FocusViewContext) ?? {
      focused: false,
      setFocused: () => {},
      toggle: () => {},
      hiddenKinds: ["tool"],
    }
  );
}

export interface FocusViewProviderProps {
  focused?: boolean;
  defaultFocused?: boolean;
  onFocusedChange?: (focused: boolean) => void;
  /** Kinds hidden while focused. Default `["tool"]`. */
  hiddenKinds?: FocusViewKind[];
  children?: React.ReactNode;
}

/** Shares the focus-view state between a `FocusViewToggle` and transcript rows. */
export function FocusViewProvider({
  focused: focusedProp,
  defaultFocused = false,
  onFocusedChange,
  hiddenKinds = ["tool"],
  children,
}: FocusViewProviderProps) {
  const [focused, setFocused] = useControllableState({ value: focusedProp, defaultValue: defaultFocused, onChange: onFocusedChange });
  const value = React.useMemo<FocusViewContextValue>(
    () => ({ focused, setFocused, toggle: () => setFocused(!focused), hiddenKinds }),
    [focused, setFocused, hiddenKinds]
  );
  return <FocusViewContext.Provider value={value}>{children}</FocusViewContext.Provider>;
}

export interface FocusViewToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  /** Used only outside a `FocusViewProvider`. */
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** Visible label. Default "Focus". Set `iconOnly` to hide it. */
  label?: React.ReactNode;
  iconOnly?: boolean;
}

/** Toggle that hides tool calls and keeps only user/assistant rows (reads `FocusViewProvider`). */
export const FocusViewToggle = React.forwardRef<HTMLButtonElement, FocusViewToggleProps>(
  ({ pressed: pressedProp, defaultPressed = false, onPressedChange, label = "Focus", iconOnly, className, onClick, ...props }, ref) => {
    const ctx = React.useContext(FocusViewContext);
    const [local, setLocal] = useControllableState({ value: pressedProp, defaultValue: defaultPressed, onChange: onPressedChange });
    const pressed = ctx ? ctx.focused : local;
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={pressed}
        aria-label={iconOnly ? "Focus view: hide tool calls" : undefined}
        title="Hide tool calls and show only messages"
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          if (ctx) ctx.setFocused(!pressed);
          else setLocal(!pressed);
          if (ctx) onPressedChange?.(!pressed);
        }}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-control px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          "aria-pressed:bg-primary-soft aria-pressed:text-primary-soft-foreground",
          focusRing,
          className
        )}
        {...props}
      >
        <RiFocus3Line aria-hidden className="size-4" />
        {!iconOnly && label}
      </button>
    );
  }
);
FocusViewToggle.displayName = "FocusViewToggle";

export interface FocusViewItemProps {
  kind: FocusViewKind;
  children?: React.ReactNode;
}

/** Renders its children unless focus view hides this kind of row. */
export function FocusViewItem({ kind, children }: FocusViewItemProps) {
  const { focused, hiddenKinds } = useFocusView();
  if (focused && hiddenKinds.includes(kind)) return null;
  return <>{children}</>;
}
