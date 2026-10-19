import * as React from "react";
import { createPortal } from "react-dom";
import { Popover as PopoverPrimitive } from "radix-ui";
import { RiArrowRightSLine, RiCloseLine, RiLightbulbFlashLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { normalizeTone, toneClasses, type Tone, type ToneInput } from "../lib/tone";
import { clamp } from "../lib/math";
import { useChangeKey } from "../hooks/use-change-key";
import { useControllableState } from "../hooks/use-controllable-state";
import { prefersReducedMotion } from "../hooks/use-media-query";
import { useSafeId } from "../hooks/use-safe-id";
import { useResizeObserver } from "../hooks/use-resize-observer";
import { Button } from "../primitives/button";

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

export type CoachmarkTarget = string | React.RefObject<HTMLElement | null>;
export type CoachmarkPlacement = "top" | "bottom" | "left" | "right" | "auto";

function resolveTarget(target: CoachmarkTarget | undefined): HTMLElement | null {
  if (!target || typeof document === "undefined") return null;
  if (typeof target === "string") {
    try {
      return document.querySelector<HTMLElement>(target);
    } catch {
      return null;
    }
  }
  return target.current ?? null;
}

/* ------------------------------------------------------------------ */
/* CoachmarkTour                                                       */
/* ------------------------------------------------------------------ */

export interface CoachmarkStep {
  id?: string;
  /** CSS selector or ref of the element to highlight. Missing targets show a centered card. */
  target?: CoachmarkTarget;
  title: React.ReactNode;
  body?: React.ReactNode;
  /** Default "auto". */
  placement?: CoachmarkPlacement;
  /** Optional extra action rendered next to the navigation. */
  action?: { label: React.ReactNode; onClick: () => void };
}

export interface CoachmarkTourLabels {
  next?: string;
  back?: string;
  skip?: string;
  finish?: string;
}

export interface CoachmarkTourProps {
  steps: CoachmarkStep[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  step?: number;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  onFinish?: () => void;
  onSkip?: (step: number) => void;
  /** Persist completion; called for both finish and skip. */
  onComplete?: (reason: "finish" | "skip") => void;
  /** Spotlight padding around the target, px. Default 8. */
  padding?: number;
  /** Spotlight corner radius, px. Default 10. */
  radius?: number;
  labels?: CoachmarkTourLabels;
  /** Close (skip) when the dimmed area is clicked. Default false. */
  closeOnOverlayClick?: boolean;
  className?: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function placeCard(
  r: Rect | null,
  card: { width: number; height: number },
  placement: CoachmarkPlacement,
  pad: number
): { top: number; left: number; side: Exclude<CoachmarkPlacement, "auto"> | "center" } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cw = card.width || 320;
  const ch = card.height || 160;
  const gap = 12;
  const clampX = (x: number) => Math.max(8, Math.min(x, vw - cw - 8));
  const clampY = (y: number) => Math.max(8, Math.min(y, vh - ch - 8));
  if (!r || (r.width === 0 && r.height === 0)) {
    return { top: clampY((vh - ch) / 2), left: clampX((vw - cw) / 2), side: "center" };
  }
  const room = {
    bottom: vh - (r.top + r.height + pad + gap),
    top: r.top - pad - gap,
    right: vw - (r.left + r.width + pad + gap),
    left: r.left - pad - gap,
  };
  let side: Exclude<CoachmarkPlacement, "auto"> =
    placement === "auto"
      ? room.bottom >= ch
        ? "bottom"
        : room.top >= ch
          ? "top"
          : room.right >= cw
            ? "right"
            : room.left >= cw
              ? "left"
              : "bottom"
      : placement;
  if (side === "bottom" && room.bottom < ch && room.top >= ch) side = "top";
  else if (side === "top" && room.top < ch && room.bottom >= ch) side = "bottom";
  else if (side === "right" && room.right < cw && room.left >= cw) side = "left";
  else if (side === "left" && room.left < cw && room.right >= cw) side = "right";
  const cx = r.left + r.width / 2 - cw / 2;
  const cy = r.top + r.height / 2 - ch / 2;
  switch (side) {
    case "top":
      return { top: clampY(r.top - pad - gap - ch), left: clampX(cx), side };
    case "left":
      return { top: clampY(cy), left: clampX(r.left - pad - gap - cw), side };
    case "right":
      return { top: clampY(cy), left: clampX(r.left + r.width + pad + gap), side };
    default:
      return { top: clampY(r.top + r.height + pad + gap), left: clampX(cx), side: "bottom" };
  }
}

/** Dependency-free guided tour: spotlight cutout, anchored step card, keyboard and completion callbacks. */
export function CoachmarkTour({
  steps,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  step: stepProp,
  defaultStep = 0,
  onStepChange,
  onFinish,
  onSkip,
  onComplete,
  padding = 8,
  radius = 10,
  labels = {},
  closeOnOverlayClick = false,
  className,
}: CoachmarkTourProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [stepState, setStep] = useControllableState({ value: stepProp, defaultValue: defaultStep, onChange: onStepChange });
  const count = steps.length;
  const index = clamp(stepState, 0, Math.max(0, count - 1));
  const current = steps[index];
  // The title and body fade in when the step changes (not when the tour opens); the card itself already glides.
  const stepChanges = useChangeKey(index);
  const stepFade = stepChanges > 0 ? "animate-fade-in" : undefined;
  const [rect, setRect] = React.useState<Rect | null>(null);
  const [cardSize, setCardSize] = React.useState({ width: 0, height: 0 });
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [targetEl, setTargetEl] = React.useState<HTMLElement | null>(null);
  const frameRef = React.useRef(0);
  const uid = useSafeId("coachmark");
  const { next: nextLabel = "Next", back: backLabel = "Back", skip: skipLabel = "Skip tour", finish: finishLabel = "Finish" } = labels;

  const measure = React.useCallback(() => {
    const el = resolveTarget(current?.target);
    if (!el) {
      setRect(null);
      return;
    }
    const b = el.getBoundingClientRect();
    setRect((prev) =>
      prev && prev.top === b.top && prev.left === b.left && prev.width === b.width && prev.height === b.height
        ? prev
        : { top: b.top, left: b.left, width: b.width, height: b.height }
    );
  }, [current?.target]);

  React.useLayoutEffect(() => {
    if (!open || !current) {
      setTargetEl(null);
      return;
    }
    const el = resolveTarget(current.target);
    setTargetEl(el);
    el?.scrollIntoView?.({ block: "center", inline: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    measure();
    cardRef.current?.focus({ preventScroll: true });
  }, [open, index, current, measure]);

  // Re-measure at most once per frame on scroll, resize and target resize.
  const schedule = React.useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(measure);
  }, [measure]);
  useResizeObserver(targetEl, schedule);

  React.useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    // Smooth scrolling moves the target after the first measure; re-measure briefly.
    const settle = window.setTimeout(measure, 350);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.clearTimeout(settle);
    };
  }, [open, measure, schedule]);

  React.useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const { offsetWidth: width, offsetHeight: height } = el;
    setCardSize((p) => (p.width === width && p.height === height ? p : { width, height }));
  });

  const close = React.useCallback(() => setOpen(false), [setOpen]);
  const finish = React.useCallback(() => {
    close();
    onFinish?.();
    onComplete?.("finish");
  }, [close, onFinish, onComplete]);
  const skip = React.useCallback(() => {
    close();
    onSkip?.(index);
    onComplete?.("skip");
  }, [close, onSkip, onComplete, index]);
  const next = React.useCallback(() => (index >= count - 1 ? finish() : setStep(index + 1)), [index, count, finish, setStep]);
  const back = React.useCallback(() => index > 0 && setStep(index - 1), [index, setStep]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.keyCode === 229) return;
      // Leave keys alone in text fields (the spotlighted target may be one): arrows move the caret there.
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || (t.closest && t.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")))) return;
      if (e.key === "Escape") {
        e.preventDefault();
        skip();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, next, back, skip]);

  if (!open || !current || typeof document === "undefined") return null;

  const pos = placeCard(rect, cardSize, current.placement ?? "auto", padding);
  const hole = rect
    ? { x: rect.left - padding, y: rect.top - padding, w: rect.width + padding * 2, h: rect.height + padding * 2 }
    : null;
  const titleId = `${uid}-title`;
  const bodyId = `${uid}-body`;
  const last = index === count - 1;

  return createPortal(
    <div className={cn("fixed inset-0 z-50", className)} data-coachmark-tour="">
      <svg
        aria-hidden
        className="absolute inset-0 size-full"
        onClick={closeOnOverlayClick ? skip : undefined}
        data-coachmark-overlay=""
      >
        <defs>
          <mask id={`${uid}-mask`}>
            <rect width="100%" height="100%" fill="white" />
            {hole && <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={radius} ry={radius} fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" mask={`url(#${uid}-mask)`} className="fill-overlay" />
        {hole && (
          <rect
            x={hole.x}
            y={hole.y}
            width={hole.w}
            height={hole.h}
            rx={radius}
            ry={radius}
            fill="none"
            className="stroke-primary"
            strokeWidth={2}
            data-coachmark-spotlight=""
          />
        )}
      </svg>
      <div
        ref={cardRef}
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={current.body ? bodyId : undefined}
        tabIndex={-1}
        data-side={pos.side}
        data-step={index}
        className={cn(
          "absolute w-80 max-w-[calc(100vw-1rem)] rounded-box border border-border bg-popover p-4 text-popover-foreground shadow-2xl outline-none",
          "transition-[top,left] duration-200 ease-out-quart motion-reduce:transition-none"
        )}
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="mb-1 flex items-start gap-2">
          <h2 key={`title-${stepChanges}`} id={titleId} className={cn("min-w-0 flex-1 text-sm font-semibold text-foreground", stepFade)}>
            {current.title}
          </h2>
          <button
            type="button"
            aria-label={skipLabel}
            onClick={skip}
            className={cn("-mr-1 -mt-1 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground", focusRing)}
          >
            <RiCloseLine aria-hidden className="size-4" />
          </button>
        </div>
        {current.body && (
          <div key={`body-${stepChanges}`} id={bodyId} className={cn("text-sm text-muted-foreground", stepFade)}>
            {current.body}
          </div>
        )}
        {!rect && current.target && (
          <p className="mt-2 text-xs text-muted-foreground/80" data-coachmark-missing="">
            This part of the page isn&apos;t visible right now.
          </p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
            Step {index + 1} of {count}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {current.action && (
              <Button size="xs" variant="ghost" onClick={current.action.onClick}>
                {current.action.label}
              </Button>
            )}
            {!last && (
              <Button size="xs" variant="ghost" onClick={skip}>
                Skip
              </Button>
            )}
            {index > 0 && (
              <Button size="xs" variant="outline" onClick={back}>
                {backLabel}
              </Button>
            )}
            <Button size="xs" onClick={next}>
              {last ? finishLabel : nextLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
CoachmarkTour.displayName = "CoachmarkTour";

/* ------------------------------------------------------------------ */
/* TipBubble                                                           */
/* ------------------------------------------------------------------ */

export interface TipBubbleItem {
  id: string;
  title?: React.ReactNode;
  body: React.ReactNode;
}

/** @deprecated Use `ToneInput` with the `tone` prop. */
export type TipBubbleAccent = "primary" | "info" | "success" | "warning" | "destructive";

const accentIcon: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-soft-foreground",
  destructive: "bg-destructive-soft text-destructive",
};

export interface TipBubbleProps {
  /** One or more tips; "Next tip" cycles through them. */
  tips: TipBubbleItem[];
  /** Anchor element (wrapped with asChild). Use `target` instead to anchor to an existing element. */
  children?: React.ReactElement;
  target?: CoachmarkTarget;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Called when the bubble is closed. */
  onDismiss?: () => void;
  /** Shows a "Don't show again" action. */
  onDontShowAgain?: () => void;
  /** Accent colour of the bar and icon. Default `primary`. */
  tone?: ToneInput;
  /** @deprecated Use `tone`. */
  accent?: TipBubbleAccent;
  icon?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}

/** Dismissible contextual tip anchored to an element, with a rotating "Next tip" list. */
export function TipBubble({
  tips,
  children,
  target,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  onDismiss,
  onDontShowAgain,
  tone,
  accent,
  icon,
  side = "bottom",
  align = "start",
  className,
}: TipBubbleProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [indexState, setIndex] = useControllableState({ value: indexProp, defaultValue: defaultIndex, onChange: onIndexChange });
  const count = tips.length;
  const tip = count ? tips[((indexState % count) + count) % count] : undefined;
  const uid = React.useId();
  const targetRef = React.useRef(target);
  targetRef.current = target;
  const virtualRef = React.useRef({
    getBoundingClientRect: () => resolveTarget(targetRef.current)?.getBoundingClientRect() ?? new DOMRect(),
  });
  const accentTone = normalizeTone(tone ?? accent, "primary");

  const dismiss = () => {
    setOpen(false);
    onDismiss?.();
  };

  if (!tip) return children ?? null;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : dismiss())}>
      {children ? (
        <PopoverPrimitive.Anchor asChild>{children}</PopoverPrimitive.Anchor>
      ) : (
        <PopoverPrimitive.Anchor virtualRef={virtualRef} />
      )}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={8}
          aria-labelledby={`${uid}-title`}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          data-tip={tip.id}
          className={cn(
            "relative z-50 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-box border border-border bg-popover p-3 pl-4 text-popover-foreground shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            className
          )}
        >
          <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", toneClasses.dot[accentTone])} />
          <div className="flex items-start gap-2.5">
            <span aria-hidden className={cn("flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-4", accentIcon[accentTone])}>
              {icon ?? <RiLightbulbFlashLine aria-hidden />}
            </span>
            <div className="min-w-0 flex-1">
              <p id={`${uid}-title`} className="text-sm font-semibold text-foreground">
                {tip.title ?? "Tip"}
              </p>
              <div className="mt-0.5 text-sm text-muted-foreground">{tip.body}</div>
            </div>
            <button
              type="button"
              aria-label="Dismiss tip"
              onClick={dismiss}
              className={cn("-mr-1 -mt-1 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground", focusRing)}
            >
              <RiCloseLine aria-hidden className="size-4" />
            </button>
          </div>
          {(count > 1 || onDontShowAgain) && (
            <div className="mt-3 flex items-center gap-2 pl-9">
              {onDontShowAgain && (
                <button
                  type="button"
                  onClick={() => {
                    onDontShowAgain();
                    dismiss();
                  }}
                  className={cn("rounded-xs text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline", focusRing)}
                >
                  Don&apos;t show again
                </button>
              )}
              {count > 1 && (
                <>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {(((indexState % count) + count) % count) + 1}/{count}
                  </span>
                  <Button size="xs" variant="soft" trailingIcon={<RiArrowRightSLine aria-hidden />} onClick={() => setIndex((indexState + 1) % count)}>
                    Next tip
                  </Button>
                </>
              )}
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
TipBubble.displayName = "TipBubble";
