import * as React from "react";
import { Collapsible } from "radix-ui";
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiBrainLine,
  RiCheckLine,
  RiEditLine,
  RiFileCopyLine,
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
import { cn, focusRing } from "../lib/cn";
import { useCopy } from "../hooks/use-copy";
import { useControllableState } from "../hooks/use-controllable-state";
import { Spinner } from "./spinner";
import { TextShimmer } from "./text-shimmer";
import { parseAnsi, ansiSegmentClassName } from "./log-viewer";
import { DiffCard, DiffStat, type DiffCardProps } from "./diff-viewer";
import { Favicon, domainOf } from "./favicon";
import { CodeBlock } from "./code-block";
import { formatTokenLabel } from "./chain-of-thought";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export type ToolTimelineStatus = "success" | "failure" | "progress" | "warning" | "pending";

const statusLabel: Record<ToolTimelineStatus, string> = {
  success: "Succeeded",
  failure: "Failed",
  progress: "In progress",
  warning: "Warning",
  pending: "Pending",
};

function formatMs(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function formatSeconds(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
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
  /** Omit for a neutral narration dot (hidden from assistive tech). */
  status?: ToolTimelineStatus;
  /** Accessible label; defaults to the status name. */
  label?: string;
}

/** Status dot on the timeline rail: success, failure, progress (pulsing), warning or pending. */
export const ToolTimelineDot = React.forwardRef<HTMLSpanElement, ToolTimelineDotProps>(
  ({ status, label, className, ...props }, ref) => {
    const text = status ? (label ?? statusLabel[status]) : undefined;
    return (
      <span
        ref={ref}
        role={text ? "img" : undefined}
        aria-label={text}
        aria-hidden={text ? undefined : true}
        data-slot="tool-timeline-dot"
        data-status={status ?? "neutral"}
        className={cn("absolute left-[7px] top-[10px] z-[1] inline-flex size-[9px] rounded-full", className)}
        {...props}
      >
        {status === "progress" && (
          <span className="absolute inset-0 rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
        )}
        <span
          className={cn(
            "relative inline-flex size-full rounded-full ring-[3px] ring-background",
            !status && "bg-muted-foreground/50",
            status === "success" && "bg-success",
            status === "failure" && "bg-destructive",
            status === "warning" && "bg-warning",
            status === "progress" && "bg-primary",
            status === "pending" && "border border-dashed border-muted-foreground/70 bg-background"
          )}
        />
      </span>
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
  status?: ToolTimelineStatus;
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
  status?: ToolTimelineStatus;
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
      status = "success",
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
          {duration != null && !running && <span className="tabular-nums">{formatMs(duration)}</span>}
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
  /** Group status; derived from the children's `status` when omitted. */
  status?: ToolTimelineStatus;
  icon?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Collapse when the group finishes running (uncontrolled only). Default true. */
  autoCollapse?: boolean;
}

function deriveStatus(children: React.ReactNode): ToolTimelineStatus {
  const statuses = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((c) => ((c.props as { status?: ToolTimelineStatus }).status ?? "success"));
  if (!statuses.length) return "pending";
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
    const status = statusProp ?? deriveStatus(children);
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
      ? label({ count, status, running })
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
              {icon ?? <RiSearchLine />}
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

    React.useLayoutEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      const measure = () => setOverflows(el.scrollHeight > collapsedHeight + 4);
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }, [collapsedHeight, children]);

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
          tone === "error" ? "text-red-300" : "text-zinc-200"
        )}
      >
        <code>
          <AnsiText text={shown.join("\n")} />
        </code>
      </pre>
      {hidden > 0 && !all && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-7 h-10 bg-gradient-to-t from-zinc-950 to-transparent"
        />
      )}
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={all}
          aria-controls={id}
          onClick={() => setAll(!all)}
          className={cn(
            "mx-2 mb-2 inline-flex h-6 items-center rounded-sm px-1.5 font-sans text-xs text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100",
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
    const { copied, copy } = useCopy();
    return (
      <div
        ref={ref}
        data-slot="bash-tool-body"
        className={cn(
          "overflow-hidden rounded-box border border-zinc-800 bg-zinc-950 text-zinc-100 [color-scheme:dark]",
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
          <button
            type="button"
            aria-label={copied ? "Copied" : "Copy command"}
            onClick={() => copy(command)}
            className={cn(
              "inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100",
              focusRing
            )}
          >
            {copied ? <RiCheckLine aria-hidden className="size-3.5" /> : <RiFileCopyLine aria-hidden className="size-3.5" />}
          </button>
        </div>
        {output ? <TruncatedOutput text={output} maxLines={maxLines} /> : null}
        {streaming && (
          <div className="px-3 pb-2">
            <span aria-hidden className="inline-block h-3.5 w-1.5 animate-caret-blink bg-zinc-300 align-middle" />
            <span className="sr-only">Running</span>
          </div>
        )}
        {stderr ? (
          <div className="border-t border-white/10 bg-red-500/[0.06]">
            <TruncatedOutput text={stderr} maxLines={maxLines} tone="error" label="Error output" />
          </div>
        ) : null}
        {!output && !stderr && !streaming && (
          <div className="px-3 py-2 font-sans text-xs italic text-zinc-500">No output</div>
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
          href={url}
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
  /** Overrides the default label. */
  label?: React.ReactNode;
  /** Epoch ms when the current state began. Defaults to when `state` / `tool` last changed. */
  startedAt?: number;
  /** Controlled elapsed seconds (disables the internal clock). */
  elapsed?: number;
  tokenCount?: number;
  /** Right-side hint, e.g. <Kbd>Esc</Kbd> to interrupt. */
  hint?: React.ReactNode;
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

/** Live agent status above the composer with elapsed time and token count. Renders nothing when idle. */
export const AgentStatusLine = React.forwardRef<HTMLDivElement, AgentStatusLineProps>(
  ({ state, tool, label, startedAt, elapsed: elapsedProp, tokenCount, hint, className, ...props }, ref) => {
    const [since, setSince] = React.useState(() => startedAt ?? Date.now());
    const [now, setNow] = React.useState(() => Date.now());
    const active = state !== "idle";

    React.useEffect(() => {
      const t = Date.now();
      setSince(startedAt ?? t);
      setNow(t);
    }, [state, tool, startedAt]);

    React.useEffect(() => {
      if (!active || elapsedProp != null) return;
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }, [active, elapsedProp]);

    if (!active) return null;
    const seconds = elapsedProp ?? Math.max(0, Math.floor((now - since) / 1000));
    const text = label ?? defaultStatusLabel(state, tool);
    const waiting = state === "permission" || state === "question";

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        data-slot="agent-status-line"
        data-state={state}
        className={cn("flex min-w-0 items-center gap-2 px-1 py-1 text-sm text-muted-foreground", className)}
        {...props}
      >
        <span aria-hidden className="inline-flex shrink-0 [&_svg]:size-4">
          {state === "thinking" && <RiBrainLine className="text-primary" />}
          {state === "running" && <Spinner role="presentation" size="sm" className="text-primary" />}
          {state === "permission" && <RiShieldKeyholeLine className="text-warning" />}
          {state === "question" && <RiQuestionLine className="text-info" />}
        </span>
        {waiting ? (
          <span className="truncate font-medium text-foreground">{text}</span>
        ) : (
          <TextShimmer className="truncate font-medium">{text}</TextShimmer>
        )}
        <span aria-hidden data-slot="agent-status-elapsed" className="shrink-0 text-xs tabular-nums">
          {formatSeconds(seconds)}
        </span>
        {tokenCount != null && (
          <span aria-hidden data-slot="agent-status-tokens" className="shrink-0 text-xs tabular-nums">
            · {formatTokenLabel(tokenCount)}
          </span>
        )}
        {hint != null && <span className="ml-auto shrink-0 text-xs">{hint}</span>}
      </div>
    );
  }
);
AgentStatusLine.displayName = "AgentStatusLine";
