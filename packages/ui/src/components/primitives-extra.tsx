import * as React from "react";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckboxCircleFill,
  RiErrorWarningLine,
  RiFullscreenExitLine,
  RiQuestionAnswerLine,
  RiRefreshLine,
  RiSubtractLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { Button, type ButtonProps } from "./button";
import { clamp } from "../lib/math";
import { useControllableState } from "../hooks/use-controllable-state";
import { useIsoLayoutEffect } from "../hooks/use-iso-layout-effect";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { useResizeObserver } from "../hooks/use-resize-observer";
import { Spinner, spinnerGlyphFrames, type SpinnerGlyphFrameSet } from "./spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.RefObject<T | null>).current = value;
}

/* ------------------------------------------------------------------ */
/* SplitButton                                                         */
/* ------------------------------------------------------------------ */

export interface SplitButtonAction {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  shortcut?: React.ReactNode;
  disabled?: boolean;
  variant?: "default" | "destructive";
  onSelect: () => void;
}

/** SplitButton follows Button's full text scale (xs h-7, sm h-8, md h-9, lg h-10, xl h-12). */
export type SplitButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface SplitButtonProps extends Omit<ButtonProps, "size"> {
  /** Button's text-size scale; the chevron uses the matching icon size. Default "md". */
  size?: SplitButtonSize;
  /** Secondary actions listed in the chevron menu. */
  actions?: SplitButtonAction[];
  /** Custom menu content (rendered after `actions`). */
  menuContent?: React.ReactNode;
  /** Accessible name of the chevron button. Default "More options". */
  menuLabel?: string;
  /** Optional heading inside the menu. */
  menuHeading?: React.ReactNode;
  align?: "start" | "center" | "end";
  /** Class for the outer group. */
  groupClassName?: string;
}

const chevronSize: Record<SplitButtonSize, ButtonProps["size"]> = {
  xs: "icon-xs",
  sm: "icon-sm",
  md: "icon",
  lg: "icon-lg",
  xl: "icon-xl",
};

const dividerByVariant: Partial<Record<NonNullable<ButtonProps["variant"]>, string>> = {
  primary: "border-l border-primary-foreground/25",
  destructive: "border-l border-destructive-foreground/25",
  inverse: "border-l border-inverse-foreground/20",
  soft: "border-l border-primary-soft-foreground/20",
  tertiary: "border-l border-border-strong",
  ghost: "border-l border-border",
  "destructive-soft": "border-l border-destructive-soft-foreground/20",
};

/** A primary action fused with a chevron that opens a menu of secondary actions. */
export const SplitButton = React.forwardRef<HTMLButtonElement, SplitButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      actions = [],
      menuContent,
      menuLabel = "More options",
      menuHeading,
      align = "end",
      disabled,
      loading,
      className,
      groupClassName,
      children,
      ...props
    },
    ref
  ) => {
    const hasMenu = actions.length > 0 || !!menuContent;
    return (
      <div role="group" className={cn("inline-flex items-stretch", groupClassName)}>
        <Button
          ref={ref}
          variant={variant}
          size={size}
          disabled={disabled}
          loading={loading}
          className={cn(hasMenu && "rounded-r-none active:scale-100", className)}
          {...props}
        >
          {children}
        </Button>
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={variant}
                size={chevronSize[size]}
                disabled={disabled || loading}
                aria-label={menuLabel}
                title={menuLabel}
                className={cn(
                  "rounded-l-none active:scale-100 data-[state=open]:brightness-95",
                  variant === "secondary" || variant === "outline" ? "-ml-px" : dividerByVariant[variant ?? "primary"],
                  size === "xs" ? "w-6" : size === "sm" ? "w-7" : "w-8"
                )}
              >
                <RiArrowDownSLine aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="min-w-52">
              {menuHeading && (
                <>
                  <DropdownMenuLabel>{menuHeading}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              {actions.map((a) => (
                <DropdownMenuItem
                  key={a.id}
                  icon={a.icon}
                  description={a.description}
                  shortcut={a.shortcut}
                  disabled={a.disabled}
                  variant={a.variant}
                  onSelect={a.onSelect}
                >
                  {a.label}
                </DropdownMenuItem>
              ))}
              {menuContent}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }
);
SplitButton.displayName = "SplitButton";

/* ------------------------------------------------------------------ */
/* FanMenu                                                             */
/* ------------------------------------------------------------------ */

export interface FanMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  /** Marks the item as the current choice (e.g. the active voice mode). */
  active?: boolean;
  onSelect?: () => void;
}

export type FanMenuDirection = "up" | "down" | "left" | "right";

export interface FanMenuProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  items: FanMenuItem[];
  /** Hub button icon. */
  icon: React.ReactNode;
  /** Accessible name of the hub button. */
  label: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Fired with the selected item id (after the item's own `onSelect`). */
  onSelect?: (id: string) => void;
  /** Direction the fan opens towards. Default "up". */
  direction?: FanMenuDirection;
  /** Distance from the hub centre to each disc, px. Default 76. */
  radius?: number;
  /** Total arc covered by the discs, degrees. Default 120. */
  spread?: number;
  /** Disc diameter, px. Default 44. */
  discSize?: number;
  /** Hub diameter, px. Default 48. */
  hubSize?: number;
  /** Show item labels as tooltips next to the discs. Default true. */
  showLabels?: boolean;
}

const fanAngle: Record<FanMenuDirection, number> = { up: -90, down: 90, left: 180, right: 0 };

/** A hub button that fans out circular action discs along an arc (e.g. voice modes). Keyboard accessible as a menu. */
export const FanMenu = React.forwardRef<HTMLDivElement, FanMenuProps>(
  (
    {
      items,
      icon,
      label,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      onSelect,
      direction = "up",
      radius = 76,
      spread = 120,
      discSize = 44,
      hubSize = 48,
      showLabels = true,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = useControllableState<boolean>({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    const reduced = usePrefersReducedMotion();
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const hubRef = React.useRef<HTMLButtonElement>(null);
    const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
    const [focusIndex, setFocusIndex] = React.useState(0);
    const pendingFocus = React.useRef<number | null>(null);
    const menuId = React.useId();

    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);

    const openAt = (index: number) => {
      pendingFocus.current = index;
      setFocusIndex(index);
      setOpen(true);
    };
    const close = (refocus = true) => {
      setOpen(false);
      if (refocus) hubRef.current?.focus();
    };

    React.useEffect(() => {
      if (!open || pendingFocus.current == null) return;
      itemRefs.current[pendingFocus.current]?.focus();
      pendingFocus.current = null;
    }, [open]);

    React.useEffect(() => {
      if (!open) return;
      const onDown = (e: PointerEvent) => {
        if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("pointerdown", onDown);
      return () => document.removeEventListener("pointerdown", onDown);
    }, [open, setOpen]);

    const moveFocus = (delta: number | "first" | "last") => {
      if (enabled.length === 0) return;
      const pos = enabled.indexOf(focusIndex);
      const next =
        delta === "first"
          ? enabled[0]
          : delta === "last"
            ? enabled[enabled.length - 1]
            : enabled[(pos + delta + enabled.length) % enabled.length];
      setFocusIndex(next);
      itemRefs.current[next]?.focus();
    };

    const base = fanAngle[direction];
    const n = items.length;
    const positions = items.map((_, i) => {
      const angle = n === 1 ? base : base - spread / 2 + (spread * i) / (n - 1);
      const rad = (angle * Math.PI) / 180;
      return { x: Math.round(Math.cos(rad) * radius), y: Math.round(Math.sin(rad) * radius) };
    });

    return (
      <div
        ref={(node) => {
          rootRef.current = node;
          assignRef(ref, node);
        }}
        data-state={open ? "open" : "closed"}
        className={cn("relative inline-flex shrink-0", className)}
        style={{ width: hubSize, height: hubSize, ...style }}
        {...props}
      >
        <button
          ref={hubRef}
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => (open ? close(false) : openAt(enabled[0] ?? 0))}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              openAt(e.key === "ArrowDown" || e.key === "ArrowRight" ? (enabled[0] ?? 0) : (enabled[enabled.length - 1] ?? 0));
            } else if (e.key === "Escape" && open) {
              e.preventDefault();
              close();
            }
          }}
          className={cn(
            "relative z-10 inline-flex size-full items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-inner-highlight transition-[transform,background-color] duration-200 hover:bg-primary-hover motion-reduce:transition-none [&_svg]:size-5",
            open && "scale-95",
            focusRing
          )}
        >
          {icon}
        </button>
        {open && (
          <div
            id={menuId}
            role="menu"
            aria-label={label}
            aria-orientation={direction === "up" || direction === "down" ? "horizontal" : "vertical"}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                moveFocus(1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                moveFocus(-1);
              } else if (e.key === "Home") {
                e.preventDefault();
                moveFocus("first");
              } else if (e.key === "End") {
                e.preventDefault();
                moveFocus("last");
              } else if (e.key === "Escape") {
                e.preventDefault();
                close();
              } else if (e.key === "Tab") {
                close(false);
              }
            }}
            className="pointer-events-none absolute inset-0"
          >
            {items.map((item, i) => {
              const { x, y } = positions[i];
              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    itemRefs.current[i] = node;
                  }}
                  type="button"
                  role="menuitem"
                  aria-label={item.label}
                  aria-current={item.active || undefined}
                  disabled={item.disabled}
                  tabIndex={i === focusIndex ? 0 : -1}
                  data-active={item.active ? "" : undefined}
                  onFocus={() => setFocusIndex(i)}
                  onClick={() => {
                    item.onSelect?.();
                    onSelect?.(item.id);
                    close();
                  }}
                  className={cn(
                    "group/fan pointer-events-auto absolute left-1/2 top-1/2 inline-flex items-center justify-center rounded-full border border-border bg-popover text-foreground shadow-lg transition-colors hover:bg-accent disabled:opacity-50 [&_svg]:size-[18px]",
                    "data-[active]:border-primary data-[active]:bg-primary-soft data-[active]:text-primary-soft-foreground",
                    !reduced && "animate-in fade-in-0 zoom-in-50 duration-200 ease-out",
                    focusRing
                  )}
                  style={
                    {
                      width: discSize,
                      height: discSize,
                      marginLeft: x - discSize / 2,
                      marginTop: y - discSize / 2,
                      animationDelay: reduced ? undefined : `${i * 25}ms`,
                      animationFillMode: "backwards",
                      "--tw-enter-translate-x": `${-x}px`,
                      "--tw-enter-translate-y": `${-y}px`,
                    } as React.CSSProperties
                  }
                >
                  <span aria-hidden className="inline-flex">
                    {item.icon}
                  </span>
                  {showLabels && (
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute whitespace-nowrap rounded-xs bg-inverse px-1.5 py-0.5 text-2xs font-medium text-inverse-foreground opacity-0 transition-opacity group-hover/fan:opacity-100 group-focus-visible/fan:opacity-100",
                        direction === "down" ? "top-full mt-1.5" : direction === "left" ? "right-full mr-1.5" : direction === "right" ? "left-full ml-1.5" : "bottom-full mb-1.5"
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);
FanMenu.displayName = "FanMenu";

/* ------------------------------------------------------------------ */
/* DecodeText                                                          */
/* ------------------------------------------------------------------ */

export interface DecodeTextProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Final text. Also the accessible name. */
  text: string;
  /** When to play: on mount, on hover/focus, or only when `play` changes. Default "mount". */
  trigger?: "mount" | "hover" | "manual";
  /** Bump to replay when `trigger="manual"`. */
  play?: number | boolean;
  /** Total duration, ms. Default 900. */
  duration?: number;
  /** Frame interval, ms. Default 40. */
  interval?: number;
  /** Characters used for the scramble. */
  charset?: string;
  onComplete?: () => void;
}

const DEFAULT_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*+=?<>/";

/** Scramble-then-decode text reveal. Exposed as `role="img"` labelled with the final text, so screen readers never hear the scramble; reduced motion shows it instantly. */
export const DecodeText = React.forwardRef<HTMLSpanElement, DecodeTextProps>(
  (
    {
      text,
      trigger = "mount",
      play,
      duration = 900,
      interval = 40,
      charset = DEFAULT_CHARSET,
      onComplete,
      className,
      onMouseEnter,
      onFocus,
      ...props
    },
    ref
  ) => {
    const reduced = usePrefersReducedMotion();
    const [display, setDisplay] = React.useState(() => (trigger === "mount" && !reduced ? scramble(text, 0, charset) : text));
    const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const doneRef = React.useRef(onComplete);
    doneRef.current = onComplete;

    const stop = () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };

    const start = React.useCallback(() => {
      stop();
      if (reduced || duration <= 0) {
        setDisplay(text);
        doneRef.current?.();
        return;
      }
      const began = Date.now();
      setDisplay(scramble(text, 0, charset));
      timer.current = setInterval(() => {
        const progress = Math.min(1, (Date.now() - began) / duration);
        if (progress >= 1) {
          stop();
          setDisplay(text);
          doneRef.current?.();
        } else setDisplay(scramble(text, progress, charset));
      }, interval);
    }, [text, reduced, duration, interval, charset]);

    React.useEffect(() => {
      if (trigger === "mount") start();
      else setDisplay(text);
      return stop;
    }, [trigger, start, text]);

    React.useEffect(() => {
      if (trigger === "manual" && play) start();
      return stop;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [play]);

    return (
      <span
        ref={ref}
        role="img"
        aria-label={text}
        data-decoding={display !== text ? "" : undefined}
        onMouseEnter={(e) => {
          onMouseEnter?.(e);
          if (trigger === "hover" && !timer.current) start();
        }}
        onFocus={(e) => {
          onFocus?.(e);
          if (trigger === "hover" && !timer.current) start();
        }}
        className={cn("inline-block whitespace-pre-wrap tabular-nums", className)}
        {...props}
      >
        <span aria-hidden>{display}</span>
      </span>
    );
  }
);
DecodeText.displayName = "DecodeText";

function scramble(text: string, progress: number, charset: string) {
  const revealed = Math.floor(text.length * progress);
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (i < revealed || /\s/.test(ch)) out += ch;
    else out += charset[Math.floor(Math.random() * charset.length)] ?? ch;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* ZoomPan                                                             */
/* ------------------------------------------------------------------ */

export interface ZoomPanState {
  scale: number;
  x: number;
  y: number;
}

export interface UseZoomPanOptions {
  minScale?: number;
  maxScale?: number;
  defaultScale?: number;
  /** Multiplier per zoom step (buttons / keys). Default 1.25. */
  step?: number;
  /** Require Ctrl/⌘ for wheel zoom (so the page can still scroll). Default false. */
  wheelRequiresModifier?: boolean;
  /** Pixels per arrow-key pan. Default 40. */
  panStep?: number;
  /** Called with the new scale and offset after every zoom or pan. */
  onValueChange?: (state: ZoomPanState) => void;
  /** @deprecated Use `onValueChange`. */
  onChange?: (state: ZoomPanState) => void;
}

/** Zoom/pan state + handlers: wheel and pinch zoom around the pointer, drag to pan, double-click reset, keyboard +/−/0/arrows. */
export function useZoomPan({
  minScale = 0.5,
  maxScale = 4,
  defaultScale = 1,
  step = 1.25,
  wheelRequiresModifier = false,
  panStep = 40,
  onValueChange,
  onChange,
}: UseZoomPanOptions = {}) {
  const [state, setStateRaw] = React.useState<ZoomPanState>({ scale: defaultScale, x: 0, y: 0 });
  const stateRef = React.useRef(state);
  const changeRef = React.useRef(onValueChange ?? onChange);
  changeRef.current = onValueChange ?? onChange;
  const viewportRef = React.useRef<HTMLElement | null>(null);
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const gesture = React.useRef<{ dist: number; scale: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const setState = React.useCallback((next: ZoomPanState | ((s: ZoomPanState) => ZoomPanState)) => {
    const value = typeof next === "function" ? next(stateRef.current) : next;
    stateRef.current = value;
    setStateRaw(value);
    changeRef.current?.(value);
  }, []);

  /** Zoom to `scale`, keeping the point (cx, cy) (viewport-relative, from centre) fixed. */
  const zoomTo = React.useCallback(
    (scale: number, cx = 0, cy = 0) =>
      setState((s) => {
        const next = clamp(scale, minScale, maxScale);
        const k = next / s.scale;
        return { scale: next, x: cx - (cx - s.x) * k, y: cy - (cy - s.y) * k };
      }),
    [minScale, maxScale, setState]
  );
  const zoomIn = React.useCallback(() => zoomTo(stateRef.current.scale * step), [zoomTo, step]);
  const zoomOut = React.useCallback(() => zoomTo(stateRef.current.scale / step), [zoomTo, step]);
  const reset = React.useCallback(() => setState({ scale: defaultScale, x: 0, y: 0 }), [defaultScale, setState]);
  const panBy = React.useCallback((dx: number, dy: number) => setState((s) => ({ ...s, x: s.x + dx, y: s.y + dy })), [setState]);

  const relative = (clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  };

  const wheelOpts = React.useRef({ wheelRequiresModifier });
  wheelOpts.current = { wheelRequiresModifier };
  const zoomToRef = React.useRef(zoomTo);
  zoomToRef.current = zoomTo;

  const ref = React.useCallback((node: HTMLElement | null) => {
    const prev = viewportRef.current as (HTMLElement & { __zpWheel?: (e: WheelEvent) => void }) | null;
    if (prev?.__zpWheel) prev.removeEventListener("wheel", prev.__zpWheel);
    viewportRef.current = node;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      if (wheelOpts.current.wheelRequiresModifier && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      const p = relative(e.clientX, e.clientY);
      zoomToRef.current(stateRef.current.scale * factor, p.x, p.y);
    };
    (node as HTMLElement & { __zpWheel?: (e: WheelEvent) => void }).__zpWheel = onWheel;
    node.addEventListener("wheel", onWheel, { passive: false });
  }, []);

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if ((e.target as HTMLElement).closest("button, a, input, [data-zoom-pan-ignore]")) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        const [a, b] = Array.from(pointers.current.values());
        gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: stateRef.current.scale };
      }
      setDragging(true);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size >= 2 && gesture.current) {
        const [a, b] = Array.from(pointers.current.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = relative((a.x + b.x) / 2, (a.y + b.y) / 2);
        if (gesture.current.dist > 0) zoomTo((gesture.current.scale * dist) / gesture.current.dist, mid.x, mid.y);
      } else {
        panBy(e.clientX - prev.x, e.clientY - prev.y);
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) gesture.current = null;
      if (pointers.current.size === 0) setDragging(false);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
      pointers.current.delete(e.pointerId);
      gesture.current = null;
      if (pointers.current.size === 0) setDragging(false);
    },
    onDoubleClick: (e: React.MouseEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest("button, a, input, [data-zoom-pan-ignore]")) return;
      reset();
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      const k = e.key;
      if (k === "+" || k === "=") zoomIn();
      else if (k === "-" || k === "_") zoomOut();
      else if (k === "0") reset();
      else if (k === "ArrowLeft") panBy(panStep, 0);
      else if (k === "ArrowRight") panBy(-panStep, 0);
      else if (k === "ArrowUp") panBy(0, panStep);
      else if (k === "ArrowDown") panBy(0, -panStep);
      else return;
      e.preventDefault();
    },
  };

  return {
    ...state,
    state,
    dragging,
    minScale,
    maxScale,
    setState,
    zoomTo,
    zoomIn,
    zoomOut,
    reset,
    panBy,
    /** Attach to the viewport element (registers a non-passive wheel listener). */
    ref,
    handlers,
    /** Inline style for the transformed content layer. */
    contentStyle: {
      transform: `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
      transformOrigin: "center center",
    } as React.CSSProperties,
  };
}

export interface ZoomPanProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">, UseZoomPanOptions {
  /** Accessible name of the zoomable region. Default "Zoomable content". */
  label?: string;
  /** Show the zoom controls overlay. Default true. */
  controls?: boolean;
  controlsPosition?: "top-right" | "bottom-right" | "bottom-left" | "top-left";
  contentClassName?: string;
}

const controlsPos = {
  "top-right": "right-2 top-2",
  "bottom-right": "bottom-2 right-2",
  "bottom-left": "bottom-2 left-2",
  "top-left": "left-2 top-2",
};

/** Zoom & pan viewport for images, diagrams or SVG, with a controls overlay. */
export const ZoomPan = React.forwardRef<HTMLDivElement, ZoomPanProps>(
  (
    {
      label = "Zoomable content",
      controls = true,
      controlsPosition = "bottom-right",
      minScale,
      maxScale,
      defaultScale,
      step,
      wheelRequiresModifier,
      panStep,
      onValueChange,
      onChange,
      className,
      contentClassName,
      children,
      ...props
    },
    forwardedRef
  ) => {
    const zp = useZoomPan({ minScale, maxScale, defaultScale, step, wheelRequiresModifier, panStep, onValueChange, onChange });
    const percent = Math.round(zp.scale * 100);
    const ctrl = cn(
      "inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4",
      focusRing
    );
    return (
      <div className={cn("relative overflow-hidden rounded-box border border-border bg-subtle", className)}>
        <div
          ref={(node) => {
            zp.ref(node);
            assignRef(forwardedRef, node);
          }}
          role="group"
          aria-roledescription="zoomable area"
          aria-label={`${label}, ${percent}%`}
          tabIndex={0}
          data-scale={zp.scale}
          data-dragging={zp.dragging ? "" : undefined}
          className={cn(
            "size-full touch-none select-none outline-none",
            zp.dragging ? "cursor-grabbing" : "cursor-grab",
            "focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/35"
          )}
          {...zp.handlers}
          {...props}
        >
          <div
            data-slot="zoom-pan-content"
            className={cn("flex size-full items-center justify-center will-change-transform", !zp.dragging && "transition-transform duration-150 ease-out motion-reduce:transition-none", contentClassName)}
            style={zp.contentStyle}
          >
            {children}
          </div>
        </div>
        {controls && (
          <div
            role="toolbar"
            aria-label="Zoom controls"
            data-zoom-pan-ignore=""
            className={cn("absolute flex items-center gap-0.5 rounded-control border border-border bg-popover/90 p-0.5 shadow-sm backdrop-blur", controlsPos[controlsPosition])}
          >
            <button type="button" aria-label="Zoom out" title="Zoom out (−)" disabled={zp.scale <= zp.minScale} onClick={zp.zoomOut} className={ctrl}>
              <RiSubtractLine aria-hidden />
            </button>
            <span aria-live="polite" className="min-w-10 text-center text-xs font-medium tabular-nums text-foreground">
              {percent}%
            </span>
            <button type="button" aria-label="Zoom in" title="Zoom in (+)" disabled={zp.scale >= zp.maxScale} onClick={zp.zoomIn} className={ctrl}>
              <RiAddLine aria-hidden />
            </button>
            <button type="button" aria-label="Reset zoom" title="Reset (0)" onClick={zp.reset} className={ctrl}>
              <RiFullscreenExitLine aria-hidden />
            </button>
          </div>
        )}
      </div>
    );
  }
);
ZoomPan.displayName = "ZoomPan";

/* ------------------------------------------------------------------ */
/* TabDropdown                                                         */
/* ------------------------------------------------------------------ */

export interface TabDropdownItem {
  value: string;
  label: React.ReactNode;
  /** Plain-text label for the overflow menu / measuring (defaults to `label` when it is a string). */
  textValue?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabDropdownProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  items: TabDropdownItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Label of the overflow trigger. Default "More". */
  moreLabel?: string;
  /** Accessible name of the tab list. */
  label?: string;
  size?: "sm" | "md";
}

/** A tab bar that collapses tabs which don't fit into a "More" dropdown (ResizeObserver-driven). */
export const TabDropdown = React.forwardRef<HTMLDivElement, TabDropdownProps>(
  (
    { items, value, defaultValue, onValueChange, moreLabel = "More", label = "Tabs", size = "md", className, ...props },
    forwardedRef
  ) => {
    const [selected, setSelected] = useControllableState<string>({
      value,
      defaultValue: defaultValue ?? items[0]?.value ?? "",
      onChange: onValueChange,
    });
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const measureRef = React.useRef<HTMLDivElement>(null);
    const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
    const [visibleCount, setVisibleCount] = React.useState(items.length);

    const measure = React.useCallback(() => {
      const root = rootRef.current;
      const m = measureRef.current;
      if (!root || !m) return;
      const available = root.offsetWidth;
      const nodes = Array.from(m.querySelectorAll<HTMLElement>("[data-tab-measure]"));
      const widths = nodes.map((n) => n.offsetWidth);
      const moreWidth = m.querySelector<HTMLElement>("[data-tab-measure-more]")?.offsetWidth ?? 0;
      const gap = 4;
      if (!available || widths.every((w) => !w)) {
        setVisibleCount(items.length);
        return;
      }
      const total = widths.reduce((a, w) => a + w + gap, 0);
      if (total <= available) {
        setVisibleCount(items.length);
        return;
      }
      let used = moreWidth + gap;
      let count = 0;
      for (const w of widths) {
        if (used + w + gap > available) break;
        used += w + gap;
        count++;
      }
      setVisibleCount(Math.max(0, count));
    }, [items.length]);

    useIsoLayoutEffect(() => {
      measure();
    }, [measure, items]);

    useResizeObserver(rootRef, () => measure());

    const text = (it: TabDropdownItem) => it.textValue ?? (typeof it.label === "string" ? it.label : it.value);
    const visible = items.slice(0, visibleCount);
    const overflow = items.slice(visibleCount);
    const activeOverflow = overflow.find((it) => it.value === selected);

    const focusTab = (index: number) => {
      const enabled = visible.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
      if (enabled.length === 0) return;
      const target = enabled[(enabled.indexOf(index) + enabled.length) % enabled.length] ?? enabled[0];
      tabRefs.current[target]?.focus();
      setSelected(visible[target].value);
    };

    const tabClass = cn(
      "relative inline-flex shrink-0 select-none items-center gap-1.5 whitespace-nowrap rounded-control font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
      "data-[state=active]:bg-muted data-[state=active]:text-foreground",
      size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
      focusRing
    );
    const renderInner = (it: TabDropdownItem) => (
      <>
        {it.icon}
        {it.label}
        {it.badge != null && it.badge !== false && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background px-1 text-2xs font-semibold tabular-nums">{it.badge}</span>
        )}
      </>
    );

    return (
      <div
        ref={(node) => {
          rootRef.current = node;
          assignRef(forwardedRef, node);
        }}
        data-tab-dropdown-root=""
        className={cn("relative flex min-w-0 items-center", className)}
        {...props}
      >
        <div ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex gap-1 whitespace-nowrap" data-slot="tab-dropdown-measure">
          {items.map((it) => (
            <span key={it.value} data-tab-measure="" className={tabClass}>
              {renderInner(it)}
            </span>
          ))}
          <span data-tab-measure-more="" className={tabClass}>
            {moreLabel}
            <RiArrowDownSLine aria-hidden />
          </span>
        </div>
        <div role="tablist" aria-label={label} aria-orientation="horizontal" className="flex min-w-0 items-center gap-1">
          {visible.map((it, i) => {
            const active = it.value === selected;
            return (
              <button
                key={it.value}
                ref={(node) => {
                  tabRefs.current[i] = node;
                }}
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active || (!visible.some((v) => v.value === selected) && i === 0) ? 0 : -1}
                disabled={it.disabled}
                data-state={active ? "active" : "inactive"}
                onClick={() => setSelected(it.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") focusTab(i + 1);
                  else if (e.key === "ArrowLeft") focusTab(i - 1);
                  else if (e.key === "Home") focusTab(0);
                  else if (e.key === "End") focusTab(visible.length - 1);
                  else return;
                  e.preventDefault();
                }}
                className={tabClass}
              >
                {renderInner(it)}
              </button>
            );
          })}
        </div>
        {overflow.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-state={activeOverflow ? "active" : "inactive"}
                aria-label={activeOverflow ? `${moreLabel} tabs, current: ${text(activeOverflow)}` : `${moreLabel} tabs`}
                className={cn(tabClass, "ml-1")}
              >
                {activeOverflow ? text(activeOverflow) : moreLabel}
                <span className="rounded-full bg-background px-1 text-2xs tabular-nums text-muted-foreground">{overflow.length}</span>
                <RiArrowDownSLine aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={selected} onValueChange={setSelected}>
                {overflow.map((it) => (
                  <DropdownMenuRadioItem key={it.value} value={it.value} disabled={it.disabled}>
                    {text(it)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }
);
TabDropdown.displayName = "TabDropdown";

/* ------------------------------------------------------------------ */
/* GlyphSpinner                                                        */
/* ------------------------------------------------------------------ */

/** Built-in frame sets for GlyphSpinner (the same object as `spinnerGlyphFrames`). */
export const glyphSpinnerFrames = spinnerGlyphFrames;

export type GlyphSpinnerVariant = SpinnerGlyphFrameSet;

export interface GlyphSpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: GlyphSpinnerVariant;
  /** Custom frames (overrides `variant`). */
  frames?: readonly string[];
  /** Milliseconds per frame. Default 80. */
  interval?: number;
  /** Screen reader label. Default "Loading". */
  label?: string;
  /** Pause on the current frame. */
  paused?: boolean;
}

/** Text-glyph spinner (braille dots, arcs, …): a preset of `<Spinner variant="glyph">`. Holds a static frame under reduced motion. */
export const GlyphSpinner = React.forwardRef<HTMLSpanElement, GlyphSpinnerProps>(
  ({ variant = "dots", frames, ...props }, ref) => (
    <Spinner ref={ref} variant="glyph" frames={frames && frames.length > 0 ? frames : variant} {...props} />
  )
);
GlyphSpinner.displayName = "GlyphSpinner";

/* ------------------------------------------------------------------ */
/* FadeText                                                            */
/* ------------------------------------------------------------------ */

export interface FadeTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Clamp to this many lines (fades the last line). Default 1. */
  lines?: number;
  /** Width (single line) or height (multi-line) of the fade, CSS length. Default "2.5rem". */
  fade?: string;
  /** Native tooltip with the full text when truncated (string children only). Default true. */
  showTitle?: boolean;
}

/** Truncates text with a soft gradient fade instead of an ellipsis; the fade only appears when the text overflows. */
export const FadeText = React.forwardRef<HTMLSpanElement, FadeTextProps>(
  ({ lines = 1, fade = "2.5rem", showTitle = true, className, style, children, title, ...props }, forwardedRef) => {
    const ref = React.useRef<HTMLSpanElement | null>(null);
    const [overflowing, setOverflowing] = React.useState(false);
    const multi = lines > 1;
    const check = React.useCallback(() => {
      const el = ref.current;
      if (!el) return;
      setOverflowing(multi ? el.scrollHeight > el.clientHeight + 1 : el.scrollWidth > el.clientWidth + 1);
    }, [multi]);
    useIsoLayoutEffect(() => check(), [check, children]);
    useResizeObserver(ref, () => check());

    const mask = overflowing
      ? multi
        ? `linear-gradient(to bottom, #000 calc(100% - ${fade}), transparent)`
        : `linear-gradient(to right, #000 calc(100% - ${fade}), transparent)`
      : undefined;
    return (
      <span
        ref={(node) => {
          ref.current = node;
          assignRef(forwardedRef, node);
        }}
        data-overflowing={overflowing ? "" : undefined}
        title={title ?? (showTitle && overflowing && typeof children === "string" ? children : undefined)}
        className={cn("block min-w-0 overflow-hidden", multi ? "whitespace-normal" : "whitespace-nowrap", className)}
        style={{
          maskImage: mask,
          WebkitMaskImage: mask,
          maxHeight: multi ? `calc(${lines} * 1lh)` : undefined,
          ...style,
        }}
        {...props}
      >
        {children}
      </span>
    );
  }
);
FadeText.displayName = "FadeText";

/* ------------------------------------------------------------------ */
/* ClarifySettled / UndeliveredNotice                                  */
/* ------------------------------------------------------------------ */

export interface ClarifySettledItem {
  id: string;
  question: React.ReactNode;
  answer: React.ReactNode;
  /** The question was skipped instead of answered. */
  skipped?: boolean;
}

export interface ClarifySettledProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  items: ClarifySettledItem[];
  /** Summary line. Default "Answered n questions". */
  title?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Shows an "Edit" button per answer. */
  onEdit?: (id: string) => void;
}

/** Collapsed summary of an answered clarifying-question card, expandable to the Q → A list. */
export const ClarifySettled = React.forwardRef<HTMLDivElement, ClarifySettledProps>(
  ({ items, title, open: openProp, defaultOpen = false, onOpenChange, onEdit, className, ...props }, ref) => {
    const [open, setOpen] = useControllableState<boolean>({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    const listId = React.useId();
    const answered = items.filter((i) => !i.skipped).length;
    const summary = title ?? `Answered ${answered} ${answered === 1 ? "question" : "questions"}${items.length > answered ? ` · ${items.length - answered} skipped` : ""}`;
    return (
      <div ref={ref} data-state={open ? "open" : "closed"} className={cn("rounded-box border border-border bg-card text-sm", className)} {...props}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen(!open)}
          className={cn("flex w-full items-center gap-2 rounded-box px-3 py-2 text-left text-muted-foreground transition-colors hover:text-foreground", focusRing)}
        >
          <RiCheckboxCircleFill aria-hidden className="size-4 shrink-0 text-success" />
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{summary}</span>
          <RiArrowRightSLine aria-hidden className={cn("size-4 shrink-0 transition-transform motion-reduce:transition-none", open && "rotate-90")} />
        </button>
        {open && (
          <ol id={listId} className="flex flex-col gap-2 border-t border-border px-3 py-2.5">
            {items.map((it) => (
              <li key={it.id} className="flex items-start gap-2">
                <RiQuestionAnswerLine aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-muted-foreground">{it.question}</div>
                  <div className={cn("font-medium text-foreground", it.skipped && "font-normal italic text-muted-foreground")}>
                    {it.skipped ? "Skipped" : it.answer}
                  </div>
                </div>
                {onEdit && (
                  <Button size="xs" variant="ghost" onClick={() => onEdit(it.id)} className="h-6 shrink-0">
                    Edit
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }
);
ClarifySettled.displayName = "ClarifySettled";

export interface UndeliveredNoticeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  retryLabel?: string;
  onDismiss?: () => void;
}

/** Inline notice when an answer or message couldn't be delivered, with Retry. */
export const UndeliveredNotice = React.forwardRef<HTMLDivElement, UndeliveredNoticeProps>(
  (
    {
      title = "Your answer couldn't be delivered",
      description,
      onRetry,
      retrying = false,
      retryLabel = "Retry",
      onDismiss,
      className,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      role="alert"
      className={cn("flex items-start gap-2.5 rounded-box border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground", className)}
      {...props}
    >
      <RiErrorWarningLine aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{title}</div>
        {description && <div className="text-xs opacity-80">{description}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onDismiss && (
          <Button size="xs" variant="ghost" onClick={onDismiss} className="h-6 text-current">
            Dismiss
          </Button>
        )}
        {onRetry && (
          <Button size="xs" variant="secondary" loading={retrying} leadingIcon={<RiRefreshLine aria-hidden />} onClick={onRetry} className="h-6">
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  )
);
UndeliveredNotice.displayName = "UndeliveredNotice";

