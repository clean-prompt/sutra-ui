import * as React from "react";
import { RiPlayLine, RiRestartLine, RiStopLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { formatDuration } from "../../lib/duration";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";

/* ------------------------------------------------------------------ */
/* GatewayStatusPopover                                                */
/* ------------------------------------------------------------------ */

export type GatewayRunState = "running" | "starting" | "stopping" | "stopped" | "error";

const runStateMeta: Record<GatewayRunState, { label: string; dot: string }> = {
  running: { label: "Running", dot: "bg-success" },
  starting: { label: "Starting", dot: "bg-warning motion-safe:animate-pulse" },
  stopping: { label: "Stopping", dot: "bg-warning motion-safe:animate-pulse" },
  stopped: { label: "Stopped", dot: "bg-muted-foreground" },
  error: { label: "Error", dot: "bg-destructive" },
};

export interface GatewayStatusPopoverProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "name" | "children" | "type" | "onError"> {
  /**
   * Run state of the gateway (`running`, `starting`, `stopping`, `stopped` or `error`); sets the dot, label and the
   * actions offered.
   */
  state: GatewayRunState;
  /** Gateway display name. Default "Gateway". */
  name?: React.ReactNode;
  /** Seconds (formatted) or a preformatted string. */
  uptime?: number | string;
  /** Gateway version, shown in the popover. */
  version?: string;
  /** Host or address the gateway listens on, shown in the popover. */
  host?: string;
  /** Error detail shown when state is "error". */
  error?: React.ReactNode;
  /** Called when the user presses Restart; the button is hidden when unset. */
  onRestart?: () => void;
  /** Called when the user presses Stop; the button is hidden when unset. */
  onStop?: () => void;
  /** Called when the user presses Start on a stopped gateway; the button is hidden when unset. */
  onStart?: () => void;
  /** Recent log lines rendered in the tail panel. */
  logLines?: string[];
  /** Custom log tail content (e.g. a streaming LogViewer); replaces `logLines`. */
  logSlot?: React.ReactNode;
  /** Controlled open state of the popover. */
  open?: boolean;
  /** Initial open state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called when the popover opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Extra classes for the trigger button. */
  className?: string;
  /** Extra classes for the popover content. */
  contentClassName?: string;
}

/** Status-bar gateway indicator with a popover of uptime, version, controls and a live log tail. */
export const GatewayStatusPopover = React.forwardRef<HTMLButtonElement, GatewayStatusPopoverProps>(
  (
    {
      state,
      name = "Gateway",
      uptime,
      version,
      host,
      error,
      onRestart,
      onStop,
      onStart,
      logLines,
      logSlot,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      className,
      contentClassName,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    const meta = runStateMeta[state];
    const busy = state === "starting" || state === "stopping";
    const uid = React.useId();
    const logRef = React.useRef<HTMLPreElement>(null);
    React.useEffect(() => {
      const el = logRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, [logLines, open]);
    const uptimeText = typeof uptime === "number" ? formatDuration(uptime * 1000, { round: "floor" }) : uptime;
    const rows: [string, React.ReactNode][] = [];
    if (uptimeText && state === "running") rows.push(["Uptime", uptimeText]);
    if (version) rows.push(["Version", version]);
    if (host) rows.push(["Host", host]);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            type="button"
            data-state-kind={state}
            className={cn(
              "inline-flex h-6 max-w-full items-center gap-1.5 whitespace-nowrap rounded-sm px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              focusRing,
              className
            )}
            data-slot="gateway-status-popover"
            {...props}
          >
            <span aria-hidden className={cn("size-2 shrink-0 rounded-full", meta.dot)} />
            <span className="min-w-0 truncate">{name}</span>
            <span className="shrink-0 text-foreground">{meta.label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          size="auto"
          padded={false}
          aria-labelledby={`${uid}-title`}
          className={cn("w-80", contentClassName)}
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span aria-hidden className={cn("size-2.5 rounded-full", meta.dot)} />
            <span id={`${uid}-title`} className="text-sm font-semibold text-foreground">
              {name}
            </span>
            <span className="ms-auto text-xs text-muted-foreground" role="status">
              {meta.label}
            </span>
          </div>
          <div className="flex flex-col gap-3 px-4 py-3">
            {state === "error" && error && (
              <p className="rounded-sm bg-destructive-soft px-2 py-1.5 text-xs text-destructive-soft-foreground">{error}</p>
            )}
            {rows.length > 0 && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                {rows.map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="truncate text-end font-mono text-foreground">{v}</dd>
                  </React.Fragment>
                ))}
              </dl>
            )}
            <div className="flex flex-wrap gap-2">
              {state === "stopped" || state === "error"
                ? onStart && (
                    <Button size="xs" variant="secondary" leadingIcon={<RiPlayLine aria-hidden />} onClick={onStart}>
                      Start
                    </Button>
                  )
                : null}
              {onRestart && state !== "stopped" && (
                <Button size="xs" variant="secondary" leadingIcon={<RiRestartLine aria-hidden />} onClick={onRestart} disabled={busy}>
                  Restart
                </Button>
              )}
              {onStop && state !== "stopped" && state !== "error" && (
                <Button size="xs" variant="destructive-soft" leadingIcon={<RiStopLine aria-hidden />} onClick={onStop} disabled={busy}>
                  Stop
                </Button>
              )}
            </div>
            {(logSlot || logLines) && (
              <section aria-label="Recent logs" className="flex flex-col gap-1">
                <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Recent logs</span>
                {logSlot ?? (
                  <pre
                    ref={logRef}
                    tabIndex={0}
                    aria-live="polite"
                    className={cn(
                      "max-h-40 overflow-auto rounded-sm bg-inverse p-2 font-mono text-2xs leading-relaxed text-inverse-foreground scrollbar-thin",
                      focusRing
                    )}
                  >
                    {logLines && logLines.length ? logLines.join("\n") : "No log output yet"}
                  </pre>
                )}
              </section>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);
GatewayStatusPopover.displayName = "GatewayStatusPopover";
