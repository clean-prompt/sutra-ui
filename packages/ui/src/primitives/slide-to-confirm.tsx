import * as React from "react";
import { RiArrowRightSLine, RiCheckLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { slideConfirms, slideProgress } from "../lib/gesture";
import { normalizeTone, toneClasses, type ToneInput } from "../lib/tone";
import { useControllableState } from "../hooks/use-controllable-state";
import { useDrag } from "../hooks/use-drag";
import { useElementWidth } from "../hooks/use-resize-observer";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useDirection } from "../hooks/use-direction";
import { inlineKeyStep, inlineSign } from "../lib/direction";
import { Spinner } from "./spinner";

export interface SlideToConfirmProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "children" | "defaultValue"> {
  /** Runs once the thumb reaches the end (or Enter, Space or End is pressed). A returned promise keeps the control busy; a rejection slides it back. */
  onConfirm?: () => void | Promise<unknown>;
  /** The thumb is at the end. Pass `false` to slide it back after a confirmation. */
  confirmed?: boolean;
  /** Initial confirmed state when uncontrolled. */
  defaultConfirmed?: boolean;
  /** Called when the control reaches or leaves the confirmed state. */
  onConfirmedChange?: (confirmed: boolean) => void;
  /** Visible hint, also the slider's accessible name. Default "Slide to confirm". */
  label?: string;
  /** Hint shown once the thumb reaches the end. */
  confirmedLabel?: string;
  /** Shown while the action runs. Default "Confirming…". */
  loadingLabel?: string;
  /** Thumb at the end with a spinner while the action runs (a promise from `onConfirm` does the same by itself). */
  loading?: boolean;
  /** Disables dragging and the keyboard. */
  disabled?: boolean;
  /** Colour of the thumb and the filled track. */
  tone?: ToneInput;
  /**
   * Control height and thumb size.
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
  /** Arrow key step in percent of the track. Default 10. */
  step?: number;
  /** Icon on the thumb. Default a chevron. */
  icon?: React.ReactNode;
}

/** Track height and the thumb width the fill and the travel are measured from. */
const sizes = {
  sm: "h-10 text-xs [--sutra-thumb:2rem]",
  md: "h-12 text-sm [--sutra-thumb:2.5rem]",
  lg: "h-14 text-base [--sutra-thumb:3rem]",
} as const;
/** Gap between the thumb and the track edge (matches `p-1`). */
const INSET = 4;

/**
 * Confirm an irreversible action by sliding the thumb along the track. It is a `role="slider"` (value 0 to 100, arrow keys step,
 * Home resets, End and Enter and Space confirm), the offset follows the finger without React state (`useDrag`), a release short of
 * 90% springs back, and under reduced motion the release is instant. `onConfirm` may return a promise: the control stays busy
 * until it settles and slides back if it rejects.
 */
export const SlideToConfirm = React.forwardRef<HTMLDivElement, SlideToConfirmProps>(function SlideToConfirm(
  {
    onConfirm,
    confirmed: confirmedProp,
    defaultConfirmed = false,
    onConfirmedChange,
    label = "Slide to confirm",
    confirmedLabel = "Confirmed",
    loadingLabel = "Confirming…",
    loading = false,
    disabled = false,
    tone = "primary",
    size = "md",
    step = 10,
    icon,
    className,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onClickCapture,
    ...props
  },
  forwardedRef
) {
  const [confirmed, setConfirmed] = useControllableState({ value: confirmedProp, defaultValue: defaultConfirmed, onChange: onConfirmedChange });
  const [busy, setBusy] = React.useState(false);
  const placed = React.useRef<{ pct: number; travel: number; sign?: number } | null>(null);
  const [pct, setPct] = React.useState(confirmed ? 100 : 0);
  const labelId = React.useId();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const thumbRef = React.useRef<HTMLDivElement | null>(null);
  const alive = React.useRef(true);
  const trackWidth = useElementWidth(rootRef);
  const thumbWidth = useElementWidth(thumbRef);
  const travel = Math.max(0, trackWidth - thumbWidth - INSET * 2);
  const locked = disabled || confirmed || busy || loading;
  const atEnd = confirmed || busy || loading;
  const toneName = normalizeTone(tone);
  // The thumb travels from the inline start to the inline end: towards the right in LTR, the left in RTL (offsets are physical).
  const sign = inlineSign(useDirection(rootRef));

  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const confirm = () => {
    if (confirmed || busy || disabled) return;
    setConfirmed(true);
    setPct(100);
    let result: void | Promise<unknown>;
    try {
      result = onConfirm?.();
    } catch (error) {
      slideBack();
      throw error;
    }
    if (result && typeof (result as Promise<unknown>).then === "function") {
      setBusy(true);
      (result as Promise<unknown>).then(
        () => alive.current && setBusy(false),
        () => {
          if (!alive.current) return;
          setBusy(false);
          slideBack();
        }
      );
    }
  };
  const slideBack = () => {
    setConfirmed(false);
    setPct(0);
  };

  /** The thumb is positioned by `--sutra-drag-x`; the track reads `--sutra-slide-progress` and the slider value follows without a render. */
  const drag = useDrag({
    axis: "x",
    enabled: !locked,
    bounds: sign > 0 ? { left: 0, right: travel } : { left: -travel, right: 0 },
    allow: (event) => Boolean(thumbRef.current?.contains(event.target as Node)),
    onPosition: (x) => {
      const p = slideProgress(x * sign, travel);
      rootRef.current?.style.setProperty("--sutra-slide-progress", p.toFixed(3));
      thumbRef.current?.setAttribute("aria-valuenow", String(Math.round(p * 100)));
    },
    onEnd(info, cancelled) {
      if (!cancelled && slideConfirms(info.x * sign, travel)) {
        drag.settle({ x: travel * sign }, "snappy", { x: info.vx });
        placed.current = { pct: 100, travel, sign };
        confirm();
      } else {
        drag.settle({ x: (atEnd ? travel : (pct / 100) * travel) * sign }, "snappy", { x: info.vx });
      }
    },
  });
  const { set: setPosition, settle } = drag;
  const ref = useMergedRefs(rootRef, forwardedRef, drag.ref);

  // Follow the resting value (keys, `confirmed`, a resize): jump on the first layout, spring afterwards.
  React.useEffect(() => {
    if (drag.dragging) return;
    const rest = atEnd ? 100 : pct;
    const x = (rest / 100) * travel * sign;
    const last = placed.current;
    placed.current = { pct: rest, travel, sign };
    if (!last || last.travel !== travel || last.sign !== sign) setPosition(x, 0);
    else if (last.pct !== rest) settle({ x }, "snappy");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct, atEnd, travel, sign, drag.dragging]);
  // A parent resetting `confirmed` slides the thumb home.
  React.useEffect(() => {
    if (!confirmed && pct === 100) setPct(0);
    if (confirmed && pct !== 100) setPct(100);
  }, [confirmed, pct]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (locked || event.altKey || event.ctrlKey || event.metaKey) return;
    const move = (to: number) => {
      event.preventDefault();
      if (to >= 100) confirm();
      else setPct(Math.max(0, to));
    };
    const along = inlineKeyStep(event.key, sign > 0 ? "ltr" : "rtl");
    if (along > 0 || event.key === "ArrowUp") move(pct + step);
    else if (along < 0 || event.key === "ArrowDown") move(pct - step);
    else if (event.key === "Home") move(0);
    else if (event.key === "End" || event.key === "Enter" || event.key === " ") move(100);
  };

  const state = loading || busy ? "loading" : confirmed ? "confirmed" : drag.dragging ? "dragging" : "idle";

  return (
    <div
      ref={ref}
      data-slot="slide-to-confirm"
      data-state={state}
      aria-busy={state === "loading" || undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        "relative isolate flex w-full select-none items-center overflow-hidden rounded-control border border-border bg-muted p-1 font-medium",
        sizes[size],
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        drag.handlers.onPointerDown?.(event);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        drag.handlers.onPointerMove?.(event);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        drag.handlers.onPointerUp?.(event);
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        drag.handlers.onPointerCancel?.(event);
      }}
      onLostPointerCapture={(event) => {
        onLostPointerCapture?.(event);
        drag.handlers.onLostPointerCapture?.(event);
      }}
      onClickCapture={(event) => {
        onClickCapture?.(event);
        drag.handlers.onClickCapture?.(event);
      }}
      {...props}
    >
      <div
        aria-hidden
        data-slot="slide-to-confirm-fill"
        className={cn("absolute inset-y-0 start-0 rounded-[inherit]", toneClasses.soft[toneName])}
        style={{ width: `calc(var(--sutra-drag-x, 0px) * ${sign} + ${INSET * 2}px + var(--sutra-thumb))` }}
      />
      <span
        id={labelId}
        data-slot="slide-to-confirm-label"
        className={cn("pointer-events-none relative z-10 min-w-0 flex-1 truncate pe-4 ps-[calc(var(--sutra-thumb)+0.75rem)] text-center", atEnd ? "text-foreground" : "text-muted-foreground")}
        style={atEnd ? undefined : { opacity: "calc(1 - var(--sutra-slide-progress, 0) * 1.2)" }}
      >
        {busy || loading ? loadingLabel : confirmed ? confirmedLabel : label}
      </span>
      <div
        ref={thumbRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={atEnd ? 100 : pct}
        aria-valuetext={atEnd ? (busy || loading ? loadingLabel : confirmedLabel) : undefined}
        aria-orientation="horizontal"
        aria-disabled={disabled || undefined}
        data-slot="slide-to-confirm-thumb"
        onKeyDown={onKeyDown}
        className={cn(
          "absolute inset-y-1 start-1 z-20 grid w-[var(--sutra-thumb)] place-items-center rounded-control shadow-sm [&_svg]:size-5",
          toneClasses.solid[toneName],
          !locked && "cursor-grab active:cursor-grabbing",
          focusRing
        )}
        style={{ translate: "var(--sutra-drag-x, 0px) 0" }}
      >
        {state === "loading" ? <Spinner size="xs" label="" className="text-current" /> : confirmed ? <RiCheckLine aria-hidden /> : (icon ?? <RiArrowRightSLine className="rtl:-scale-x-100" aria-hidden />)}
      </div>
      <span role="status" className="sr-only">
        {confirmed && !busy && !loading ? confirmedLabel : ""}
      </span>
    </div>
  );
});
SlideToConfirm.displayName = "SlideToConfirm";
