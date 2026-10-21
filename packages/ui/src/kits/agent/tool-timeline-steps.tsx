import * as React from "react";
import { Collapsible } from "radix-ui";
import {
  RiArrowRightSLine,
  RiBrainLine,
  RiEditLine,
  RiFileTextLine,
  RiFolderOpenLine,
  RiGlobalLine,
  RiListCheck2,
  RiRobot2Line,
  RiSearchLine,
  RiTerminalLine,
  RiToolsLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { formatDuration } from "../../lib/duration";
import type { Tone } from "../../lib/tone";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Spinner } from "../../primitives/spinner";
import { StatusDot } from "../../primitives/status-badge";
import { TextShimmer } from "../../primitives/text-shimmer";
import { DiffStat } from "../../patterns/diff-viewer";
import {
  NestedContext,
  Rail,
  itemTypes,
  statusLabel,
  toDisplayStatus,
  type DisplayStatus,
  type ToolTimelineStatus,
  type ToolTimelineStatusInput,
} from "./tool-timeline-internal";

export type { ToolTimelineStatus, ToolTimelineStatusInput } from "./tool-timeline-internal";

const toolIcons: [RegExp, React.ElementType][] = [
  [/^(read|view|cat|open)/i, RiFileTextLine],
  [/(edit|write|patch|replace)/i, RiEditLine],
  [/^(bash|shell|terminal|exec|run)/i, RiTerminalLine],
  [/(web|fetch|browse|url)/i, RiGlobalLine],
  [/(grep|search|find)/i, RiSearchLine],
  [/^(glob|ls|list)/i, RiFolderOpenLine],
  [/(todo|plan)/i, RiListCheck2],
  [/(task|agent)/i, RiRobot2Line],
  [/(think)/i, RiBrainLine],
];

/** Default icon for a tool name (Read, Edit, Bash, Grep, WebFetch …). */
export function getToolIcon(name: string): React.ElementType {
  return toolIcons.find(([re]) => re.test(name))?.[1] ?? RiToolsLine;
}

/* ------------------------------------------------------------------ */
/* Rail + dot                                                          */
/* ------------------------------------------------------------------ */

export interface ToolTimelineDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Omit for a neutral narration dot (hidden from assistive tech). Accepts `TaskStatus` values too. */
  status?: ToolTimelineStatusInput;
  /** Accessible label; defaults to the status name. */
  label?: string;
}

const dotTone: Record<DisplayStatus, Tone> = {
  success: "success",
  failure: "destructive",
  warning: "warning",
  progress: "primary",
  pending: "neutral",
  canceled: "neutral",
};

/** Status dot on the timeline rail (a `StatusDot` placed on the rail): success, failure, progress (pulsing), warning or pending (dashed ring). */
export const ToolTimelineDot = React.forwardRef<HTMLSpanElement, ToolTimelineDotProps>(
  ({ status: statusProp, label, className, ...props }, ref) => {
    const status = toDisplayStatus(statusProp);
    const text = status ? (label ?? statusLabel[status]) : undefined;
    return (
      <StatusDot
        ref={ref}
        data-slot="tool-timeline-dot"
        data-status={status ?? "neutral"}
        tone={status ? dotTone[status] : "neutral"}
        variant={status === "pending" ? "dashed" : "solid"}
        pulse={status === "progress"}
        label={text ?? ""}
        className={cn(
          "absolute start-[7px] top-[10px] z-[1] size-[9px] bg-background ring-[3px] ring-background",
          (!status || status === "canceled") && "[&>span]:bg-muted-foreground/50",
          className
        )}
        {...props}
      />
    );
  }
);
ToolTimelineDot.displayName = "ToolTimelineDot";

export interface ToolTimelineProps extends React.OlHTMLAttributes<HTMLOListElement> {}

/** Vertical rail of agent steps. Children are ToolTimelineItem, ToolGroup or ToolTimelineText (other nodes are wrapped as text). */
export const ToolTimeline = React.forwardRef<HTMLOListElement, ToolTimelineProps>(
  ({ className, children, ...props }, ref) => (
    <ol
      ref={ref}
      aria-label={props["aria-label"] ?? "Agent steps"}
      data-slot="tool-timeline"
      className={cn("flex flex-col text-sm", className)}
      {...props}
    >
      <NestedContext.Provider value={false}>
        {React.Children.map(children, (child) => {
          if (child == null || typeof child === "boolean") return null;
          if (React.isValidElement(child) && (itemTypes.has(child.type) || child.type === React.Fragment)) return child;
          return <ToolTimelineText>{child}</ToolTimelineText>;
        })}
      </NestedContext.Provider>
    </ol>
  )
);
ToolTimeline.displayName = "ToolTimeline";

export interface ToolTimelineTextProps extends React.LiHTMLAttributes<HTMLLIElement> {
  /** Optional status for the dot (narration usually has none). */
  status?: ToolTimelineStatusInput;
}

/** Assistant narration between tool calls. */
export const ToolTimelineText = React.forwardRef<HTMLLIElement, ToolTimelineTextProps>(
  ({ status, className, children, ...props }, ref) => (
    <li
      ref={ref}
      data-slot="tool-timeline-text"
      className={cn("group/tl relative py-1.5 ps-7 leading-6 text-foreground", className)}
      {...props}
    >
      <Rail />
      <ToolTimelineDot status={status} className="top-[14px]" />
      <div className="min-w-0 [&>p+p]:mt-2">{children}</div>
    </li>
  )
);
ToolTimelineText.displayName = "ToolTimelineText";

/* ------------------------------------------------------------------ */
/* ToolTimelineItem                                                    */
/* ------------------------------------------------------------------ */

export interface ToolTimelineItemProps
  extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "title" | "onToggle"> {
  /** Tool name, e.g. "Read", "Bash". */
  name: React.ReactNode;
  /** Primary argument (path, command, pattern) in muted mono. */
  arg?: React.ReactNode;
  /** Default `success`. Accepts canonical `TaskStatus` values (`succeeded`, `failed`, `running`, `canceled`). */
  status?: ToolTimelineStatusInput;
  /** Replaces the default icon chosen from the tool name. */
  icon?: React.ReactNode;
  /** Duration in milliseconds. */
  duration?: number;
  /** Line counts shown as "+12 −3". */
  diffStat?: { additions: number; deletions: number };
  /** Exit code of a command tool, shown as an "exit N" badge; non-zero turns it red. */
  exitCode?: number;
  /** Extra right-side meta. */
  meta?: React.ReactNode;
  /** Label while running (default "Running {name}…"). */
  runningLabel?: React.ReactNode;
  /** Controlled expanded state of the body (`children`). */
  open?: boolean;
  /** Initial expanded state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called with the new state when the user expands or collapses the row. */
  onOpenChange?: (open: boolean) => void;
}

/** One compact tool call row: icon, bold name, mono argument, meta and an expandable body (children). */
export const ToolTimelineItem = React.forwardRef<HTMLLIElement, ToolTimelineItemProps>(
  (
    {
      name,
      arg,
      status: statusProp = "success",
      icon,
      duration,
      diffStat,
      exitCode,
      meta,
      runningLabel,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const nested = React.useContext(NestedContext);
    const [open, setOpen] = useControllableState<boolean>({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    });
    const status = toDisplayStatus(statusProp);
    const running = status === "progress";
    const hasBody = children != null && children !== false;
    const Icon = typeof name === "string" ? getToolIcon(name) : RiToolsLine;
    const label = running
      ? (runningLabel ?? (typeof name === "string" ? `Running ${name}…` : name))
      : name;

    const iconNode =
      nested && running ? (
        <Spinner aria-hidden role="presentation" size="xs" className="size-3.5" />
      ) : (
        (icon ?? <Icon />)
      );

    const row = (
      <>
        <span
          aria-hidden
          className={cn(
            "inline-flex shrink-0 text-muted-foreground [&_svg]:size-3.5",
            nested && status === "failure" && "text-destructive",
            nested && status === "warning" && "text-warning"
          )}
        >
          {iconNode}
        </span>
        {running && (typeof label === "string" || runningLabel != null) ? (
          <TextShimmer className="shrink-0 font-semibold">{label}</TextShimmer>
        ) : (
          <span className="shrink-0 font-semibold text-foreground">{label}</span>
        )}
        {arg != null && (
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{arg}</span>
        )}
        {arg == null && <span className="flex-1" />}
        {nested && status !== "success" && <span className="sr-only">{statusLabel[status]}</span>}
        <span className="ms-2 flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          {meta}
          {diffStat && <DiffStat additions={diffStat.additions} deletions={diffStat.deletions} showBar={false} />}
          {exitCode != null && (
            <span
              data-slot="tool-exit-code"
              className={cn(
                "rounded-control px-1.5 py-px font-mono text-2xs",
                exitCode === 0 ? "bg-muted text-muted-foreground" : "bg-destructive-soft text-destructive-soft-foreground"
              )}
            >
              exit {exitCode}
            </span>
          )}
          {duration != null && !running && <span className="tabular-nums">{formatDuration(duration, { ms: true, decimals: 1, trimZeros: false })}</span>}
        </span>
      </>
    );

    const rowClass =
      "flex w-full min-w-0 items-center gap-2 rounded-control px-1.5 py-1 text-start text-sm leading-5";

    return (
      <li
        ref={ref}
        data-slot="tool-timeline-item"
        data-status={status}
        className={cn("group/tl relative", nested ? "" : "ps-7", className)}
        {...props}
      >
        {!nested && (
          <>
            <Rail />
            <ToolTimelineDot status={status} />
          </>
        )}
        {hasBody ? (
          <Collapsible.Root open={open} onOpenChange={setOpen}>
            <Collapsible.Trigger
              className={cn(rowClass, "group/tli transition-colors hover:bg-accent/70", focusRing)}
            >
              {row}
              <RiArrowRightSLine
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground chevron-turn group-data-[state=open]/tli:rotate-90 rtl:group-data-[state=open]/tli:-rotate-90 rtl:-scale-x-100"
              />
            </Collapsible.Trigger>
            <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <div className="mb-2 mt-1 ps-1.5">{children}</div>
            </Collapsible.Content>
          </Collapsible.Root>
        ) : (
          <div className={cn(rowClass, "pe-7")}>{row}</div>
        )}
      </li>
    );
  }
);
ToolTimelineItem.displayName = "ToolTimelineItem";

/* ------------------------------------------------------------------ */
/* ToolGroup                                                           */
/* ------------------------------------------------------------------ */

export interface ToolGroupLabelInfo {
  count: number;
  status: ToolTimelineStatus;
  running: boolean;
}

export interface ToolGroupProps extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "onToggle"> {
  /** Past-tense verb. Default "Explored". */
  verb?: string;
  /** Present participle while running. Default "Exploring". */
  runningVerb?: string;
  /** Singular noun. Default "file". */
  noun?: string;
  /** Plural noun. Default `${noun}s`. */
  pluralNoun?: string;
  /** Custom label, e.g. ({ count }) => `Searched ${count} patterns`. */
  label?: (info: ToolGroupLabelInfo) => React.ReactNode;
  /** Group status; derived from the children's `status` when omitted. Accepts `TaskStatus` values too. */
  status?: ToolTimelineStatusInput;
  /** Replaces the default group icon. */
  icon?: React.ReactNode;
  /** Controlled expanded state of the group. */
  open?: boolean;
  /** Initial expanded state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called with the new state when the user expands or collapses the group. */
  onOpenChange?: (open: boolean) => void;
  /** Collapse when the group finishes running (uncontrolled only). Default true. */
  autoCollapse?: boolean;
}

function deriveStatus(children: React.ReactNode): DisplayStatus {
  const all = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((c) => toDisplayStatus((c.props as { status?: ToolTimelineStatusInput }).status ?? "success"));
  if (!all.length) return "pending";
  const statuses = all.filter((s) => s !== "canceled");
  if (!statuses.length) return "canceled";
  if (statuses.includes("progress")) return "progress";
  if (statuses.includes("failure")) return "failure";
  if (statuses.includes("warning")) return "warning";
  if (statuses.every((s) => s === "pending")) return "pending";
  if (statuses.includes("pending")) return "progress";
  return "success";
}

/** Folds consecutive low-signal calls into one row ("Explored 6 files"), expandable to list them. */
export const ToolGroup = React.forwardRef<HTMLLIElement, ToolGroupProps>(
  (
    {
      verb = "Explored",
      runningVerb = "Exploring",
      noun = "file",
      pluralNoun,
      label,
      status: statusProp,
      icon,
      open: openProp,
      defaultOpen,
      onOpenChange,
      autoCollapse = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const status = statusProp !== undefined ? toDisplayStatus(statusProp) : deriveStatus(children);
    const running = status === "progress";
    const count = React.Children.toArray(children).filter(React.isValidElement).length;
    const [open, setOpen] = useControllableState<boolean>({
      value: openProp,
      defaultValue: defaultOpen ?? running,
      onChange: onOpenChange,
    });
    const prevRunning = React.useRef(running);
    React.useEffect(() => {
      const was = prevRunning.current;
      prevRunning.current = running;
      if (openProp !== undefined || !autoCollapse) return;
      if (running && !was) setOpen(true);
      else if (!running && was) setOpen(false);
    }, [running, autoCollapse, openProp, setOpen]);

    const nouns = count === 1 ? noun : (pluralNoun ?? `${noun}s`);
    const text = label
      ? label({ count, status: status === "canceled" ? "pending" : status, running })
      : running
        ? `${runningVerb} ${count} ${nouns}…`
        : `${verb} ${count} ${nouns}`;
    const listId = React.useId();

    return (
      <li
        ref={ref}
        data-slot="tool-group"
        data-status={status}
        className={cn("group/tl relative ps-7", className)}
        {...props}
      >
        <Rail />
        <ToolTimelineDot status={status} />
        <Collapsible.Root open={open} onOpenChange={setOpen}>
          <Collapsible.Trigger
            aria-controls={listId}
            className={cn(
              "group/tg flex w-full min-w-0 items-center gap-2 rounded-control px-1.5 py-1 text-start text-sm leading-5 transition-colors hover:bg-accent/70",
              focusRing
            )}
          >
            <span aria-hidden className="inline-flex shrink-0 text-muted-foreground [&_svg]:size-3.5">
              {icon ?? <RiSearchLine aria-hidden />}
            </span>
            {running && typeof text === "string" ? (
              <TextShimmer className="font-semibold">{text}</TextShimmer>
            ) : (
              <span className="font-semibold text-foreground">{text}</span>
            )}
            <span className="flex-1" />
            <RiArrowRightSLine
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground chevron-turn group-data-[state=open]/tg:rotate-90 rtl:group-data-[state=open]/tg:-rotate-90 rtl:-scale-x-100"
            />
          </Collapsible.Trigger>
          <Collapsible.Content
            id={listId}
            className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
          >
            <ol className="mb-1 ms-3 flex flex-col border-s border-border ps-2">
              <NestedContext.Provider value>{children}</NestedContext.Provider>
            </ol>
          </Collapsible.Content>
        </Collapsible.Root>
      </li>
    );
  }
);
ToolGroup.displayName = "ToolGroup";

itemTypes.add(ToolTimelineItem);
itemTypes.add(ToolTimelineText);
itemTypes.add(ToolGroup);
