import * as React from "react";
import type { Terminal as XTermInstance } from "@xterm/xterm";
import type { FitAddon as XTermFitAddon } from "@xterm/addon-fit";
import {
  RiAddLine,
  RiFullscreenExitLine,
  RiFullscreenLine,
  RiRefreshLine,
  RiTerminalBoxLine,
  RiErrorWarningLine,
  RiPlugLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { formatRelative } from "../../lib/time";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useResizeObserver } from "../../hooks/use-resize-observer";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";

/*
 * @xterm/xterm and @xterm/addon-fit are optional peers. They are only loaded through
 * dynamic `import()` when a <Terminal> mounts; the type-only imports above are erased.
 */

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

/** xterm.js color theme (subset of `ITheme`). */
export interface TerminalTheme {
  background?: string;
  foreground?: string;
  cursor?: string;
  cursorAccent?: string;
  selectionBackground?: string;
  selectionForeground?: string;
  black?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  magenta?: string;
  cyan?: string;
  white?: string;
  brightBlack?: string;
  brightRed?: string;
  brightGreen?: string;
  brightYellow?: string;
  brightBlue?: string;
  brightMagenta?: string;
  brightCyan?: string;
  brightWhite?: string;
}

let colorCanvas: CanvasRenderingContext2D | null | undefined;

/** Resolve any CSS color expression (vars, color-mix, oklch) to `rgb()/rgba()` for xterm. */
/**
 * Load xterm and its fit addon once per page. Every Terminal (and every remount of one, e.g.
 * StrictMode's mount → unmount → mount) shares the same promise instead of re-importing.
 * A failed load is forgotten so a later mount can retry.
 */
let xtermModules: Promise<[typeof import("@xterm/xterm"), typeof import("@xterm/addon-fit")]> | null = null;
function loadXterm() {
  xtermModules ??= Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]).catch((err) => {
    xtermModules = null;
    throw err;
  });
  return xtermModules;
}

function resolveColor(scope: HTMLElement, expr: string, fallback: string): string {
  if (typeof document === "undefined" || typeof getComputedStyle === "undefined") return fallback;
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.color = expr;
  scope.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  if (!computed || computed.includes("var(")) return fallback;
  if (/^(#|rgba?\()/.test(computed)) return computed;
  if (colorCanvas === undefined) {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      colorCanvas = c.getContext("2d", { willReadFrequently: true });
    } catch {
      colorCanvas = null;
    }
  }
  if (!colorCanvas) return computed;
  colorCanvas.clearRect(0, 0, 1, 1);
  colorCanvas.fillStyle = computed;
  colorCanvas.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = colorCanvas.getImageData(0, 0, 1, 1).data;
  return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

function isDarkScope(scope: HTMLElement): boolean {
  return !!scope.closest(".dark, [data-theme='dark']");
}

/** Build an xterm theme from Sutra CSS variables (light or dark, whichever applies to `scope`). */
export function getTerminalTheme(scope?: HTMLElement | null): TerminalTheme {
  const el = scope ?? (typeof document !== "undefined" ? document.documentElement : null);
  const dark = el ? isDarkScope(el) : false;
  const fb = dark
    ? { bg: "#09090b", fg: "#fafafa", muted: "#9f9fa9", black: "#27272a", white: "#e4e4e7", brightWhite: "#fafafa" }
    : { bg: "#ffffff", fg: "#09090b", muted: "#71717b", black: "#18181b", white: "#9f9fa9", brightWhite: "#71717b" };
  if (!el) return { background: fb.bg, foreground: fb.fg };
  const c = (expr: string, fallback: string) => resolveColor(el, expr, fallback);
  const toward = dark ? "white" : "black";
  const bright = (v: string) => `color-mix(in oklab, var(${v}) 78%, ${toward})`;
  return {
    background: c("var(--background)", fb.bg),
    foreground: c("var(--foreground)", fb.fg),
    cursor: c("var(--primary)", "#615fff"),
    cursorAccent: c("var(--background)", fb.bg),
    selectionBackground: c("color-mix(in oklab, var(--primary) 30%, transparent)", "rgba(97, 95, 255, 0.3)"),
    black: c(dark ? "var(--n-800)" : "var(--n-900)", fb.black),
    red: c("var(--destructive)", "#e7000b"),
    green: c("var(--success)", "#00a63e"),
    yellow: c(dark ? "var(--warning)" : "var(--warning-soft-foreground)", dark ? "#f0b100" : "#894b00"),
    blue: c("var(--info)", "#155dfc"),
    magenta: c("var(--b-500)", "#8e51ff"),
    cyan: c(dark ? "#00b8db" : "#007595", dark ? "#00b8db" : "#007595"),
    white: c(dark ? "var(--n-200)" : "var(--n-400)", fb.white),
    brightBlack: c("var(--muted-foreground)", fb.muted),
    brightRed: c(bright("--destructive"), "#ff6467"),
    brightGreen: c(bright("--success"), "#05df72"),
    brightYellow: c(dark ? bright("--warning") : "var(--warning-soft-foreground)", "#fdc700"),
    brightBlue: c(bright("--info"), "#51a2ff"),
    brightMagenta: c(bright("--b-500"), "#a684ff"),
    brightCyan: c(dark ? "#53eafd" : "#005f78", dark ? "#53eafd" : "#005f78"),
    brightWhite: c(dark ? "var(--n-50)" : "var(--n-500)", fb.brightWhite),
  };
}

/* ------------------------------------------------------------------ */
/* Terminal                                                            */
/* ------------------------------------------------------------------ */

export type TerminalConnection = "connecting" | "connected" | "disconnected" | "error";

export interface TerminalHandle {
  write: (data: string | Uint8Array) => void;
  writeln: (data: string) => void;
  clear: () => void;
  reset: () => void;
  focus: () => void;
  fit: () => void;
  readonly cols: number;
  readonly rows: number;
  /** Underlying xterm.js instance once loaded (typed loosely to keep xterm optional). */
  readonly xterm: unknown;
}

export interface TerminalProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onResize" | "title" | "children" | "onCopy"> {
  /** Connection state; anything but "connected" shows an overlay. Default "connected". */
  connection?: TerminalConnection;
  /** Error / disconnect detail shown in the overlay. */
  connectionMessage?: React.ReactNode;
  /** Called when the user presses Reconnect in the disconnected or error overlay; the button is hidden when unset. */
  onReconnect?: () => void;
  /** Keystrokes / pasted data from the user. */
  onData?: (data: string) => void;
  /** Called with the new columns and rows when the terminal is resized to fit its container. */
  onResize?: (size: { cols: number; rows: number }) => void;
  /** Called once with the imperative handle (write, clear, focus and so on) when the terminal has mounted. */
  onReady?: (handle: TerminalHandle) => void;
  /** Text in the header bar. */
  title?: React.ReactNode;
  /** Extra header controls. */
  toolbar?: React.ReactNode;
  /** Hides the header bar with the title, connection state and toolbar. */
  hideHeader?: boolean;
  /** Font size in px. Default 13. */
  fontSize?: number;
  /** CSS font stack; defaults to the mono font of the theme. */
  fontFamily?: string;
  /** Blinks the cursor. Default true. */
  cursorBlink?: boolean;
  /** Lines kept in the scrollback buffer. Default 5000. */
  scrollback?: number;
  /** Extra xterm constructor options. */
  options?: Record<string, unknown>;
  /**
   * Colours that replace parts of the theme-derived terminal palette (background, foreground, cursor, ANSI colours).
   */
  themeOverrides?: TerminalTheme;
  /** Height of the terminal area (ignored in fullscreen). Default 360. */
  height?: number | string;
  /** Shows the fullscreen button in the header. Default true. */
  fullscreenable?: boolean;
  /** Controlled fullscreen state. */
  fullscreen?: boolean;
  /** Initial fullscreen state when `fullscreen` is not controlled. */
  defaultFullscreen?: boolean;
  /** Called with the new state when the user enters or leaves fullscreen. */
  onFullscreenChange?: (fullscreen: boolean) => void;
  /** Accessible name. Default "Terminal". */
  label?: string;
}

const connectionMeta: Record<TerminalConnection, { label: string; dot: string }> = {
  connecting: { label: "Connecting", dot: "bg-warning motion-safe:animate-pulse" },
  connected: { label: "Connected", dot: "bg-success" },
  disconnected: { label: "Disconnected", dot: "bg-muted-foreground" },
  error: { label: "Error", dot: "bg-destructive" },
};

/** xterm.js terminal (lazy-loaded) themed from Sutra tokens, with fit-on-resize, connection overlay and fullscreen. */
export const Terminal = React.forwardRef<TerminalHandle, TerminalProps>(
  (
    {
      className,
      connection = "connected",
      connectionMessage,
      onReconnect,
      onData,
      onResize,
      onReady,
      title,
      toolbar,
      hideHeader,
      fontSize = 13,
      fontFamily = 'var(--font-mono), "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
      cursorBlink = true,
      scrollback = 5000,
      options,
      themeOverrides,
      height = 360,
      fullscreenable = true,
      fullscreen: fullscreenProp,
      defaultFullscreen = false,
      onFullscreenChange,
      label = "Terminal",
      style,
      ...props
    },
    ref
  ) => {
    const rootRef = React.useRef<HTMLDivElement>(null);
    const hostRef = React.useRef<HTMLDivElement>(null);
    const termRef = React.useRef<XTermInstance | null>(null);
    const fitRef = React.useRef<XTermFitAddon | null>(null);
    const queue = React.useRef<(string | Uint8Array)[]>([]);
    const [load, setLoad] = React.useState<{ state: "loading" | "ready" | "failed"; error?: string }>({ state: "loading" });
    const [fsState, setFsState] = React.useState(defaultFullscreen);
    const fullscreen = fullscreenProp ?? fsState;
    const setFullscreen = (v: boolean) => {
      if (fullscreenProp === undefined) setFsState(v);
      onFullscreenChange?.(v);
    };

    const callbacks = useLatestRef({ onData, onResize, onReady });
    const themeRef = useLatestRef(themeOverrides);

    const fontFamilyResolved = React.useCallback(
      (ff: string) => {
        if (!ff.includes("var(") || !rootRef.current || typeof getComputedStyle === "undefined") return ff;
        const v = getComputedStyle(rootRef.current).getPropertyValue("--font-mono").trim();
        return ff.replace(/var\(--font-mono\),?\s*/, v ? `${v}, ` : "");
      },
      []
    );

    const fit = React.useCallback(() => {
      const f = fitRef.current;
      if (!f) return;
      try {
        f.fit();
      } catch {
        /* host not measurable yet */
      }
    }, []);

    const handle = React.useMemo<TerminalHandle>(
      () => ({
        write: (data) => {
          if (termRef.current) termRef.current.write(data);
          else queue.current.push(data);
        },
        writeln: (data) => {
          if (termRef.current) termRef.current.writeln(data);
          else queue.current.push(`${data}\r\n`);
        },
        clear: () => termRef.current?.clear(),
        reset: () => termRef.current?.reset(),
        focus: () => termRef.current?.focus(),
        fit,
        get cols() {
          return termRef.current?.cols ?? 0;
        },
        get rows() {
          return termRef.current?.rows ?? 0;
        },
        get xterm() {
          return termRef.current;
        },
      }),
      [fit]
    );
    React.useImperativeHandle(ref, () => handle, [handle]);

    React.useEffect(() => {
      let disposed = false;
      const cleanups: (() => void)[] = [];
      (async () => {
        try {
          const [xtermMod, fitMod] = await loadXterm();
          if (disposed || !hostRef.current) return;
          const term = new xtermMod.Terminal({
            fontSize,
            fontFamily: fontFamilyResolved(fontFamily),
            cursorBlink,
            scrollback,
            theme: { ...getTerminalTheme(rootRef.current), ...themeRef.current },
            ...options,
          });
          const fitAddon = new fitMod.FitAddon();
          term.loadAddon(fitAddon);
          term.open(hostRef.current);
          termRef.current = term;
          fitRef.current = fitAddon;
          fit();
          const subs = [
            term.onData((d: string) => callbacks.current.onData?.(d)),
            term.onResize((size: { cols: number; rows: number }) => callbacks.current.onResize?.({ cols: size.cols, rows: size.rows })),
          ];
          for (const chunk of queue.current) term.write(chunk);
          queue.current = [];
          cleanups.push(() => {
            subs.forEach((s) => s.dispose());
            term.dispose();
          });
          setLoad({ state: "ready" });
          callbacks.current.onReady?.(handle);
        } catch (e) {
          if (!disposed) setLoad({ state: "failed", error: (e as Error)?.message });
        }
      })();
      return () => {
        disposed = true;
        cleanups.forEach((c) => c());
        termRef.current = null;
        fitRef.current = null;
      };
      // Created once; option changes are applied below.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
      const term = termRef.current;
      if (!term) return;
      term.options.fontSize = fontSize;
      term.options.fontFamily = fontFamilyResolved(fontFamily);
      term.options.cursorBlink = cursorBlink;
      fit();
    }, [fontSize, fontFamily, cursorBlink, fit, fontFamilyResolved, load.state]);

    const themeKey = JSON.stringify(themeOverrides ?? null);
    React.useEffect(() => {
      if (load.state !== "ready" || typeof MutationObserver === "undefined") return;
      const apply = () => {
        const term = termRef.current;
        if (term) term.options.theme = { ...getTerminalTheme(rootRef.current), ...themeRef.current };
      };
      apply();
      const mo = new MutationObserver(apply);
      const opts = { attributes: true, attributeFilter: ["class", "data-theme", "style"] };
      mo.observe(document.documentElement, opts);
      if (document.body) mo.observe(document.body, opts);
      return () => mo.disconnect();
    }, [load.state, themeKey]);

    const fitFrame = React.useRef(0);
    useResizeObserver(load.state === "ready" ? hostRef : null, () => {
      cancelAnimationFrame(fitFrame.current);
      fitFrame.current = requestAnimationFrame(fit);
    });
    React.useEffect(() => () => cancelAnimationFrame(fitFrame.current), []);

    React.useEffect(() => {
      if (load.state !== "ready") return;
      const frame = requestAnimationFrame(fit);
      return () => cancelAnimationFrame(frame);
    }, [fullscreen, load.state, fit]);

    const meta = connectionMeta[connection];
    const overlay =
      load.state === "failed" ? (
        <>
          <RiErrorWarningLine aria-hidden className="size-6 text-destructive" />
          <p className="font-medium">Terminal unavailable</p>
          <p className="max-w-xs text-xs text-muted-foreground">Install the optional peers @xterm/xterm and @xterm/addon-fit.{load.error ? ` (${load.error})` : ""}</p>
        </>
      ) : load.state === "loading" ? (
        <>
          <Spinner size="sm" aria-hidden />
          <p className="text-xs text-muted-foreground">Loading terminal…</p>
        </>
      ) : connection === "connecting" ? (
        <>
          <Spinner size="sm" aria-hidden />
          <p className="font-medium">Connecting…</p>
          {connectionMessage ? <p className="text-xs text-muted-foreground">{connectionMessage}</p> : null}
        </>
      ) : connection === "disconnected" || connection === "error" ? (
        <>
          {connection === "error" ? (
            <RiErrorWarningLine aria-hidden className="size-6 text-destructive" />
          ) : (
            <RiPlugLine aria-hidden className="size-6 text-muted-foreground" />
          )}
          <p className="font-medium">{connection === "error" ? "Connection error" : "Disconnected"}</p>
          {connectionMessage ? <p className="max-w-xs text-xs text-muted-foreground">{connectionMessage}</p> : null}
          {onReconnect ? (
            <Button size="sm" variant="secondary" onClick={onReconnect} leadingIcon={<RiRefreshLine aria-hidden />}>
              Reconnect
            </Button>
          ) : null}
        </>
      ) : null;

    return (
      <div
        ref={rootRef}
        role="group"
        aria-label={label}
        data-connection={connection}
        data-fullscreen={fullscreen || undefined}
        className={cn(
          "flex min-w-0 flex-col overflow-hidden border border-border bg-background shadow-xs",
          fullscreen ? "fixed inset-0 z-50 rounded-none" : "rounded-box",
          className
        )}
        style={style}
        dir="ltr"
        {...props}
      >
        {!hideHeader ? (
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-subtle px-3">
            <RiTerminalBoxLine aria-hidden className="size-4 text-muted-foreground" />
            <span className="min-w-0 truncate text-xs font-medium text-foreground">{title ?? label}</span>
            <span className="inline-flex items-center gap-1.5 text-2xs text-muted-foreground" data-connection-label="">
              <span aria-hidden className={cn("size-1.5 rounded-full", meta.dot)} />
              {meta.label}
            </span>
            <div className="ms-auto flex items-center gap-1">
              {toolbar}
              {fullscreenable ? (
                <button
                  type="button"
                  onClick={() => setFullscreen(!fullscreen)}
                  aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  aria-pressed={fullscreen}
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-control text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:size-4",
                    focusRing
                  )}
                >
                  {fullscreen ? <RiFullscreenExitLine aria-hidden /> : <RiFullscreenLine aria-hidden />}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className={cn("relative min-h-0", fullscreen && "flex-1")} style={fullscreen ? undefined : { height }}>
          <div ref={hostRef} className="absolute inset-0 px-2 py-1.5" data-terminal-host="" />
          {overlay ? (
            <div
              role="status"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/85 p-4 text-center text-sm text-foreground backdrop-blur-[2px]"
              data-terminal-overlay={load.state !== "ready" ? load.state : connection}
            >
              {overlay}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
);
Terminal.displayName = "Terminal";

/* ------------------------------------------------------------------ */
/* TerminalSessionPicker                                               */
/* ------------------------------------------------------------------ */

export interface TerminalSession {
  id: string;
  name: string;
  /** tmux window count. */
  windows?: number;
  /** A client is attached elsewhere. */
  attached?: boolean;
  lastActivity?: Date | number | string;
}

export interface TerminalSessionPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "defaultValue"> {
  /** Terminal sessions to choose from, each with an id, title and state. */
  sessions: TerminalSession[];
  /** Selected (active) session id. */
  value?: string | null;
  /** Initially active session id when `value` is not controlled. */
  defaultValue?: string | null;
  /** Called with the session id when the user picks a session. */
  onValueChange?: (id: string) => void;
  /** Shows a "New session" button. */
  onCreate?: () => void;
  /** Shows a busy state on the new-session button while a session is being created. */
  creating?: boolean;
  /** Shows placeholder rows while the sessions load. */
  loading?: boolean;
  /** Shown when there are no sessions. Default "No sessions". */
  emptyState?: React.ReactNode;
  /** Accessible name of the session list. Default "Terminal sessions". */
  label?: string;
}

/** tmux-style session list: name, windows, attached / active badges and "New session". */
export const TerminalSessionPicker = React.forwardRef<HTMLDivElement, TerminalSessionPickerProps>(
  (
    {
      className,
      sessions,
      value: valueProp,
      defaultValue = null,
      onValueChange,
      onCreate,
      creating,
      loading,
      emptyState = "No sessions",
      label = "Terminal sessions",
      ...props
    },
    ref
  ) => {
    const [value, select] = useControllableState<string | null>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange as ((id: string | null) => void) | undefined,
    });
    const baseId = React.useId();
    const selectedIdx = sessions.findIndex((s) => s.id === value);
    const [focusIdx, setFocusIdx] = React.useState(Math.max(0, selectedIdx));
    const active = Math.min(focusIdx, sessions.length - 1);
    const optionId = (i: number) => `${baseId}-opt-${i}`;

    const onKeyDown = (e: React.KeyboardEvent) => {
      if (!sessions.length) return;
      let next = active;
      if (e.key === "ArrowDown") next = Math.min(sessions.length - 1, active + 1);
      else if (e.key === "ArrowUp") next = Math.max(0, active - 1);
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = sessions.length - 1;
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select(sessions[active].id);
        return;
      } else return;
      e.preventDefault();
      setFocusIdx(next);
    };

    return (
      <div ref={ref} className={cn("flex min-w-0 flex-col gap-2", className)} {...props}>
        {loading ? (
          <div role="status" className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            <Spinner size="xs" aria-hidden /> Loading sessions…
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">{emptyState}</p>
        ) : (
          <ul
            role="listbox"
            aria-label={label}
            tabIndex={0}
            aria-activedescendant={optionId(active)}
            onKeyDown={onKeyDown}
            className={cn("flex flex-col gap-0.5 rounded-box border border-border bg-card p-1", focusRing)}
          >
            {sessions.map((s, i) => {
              const selected = s.id === value;
              return (
                <li
                  key={s.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setFocusIdx(i);
                    select(s.id);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                    selected ? "bg-primary-soft text-primary-soft-foreground" : "hover:bg-accent",
                    i === active && "ring-2 ring-inset ring-ring/40"
                  )}
                >
                  <RiTerminalBoxLine aria-hidden className="size-4 shrink-0 opacity-70" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono font-medium">{s.name}</div>
                    <div className="text-2xs text-muted-foreground">
                      {s.windows != null ? `${s.windows} ${pluralize(s.windows, "window")}` : null}
                      {s.windows != null && s.lastActivity != null ? " · " : null}
                      {s.lastActivity != null ? formatRelative(s.lastActivity, { justNowMs: 60_000 }) : null}
                    </div>
                  </div>
                  {s.attached ? (
                    <span className="rounded-xs bg-success-soft px-1.5 py-0.5 text-2xs font-medium text-success-soft-foreground">attached</span>
                  ) : null}
                  {selected ? (
                    <span className="rounded-xs bg-primary px-1.5 py-0.5 text-2xs font-medium text-primary-foreground">active</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {onCreate ? (
          <Button size="sm" variant="outline" onClick={onCreate} loading={creating} leadingIcon={<RiAddLine aria-hidden />}>
            New session
          </Button>
        ) : null}
      </div>
    );
  }
);
TerminalSessionPicker.displayName = "TerminalSessionPicker";
