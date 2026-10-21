/** Log viewer: LogViewer (live tail with level colors, ANSI, filters and virtualized rows) with re-exports of the log model, one module per family. */
import * as React from "react";
import {
  RiArrowDownLine,
  RiDownloadLine,
  RiListOrdered,
  RiPauseLine,
  RiPlayLine,
  RiTextWrap,
  RiTimeLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { pluralize } from "../lib/format";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "../primitives/button";
import { CopyButton } from "../primitives/copy-button";
import { Checkbox } from "../primitives/checkbox";
import { SearchInput } from "../primitives/input";
import { SimpleSelect } from "../primitives/select";
import { Spinner } from "../primitives/spinner";
import { useStickToBottom } from "../hooks/use-stick-to-bottom";
import { useVirtualRows } from "../hooks/use-virtual-rows";

export { useVirtualRows, type UseVirtualRowsOptions, type VirtualRows } from "../hooks/use-virtual-rows";

import { LOG_LEVELS, type LogLevel, type LogLine, type LogViewerStatus } from "./log-viewer-model";
import {
  ToolbarToggle,
  buildMatcher,
  levelDot,
  levelLabel,
  levelRow,
  levelText,
  matchRanges,
  renderMessage,
  statusChip,
  useLogBuffer,
} from "./log-viewer-internal";

export * from "./log-viewer-model";

export interface LogSourceOption {
  value: string;
  label?: React.ReactNode;
}

export interface LogViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Log lines: raw strings (ANSI allowed) or structured entries. Append to the same array or pass a new one. */
  lines?: readonly LogLine[];
  /** Alias of `lines`. */
  entries?: readonly LogLine[];
  /** Ring-buffer cap on retained lines. Default 10 000. */
  maxLines?: number;
  /** Connection state, drives the empty state and a status chip. */
  status?: LogViewerStatus;
  /** Height of the scrolling area. Default 360. */
  height?: number | string;
  /** Row height in px used for virtualization. Default 20. */
  rowHeight?: number;
  /** Virtualize when more than this many lines are shown and wrapping is off. Default 200. */
  virtualizeThreshold?: number;
  /** Controlled visibility of the timestamp column. Use with `onShowTimestampsChange`. */
  showTimestamps?: boolean;
  /**
   * Initial timestamp visibility when uncontrolled.
   * @default true
   */
  defaultShowTimestamps?: boolean;
  /** Called when the timestamp toggle changes. */
  onShowTimestampsChange?: (value: boolean) => void;
  /** Controlled visibility of the line-number column. Use with `onShowLineNumbersChange`. */
  showLineNumbers?: boolean;
  /**
   * Initial line-number visibility when uncontrolled.
   * @default false
   */
  defaultShowLineNumbers?: boolean;
  /** Called when the line-number toggle changes. */
  onShowLineNumbersChange?: (value: boolean) => void;
  /** Controlled line wrapping (off keeps one line per entry and enables virtualization). Use with `onWrapChange`. */
  wrap?: boolean;
  /**
   * Initial wrapping when uncontrolled.
   * @default false
   */
  defaultWrap?: boolean;
  /** Called when the wrap toggle changes. */
  onWrapChange?: (value: boolean) => void;
  /** Controlled pause state: while paused the view freezes and new lines are counted. Use with `onPausedChange`. */
  paused?: boolean;
  /**
   * Initial pause state when uncontrolled.
   * @default false
   */
  defaultPaused?: boolean;
  /** Called when the user pauses or resumes. */
  onPausedChange?: (value: boolean) => void;
  /** Controlled search text. Use with `onFilterChange`. */
  filter?: string;
  /** Initial search text when uncontrolled. */
  defaultFilter?: string;
  /** Called with the search text as it changes. */
  onFilterChange?: (value: string) => void;
  /** Treat the filter as a regular expression. */
  regex?: boolean;
  /**
   * Initially treat the search text as a regular expression.
   * @default false
   */
  defaultRegex?: boolean;
  /** Called when the regex toggle changes. */
  onRegexChange?: (value: boolean) => void;
  /** Levels currently shown. Default all. */
  levels?: LogLevel[];
  /**
   * Initially shown levels when uncontrolled.
   * @default all levels
   */
  defaultLevels?: LogLevel[];
  /** Called with the shown levels when a level filter is toggled. */
  onLevelsChange?: (levels: LogLevel[]) => void;
  /** Source picker options (e.g. services or models). The picker reports changes via `onSourceChange`. */
  sources?: (string | LogSourceOption)[];
  /** Controlled selected source. Use with `onSourceChange`. */
  source?: string;
  /** Initially selected source when uncontrolled. */
  defaultSource?: string;
  /** Called with the source the user picked. */
  onSourceChange?: (source: string) => void;
  /** Also hide entries whose `source` differs from the selected one (client-side). Default false. */
  filterBySource?: boolean;
  /** File name for "Download". Default `logs.log`. */
  downloadName?: string;
  /** Hide the toolbar (search, level filters, actions). */
  hideToolbar?: boolean;
  /** Extra toolbar content, rendered before the action buttons. */
  toolbarExtra?: React.ReactNode;
  /** Called by the "Reconnect" button shown while disconnected. */
  onReconnect?: () => void;
  /** Shown when there are no lines (and no filter/connection message applies). Default "No log lines yet". */
  emptyState?: React.ReactNode;
  /** Legacy name of `emptyState`. @deprecated Use `emptyState`. */
  emptyMessage?: React.ReactNode;
  "aria-label"?: string;
}


export const LogViewer = React.forwardRef<HTMLDivElement, LogViewerProps>(
  (
    {
      lines,
      entries: entriesProp,
      maxLines = 10_000,
      status,
      height = 360,
      rowHeight = 20,
      virtualizeThreshold = 200,
      showTimestamps: showTimestampsProp,
      defaultShowTimestamps = true,
      onShowTimestampsChange,
      showLineNumbers: showLineNumbersProp,
      defaultShowLineNumbers = false,
      onShowLineNumbersChange,
      wrap: wrapProp,
      defaultWrap = false,
      onWrapChange,
      paused: pausedProp,
      defaultPaused = false,
      onPausedChange,
      filter: filterProp,
      defaultFilter = "",
      onFilterChange,
      regex: regexProp,
      defaultRegex = false,
      onRegexChange,
      levels: levelsProp,
      defaultLevels = LOG_LEVELS,
      onLevelsChange,
      sources,
      source: sourceProp,
      defaultSource,
      onSourceChange,
      filterBySource: filterBySourceProp = false,
      downloadName = "logs.log",
      hideToolbar,
      toolbarExtra,
      onReconnect,
      emptyState,
      emptyMessage,
      className,
      "aria-label": ariaLabel = "Logs",
      ...props
    },
    ref
  ) => {
    const raw = lines ?? entriesProp ?? EMPTY;
    const buffer = useLogBuffer(raw, Math.max(1, maxLines));

    const [showTs, setShowTs] = useControllableState({
      value: showTimestampsProp,
      defaultValue: defaultShowTimestamps,
      onChange: onShowTimestampsChange,
    });
    const [showNums, setShowNums] = useControllableState({
      value: showLineNumbersProp,
      defaultValue: defaultShowLineNumbers,
      onChange: onShowLineNumbersChange,
    });
    const [wrap, setWrap] = useControllableState({ value: wrapProp, defaultValue: defaultWrap, onChange: onWrapChange });
    const [paused, setPausedState] = useControllableState({
      value: pausedProp,
      defaultValue: defaultPaused,
      onChange: onPausedChange,
    });
    const [filter, setFilter] = useControllableState({
      value: filterProp,
      defaultValue: defaultFilter,
      onChange: onFilterChange,
    });
    const [regex, setRegex] = useControllableState({ value: regexProp, defaultValue: defaultRegex, onChange: onRegexChange });
    const [levels, setLevels] = useControllableState<LogLevel[]>({
      value: levelsProp,
      defaultValue: defaultLevels,
      onChange: onLevelsChange,
    });
    const sourceOptions = React.useMemo(
      () => (sources ?? []).map((s) => (typeof s === "string" ? { value: s, label: s } : { value: s.value, label: s.label ?? s.value })),
      [sources]
    );
    const [source, setSource] = useControllableState({
      value: sourceProp,
      defaultValue: defaultSource ?? sourceOptions[0]?.value ?? "",
      onChange: onSourceChange,
    });

    const lastSeq = buffer.length ? buffer[buffer.length - 1].seq : 0;
    const [pausedAt, setPausedAt] = React.useState<number | null>(paused ? lastSeq : null);
    React.useEffect(() => {
      if (paused && pausedAt === null) setPausedAt(lastSeq);
      if (!paused && pausedAt !== null) setPausedAt(null);
    }, [paused, pausedAt, lastSeq]);
    const freezeAt = paused ? (pausedAt ?? lastSeq) : null;
    const pendingCount = freezeAt === null ? 0 : buffer.filter((e) => e.seq > freezeAt).length;

    const shown = React.useMemo(
      () => (freezeAt === null ? buffer : buffer.filter((e) => e.seq <= freezeAt)),
      [buffer, freezeAt]
    );

    const { re, invalid } = React.useMemo(() => buildMatcher(filter ?? "", !!regex), [filter, regex]);
    const levelSet = React.useMemo(() => new Set(levels), [levels]);
    const filterBySource = filterBySourceProp && !!source;

    const counts = React.useMemo(() => {
      const c: Record<LogLevel, number> = { error: 0, warn: 0, info: 0, http: 0, debug: 0, other: 0 };
      for (const e of shown) if (!filterBySource || !e.source || e.source === source) c[e.level]++;
      return c;
    }, [shown, filterBySource, source]);

    const visible = React.useMemo(
      () =>
        shown.filter((e) => {
          if (!levelSet.has(e.level)) return false;
          if (filterBySource && e.source && e.source !== source) return false;
          if (re) {
            re.lastIndex = 0;
            if (!re.test(e.plain)) return false;
          }
          return true;
        }),
      [shown, levelSet, filterBySource, source, re]
    );

    const hasTs = showTs && visible.some((e) => e.ts);
    const hasSource = visible.some((e) => e.source) && !filterBySource;
    const gutter = String(visible.length ? visible[visible.length - 1].seq : 0).length;

    const stick = useStickToBottom({ resize: "instant", threshold: rowHeight * 2 });
    const [scrollEl, setScrollEl] = React.useState<HTMLElement | null>(null);
    const scrollRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        stick.scrollRef(node);
        setScrollEl(node);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [stick.scrollRef]
    );

    const virtual = useVirtualRows({
      count: visible.length,
      rowHeight,
      scrollElement: scrollEl,
      enabled: !wrap && visible.length > virtualizeThreshold,
    });
    const isVirtual = !wrap && visible.length > virtualizeThreshold;
    const rows = visible.slice(virtual.start, virtual.end);

    const asText = React.useCallback(
      () =>
        visible
          .map((e) => [e.ts, e.source ? `[${e.source}]` : null, e.plain].filter(Boolean).join(" "))
          .join("\n"),
      [visible]
    );
    const download = () => {
      if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return;
      const url = URL.createObjectURL(new Blob([asText() + "\n"], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    };

    const setPaused = (v: boolean) => setPausedState(v);
    const resume = () => {
      setPaused(false);
      if (typeof requestAnimationFrame !== "undefined") requestAnimationFrame(() => stick.scrollToBottom("instant"));
    };

    const toggleLevel = (level: LogLevel, on: boolean) => {
      const next = on ? LOG_LEVELS.filter((l) => l === level || levelSet.has(l)) : levels.filter((l) => l !== level);
      setLevels(next);
    };
    const levelOptions = LOG_LEVELS.filter((l) => l !== "other" || counts.other > 0 || !levelSet.has("other"));

    const filtering = !!re || levels.length < LOG_LEVELS.length;
    const chip = status ? statusChip[status] : null;

    let empty: React.ReactNode = null;
    if (visible.length === 0) {
      if (shown.length > 0 && filtering) empty = "No lines match the current filters";
      else if (status === "connecting")
        empty = (
          <span className="inline-flex items-center gap-2">
            <Spinner size="xs" /> Connecting…
          </span>
        );
      else if (status === "disconnected") empty = "Disconnected";
      else if (status === "error") empty = "Log stream failed";
      else empty = emptyState ?? emptyMessage ?? "No log lines yet";
    }

    return (
      <div
        ref={ref}
        data-slot="log-viewer"
        className={cn("flex min-w-0 flex-col overflow-hidden rounded-box border border-border bg-card shadow-xs", className)}
        dir="ltr"
        {...props}
      >
        {!hideToolbar && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-2.5 py-2">
            <div className="flex min-w-48 flex-1 items-center gap-1">
              <SearchInput
                size="sm"
                placeholder={regex ? "Filter (regex)…" : "Filter…"}
                aria-label="Filter log lines"
                value={filter ?? ""}
                onChange={(e) => setFilter(e.target.value)}
                onClear={() => setFilter("")}
                invalid={invalid}
                className="max-w-64"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Use regular expression"
                title="Use regular expression"
                aria-pressed={!!regex}
                onClick={() => setRegex(!regex)}
                className={cn("font-mono text-xs text-muted-foreground", regex && "bg-accent text-foreground")}
              >
                .*
              </Button>
            </div>
            <div role="group" aria-label="Levels" className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {levelOptions.map((level) => (
                <label key={level} className="inline-flex cursor-pointer select-none items-center gap-1.5 text-xs text-foreground">
                  <Checkbox
                    size="sm"
                    checked={levelSet.has(level)}
                    onCheckedChange={(v) => toggleLevel(level, v === true)}
                  />
                  <span aria-hidden className={cn("size-1.5 rounded-full", levelDot[level])} />
                  {levelLabel[level]}
                  <span className="tabular-nums text-muted-foreground">{counts[level]}</span>
                </label>
              ))}
            </div>
            {sourceOptions.length > 0 && (
              <SimpleSelect
                size="sm"
                aria-label="Log source"
                options={sourceOptions}
                value={source}
                onValueChange={setSource}
                className="w-40"
              />
            )}
            <div className="ms-auto flex max-w-full flex-wrap items-center justify-end gap-0.5">
              {toolbarExtra}
              {chip && (
                <span className="me-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
                  <span aria-hidden className={cn("size-1.5 rounded-full", chip.dot)} />
                  {chip.label}
                </span>
              )}
              <ToolbarToggle pressed={!!showTs} onPressedChange={setShowTs} label="Show timestamps">
                <RiTimeLine aria-hidden />
              </ToolbarToggle>
              <ToolbarToggle pressed={!!showNums} onPressedChange={setShowNums} label="Show line numbers">
                <RiListOrdered aria-hidden />
              </ToolbarToggle>
              <ToolbarToggle pressed={!!wrap} onPressedChange={setWrap} label="Wrap lines">
                <RiTextWrap aria-hidden />
              </ToolbarToggle>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={paused ? "Resume" : "Pause"}
                title={paused ? "Resume" : "Pause"}
                onClick={() => (paused ? resume() : setPaused(true))}
                className="text-muted-foreground"
              >
                {paused ? <RiPlayLine aria-hidden /> : <RiPauseLine aria-hidden />}
              </Button>
              <CopyButton value={asText} size="md" label="Copy visible lines" className="rounded-control" />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Download as .log"
                title="Download as .log"
                onClick={download}
                className="text-muted-foreground"
              >
                <RiDownloadLine aria-hidden />
              </Button>
            </div>
          </div>
        )}
        <div className="relative min-h-0 flex-1 bg-code text-code-foreground [color-scheme:dark]">
          <div
            ref={scrollRef}
            role="log"
            aria-live="off"
            aria-label={ariaLabel}
            tabIndex={0}
            data-virtual={isVirtual ? "" : undefined}
            className={cn("scrollbar-thin overflow-auto py-2 font-mono text-xs", focusRing)}
            style={{ height }}
          >
            {empty ? (
              <div className="flex h-full items-center justify-center px-4 text-center text-code-muted">{empty}</div>
            ) : (
              <div
                ref={stick.contentRef}
                className={cn("relative", !wrap && "min-w-max")}
                style={isVirtual ? { height: virtual.totalHeight } : undefined}
              >
                <div style={isVirtual ? { transform: `translateY(${virtual.offset}px)` } : undefined}>
                  {rows.map((e) => {
                    const ranges = re ? matchRanges(e.plain, re) : [];
                    return (
                      <div
                        key={e.key + ":" + e.seq}
                        data-level={e.level}
                        data-log-row=""
                        className={cn(
                          "flex gap-3 px-3 leading-5 hover:bg-code-foreground/[0.04]",
                          levelRow[e.level],
                          wrap ? "items-start" : "items-center whitespace-pre"
                        )}
                        style={wrap ? { minHeight: rowHeight } : { height: rowHeight }}
                      >
                        {showNums && (
                          <span
                            aria-hidden
                            className="shrink-0 select-none text-end tabular-nums text-code-muted/70"
                            style={{ width: `${gutter}ch` }}
                          >
                            {e.seq}
                          </span>
                        )}
                        {hasTs && <span className="shrink-0 tabular-nums text-code-muted">{e.ts ?? ""}</span>}
                        {hasSource && e.source && <span className="shrink-0 text-code-muted">[{e.source}]</span>}
                        <span
                          className={cn(
                            "min-w-0",
                            levelText[e.level],
                            wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
                          )}
                        >
                          {e.message ? renderMessage(e.message, ranges) : " "}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {status === "disconnected" && visible.length > 0 && (
            <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 bg-code/90 py-1 text-xs text-code-muted">
              Disconnected
              {onReconnect && (
                <button
                  type="button"
                  onClick={onReconnect}
                  className={cn("rounded-control px-1.5 text-code-foreground underline underline-offset-2", focusRing)}
                >
                  Reconnect
                </button>
              )}
            </div>
          )}
          {status === "disconnected" && visible.length === 0 && onReconnect && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center">
              <Button size="xs" variant="secondary" onClick={onReconnect}>
                Reconnect
              </Button>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {paused && pendingCount > 0 && (
              <button
                type="button"
                onClick={resume}
                className={cn(
                  "pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground shadow-lg animate-in fade-in-0 slide-in-from-bottom-2",
                  focusRing
                )}
              >
                <RiPlayLine className="size-3.5" aria-hidden />
                {pendingCount} new {pluralize(pendingCount, "line")}
              </button>
            )}
            {!stick.isAtBottom && !(paused && pendingCount > 0) && visible.length > 0 && (
              <button
                type="button"
                aria-label="Jump to bottom"
                onClick={() => stick.scrollToBottom("instant")}
                className={cn(
                  "pointer-events-auto inline-flex size-8 items-center justify-center rounded-full border border-code-border bg-code text-code-foreground shadow-lg hover:bg-code-foreground/10 animate-in fade-in-0",
                  focusRing
                )}
              >
                <RiArrowDownLine className="size-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);
LogViewer.displayName = "LogViewer";

const EMPTY: readonly LogLine[] = [];
