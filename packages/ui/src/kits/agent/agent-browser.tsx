import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiBugLine,
  RiChatQuoteLine,
  RiCloseLine,
  RiComputerLine,
  RiCookieLine,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiGlobalLine,
  RiHand,
  RiHistoryLine,
  RiInformationLine,
  RiKey2Line,
  RiLockLine,
  RiLockUnlockLine,
  RiMapPin2Line,
  RiRefreshLine,
  RiRobot2Line,
  RiSendPlaneLine,
  RiShieldUserLine,
  RiTerminalBoxLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { Progress } from "../../primitives/progress";
import { clamp, roundTo } from "../../lib/math";
import { pad2, toValidDate } from "../../lib/time";
import { isSafeHref } from "../../lib/validate";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Textarea } from "../../primitives/textarea";
import { CheckboxField } from "../../primitives/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export type BrowserSecurity = "secure" | "insecure" | "local" | "unknown";
export type BrowserController = "agent" | "user";

/** Classify a URL for the address-bar security indicator (pure, never fetches). */
export function inferBrowserSecurity(url: string | undefined): BrowserSecurity {
  if (!url) return "unknown";
  const u = url.trim().toLowerCase();
  if (u.startsWith("file:") || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|\/|$)/.test(u)) return "local";
  if (u.startsWith("https:")) return "secure";
  if (u.startsWith("http:")) return "insecure";
  return "unknown";
}

/**
 * Turn address-bar input into a navigable URL string (adds https:// to bare hosts and `host:port`;
 * `""` for script/data URLs and for text with spaces, which isn't an address).
 */
export function normalizeBrowserInput(input: string): string {
  const v = input.trim();
  if (!v || /\s/.test(v)) return "";
  if (/^(localhost|127\.0\.0\.1)(:\d+)?([/?#]|$)/i.test(v)) return `http://${v}`;
  if (/^[a-z0-9.-]+:\d+([/?#]|$)/i.test(v)) return `https://${v}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return isSafeHref(v) || /^(file|about):/i.test(v) ? v : "";
  return `https://${v}`;
}

const securityMeta: Record<BrowserSecurity, { label: string; icon: React.ReactNode; className: string }> = {
  secure: { label: "Secure connection", icon: <RiLockLine aria-hidden />, className: "text-success" },
  insecure: { label: "Not secure", icon: <RiLockUnlockLine aria-hidden />, className: "text-destructive" },
  local: { label: "Local page", icon: <RiComputerLine aria-hidden />, className: "text-info" },
  unknown: { label: "Page", icon: <RiGlobalLine aria-hidden />, className: "text-muted-foreground" },
};

/* ------------------------------------------------------------------ */
/* AgentBrowserPane                                                    */
/* ------------------------------------------------------------------ */

export interface AgentBrowserPaneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Current URL. Display state only: the pane never loads it. */
  url?: string;
  /** Page title, shown as a tooltip on the URL field. */
  pageTitle?: string;
  /** Override the inferred security indicator. */
  security?: BrowserSecurity;
  loading?: boolean;
  /** 0–100. Indeterminate while `loading` and unset. */
  progress?: number;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onReload?: () => void;
  onStop?: () => void;
  /** Called with the normalized URL when the user submits the address bar. */
  onNavigate?: (url: string) => void;
  /** Who holds the control lease. */
  controller?: BrowserController;
  defaultController?: BrowserController;
  onControllerChange?: (controller: BrowserController) => void;
  agentName?: string;
  /** What the agent is doing right now, e.g. "Clicking “Sign in”". */
  agentActivity?: React.ReactNode;
  /** Extra toolbar content after the URL field. */
  toolbarExtra?: React.ReactNode;
  /** Rendered under the viewport, e.g. a `BrowserConsole`. */
  footer?: React.ReactNode;
  viewportClassName?: string;
  /** The viewport (iframe, screenshot, canvas…) supplied by the app. */
  children?: React.ReactNode;
}

/** Agent-driven browser surface: address bar, lease banner, loading bar and an app-provided viewport. */
export const AgentBrowserPane = React.forwardRef<HTMLDivElement, AgentBrowserPaneProps>(
  (
    {
      url = "",
      pageTitle,
      security: securityProp,
      loading = false,
      progress,
      canGoBack = false,
      canGoForward = false,
      onBack,
      onForward,
      onReload,
      onStop,
      onNavigate,
      controller: controllerProp,
      defaultController = "user",
      onControllerChange,
      agentName = "Agent",
      agentActivity,
      toolbarExtra,
      footer,
      viewportClassName,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [controller, setController] = useControllableState<BrowserController>({
      value: controllerProp,
      defaultValue: defaultController,
      onChange: onControllerChange,
    });
    const agentDriving = controller === "agent";
    const [draft, setDraft] = React.useState(url);
    const [editing, setEditing] = React.useState(false);
    React.useEffect(() => {
      if (!editing) setDraft(url);
    }, [url, editing]);
    const security = securityProp ?? inferBrowserSecurity(url);
    const sec = securityMeta[security];
    const lockedTitle = agentDriving ? `${agentName} is driving. Take over to browse.` : undefined;

    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      if (agentDriving) return;
      const next = normalizeBrowserInput(draft);
      if (!next) return;
      setEditing(false);
      onNavigate?.(next);
    };

    return (
      <div
        ref={ref}
        data-slot="agent-browser"
        data-controller={controller}
        className={cn(
          "flex min-h-0 flex-col overflow-hidden rounded-box border border-border bg-card shadow-xs",
          agentDriving && "border-primary/50",
          className
        )}
        {...props}
      >
        <div className="relative flex items-center gap-1 border-b border-border bg-subtle px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Back"
            title={lockedTitle ?? "Back"}
            disabled={!canGoBack || agentDriving}
            onClick={onBack}
          >
            <RiArrowLeftLine aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Forward"
            title={lockedTitle ?? "Forward"}
            disabled={!canGoForward || agentDriving}
            onClick={onForward}
          >
            <RiArrowRightLine aria-hidden />
          </Button>
          {loading ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Stop loading"
              title={lockedTitle ?? "Stop loading"}
              disabled={agentDriving}
              onClick={onStop}
            >
              <RiCloseLine aria-hidden />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Reload"
              title={lockedTitle ?? "Reload"}
              disabled={agentDriving}
              onClick={onReload}
            >
              <RiRefreshLine aria-hidden />
            </Button>
          )}
          <form role="search" aria-label="Address bar" onSubmit={submit} className="min-w-0 flex-1">
            <div
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-control border border-input bg-background px-2 text-sm shadow-xs",
                "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20",
                agentDriving && "opacity-80"
              )}
              title={pageTitle}
            >
              <span
                role="img"
                aria-label={sec.label}
                title={sec.label}
                data-security={security}
                className={cn("flex shrink-0 [&_svg]:size-3.5", sec.className)}
              >
                {sec.icon}
              </span>
              <input
                type="text"
                inputMode="url"
                spellCheck={false}
                autoComplete="off"
                aria-label="Address"
                value={draft}
                readOnly={agentDriving}
                title={lockedTitle}
                placeholder="Search or enter address"
                onFocus={() => setEditing(true)}
                onBlur={() => setEditing(false)}
                onChange={(e) => {
                  setEditing(true);
                  setDraft(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setDraft(url);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="min-w-0 flex-1 truncate bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </form>
          {agentDriving && (
            <span
              data-slot="agent-driving-pill"
              className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-control bg-primary-soft px-2 text-xs font-medium text-primary-soft-foreground [&_svg]:size-3.5"
            >
              <span className="relative flex size-1.5" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              <RiRobot2Line aria-hidden />
              {agentName} is driving
            </span>
          )}
          {toolbarExtra}
          {loading && (
            <Progress
              size="2xs"
              value={progress != null ? Math.round(progress) : null}
              aria-label="Page loading"
              className="absolute inset-x-0 bottom-0 rounded-none bg-transparent"
              indicatorClassName="rounded-none duration-300"
            />
          )}
        </div>

        <div
          role="status"
          data-slot="browser-lease"
          className={cn(
            "flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs",
            agentDriving ? "bg-primary-soft/60 text-primary-soft-foreground" : "bg-background text-muted-foreground"
          )}
        >
          {agentDriving ? <RiRobot2Line className="size-3.5 shrink-0" aria-hidden /> : <RiHand className="size-3.5 shrink-0" aria-hidden />}
          <span className="min-w-0 flex-1 truncate">
            {agentDriving ? (
              <>
                <span className="font-medium">{agentName} is browsing</span>
                {agentActivity && <span className="opacity-80"> · {agentActivity}</span>}
              </>
            ) : (
              <>You’re in control. {agentName} is paused.</>
            )}
          </span>
          <Button
            type="button"
            size="xs"
            variant={agentDriving ? "secondary" : "soft"}
            onClick={() => setController(agentDriving ? "user" : "agent")}
          >
            {agentDriving ? "Take over" : "Hand back"}
          </Button>
        </div>

        <div
          data-slot="browser-viewport"
          className={cn("relative min-h-48 flex-1 overflow-hidden bg-background", viewportClassName)}
        >
          {children}
          {agentDriving && (
            <div
              aria-hidden
              data-slot="browser-agent-shield"
              className="pointer-events-auto absolute inset-0 cursor-not-allowed ring-2 ring-inset ring-primary/40"
            />
          )}
        </div>
        {footer}
      </div>
    );
  }
);
AgentBrowserPane.displayName = "AgentBrowserPane";

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
  entries: readonly BrowserConsoleEntry[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Levels shown. Default all. */
  levels?: BrowserConsoleLevel[];
  defaultLevels?: BrowserConsoleLevel[];
  onLevelsChange?: (levels: BrowserConsoleLevel[]) => void;
  filter?: string;
  defaultFilter?: string;
  onFilterChange?: (filter: string) => void;
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
        <div className="flex items-center gap-2 px-2 py-1">
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
            <RiArrowDownSLine aria-hidden className={cn("transition-transform", !open && "-rotate-90")} />
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
            <div className="ml-auto flex min-w-0 items-center gap-1">
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
              <div role="group" aria-label="Levels" className="flex items-center">
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

/* ------------------------------------------------------------------ */
/* AnnotationLayer                                                     */
/* ------------------------------------------------------------------ */

export interface BrowserAnnotation {
  id: string;
  /** Horizontal position, percent of the surface width. */
  x: number;
  /** Vertical position, percent of the surface height. */
  y: number;
  comment: string;
}

export interface AnnotationLayerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  annotations?: BrowserAnnotation[];
  defaultAnnotations?: BrowserAnnotation[];
  onAnnotationsChange?: (annotations: BrowserAnnotation[]) => void;
  /** Annotate mode: clicks on the surface drop pins. */
  active?: boolean;
  defaultActive?: boolean;
  onActiveChange?: (active: boolean) => void;
  /** "Send to agent". Receives annotations that have a comment. */
  onSendAnnotations?: (annotations: BrowserAnnotation[]) => void;
  /** Clear the pins after sending. Default true. */
  clearOnSend?: boolean;
  /** Show the numbered list under the surface. Default true. */
  showList?: boolean;
  surfaceClassName?: string;
  /** Page content to annotate. */
  children?: React.ReactNode;
}

const clampPct = (n: number) => roundTo(clamp(n, 0, 100), 1);

let annotationSeq = 0;

/** Lets the user pin numbered comments on a page for the agent, then send them in one batch. */
export const AnnotationLayer = React.forwardRef<HTMLDivElement, AnnotationLayerProps>(
  (
    {
      annotations: annotationsProp,
      defaultAnnotations = [],
      onAnnotationsChange,
      active: activeProp,
      defaultActive = false,
      onActiveChange,
      onSendAnnotations,
      clearOnSend = true,
      showList = true,
      surfaceClassName,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [annotations, setAnnotations] = useControllableState({
      value: annotationsProp,
      defaultValue: defaultAnnotations,
      onChange: onAnnotationsChange,
    });
    const [active, setActive] = useControllableState({ value: activeProp, defaultValue: defaultActive, onChange: onActiveChange });
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [draft, setDraft] = React.useState("");
    const freshIds = React.useRef(new Set<string>());

    const drop = (x: number, y: number) => {
      const id = `ann-${++annotationSeq}`;
      freshIds.current.add(id);
      setAnnotations([...annotations, { id, x: clampPct(x), y: clampPct(y), comment: "" }]);
      setDraft("");
      setEditingId(id);
    };

    const onSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!active) return;
      const r = e.currentTarget.getBoundingClientRect();
      if (!r.width || !r.height) return;
      drop(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
    };

    const openEditor = (a: BrowserAnnotation) => {
      setDraft(a.comment);
      setEditingId(a.id);
    };

    const closeEditor = (list = annotations) => {
      const id = editingId;
      setEditingId(null);
      if (id && freshIds.current.has(id)) {
        freshIds.current.delete(id);
        const a = list.find((x) => x.id === id);
        if (a && !a.comment.trim()) setAnnotations(list.filter((x) => x.id !== id));
      }
    };

    const save = () => {
      if (!editingId) return;
      const next = annotations.map((a) => (a.id === editingId ? { ...a, comment: draft.trim() } : a));
      freshIds.current.delete(editingId);
      setAnnotations(next);
      setEditingId(null);
    };

    const remove = (id: string) => {
      freshIds.current.delete(id);
      setAnnotations(annotations.filter((a) => a.id !== id));
      if (editingId === id) setEditingId(null);
    };

    const sendable = annotations.filter((a) => a.comment.trim());
    const send = () => {
      if (!sendable.length) return;
      onSendAnnotations?.(sendable);
      if (clearOnSend) setAnnotations([]);
    };

    return (
      <div ref={ref} data-slot="annotation-layer" className={cn("flex min-h-0 flex-col", className)} {...props}>
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-subtle px-2 py-1.5">
          <Button
            type="button"
            size="xs"
            variant={active ? "soft" : "ghost"}
            aria-pressed={active}
            leadingIcon={<RiMapPin2Line aria-hidden />}
            onClick={() => setActive(!active)}
          >
            Annotate
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            leadingIcon={<RiAddLine aria-hidden />}
            onClick={() => {
              if (!active) setActive(true);
              drop(50, 50);
            }}
          >
            Add note
          </Button>
          <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
            {annotations.length === 1 ? "1 note" : `${annotations.length} notes`}
          </span>
          <Button
            type="button"
            size="xs"
            variant="primary"
            leadingIcon={<RiSendPlaneLine aria-hidden />}
            disabled={!sendable.length}
            onClick={send}
          >
            Send to agent
          </Button>
        </div>
        <div
          data-slot="annotation-surface"
          data-active={active || undefined}
          onClick={onSurfaceClick}
          className={cn("relative min-h-40 flex-1 overflow-hidden", active && "cursor-crosshair", surfaceClassName)}
        >
          <div className={cn(active && "pointer-events-none select-none")}>{children}</div>
          {active && <div aria-hidden className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-warning/50" />}
          {annotations.map((a, i) => (
            <PopoverPrimitive.Root
              key={a.id}
              open={editingId === a.id}
              onOpenChange={(o) => (o ? openEditor(a) : closeEditor())}
            >
              <PopoverPrimitive.Trigger asChild>
                <button
                  type="button"
                  aria-label={`Annotation ${i + 1}${a.comment ? `: ${a.comment}` : ""}`}
                  data-slot="annotation-pin"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "absolute z-10 flex size-6 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full rounded-bl-none border-2 border-background bg-warning text-2xs font-semibold text-warning-foreground shadow-md",
                    focusRing
                  )}
                  style={{ left: `${a.x}%`, top: `${a.y}%` }}
                >
                  {i + 1}
                </button>
              </PopoverPrimitive.Trigger>
              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                  side="right"
                  align="start"
                  sideOffset={6}
                  onClick={(e) => e.stopPropagation()}
                  className="z-50 w-64 rounded-box border border-border bg-popover p-3 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                >
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      save();
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <RiChatQuoteLine className="size-3.5 text-muted-foreground" aria-hidden />
                      Note {i + 1}
                    </div>
                    <Textarea
                      aria-label={`Annotation ${i + 1} comment`}
                      autoFocus
                      autoResize
                      minRows={2}
                      maxRows={6}
                      value={draft}
                      placeholder="What should the agent change here?"
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          save();
                        }
                      }}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <Button type="button" size="xs" variant="ghost" onClick={() => remove(a.id)} leadingIcon={<RiDeleteBinLine aria-hidden />}>
                        Delete
                      </Button>
                      <Button type="submit" size="xs" disabled={!draft.trim()}>
                        Save
                      </Button>
                    </div>
                  </form>
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
          ))}
        </div>
        {showList && annotations.length > 0 && (
          <ol aria-label="Annotations" className="divide-y divide-border border-t border-border text-sm">
            {annotations.map((a, i) => (
              <li key={a.id} className="flex items-start gap-2 px-3 py-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-warning text-2xs font-semibold text-warning-foreground" aria-hidden>
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => openEditor(a)}
                  className={cn("min-w-0 flex-1 truncate rounded-xs text-left hover:underline", !a.comment && "italic text-muted-foreground", focusRing)}
                >
                  {a.comment || "Empty note"}
                </button>
                <Button type="button" size="icon-xs" variant="ghost" aria-label={`Remove annotation ${i + 1}`} onClick={() => remove(a.id)}>
                  <RiCloseLine aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }
);
AnnotationLayer.displayName = "AnnotationLayer";

/* ------------------------------------------------------------------ */
/* RealProfileConsentDialog                                            */
/* ------------------------------------------------------------------ */

export type RealProfileChoice = "once" | "always" | "clean";

export interface RealProfileConsentDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called with the choice and whether to remember it. Closes the dialog. */
  onChoose?: (choice: RealProfileChoice, options: { remember: boolean }) => void;
  agentName?: string;
  /** e.g. "Chrome — Personal". */
  profileName?: string;
  /** Site the agent wants to open, shown in the copy. */
  site?: string;
  /** Default state of "Remember my choice". */
  defaultRemember?: boolean;
  className?: string;
}

const accessItems = [
  { icon: <RiCookieLine aria-hidden />, title: "Cookies and signed-in sessions", body: "It can act as you on sites where you’re logged in." },
  { icon: <RiKey2Line aria-hidden />, title: "Saved logins and autofill", body: "Password-manager autofill may be available to the page." },
  { icon: <RiHistoryLine aria-hidden />, title: "History and extensions", body: "Your browsing history and extensions stay active." },
];

/** Asks before letting the agent use the user's real browser profile (cookies, logins) instead of a clean one. */
export function RealProfileConsentDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onChoose,
  agentName = "The agent",
  profileName,
  site,
  defaultRemember = false,
  className,
}: RealProfileConsentDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [remember, setRemember] = React.useState(defaultRemember);
  const choose = (choice: RealProfileChoice) => {
    onChoose?.(choice, { remember: choice === "always" ? true : remember });
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        <DialogHeader icon={<RiShieldUserLine aria-hidden />} tone="warning">
          <DialogTitle>Use your real browser profile?</DialogTitle>
          <DialogDescription>
            {agentName} wants to browse{site ? <> {site}</> : null} with{" "}
            {profileName ? <span className="font-medium text-foreground">{profileName}</span> : "your own browser profile"} instead of a
            clean, signed-out one.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <ul className="space-y-2.5">
            {accessItems.map((it) => (
              <li key={it.title} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-control bg-muted text-muted-foreground [&_svg]:size-4" aria-hidden>
                  {it.icon}
                </span>
                <span>
                  <span className="block font-medium text-foreground">{it.title}</span>
                  <span className="block text-muted-foreground">{it.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <CheckboxField
            label="Remember my choice"
            checked={remember}
            onCheckedChange={(v) => setRemember(v === true)}
          />
        </DialogBody>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => choose("clean")}>
            Use a clean profile
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => choose("once")}>
              Allow once
            </Button>
            <Button type="button" variant="primary" onClick={() => choose("always")}>
              Always allow
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
