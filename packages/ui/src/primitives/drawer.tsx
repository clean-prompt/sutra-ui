import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { RiCloseLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { clamp } from "../lib/math";
import { useControllableState } from "../hooks/use-controllable-state";
import { DialogOverlay, SheetBody, SheetClose, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "./dialog";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useDrag, type DragInfo } from "../hooks/use-drag";
import { useIsoLayoutEffect, useLatestRef } from "../hooks/use-iso-layout-effect";
import { releaseDecision, snapIndex } from "../lib/gesture";

/* useSwipe lives in hooks/use-swipe; re-exported here for back-compat. */
export { useSwipe, type SwipeDirection, type SwipeHandlers, type SwipeInfo, type UseSwipeOptions } from "../hooks/use-swipe";

/* ------------------------------------------------------------------ */
/* Drawer                                                              */
/* ------------------------------------------------------------------ */

/** Drag distance (px) past which a release dismisses the drawer. */
export const DRAWER_DISMISS_THRESHOLD = 80;
const DRAWER_FLICK_SPEED = 500; // px/s over the last 100 ms

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

/**
 * Bottom sheet with drag-to-dismiss, optional snap points, scroll lock and focus return (Radix Dialog).
 *
 * Dialog vs Sheet vs Drawer: `Dialog` is a centred modal for a focused task or decision; `Sheet` is a panel
 * that slides in from any edge (side navigation, detail or filter panels); `Drawer` is a touch-first bottom sheet
 * with a grabber, drag-to-dismiss and snap points. Drawer's Header, Title, Description, Body and Footer are the
 * Sheet parts with drawer spacing.
 */
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
    () => (snapProp && snapProp.length ? [...snapProp].map((s) => clamp(s, 0.05, 1)).sort((a, b) => a - b) : undefined),
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

/** Element that opens the drawer (same as `SheetTrigger`). */
export const DrawerTrigger = SheetTrigger;
/** Closes the drawer when clicked (works even when `dismissible={false}`). */
export const DrawerClose = React.forwardRef<
  React.ElementRef<typeof SheetClose>,
  React.ComponentPropsWithoutRef<typeof SheetClose>
>(({ onClick, ...props }, ref) => {
  const ctx = useDrawerContext();
  return (
    <SheetClose
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

/** Resistance beyond the drawer's limits: the sheet follows the finger at a diminishing rate, at most 48px. */
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
      onLostPointerCapture,
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
    const overlayRef = React.useRef<HTMLDivElement | null>(null);
    const inScroll = React.useRef(false);

    const maxSnap = snapPoints ? snapPoints[snapPoints.length - 1]! : 1;
    const minSnap = snapPoints ? snapPoints[0]! : 1;
    const currentSnap = snapPoints ? (snap !== undefined && snapPoints.includes(snap) ? snap : minSnap) : 1;
    const baseOffset = snapPoints ? (maxSnap - currentSnap) * viewportHeight() : 0;
    const canDrag = dismissible || (snapPoints?.length ?? 0) > 1;
    const base = useLatestRef(baseOffset);

    /** The sheet moves by `translate` (base offset of the snap point plus the drag offset), written straight to the element. */
    const place = (y: number) => {
      const el = nodeRef.current;
      if (el) el.style.translate = base.current + y ? `0 ${base.current + y}px` : "";
    };

    const onEnd = (info: DragInfo, cancelled: boolean) => {
      if (cancelled) return;
      const flick = releaseDecision({ offset: info.dy, velocity: info.vy, distance: Infinity, speed: DRAWER_FLICK_SPEED });
      const dy = info.y;
      if (!snapPoints) {
        if (dismissible && (dy > DRAWER_DISMISS_THRESHOLD || flick > 0)) setOpen(false);
        return;
      }
      const vh = viewportHeight();
      const visible = currentSnap - dy / vh;
      const idx = snapPoints.indexOf(currentSnap);
      if (dismissible && ((flick > 0 && idx <= 0) || (!flick && (minSnap - visible) * vh > DRAWER_DISMISS_THRESHOLD))) {
        setOpen(false);
        return;
      }
      setSnap(snapPoints[snapIndex(snapPoints, visible, { current: idx, flick: flick > 0 ? -1 : flick < 0 ? 1 : 0 })]!);
    };

    const drag = useDrag({
      axis: "y",
      enabled: canDrag,
      bounds: { top: -baseOffset, bottom: dismissible ? undefined : snapPoints ? (currentSnap - minSnap) * viewportHeight() : 0 },
      elastic: rubber,
      // Never start from a text field, a slider, or inside a scroll area that is scrolled down.
      allow: (event) => {
        const root = nodeRef.current;
        if (!root || blocksDragStart(event.target, root)) return false;
        inScroll.current = insideScrollable(event.target, root);
        return true;
      },
      // Dragging up inside a scroll area scrolls it, unless the sheet can still grow.
      shouldStart: (info) => !(info.dy < 0 && inScroll.current && currentSnap >= maxSnap),
      onPosition: (_x, y) => place(y),
      onMove: (info) => {
        const fade = overlayRef.current;
        if (fade && !snapPoints && info.y > 0) fade.style.opacity = String(Math.max(0.2, 1 - info.y / ((nodeRef.current?.offsetHeight || 400) * 1.2)));
        else if (fade) fade.style.opacity = "";
      },
      onEnd,
    });
    const { dragging, set: setOffset } = drag;
    const ref = useMergedRefs(nodeRef, forwardedRef, drag.ref);

    // After a release (the transition is back on) and on close, the sheet returns to its snap point.
    useIsoLayoutEffect(() => {
      if (dragging && ctx.open) return;
      if (overlayRef.current) overlayRef.current.style.opacity = "";
      setOffset(0, 0);
    }, [dragging, ctx.open, setOffset]);

    const cycleSnap = () => {
      if (!snapPoints) return;
      const idx = snapPoints.indexOf(currentSnap);
      setSnap(snapPoints[(idx + 1) % snapPoints.length]!);
    };

    return (
      <DialogPrimitive.Portal>
        <DialogOverlay ref={overlayRef} className={overlayClassName} />
        <DialogPrimitive.Content
          ref={ref}
          data-slot="drawer-content"
          data-dragging={dragging || undefined}
          data-snap={snapPoints ? currentSnap : undefined}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-b-0 border-border bg-dialog text-foreground shadow-2xl outline-none",
            "pb-[env(safe-area-inset-bottom)] select-none sm:select-auto",
            !snapPoints && "max-h-[calc(100dvh-1.5rem)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom data-[state=open]:duration-300 data-[state=closed]:duration-200 ease-out-quart",
            className
          )}
          style={{
            ...(snapPoints ? { height: `${maxSnap * 100}dvh` } : null),
            translate: baseOffset ? `0 ${baseOffset}px` : undefined,
            transition: dragging ? "none" : "translate 320ms cubic-bezier(0.32, 0.72, 0, 1)",
            ...style,
          }}
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
                "absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-[18px]",
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

/** Pinned header (does not scroll with the body); drag it to move the sheet. `SheetHeader` with drawer spacing. */
export const DrawerHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <SheetHeader
      ref={ref}
      data-slot="drawer-header"
      className={cn("shrink-0 touch-none gap-1 px-5 pb-3 pt-1 text-start", className)}
      {...props}
    />
  )
);
DrawerHeader.displayName = "DrawerHeader";

/** Accessible drawer title (same as `SheetTitle`). */
export const DrawerTitle = SheetTitle;

/** Accessible drawer description (same as `SheetDescription`). */
export const DrawerDescription = SheetDescription;

/** Scrollable content area. A drag never starts here while it is scrolled down. `SheetBody` with drawer spacing. */
export const DrawerBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <SheetBody
      ref={ref}
      data-slot="drawer-body"
      className={cn("mx-0 touch-pan-y overscroll-contain px-5 pb-4 select-text", className)}
      {...props}
    />
  )
);
DrawerBody.displayName = "DrawerBody";

/** Action row pinned to the bottom of the sheet. `SheetFooter` with a top border and drawer spacing. */
export const DrawerFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <SheetFooter
      ref={ref}
      data-slot="drawer-footer"
      className={cn("shrink-0 border-t border-border px-5 py-3", className)}
      {...props}
    />
  )
);
DrawerFooter.displayName = "DrawerFooter";
