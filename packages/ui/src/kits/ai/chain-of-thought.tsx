import * as React from "react";
import { Collapsible } from "radix-ui";
import { RiArrowDownSLine, RiBrainLine, RiCheckLine, RiCloseLine, RiExpandUpDownLine } from "@remixicon/react";
import { Favicon, domainOf } from "../../primitives/favicon";
import { cn, focusRing } from "../../lib/cn";
import { useChangeKey } from "../../hooks/use-change-key";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useNow } from "../../hooks/use-now";
import { formatDuration } from "../../lib/duration";
import { formatTokens } from "../../lib/format";
import { normalizeTaskStatus, type TaskStatusInput } from "../../lib/status";
import { Spinner } from "../../primitives/spinner";
import { TextShimmer } from "../../primitives/text-shimmer";
import { Button, type ButtonProps } from "../../primitives/button";

/** "a moment" under a second, then "12s", "1m 15s", "62m 5s". */
function formatThoughtDuration(seconds: number) {
  if (!(seconds >= 1)) return "a moment";
  return formatDuration(seconds * 1000, { maxUnit: "m", keepZeros: false });
}

/** "950 tokens", "1.2k tokens", "3.4M tokens". */
export function formatTokenLabel(n: number) {
  return formatTokens(n, { label: true });
}

/* ------------------------------------------------------------------ */
/* Expand-all                                                          */
/* ------------------------------------------------------------------ */

export interface ThinkingExpandAllContextValue {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  toggle: () => void;
}

const ThinkingExpandAllContext = React.createContext<ThinkingExpandAllContextValue | null>(null);

export interface ThinkingExpandAllProviderProps {
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  children?: React.ReactNode;
}

/** Shares one "expand all thinking" switch with every ChainOfThought inside (e.g. a transcript). */
export function ThinkingExpandAllProvider({
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  children,
}: ThinkingExpandAllProviderProps) {
  const [expanded, setExpanded] = useControllableState<boolean>({
    value: expandedProp,
    defaultValue: defaultExpanded,
    onChange: onExpandedChange,
  });
  const value = React.useMemo(
    () => ({ expanded, setExpanded, toggle: () => setExpanded(!expanded) }),
    [expanded, setExpanded]
  );
  return <ThinkingExpandAllContext.Provider value={value}>{children}</ThinkingExpandAllContext.Provider>;
}

/** The nearest ThinkingExpandAllProvider state, or null outside one. */
export function useThinkingExpandAll() {
  return React.useContext(ThinkingExpandAllContext);
}

export interface ThinkingToggleProps extends Omit<ButtonProps, "onClick"> {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

/** Toggle button that expands / collapses every ChainOfThought under a ThinkingExpandAllProvider. */
export const ThinkingToggle = React.forwardRef<HTMLButtonElement, ThinkingToggleProps>(
  ({ onClick, children, variant = "ghost", size = "xs", ...props }, ref) => {
    const ctx = useThinkingExpandAll();
    if (!ctx) return null;
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        aria-pressed={ctx.expanded}
        leadingIcon={<RiExpandUpDownLine aria-hidden />}
        data-slot="thinking-toggle"
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) ctx.toggle();
        }}
        {...props}
      >
        {children ?? "Expand all thinking"}
      </Button>
    );
  }
);
ThinkingToggle.displayName = "ThinkingToggle";

export interface ChainOfThoughtProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Collapsible.Root>, "title"> {
  /** While true the header shimmers "Thinking…" and the elapsed time is measured. */
  streaming?: boolean;
  /** Seconds spent thinking. Measured automatically from `streaming` when omitted. */
  duration?: number;
  /** Custom header text (overrides "Thinking…" / "Thought for 12s"). */
  title?: React.ReactNode;
  icon?: React.ReactNode;
  /** Open while streaming and collapse when done (default true, uncontrolled only). */
  autoCollapse?: boolean;
  /** Live reasoning token count, shown as "1.2k tokens". */
  tokenCount?: number;
  /** Faint one-line summary shown under the header while collapsed. */
  summary?: React.ReactNode;
}

/** Collapsible reasoning panel with a "Thinking… / Thought for Ns" header. */
export const ChainOfThought = React.forwardRef<HTMLDivElement, ChainOfThoughtProps>(
  (
    {
      streaming = false,
      duration,
      title,
      icon,
      autoCollapse = true,
      tokenCount,
      summary,
      open: openProp,
      defaultOpen,
      onOpenChange,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const expandAll = useThinkingExpandAll();
    const [open, setOpen] = useControllableState<boolean>({
      value: openProp,
      defaultValue: defaultOpen ?? (streaming || !!expandAll?.expanded),
      onChange: onOpenChange,
    });
    const expandAllValue = expandAll?.expanded;
    const seenExpandAll = React.useRef(expandAllValue);
    React.useEffect(() => {
      if (expandAllValue === undefined || seenExpandAll.current === expandAllValue) return;
      seenExpandAll.current = expandAllValue;
      setOpen(expandAllValue);
    }, [expandAllValue, setOpen]);
    const now = useNow({ active: streaming });
    const startedAt = React.useRef<number | null>(null);
    const [measured, setMeasured] = React.useState<number | null>(null);
    const prevStreaming = React.useRef(streaming);

    React.useEffect(() => {
      const wasStreaming = prevStreaming.current;
      prevStreaming.current = streaming;
      if (streaming) {
        // Covers both mounting mid-stream and a stream starting later.
        if (startedAt.current == null) startedAt.current = Date.now();
        if (!wasStreaming) {
          setMeasured(null);
          if (autoCollapse && openProp === undefined) setOpen(true);
        }
      } else if (wasStreaming) {
        if (startedAt.current != null) setMeasured((Date.now() - startedAt.current) / 1000);
        startedAt.current = null;
        if (autoCollapse && openProp === undefined && !expandAllValue) setOpen(false);
      }
    }, [streaming, autoCollapse, openProp, setOpen, expandAllValue]);

    const elapsed =
      streaming && startedAt.current != null ? Math.max(0, Math.floor((now - startedAt.current) / 1000)) : 0;

    const seconds = duration ?? measured;
    const label =
      title ?? (streaming ? "Thinking…" : seconds != null ? `Thought for ${formatThoughtDuration(seconds)}` : "Thoughts");

    return (
      <Collapsible.Root
        ref={ref}
        open={open}
        onOpenChange={setOpen}
        data-streaming={streaming || undefined}
        className={cn("w-full", className)}
        {...props}
      >
        <Collapsible.Trigger
          className={cn(
            "group/cot -mx-1 inline-flex max-w-full items-center gap-1.5 rounded-control px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
            focusRing
          )}
        >
          <span aria-hidden className="inline-flex shrink-0 [&_svg]:size-4">
            {icon ?? <RiBrainLine aria-hidden />}
          </span>
          {streaming && title == null ? (
            <TextShimmer className="font-medium">{label}</TextShimmer>
          ) : (
            <span className="truncate font-medium">{label}</span>
          )}
          {streaming && title == null && elapsed > 0 && (
            <span data-slot="thinking-elapsed" className="shrink-0 tabular-nums">
              {formatThoughtDuration(elapsed)}
            </span>
          )}
          {tokenCount != null && (
            <span data-slot="thinking-tokens" className="shrink-0 text-xs tabular-nums text-muted-foreground/80">
              · {formatTokenLabel(tokenCount)}
            </span>
          )}
          <RiArrowDownSLine
            aria-hidden
            className="size-4 shrink-0 chevron-turn group-data-[state=open]/cot:rotate-180"
          />
        </Collapsible.Trigger>
        {summary != null && !open && (
          <p data-slot="thinking-summary" className="truncate pl-6 text-xs text-muted-foreground/70">
            {summary}
          </p>
        )}
        {children}
      </Collapsible.Root>
    );
  }
);
ChainOfThought.displayName = "ChainOfThought";

/** Collapsible body holding the reasoning steps. */
export const ChainOfThoughtContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Collapsible.Content>
>(({ className, children, ...props }, ref) => (
  <Collapsible.Content
    ref={ref}
    className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
    {...props}
  >
    <div className={cn("mt-3 flex flex-col text-sm", className)}>{children}</div>
  </Collapsible.Content>
));
ChainOfThoughtContent.displayName = "ChainOfThoughtContent";

export type ChainOfThoughtStepStatus = "pending" | "active" | "complete";
/** Step statuses accepted on input: the legacy values plus canonical `TaskStatus` names (`running`, `succeeded`, `failed`, …). */
export type ChainOfThoughtStepStatusInput = ChainOfThoughtStepStatus | TaskStatusInput;

export interface ChainOfThoughtStepProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Default "succeeded" (legacy "complete"). */
  status?: ChainOfThoughtStepStatusInput;
  /** Icon in the timeline dot (defaults depend on status). */
  icon?: React.ReactNode;
}

/** One step on the reasoning timeline. Children render under the label (e.g. search results). */
export const ChainOfThoughtStep = React.forwardRef<HTMLDivElement, ChainOfThoughtStepProps>(
  ({ label, description, status: statusProp = "complete", icon, className, children, ...props }, ref) => {
    const lifecycle = normalizeTaskStatus(statusProp, "succeeded");
    const status = lifecycle === "running" ? "active" : lifecycle === "succeeded" ? "complete" : lifecycle === "failed" ? "failed" : "pending";
    // The check and cross pop in when a step finishes or fails, not when a finished timeline first renders.
    const changes = useChangeKey(status);
    const pop = changes > 0 ? "animate-pop" : undefined;
    let dot: React.ReactNode;
    if (status === "active") dot = <Spinner aria-hidden role="presentation" size="xs" className="text-primary" />;
    else if (icon) dot = icon;
    else if (status === "complete") dot = <RiCheckLine key={changes} aria-hidden className={pop} />;
    else if (status === "failed") dot = <RiCloseLine key={changes} aria-hidden className={pop} />;
    else dot = <span className="size-1.5 rounded-full bg-current" />;

    return (
      <div
        ref={ref}
        data-status={statusProp}
        className={cn("group/step relative flex gap-3 pb-4 last:pb-0", className)}
        {...props}
      >
        <span
          aria-hidden
          className="absolute bottom-0 left-[9.5px] top-6 w-px bg-border group-last/step:hidden"
        />
        <span
          aria-hidden
          className={cn(
            "relative z-[1] mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border bg-background transition-colors duration-200 [&_svg]:size-3",
            status === "complete" && "border-border text-muted-foreground",
            status === "active" && "border-primary/40 bg-primary-soft text-primary",
            status === "failed" && "border-destructive/40 text-destructive",
            status === "pending" && "border-dashed border-border-strong text-muted-foreground/60"
          )}
        >
          {dot}
        </span>
        <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5", status === "pending" && "opacity-60")}>
          <div className="leading-6">
            {status === "active" && typeof label === "string" ? (
              <TextShimmer className="font-medium">{label}</TextShimmer>
            ) : (
              <span className={cn("font-medium", status === "complete" || status === "failed" ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            )}
          </div>
          {description && <div className="text-sm leading-6 text-muted-foreground">{description}</div>}
          {children}
        </div>
      </div>
    );
  }
);
ChainOfThoughtStep.displayName = "ChainOfThoughtStep";

export interface ChainOfThoughtSearchResultProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  /** Text in the chip; defaults to the domain. */
  title?: string;
  /** Icon URL; falls back to the FaviconProvider or a local monogram. */
  favicon?: string;
}

/** Small source chip with favicon. */
export const ChainOfThoughtSearchResult = React.forwardRef<HTMLAnchorElement, ChainOfThoughtSearchResultProps>(
  ({ href, title, favicon, className, children, ...props }, ref) => {
    const domain = domainOf(href);
    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={title ?? domain}
        className={cn(
          "inline-flex h-6 max-w-56 items-center gap-1.5 rounded-control border border-border bg-subtle px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          focusRing,
          className
        )}
        {...props}
      >
        <Favicon domain={domain} src={favicon} shape="square" className="size-3" />
        <span className="truncate">{children ?? title ?? domain}</span>
      </a>
    );
  }
);
ChainOfThoughtSearchResult.displayName = "ChainOfThoughtSearchResult";

export interface ChainOfThoughtSearchResultsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "results"> {
  /** Data-driven chips; alternatively pass ChainOfThoughtSearchResult children. */
  results?: { href: string; title?: string; favicon?: string }[];
}

/** Wrapping row of source chips under a search step. */
export const ChainOfThoughtSearchResults = React.forwardRef<HTMLDivElement, ChainOfThoughtSearchResultsProps>(
  ({ results, className, children, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-wrap gap-1.5", className)} {...props}>
      {results?.map((r, i) => <ChainOfThoughtSearchResult key={`${r.href}-${i}`} href={r.href} title={r.title} favicon={r.favicon} />)}
      {children}
    </div>
  )
);
ChainOfThoughtSearchResults.displayName = "ChainOfThoughtSearchResults";
