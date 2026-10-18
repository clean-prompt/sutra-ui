import * as React from "react";
import { Collapsible } from "radix-ui";
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiBrainLine,
  RiEditLine,
  RiFileTextLine,
  RiFolderOpenLine,
  RiGlobalLine,
  RiListCheck2,
  RiQuestionLine,
  RiRobot2Line,
  RiSearchLine,
  RiShieldKeyholeLine,
  RiTerminalLine,
  RiToolsLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { formatDuration } from "../../lib/duration";
import { isSafeHref } from "../../lib/validate";
import { normalizeTaskStatus, type TaskStatusInput } from "../../lib/status";
import { formatTokens } from "../../lib/format";
import { toMs, type TimeInput } from "../../lib/time";
import type { Tone } from "../../lib/tone";
import { useControllableState } from "../../hooks/use-controllable-state";
import { usePrefersReducedMotion } from "../../hooks/use-media-query";
import { useNow } from "../../hooks/use-now";
import { useResizeObserver } from "../../hooks/use-resize-observer";
import { CopyButton } from "../../primitives/copy-button";
import { Spinner } from "../../primitives/spinner";
import { StatusDot } from "../../primitives/status-badge";
import { TextShimmer } from "../../primitives/text-shimmer";
import { parseAnsi, ansiSegmentClassName } from "../../patterns/log-viewer";
import { DiffCard, DiffStat, type DiffCardProps } from "../../patterns/diff-viewer";
import { Favicon, domainOf } from "../../primitives/favicon";
import { CodeBlock } from "../../patterns/code-block";
import { formatAgentElapsed } from "./agent-tasks";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Status values the timeline reports back (e.g. in `ToolGroupLabelInfo`). */
export type ToolTimelineStatus = "success" | "failure" | "progress" | "warning" | "pending";

/**
 * What status props accept: the timeline's own values plus the canonical lifecycle
 * `TaskStatus` (`succeeded`, `failed`, `running`, `canceled`) and its legacy spellings.
 */
export type ToolTimelineStatusInput = ToolTimelineStatus | TaskStatusInput;

/** Resolved display status: the timeline values plus `canceled` (a neutral, finished dot). */
type DisplayStatus = ToolTimelineStatus | "canceled";

const statusLabel: Record<DisplayStatus, string> = {
  success: "Succeeded",
  failure: "Failed",
  progress: "In progress",
  warning: "Warning",
  pending: "Pending",
  canceled: "Canceled",
};

const fromTaskStatus = { pending: "pending", running: "progress", succeeded: "success", failed: "failure", canceled: "canceled" } as const;

function toDisplayStatus(status: ToolTimelineStatusInput): DisplayStatus;
function toDisplayStatus(status: ToolTimelineStatusInput | undefined): DisplayStatus | undefined;
function toDisplayStatus(status: ToolTimelineStatusInput | undefined): DisplayStatus | undefined {
  if (status === undefined) return undefined;
  if (status === "warning") return "warning";
  return fromTaskStatus[normalizeTaskStatus(status)];
}

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

const NestedContext = React.createContext(false);

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
          "absolute left-[7px] top-[10px] z-[1] size-[9px] bg-background ring-[3px] ring-background",
          (!status || status === "canceled") && "[&>span]:bg-muted-foreground/50",
          className
        )}
        {...props}
      />
    );
  }
);
ToolTimelineDot.displayName = "ToolTimelineDot";

function Rail() {
  return (
    <span
      aria-hidden
      data-slot="tool-timeline-rail"
      className="absolute bottom-0 left-[11px] top-0 w-px bg-border group-first/tl:top-[15px] group-last/tl:bottom-auto group-last/tl:h-[15px] group-only/tl:hidden"
    />
  );
}

const itemTypes = new Set<unknown>();

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
      className={cn("group/tl relative py-1.5 pl-7 leading-6 text-foreground", className)}
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
  icon?: React.ReactNode;
  /** Duration in milliseconds. */
  duration?: number;
  /** Line counts shown as "+12 −3". */
  diffStat?: { additions: number; deletions: number };
  exitCode?: number;
  /** Extra right-side meta. */
  meta?: React.ReactNode;
  /** Label while running (default "Running {name}…"). */
  runningLabel?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
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
        <span className="ml-2 flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
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
      "flex w-full min-w-0 items-center gap-2 rounded-control px-1.5 py-1 text-left text-sm leading-5";

    return (
      <li
        ref={ref}
        data-slot="tool-timeline-item"
        data-status={status}
        className={cn("group/tl relative", nested ? "" : "pl-7", className)}
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
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]/tli:rotate-90"
              />
            </Collapsible.Trigger>
            <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <div className="mb-2 mt-1 pl-1.5">{children}</div>
            </Collapsible.Content>
          </Collapsible.Root>
        ) : (
          <div className={cn(rowClass, "pr-7")}>{row}</div>
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
  icon?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
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
        className={cn("group/tl relative pl-7", className)}
        {...props}
      >
        <Rail />
        <ToolTimelineDot status={status} />
        <Collapsible.Root open={open} onOpenChange={setOpen}>
          <Collapsible.Trigger
            aria-controls={listId}
            className={cn(
              "group/tg flex w-full min-w-0 items-center gap-2 rounded-control px-1.5 py-1 text-left text-sm leading-5 transition-colors hover:bg-accent/70",
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
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]/tg:rotate-90"
            />
          </Collapsible.Trigger>
          <Collapsible.Content
            id={listId}
            className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
          >
            <ol className="mb-1 ml-3 flex flex-col border-l border-border pl-2">
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

/* ------------------------------------------------------------------ */
/* ExpandableContent                                                   */
/* ------------------------------------------------------------------ */

export interface ExpandableContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Height (px) of the collapsed view. Default 160. */
  collapsedHeight?: number;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  moreLabel?: React.ReactNode;
  lessLabel?: React.ReactNode;
  /** Classes for the gradient (match the surface, e.g. "from-card"). Default "from-background". */
  fadeClassName?: string;
}

/** Height-capped container with a bottom fade and Show more / Show less. */
export const ExpandableContent = React.forwardRef<HTMLDivElement, ExpandableContentProps>(
  (
    {
      collapsedHeight = 160,
      expanded: expandedProp,
      defaultExpanded = false,
      onExpandedChange,
      moreLabel = "Show more",
      lessLabel = "Show less",
      fadeClassName = "from-background",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [expanded, setExpanded] = useControllableState<boolean>({
      value: expandedProp,
      defaultValue: defaultExpanded,
      onChange: onExpandedChange,
    });
    const innerRef = React.useRef<HTMLDivElement>(null);
    const [overflows, setOverflows] = React.useState(false);
    const id = React.useId();

    const measure = React.useCallback(() => {
      const el = innerRef.current;
      if (el) setOverflows(el.scrollHeight > collapsedHeight + 4);
    }, [collapsedHeight]);
    React.useLayoutEffect(measure, [measure, children]);
    useResizeObserver(innerRef, measure);

    const capped = overflows && !expanded;
    return (
      <div ref={ref} data-slot="expandable-content" data-expanded={expanded || undefined} className={cn("relative", className)} {...props}>
        <div
          id={id}
          className={cn(capped && "overflow-hidden")}
          style={capped ? { maxHeight: collapsedHeight } : undefined}
        >
          <div ref={innerRef}>{children}</div>
        </div>
        {capped && (
          <div
            aria-hidden
            className={cn("pointer-events-none absolute inset-x-0 bottom-7 h-12 bg-gradient-to-t to-transparent", fadeClassName)}
          />
        )}
        {overflows && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "mt-1 inline-flex h-6 items-center gap-1 rounded-control px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              focusRing
            )}
          >
            <RiArrowDownSLine aria-hidden className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
            {expanded ? lessLabel : moreLabel}
          </button>
        )}
      </div>
    );
  }
);
ExpandableContent.displayName = "ExpandableContent";

/* ------------------------------------------------------------------ */
/* Bodies                                                              */
/* ------------------------------------------------------------------ */

function AnsiText({ text }: { text: string }) {
  const segs = React.useMemo(() => parseAnsi(text), [text]);
  return (
    <>
      {segs.map((s, i) => {
        const cls = ansiSegmentClassName(s);
        return cls ? (
          <span key={i} className={cls}>
            {s.text}
          </span>
        ) : (
          <React.Fragment key={i}>{s.text}</React.Fragment>
        );
      })}
    </>
  );
}

function TruncatedOutput({
  text,
  maxLines,
  tone,
  label,
}: {
  text: string;
  maxLines: number;
  tone?: "error";
  label?: string;
}) {
  const [all, setAll] = React.useState(false);
  const lines = text.replace(/\n$/, "").split("\n");
  const hidden = Math.max(0, lines.length - maxLines);
  const shown = all || !hidden ? lines : lines.slice(0, maxLines);
  const id = React.useId();
  return (
    <div className="relative" data-slot={tone === "error" ? "bash-stderr" : "bash-output"}>
      {label && (
        <div className="px-3 pt-2 font-sans text-2xs font-semibold uppercase tracking-[0.08em] text-red-300/80">{label}</div>
      )}
      <pre
        id={id}
        className={cn(
          "overflow-x-auto scrollbar-thin whitespace-pre px-3 py-2 font-mono text-xs leading-5",
          tone === "error" ? "text-red-300" : "text-code-foreground/90"
        )}
      >
        <code>
          <AnsiText text={shown.join("\n")} />
        </code>
      </pre>
      {hidden > 0 && !all && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-7 h-10 bg-gradient-to-t from-code to-transparent"
        />
      )}
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={all}
          aria-controls={id}
          onClick={() => setAll(!all)}
          className={cn(
            "mx-2 mb-2 inline-flex h-6 items-center rounded-sm px-1.5 font-sans text-xs text-code-muted transition-colors hover:bg-white/10 hover:text-code-foreground",
            focusRing
          )}
        >
          {all ? "Show less" : `Show ${hidden} more ${hidden === 1 ? "line" : "lines"}`}
        </button>
      )}
    </div>
  );
}

export interface BashToolBodyProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  command: string;
  /** stdout (ANSI colors supported). */
  output?: string;
  /** stderr, shown separately as "Error output". */
  stderr?: string;
  exitCode?: number;
  /** Visible lines before "Show N more lines". Default 12. */
  maxLines?: number;
  /** Shows a blinking caret after the output. */
  streaming?: boolean;
}

/** Shell call body: `$ command` with copy, ANSI output, separate stderr and an exit code chip. */
export const BashToolBody = React.forwardRef<HTMLDivElement, BashToolBodyProps>(
  ({ command, output, stderr, exitCode, maxLines = 12, streaming, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="bash-tool-body"
        className={cn(
          "overflow-hidden rounded-box border border-code-border bg-code text-code-foreground [color-scheme:dark]",
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-2 border-b border-white/10 bg-white/[0.03] py-1.5 pl-3 pr-1.5">
          <code className="min-w-0 flex-1 whitespace-pre-wrap break-all py-0.5 font-mono text-xs leading-5">
            <span aria-hidden className="select-none text-emerald-400">
              ${" "}
            </span>
            {command}
          </code>
          {exitCode != null && (
            <span
              data-slot="bash-exit-code"
              className={cn(
                "mt-0.5 shrink-0 rounded-sm px-1.5 py-px font-mono text-2xs",
                exitCode === 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/20 text-red-300"
              )}
            >
              exit {exitCode}
            </span>
          )}
          <CopyButton
            value={command}
            label="Copy command"
            size="xs"
            className="text-code-muted hover:bg-white/10 hover:text-code-foreground"
          />
        </div>
        {output ? <TruncatedOutput text={output} maxLines={maxLines} /> : null}
        {streaming && (
          <div className="px-3 pb-2">
            <span aria-hidden className="inline-block h-3.5 w-1.5 animate-caret-blink bg-code-foreground/80 align-middle" />
            <span className="sr-only">Running</span>
          </div>
        )}
        {stderr ? (
          <div className="border-t border-white/10 bg-red-500/[0.06]">
            <TruncatedOutput text={stderr} maxLines={maxLines} tone="error" label="Error output" />
          </div>
        ) : null}
        {!output && !stderr && !streaming && (
          <div className="px-3 py-2 font-sans text-xs italic text-code-muted">No output</div>
        )}
      </div>
    );
  }
);
BashToolBody.displayName = "BashToolBody";

export interface EditToolBodyProps extends Omit<DiffCardProps, "path"> {
  path: string;
}

/** File edit body: path (link / button) and a compact DiffCard. */
export const EditToolBody = React.forwardRef<HTMLDivElement, EditToolBodyProps>((props, ref) => (
  <DiffCard ref={ref} data-slot="edit-tool-body" collapsedLines={10} {...props} />
));
EditToolBody.displayName = "EditToolBody";

export interface ReadToolBodyProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  path: string;
  startLine?: number;
  endLine?: number;
  totalLines?: number;
  /** Excerpt of what was read. */
  snippet?: string;
  language?: string;
  onOpenFile?: () => void;
}

/** File read body: path, line range and an optional snippet. */
export const ReadToolBody = React.forwardRef<HTMLDivElement, ReadToolBodyProps>(
  ({ path, startLine, endLine, totalLines, snippet, language, onOpenFile, className, ...props }, ref) => {
    const range =
      startLine != null
        ? `Lines ${startLine}${endLine != null ? `–${endLine}` : "+"}${totalLines != null ? ` of ${totalLines}` : ""}`
        : totalLines != null
          ? `${totalLines} lines`
          : null;
    return (
      <div ref={ref} data-slot="read-tool-body" className={cn("flex flex-col gap-1.5", className)} {...props}>
        <div className="flex items-center gap-2 text-xs">
          <RiFileTextLine aria-hidden className="size-3.5 text-muted-foreground" />
          {onOpenFile ? (
            <button type="button" onClick={onOpenFile} className={cn("truncate font-mono text-foreground hover:underline", focusRing)}>
              {path}
            </button>
          ) : (
            <span className="truncate font-mono text-foreground">{path}</span>
          )}
          {range && <span className="shrink-0 text-muted-foreground">{range}</span>}
        </div>
        {snippet != null && (
          <CodeBlock
            code={snippet}
            language={language}
            theme="light"
            hideHeader
            showLineNumbers
            startLine={startLine}
            maxHeight={240}
            className="text-xs"
          />
        )}
      </div>
    );
  }
);
ReadToolBody.displayName = "ReadToolBody";

export interface SearchToolMatch {
  file: string;
  line?: number;
  text?: string;
}

export interface SearchToolBodyProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  pattern: string;
  /** Directory / glob the search ran in. */
  scope?: string;
  matches?: SearchToolMatch[];
  /** Matches listed before "+N more". Default 20. */
  maxMatches?: number;
  onOpenMatch?: (match: SearchToolMatch) => void;
}

/** Search body: the pattern and a list of file:line matches. */
export const SearchToolBody = React.forwardRef<HTMLDivElement, SearchToolBodyProps>(
  ({ pattern, scope, matches = [], maxMatches = 20, onOpenMatch, className, ...props }, ref) => {
    const shown = matches.slice(0, maxMatches);
    const rest = matches.length - shown.length;
    return (
      <div ref={ref} data-slot="search-tool-body" className={cn("flex flex-col gap-1.5 text-xs", className)} {...props}>
        <div className="flex flex-wrap items-center gap-1.5">
          <code className="rounded-control border border-border bg-subtle px-1.5 py-0.5 font-mono text-foreground">{pattern}</code>
          {scope && <span className="text-muted-foreground">in <span className="font-mono">{scope}</span></span>}
          <span className="ml-auto text-muted-foreground">
            {matches.length} {matches.length === 1 ? "match" : "matches"}
          </span>
        </div>
        {shown.length > 0 && (
          <ul aria-label="Matches" className="flex flex-col overflow-hidden rounded-box border border-border bg-card">
            {shown.map((m, i) => {
              const loc = (
                <>
                  <span className="shrink-0 font-mono text-foreground">
                    {m.file}
                    {m.line != null && <span className="text-muted-foreground">:{m.line}</span>}
                  </span>
                  {m.text && <span className="min-w-0 truncate font-mono text-muted-foreground">{m.text.trim()}</span>}
                </>
              );
              return (
                <li key={`${m.file}:${m.line}:${i}`} className="border-b border-border last:border-b-0">
                  {onOpenMatch ? (
                    <button
                      type="button"
                      onClick={() => onOpenMatch(m)}
                      className={cn("flex w-full min-w-0 items-center gap-3 px-2.5 py-1 text-left hover:bg-accent", focusRing)}
                    >
                      {loc}
                    </button>
                  ) : (
                    <div className="flex min-w-0 items-center gap-3 px-2.5 py-1">{loc}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {rest > 0 && <span className="text-muted-foreground">+{rest} more</span>}
      </div>
    );
  }
);
SearchToolBody.displayName = "SearchToolBody";

export interface WebToolBodyProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  url: string;
  title?: React.ReactNode;
  /** Short excerpt or result summary. */
  snippet?: React.ReactNode;
  favicon?: string;
}

/** Web fetch / search body: favicon, domain, title and an optional excerpt. */
export const WebToolBody = React.forwardRef<HTMLDivElement, WebToolBodyProps>(
  ({ url, title, snippet, favicon, className, ...props }, ref) => {
    const domain = domainOf(url);
    return (
      <div
        ref={ref}
        data-slot="web-tool-body"
        className={cn("flex flex-col gap-1 rounded-box border border-border bg-card px-3 py-2 text-xs", className)}
        {...props}
      >
        <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <Favicon domain={domain} src={favicon} shape="square" className="size-3.5" />
          <span className="truncate">{domain}</span>
        </div>
        <a
          href={isSafeHref(url) ? url : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("truncate text-sm font-medium text-foreground hover:underline", focusRing)}
        >
          {title ?? url}
        </a>
        {snippet != null && <p className="line-clamp-2 text-muted-foreground">{snippet}</p>}
      </div>
    );
  }
);
WebToolBody.displayName = "WebToolBody";

export interface ToolKeyValueRow {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Render the value in monospace. Default true for strings. */
  mono?: boolean;
}

export interface ToolKeyValueBodyProps extends Omit<React.HTMLAttributes<HTMLDListElement>, "children"> {
  rows: ToolKeyValueRow[];
  /** Height cap for each value before "Show more". Default 72. */
  valueHeight?: number;
}

/** Generic label / value grid for tool inputs and results. */
export const ToolKeyValueBody = React.forwardRef<HTMLDListElement, ToolKeyValueBodyProps>(
  ({ rows, valueHeight = 72, className, ...props }, ref) => (
    <dl
      ref={ref}
      data-slot="tool-key-value-body"
      className={cn("grid grid-cols-[max-content_1fr] overflow-hidden rounded-box border border-border bg-card text-xs", className)}
      {...props}
    >
      {rows.map((r, i) => {
        const mono = r.mono ?? typeof r.value === "string";
        return (
          <div key={i} className="col-span-2 grid grid-cols-subgrid border-t border-border first:border-t-0">
            <dt className="px-2.5 py-1.5 font-mono text-muted-foreground">{r.label}</dt>
            <dd className={cn("min-w-0 px-2.5 py-1.5 text-foreground", mono && "font-mono")}>
              <ExpandableContent collapsedHeight={valueHeight} fadeClassName="from-card">
                <div className="whitespace-pre-wrap break-words">{r.value}</div>
              </ExpandableContent>
            </dd>
          </div>
        );
      })}
    </dl>
  )
);
ToolKeyValueBody.displayName = "ToolKeyValueBody";

/* ------------------------------------------------------------------ */
/* AgentStatusLine                                                     */
/* ------------------------------------------------------------------ */

export type AgentStatusState = "idle" | "thinking" | "running" | "permission" | "question";

export interface AgentStatusLineProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  state: AgentStatusState;
  /** Tool name for the "running" state. */
  tool?: string;
  /**
   * Overrides the default label. With `verbs`, the visible text rotates and this label is what
   * screen readers get instead (default "Thinking…").
   */
  label?: React.ReactNode;
  /** Words rotated as the visible label while `state` is "thinking" ("Pondering…", "Brewing…"). */
  verbs?: string[];
  /** Rotation order for `verbs`. Default "random" (never repeats the current verb). */
  verbOrder?: "random" | "sequential";
  /** Ms between verbs. Default 3000. Rotation pauses with reduced motion. */
  verbInterval?: number;
  /** When the current state began (Date, epoch ms or ISO string). Defaults to when `state` / `tool` last changed. */
  startedAt?: TimeInput;
  /** Controlled elapsed seconds (disables the internal clock). */
  elapsed?: number;
  /** Show the elapsed time. Default true. */
  showElapsed?: boolean;
  /** Tokens used so far, shown as "1.2k tokens". */
  tokens?: number;
  /** @deprecated Use `tokens`. */
  tokenCount?: number;
  /** Text before the token count, e.g. "↓" for streamed output tokens. */
  tokensPrefix?: string;
  /** Right-side hint, e.g. <Kbd>Esc</Kbd> to interrupt. */
  hint?: React.ReactNode;
  /** Replaces the per-state icon. */
  icon?: React.ReactNode;
  /**
   * `bar` (default): full-width row, stats after the label and the hint pushed right.
   * `inline`: compact inline loader with "(3s · 1.2k tokens · hint)" after the label.
   */
  layout?: "bar" | "inline";
}

const defaultStatusLabel = (state: AgentStatusState, tool?: string) =>
  state === "thinking"
    ? "Thinking…"
    : state === "running"
      ? `Running ${tool ?? "tool"}…`
      : state === "permission"
        ? "Waiting for permission…"
        : state === "question"
          ? "Waiting for your answer…"
          : "";

const stateIcons: Record<Exclude<AgentStatusState, "idle">, React.ReactNode> = {
  thinking: <RiBrainLine aria-hidden className="text-primary" />,
  running: <Spinner role="presentation" size="sm" className="text-primary" />,
  permission: <RiShieldKeyholeLine aria-hidden className="text-warning" />,
  question: <RiQuestionLine aria-hidden className="text-info" />,
};

/** Rotating verb index; pauses with reduced motion or fewer than two verbs. */
function useVerbIndex(count: number, active: boolean, order: "random" | "sequential", interval: number) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    if (!active || reduced || count < 2) return;
    const id = setInterval(() => {
      setIndex((i) => {
        if (order === "sequential") return (i + 1) % count;
        let n = Math.floor(Math.random() * (count - 1));
        if (n >= i % count) n += 1;
        return n;
      });
    }, interval);
    return () => clearInterval(id);
  }, [active, reduced, count, order, interval]);
  return count ? index % count : 0;
}

/**
 * Live agent activity above the composer: what the agent is doing (thinking, running a tool, waiting for
 * permission or an answer) with elapsed time and token count. Renders nothing when idle.
 *
 * For infrastructure phases (cold start, queue, retry/rate-limit countdown, offline) use `StatusStrip`,
 * which sits in the same slot. Live region: `role="status"` (polite); the ticking clock, token count and
 * rotating verbs are hidden from screen readers so only state changes are announced.
 */
export const AgentStatusLine = React.forwardRef<HTMLDivElement, AgentStatusLineProps>(
  (
    {
      state,
      tool,
      label,
      verbs,
      verbOrder = "random",
      verbInterval = 3000,
      startedAt,
      elapsed: elapsedProp,
      showElapsed = true,
      tokens: tokensProp,
      tokenCount,
      tokensPrefix,
      hint,
      icon,
      layout = "bar",
      className,
      ...props
    },
    ref
  ) => {
    const active = state !== "idle";
    const tokens = tokensProp ?? tokenCount;
    const startMs = toMs(startedAt);
    // Restart the internal clock whenever the state (or tool) changes; derived during render so it never flashes stale.
    const key = `${state}\u0000${tool ?? ""}`;
    const [since, setSince] = React.useState(() => ({ key, at: Date.now() }));
    if (since.key !== key) setSince({ key, at: Date.now() });
    const now = useNow({ active: active && showElapsed && elapsedProp == null });

    const rotating = state === "thinking" && !!verbs && verbs.length > 0;
    const verbIndex = useVerbIndex(rotating ? verbs!.length : 0, rotating, verbOrder, verbInterval);

    if (!active) return null;
    const origin = startMs ?? since.at;
    const seconds = elapsedProp ?? Math.max(0, Math.floor((now - origin) / 1000));
    const text = label ?? defaultStatusLabel(state, tool);
    const waiting = state === "permission" || state === "question";
    const verb = rotating ? (verbs![verbIndex] ?? "") : "";
    const stats = [
      showElapsed ? formatAgentElapsed(seconds * 1000) : null,
      tokens != null ? `${tokensPrefix ? `${tokensPrefix} ` : ""}${formatTokens(tokens, { label: true, wholeAbove: 100 })}` : null,
    ].filter(Boolean);
    const statsText = stats.join(" · ");
    const inline = layout === "inline";

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        data-slot="agent-status-line"
        data-state={state}
        data-layout={layout}
        className={cn(
          "min-w-0 items-center gap-2 text-sm",
          inline ? "inline-flex" : "flex px-1 py-1 text-muted-foreground",
          className
        )}
        {...props}
      >
        <span aria-hidden className="inline-flex shrink-0 text-primary [&_svg]:size-4">
          {icon ?? stateIcons[state]}
        </span>
        {rotating ? (
          <>
            <span className="sr-only">{text}</span>
            <TextShimmer aria-hidden data-slot="spinner-verb" className="truncate font-medium">
              {verb.endsWith("…") ? verb : `${verb}…`}
            </TextShimmer>
          </>
        ) : waiting ? (
          <span className="truncate font-medium text-foreground">{text}</span>
        ) : (
          <TextShimmer className="truncate font-medium">{text}</TextShimmer>
        )}
        {inline ? (
          (stats.length > 0 || hint != null) && (
            <span data-slot="agent-status-meta" className="shrink-0 text-xs tabular-nums text-muted-foreground">
              <span aria-hidden>
                ({statsText}
                {hint != null && stats.length > 0 ? " · " : ""}
              </span>
              {hint}
              <span aria-hidden>)</span>
            </span>
          )
        ) : (
          <>
            {stats.length > 0 && (
              <span aria-hidden data-slot="agent-status-meta" className="shrink-0 text-xs tabular-nums">
                {statsText}
              </span>
            )}
            {hint != null && <span className="ml-auto shrink-0 text-xs">{hint}</span>}
          </>
        )}
      </div>
    );
  }
);
AgentStatusLine.displayName = "AgentStatusLine";
