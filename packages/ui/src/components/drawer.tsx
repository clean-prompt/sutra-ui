import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { RiCloseLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";

/* ------------------------------------------------------------------ */
/* useSwipe                                                            */
/* ------------------------------------------------------------------ */

export type SwipeDirection = "left" | "right" | "up" | "down";

export interface SwipeInfo {
  direction: SwipeDirection;
  dx: number;
  dy: number;
  /** Gesture duration in ms. */
  duration: number;
  /** Average speed along the winning axis, px/ms. */
  velocity: number;
}

export interface UseSwipeOptions {
  onSwipe?: (info: SwipeInfo) => void;
  onSwipeLeft?: (info: SwipeInfo) => void;
  onSwipeRight?: (info: SwipeInfo) => void;
  onSwipeUp?: (info: SwipeInfo) => void;
  onSwipeDown?: (info: SwipeInfo) => void;
  /** Which axis counts. Default "both". */
  axis?: "x" | "y" | "both";
  /** Minimum travel in px. Default 56. */
  threshold?: number;
  /** Slower gestures are reading/scrolling, not flicks. Default 750ms. */
  maxDuration?: number;
  /** The winning axis must beat the other by this factor. Default 1.5. */
  ratio?: number;
  /** Also react to mouse drags (touch and pen always count). Default false. */
  mouse?: boolean;
  /** Asked on pointer down; return false to ignore the whole gesture (e.g. from inside a slider). */
  allow?: (event: React.PointerEvent<HTMLElement>) => boolean;
  enabled?: boolean;
}

export interface SwipeHandlers {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
}

/**
 * Detects a flick (decided when the pointer lifts, so it never fights native scrolling).
 * Spread the returned handlers on an element; give it a matching `touch-action` (e.g. `touch-pan-y` for horizontal swipes).
 */
export function useSwipe(options: UseSwipeOptions = {}): SwipeHandlers {
  const optsRef = React.useRef(options);
  optsRef.current = options;
  const start = React.useRef<{ x: number; y: number; at: number; id: number } | null>(null);
  const pointers = React.useRef(new Set<number>());

  return React.useMemo<SwipeHandlers>(() => {
    const reset = (event: React.PointerEvent<HTMLElement>) => {
      pointers.current.delete(event.pointerId);
      if (start.current?.id === event.pointerId) start.current = null;
    };
    return {
      onPointerDown(event) {
        const o = optsRef.current;
        pointers.current.add(event.pointerId);
        if (o.enabled === false || (event.pointerType === "mouse" && !o.mouse) || (event.pointerType === "mouse" && event.button !== 0)) return;
        if (pointers.current.size > 1 || (o.allow && !o.allow(event))) {
          start.current = null;
          return;
        }
        start.current = { x: event.clientX, y: event.clientY, at: Date.now(), id: event.pointerId };
      },
      onPointerMove(event) {
        if (pointers.current.size > 1) start.current = null;
      },
      onPointerUp(event) {
        const s = start.current;
        reset(event);
        if (!s || s.id !== event.pointerId) return;
        const o = optsRef.current;
        const { threshold = 56, maxDuration = 750, ratio = 1.5, axis = "both" } = o;
        const dx = event.clientX - s.x;
        const dy = event.clientY - s.y;
        const duration = Math.max(1, Date.now() - s.at);
        if (duration > maxDuration) return;
        const horizontal = Math.abs(dx) >= Math.abs(dy) * ratio && Math.abs(dx) >= threshold;
        const vertical = Math.abs(dy) >= Math.abs(dx) * ratio && Math.abs(dy) >= threshold;
        let direction: SwipeDirection | null = null;
        if (horizontal && axis !== "y") direction = dx < 0 ? "left" : "right";
        else if (vertical && axis !== "x") direction = dy < 0 ? "up" : "down";
        if (!direction) return;
        const info: SwipeInfo = {
          direction,
          dx,
          dy,
          duration,
          velocity: Math.abs(direction === "left" || direction === "right" ? dx : dy) / duration,
        };
        o.onSwipe?.(info);
        ({ left: o.onSwipeLeft, right: o.onSwipeRight, up: o.onSwipeUp, down: o.onSwipeDown })[direction]?.(info);
      },
      onPointerCancel: reset,
    };
  }, []);
}

/* ------------------------------------------------------------------ */
/* Drawer                                                              */
/* ------------------------------------------------------------------ */

/** Drag distance (px) past which a release dismisses the drawer. */
export const DRAWER_DISMISS_THRESHOLD = 80;
const FLICK_VELOCITY = 0.5; // px/ms
const FLICK_MIN_DISTANCE = 24;

interface DrawerContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  dismissible: boolean;
  snapPoints?: number[];
  snap: number | undefined;
  setSnap: (snap: number) => void;
}

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

function useDrawerContext() {
  const ctx = React.useContext(DrawerContext);
  if (!ctx) throw new Error("Drawer parts must be rendered inside <Drawer>.");
  return ctx;
}

export interface DrawerProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Allow closing by drag, Escape and scrim click. Default true. */
  dismissible?: boolean;
  /** Heights as fractions of the viewport, e.g. `[0.5, 1]`. Omit for a content-sized sheet. */
  snapPoints?: number[];
  /** Active snap point (one of `snapPoints`). */
  snapPoint?: number;
  defaultSnapPoint?: number;
  onSnapPointChange?: (snap: number) => void;
  /** Modal (scroll lock, focus trap, inert page). Default true. */
  modal?: boolean;
  children?: React.ReactNode;
}

/** Bottom sheet with drag-to-dismiss, optional snap points, scroll lock and focus return (Radix Dialog). */
export function Drawer({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  dismissible = true,
  snapPoints: snapProp,
  snapPoint,
  defaultSnapPoint,
  onSnapPointChange,
  modal = true,
  children,
}: DrawerProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const snapPoints = React.useMemo(
    () => (snapProp && snapProp.length ? [...snapProp].map((s) => Math.min(1, Math.max(0.05, s))).sort((a, b) => a - b) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapProp?.join(",")]
  );
  const [snap, setSnap] = useControllableState<number | undefined>({
    value: snapPoint,
    defaultValue: defaultSnapPoint ?? snapPoints?.[0],
    onChange: onSnapPointChange as ((v: number | undefined) => void) | undefined,
  });

  // Reopen at the starting snap point.
  const initialSnap = defaultSnapPoint ?? snapPoints?.[0];
  React.useEffect(() => {
    if (!open && snapPoint === undefined && initialSnap !== undefined) setSnap(initialSnap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ctx = React.useMemo<DrawerContextValue>(
    () => ({ open, setOpen, dismissible, snapPoints, snap, setSnap: (s: number) => setSnap(s) }),
    [open, setOpen, dismissible, snapPoints, snap, setSnap]
  );

  return (
    <DrawerContext.Provider value={ctx}>
      <DialogPrimitive.Root open={open} onOpenChange={(next) => (next || dismissible ? setOpen(next) : undefined)} modal={modal}>
        {children}
      </DialogPrimitive.Root>
    </DrawerContext.Provider>
  );
}
Drawer.displayName = "Drawer";

/** Element that opens the drawer. */
export const DrawerTrigger = DialogPrimitive.Trigger;
/** Closes the drawer when clicked (works even when `dismissible={false}`). */
export const DrawerClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(({ onClick, ...props }, ref) => {
  const ctx = useDrawerContext();
  return (
    <DialogPrimitive.Close
      ref={ref}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !ctx.dismissible) ctx.setOpen(false);
      }}
      {...props}
    />
  );
});
DrawerClose.displayName = "DrawerClose";

const NO_DRAG_SELECTOR = [
  'input[type="range"]',
  "input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=reset])",
  "textarea",
  "select",
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="slider"]',
  "[data-drawer-no-drag]",
].join(",");

/** Never start a drag from a text field, a slider, or inside a scroll area that is scrolled down. */
function blocksDragStart(target: EventTarget | null, root: HTMLElement) {
  let el = target instanceof Element ? (target as HTMLElement) : null;
  while (el && el !== root) {
    if (el.matches(NO_DRAG_SELECTOR)) return true;
    if (el.scrollTop > 0) return true;
    el = el.parentElement;
  }
  return false;
}

function insideScrollable(target: EventTarget | null, root: HTMLElement) {
  let el = target instanceof Element ? (target as HTMLElement) : null;
  while (el && el !== root) {
    if (el.scrollHeight > el.clientHeight + 1) {
      const overflow = getComputedStyle(el).overflowY;
      if (overflow === "auto" || overflow === "scroll") return true;
    }
    el = el.parentElement;
  }
  return false;
}

const rubber = (distance: number) => Math.min(48, Math.sqrt(Math.max(0, distance)) * 4);
const viewportHeight = () => (typeof window !== "undefined" && window.innerHeight) || 800;

export interface DrawerContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Show the grabber handle. Default true. */
  showHandle?: boolean;
  /** Show a top-right close button. Default false. */
  showClose?: boolean;
  overlayClassName?: string;
}

/** The sheet panel: grabber, drag-to-dismiss (80px or a fast flick), rubber-band upward, snap points. */
export const DrawerContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DrawerContentProps>(
  (
    {
      className,
      style,
      showHandle = true,
      showClose = false,
      overlayClassName,
      children,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClickCapture,
      onEscapeKeyDown,
      onPointerDownOutside,
      onInteractOutside,
      ...props
    },
    forwardedRef
  ) => {
    const ctx = useDrawerContext();
    const { dismissible, snapPoints, snap, setSnap, setOpen } = ctx;
    const nodeRef = React.useRef<HTMLDivElement | null>(null);
    const ref = React.useCallback(
      (node: HTMLDivElement | null) => {
        nodeRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef]
    );
    const [offset, setOffset] = React.useState(0);
    const [dragging, setDragging] = React.useState(false);
    const justDragged = React.useRef(false);
    const drag = React.useRef<{
      x: number;
      y: number;
      at: number;
      id: number;
      active: boolean;
      inScroll: boolean;
    } | null>(null);

    const maxSnap = snapPoints ? snapPoints[snapPoints.length - 1]! : 1;
    const minSnap = snapPoints ? snapPoints[0]! : 1;
    const currentSnap = snapPoints ? (snap !== undefined && snapPoints.includes(snap) ? snap : minSnap) : 1;
    const baseOffset = snapPoints ? (maxSnap - currentSnap) * viewportHeight() : 0;
    const canDrag = dismissible || (snapPoints?.length ?? 0) > 1;

    React.useEffect(() => {
      if (!ctx.open) {
        setOffset(0);
        setDragging(false);
        drag.current = null;
      }
    }, [ctx.open]);

    const resist = (dy: number) => {
      const vh = viewportHeight();
      const upLimit = -baseOffset;
      if (dy < upLimit) return upLimit - rubber(upLimit - dy);
      if (!dismissible) {
        const downLimit = snapPoints ? (currentSnap - minSnap) * vh : 0;
        if (dy > downLimit) return downLimit + rubber(dy - downLimit);
      }
      return dy;
    };

    const finish = (clientY: number, cancelled: boolean) => {
      const d = drag.current;
      drag.current = null;
      if (!d?.active) return;
      setDragging(false);
      justDragged.current = true;
      setTimeout(() => (justDragged.current = false), 0);
      if (cancelled) {
        setOffset(0);
        return;
      }
      const raw = clientY - d.y;
      const dy = resist(raw);
      const velocity = raw / Math.max(1, Date.now() - d.at);
      const flick = Math.abs(velocity) > FLICK_VELOCITY && Math.abs(raw) > FLICK_MIN_DISTANCE;

      if (!snapPoints) {
        if (dismissible && (dy > DRAWER_DISMISS_THRESHOLD || (flick && velocity > 0))) setOpen(false);
        setOffset(0);
        return;
      }

      const vh = viewportHeight();
      const visible = currentSnap - dy / vh;
      const idx = snapPoints.indexOf(currentSnap);
      if (dismissible && ((flick && velocity > 0 && idx <= 0) || (!flick && (minSnap - visible) * vh > DRAWER_DISMISS_THRESHOLD))) {
        setOpen(false);
        setOffset(0);
        return;
      }
      let target: number;
      if (flick) target = Math.min(snapPoints.length - 1, Math.max(0, idx + (velocity > 0 ? -1 : 1)));
      else {
        target = 0;
        snapPoints.forEach((p, i) => {
          if (Math.abs(p - visible) < Math.abs(snapPoints[target]! - visible)) target = i;
        });
      }
      setSnap(snapPoints[target]!);
      setOffset(0);
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerDown?.(event);
      const root = nodeRef.current;
      if (event.defaultPrevented || !canDrag || !root) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (blocksDragStart(event.target, root)) return;
      drag.current = {
        x: event.clientX,
        y: event.clientY,
        at: Date.now(),
        id: event.pointerId,
        active: false,
        inScroll: insideScrollable(event.target, root),
      };
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      const d = drag.current;
      if (!d || d.id !== event.pointerId) return;
      const dy = event.clientY - d.y;
      const dx = event.clientX - d.x;
      if (!d.active) {
        if (Math.abs(dy) < 4 && Math.abs(dx) < 4) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          drag.current = null;
          return;
        }
        // Dragging up inside a scroll area scrolls it, unless the sheet can still grow.
        if (dy < 0 && d.inScroll && currentSnap >= maxSnap) {
          drag.current = null;
          return;
        }
        d.active = true;
        setDragging(true);
        try {
          (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
        } catch {
          /* capture is best-effort */
        }
      }
      setOffset(resist(dy));
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerUp?.(event);
      if (drag.current?.id === event.pointerId) finish(event.clientY, false);
    };

    const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerCancel?.(event);
      if (drag.current?.id === event.pointerId) finish(event.clientY, true);
    };

    const translate = baseOffset + offset;
    const cycleSnap = () => {
      if (!snapPoints) return;
      const idx = snapPoints.indexOf(currentSnap);
      setSnap(snapPoints[(idx + 1) % snapPoints.length]!);
    };

    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            overlayClassName
          )}
          style={
            dragging && offset > 0 && !snapPoints
              ? { opacity: Math.max(0.2, 1 - offset / ((nodeRef.current?.offsetHeight || 400) * 1.2)) }
              : undefined
          }
        />
        <DialogPrimitive.Content
          ref={ref}
          data-slot="drawer-content"
          data-dragging={dragging || undefined}
          data-snap={snapPoints ? currentSnap : undefined}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-b-0 border-border bg-background text-foreground shadow-2xl outline-none",
            "pb-[env(safe-area-inset-bottom)] select-none sm:select-auto",
            !snapPoints && "max-h-[calc(100dvh-1.5rem)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom data-[state=open]:duration-300 data-[state=closed]:duration-200 ease-out-quart",
            className
          )}
          style={{
            ...(snapPoints ? { height: `${maxSnap * 100}dvh` } : null),
            translate: translate ? `0 ${translate}px` : undefined,
            transition: dragging ? "none" : "translate 320ms cubic-bezier(0.32, 0.72, 0, 1)",
            ...style,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClickCapture={(event) => {
            onClickCapture?.(event);
            if (justDragged.current) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          onEscapeKeyDown={(event) => {
            onEscapeKeyDown?.(event);
            if (!dismissible) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            onPointerDownOutside?.(event);
            if (!dismissible) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            onInteractOutside?.(event);
            if (!dismissible) event.preventDefault();
          }}
          {...props}
        >
          {showHandle &&
            (snapPoints && snapPoints.length > 1 ? (
              <button
                type="button"
                onClick={cycleSnap}
                aria-label={currentSnap >= maxSnap ? "Collapse sheet" : "Expand sheet"}
                data-slot="drawer-handle"
                className={cn("mx-auto flex h-6 w-16 shrink-0 cursor-grab touch-none items-center justify-center rounded-full active:cursor-grabbing", focusRing)}
              >
                <span aria-hidden className="block h-1.5 w-10 rounded-full bg-border-strong" />
              </button>
            ) : (
              <div aria-hidden data-slot="drawer-handle" className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing">
                <span className="block h-1.5 w-10 rounded-full bg-border-strong" />
              </div>
            ))}
          {children}
          {showClose && (
            <DrawerClose
              aria-label="Close"
              className={cn(
                "absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-[18px]",
                focusRing
              )}
            >
              <RiCloseLine aria-hidden />
            </DrawerClose>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  }
);
DrawerContent.displayName = "DrawerContent";

/** Pinned header (does not scroll with the body); drag it to move the sheet. */
export const DrawerHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="drawer-header"
      className={cn("flex shrink-0 touch-none flex-col gap-1 px-5 pb-3 pt-1 text-left", className)}
      {...props}
    />
  )
);
DrawerHeader.displayName = "DrawerHeader";

/** Accessible drawer title. */
export const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold leading-tight tracking-tight text-foreground", className)} {...props} />
));
DrawerTitle.displayName = "DrawerTitle";

/** Accessible drawer description. */
export const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DrawerDescription.displayName = "DrawerDescription";

/** Scrollable content area. A drag never starts here while it is scrolled down. */
export const DrawerBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="drawer-body"
      className={cn("min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-4 text-sm scrollbar-thin select-text", className)}
      {...props}
    />
  )
);
DrawerBody.displayName = "DrawerBody";

/** Action row pinned to the bottom of the sheet. */
export const DrawerFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="drawer-footer"
      className={cn("flex shrink-0 flex-col-reverse gap-2 border-t border-border px-5 py-3 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
);
DrawerFooter.displayName = "DrawerFooter";
