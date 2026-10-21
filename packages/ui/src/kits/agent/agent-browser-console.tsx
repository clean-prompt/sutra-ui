import * as React from "react";
import { RiArrowDownSLine, RiBugLine, RiDeleteBinLine, RiErrorWarningLine, RiInformationLine, RiTerminalBoxLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { pad2, toValidDate } from "../../lib/time";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";

/* ------------------------------------------------------------------ */
/* BrowserConsole                                                      */
/* ------------------------------------------------------------------ */

export type BrowserConsoleLevel = "error" | "warn" | "info" | "log" | "debug";

export const BROWSER_CONSOLE_LEVELS: BrowserConsoleLevel[] = ["error", "warn", "info", "log", "debug"];

export interface BrowserConsoleEntry {
  id: string | number;
  level: BrowserConsoleLevel;
  message: string;
  /** e.g. "app.js:42". */
  source?: string;
  /** Preformatted string, epoch ms or Date. */
  ts?: string | number | Date;
  /** Collapsed repeat count. */
  count?: number;
}

export interface BrowserConsoleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Console messages to list, each with a level, text and time. */
  entries: readonly BrowserConsoleEntry[];
  /** Controlled expanded state of the console. */
  open?: boolean;
  /** Initial expanded state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called with the new state when the user expands or collapses the console. */
  onOpenChange?: (open: boolean) => void;
  /** Levels shown. Default all. */
  levels?: BrowserConsoleLevel[];
  /** Initially visible levels when `levels` is not controlled. */
  defaultLevels?: BrowserConsoleLevel[];
  /** Called with the visible levels when the user toggles a level filter. */
  onLevelsChange?: (levels: BrowserConsoleLevel[]) => void;
  /** Controlled text filter applied to the messages. */
  filter?: string;
  /** Initial text filter when `filter` is not controlled. */
  defaultFilter?: string;
  /** Called with the filter text on every change. */
  onFilterChange?: (filter: string) => void;
  /** Called when the user presses Clear; the button is hidden when unset. */
  onClear?: () => void;
  /** Max height of the list (CSS length). Default 200. */
  maxHeight?: number | string;
}

const levelStyle: Record<BrowserConsoleLevel, { row: string; text: string; icon: React.ReactNode; label: string }> = {
  error: { row: "bg-destructive-soft/50", text: "text-destructive", icon: <RiErrorWarningLine aria-hidden />, label: "Errors" },
  warn: { row: "bg-warning-soft/50", text: "text-warning", icon: <RiErrorWarningLine aria-hidden />, label: "Warnings" },
  info: { row: "", text: "text-info", icon: <RiInformationLine aria-hidden />, label: "Info" },
  log: { row: "", text: "text-foreground", icon: <RiTerminalBoxLine aria-hidden />, label: "Logs" },
  debug: { row: "", text: "text-muted-foreground", icon: <RiBugLine aria-hidden />, label: "Debug" },
};

function formatConsoleTs(ts: BrowserConsoleEntry["ts"]) {
  if (ts == null) return null;
  if (typeof ts === "string") return ts;
  const d = toValidDate(ts);
  if (!d) return null;
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** Collapsible page console with level toggles and a text filter. */
export const BrowserConsole = React.forwardRef<HTMLDivElement, BrowserConsoleProps>(
  (
    {
      entries,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      levels: levelsProp,
      defaultLevels = BROWSER_CONSOLE_LEVELS,
      onLevelsChange,
      filter: filterProp,
      defaultFilter = "",
      onFilterChange,
      onClear,
      maxHeight = 200,
      className,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    const [levels, setLevels] = useControllableState({ value: levelsProp, defaultValue: defaultLevels, onChange: onLevelsChange });
    const [filter, setFilter] = useControllableState({ value: filterProp, defaultValue: defaultFilter, onChange: onFilterChange });
    const listId = React.useId();
    const counts = React.useMemo(() => {
      const c: Record<BrowserConsoleLevel, number> = { error: 0, warn: 0, info: 0, log: 0, debug: 0 };
      for (const e of entries) c[e.level] += e.count ?? 1;
      return c;
    }, [entries]);
    const q = filter.trim().toLowerCase();
    const visible = entries.filter(
      (e) =>
        levels.includes(e.level) &&
        (!q || e.message.toLowerCase().includes(q) || (e.source ?? "").toLowerCase().includes(q))
    );
    const toggleLevel = (l: BrowserConsoleLevel) =>
      setLevels(levels.includes(l) ? levels.filter((x) => x !== l) : BROWSER_CONSOLE_LEVELS.filter((x) => x === l || levels.includes(x)));

    return (
      <div ref={ref} data-slot="browser-console" className={cn("border-t border-border bg-card text-xs", className)} {...props}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            onClick={() => setOpen(!open)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-control px-1.5 font-medium text-foreground hover:bg-accent [&_svg]:size-4",
              focusRing
            )}
          >
            <RiArrowDownSLine aria-hidden className={cn("chevron-turn", !open && "-rotate-90 rtl:rotate-90")} />
            <RiTerminalBoxLine aria-hidden />
            Console
          </button>
          {counts.error > 0 && (
            <span className="inline-flex items-center gap-1 text-destructive" aria-label={`${counts.error} errors`}>
              <RiErrorWarningLine className="size-3.5" aria-hidden />
              {counts.error}
            </span>
          )}
          {counts.warn > 0 && (
            <span className="inline-flex items-center gap-1 text-warning" aria-label={`${counts.warn} warnings`}>
              <RiErrorWarningLine className="size-3.5" aria-hidden />
              {counts.warn}
            </span>
          )}
          {open && (
            <div className="ms-auto flex min-w-0 max-w-full flex-wrap items-center gap-1">
              <input
                type="search"
                aria-label="Filter console"
                placeholder="Filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={cn(
                  "h-7 w-32 min-w-0 rounded-control border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground",
                  focusRing
                )}
              />
              <div role="group" aria-label="Levels" className="flex flex-wrap items-center">
                {BROWSER_CONSOLE_LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={levels.includes(l)}
                    onClick={() => toggleLevel(l)}
                    className={cn(
                      "h-7 rounded-control px-1.5 capitalize text-muted-foreground hover:bg-accent aria-pressed:bg-accent aria-pressed:text-foreground",
                      focusRing
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {onClear && (
                <Button type="button" variant="ghost" size="icon-xs" aria-label="Clear console" onClick={onClear}>
                  <RiDeleteBinLine aria-hidden />
                </Button>
              )}
            </div>
          )}
        </div>
        {open && (
          <div
            id={listId}
            role="log"
            aria-label="Console messages"
            className="scrollbar-thin overflow-auto border-t border-border font-mono"
            style={{ maxHeight }}
          >
          <ul>
            {visible.length === 0 ? (
              <li className="px-3 py-3 text-muted-foreground">{entries.length ? "No messages match" : "Console is empty"}</li>
            ) : (
              visible.map((e) => {
                const s = levelStyle[e.level];
                const ts = formatConsoleTs(e.ts);
                return (
                  <li
                    key={e.id}
                    data-level={e.level}
                    className={cn("flex items-start gap-2 border-b border-border/60 px-3 py-1 last:border-b-0", s.row)}
                  >
                    <span className={cn("mt-0.5 flex shrink-0 [&_svg]:size-3.5", s.text)} aria-hidden>
                      {s.icon}
                    </span>
                    <span className="sr-only">{e.level}:</span>
                    {ts && <span className="shrink-0 text-muted-foreground tabular-nums">{ts}</span>}
                    <span className={cn("min-w-0 flex-1 whitespace-pre-wrap break-words", s.text)}>{e.message}</span>
                    {e.count != null && e.count > 1 && (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 text-2xs tabular-nums text-muted-foreground">{e.count}</span>
                    )}
                    {e.source && <span className="shrink-0 text-muted-foreground">{e.source}</span>}
                  </li>
                );
              })
            )}
          </ul>
          </div>
        )}
      </div>
    );
  }
);
BrowserConsole.displayName = "BrowserConsole";
