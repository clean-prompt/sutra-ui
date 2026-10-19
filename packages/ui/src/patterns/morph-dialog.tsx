import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { RiCloseLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import type { MorphOrigin, MorphRect } from "../lib/morph";
import { DirectionContext } from "../hooks/use-direction";
import { useControllableState } from "../hooks/use-controllable-state";
import { useIsoLayoutEffect, useLatestRef } from "../hooks/use-iso-layout-effect";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useReturnFocus } from "../hooks/use-return-focus";
import { measureOrigin, playRectMorph } from "../hooks/use-rect-morph";
import { Button } from "../primitives/button";

export type MorphDialogVariant = "dialog" | "sheet" | "auto";
export type MorphDialogSize = "sm" | "md" | "lg";
/** What a `MorphDialog` grows from: an element, a ref to one, or a rectangle in viewport coordinates. */
export type MorphDialogOrigin = React.RefObject<Element | null> | Element | MorphRect | DOMRectReadOnly | null | undefined;

export interface MorphDialogProps {
  /** Whether the dialog is open (controlled). */
  open?: boolean;
  /** Start open (uncontrolled). */
  defaultOpen?: boolean;
  /** Asked to open or close: Escape, the close button, a press on the scrim or the trigger. */
  onOpenChange?: (open: boolean) => void;
  /** The box the panel grows from and shrinks back into. It is measured when the dialog opens and again when it closes. Without one the panel lifts in. */
  origin?: MorphDialogOrigin;
  /** Accessible name of the dialog. */
  title: string;
  /** Accessible description. */
  description?: string;
  /** Show the title as a heading at the top of the panel instead of hiding it from sight. Default false. */
  showTitle?: boolean;
  /** `"dialog"` is centred, `"sheet"` docks to the bottom edge, `"auto"` is a sheet below the `sm` breakpoint. Default "auto". */
  variant?: MorphDialogVariant;
  /** Width of the panel: sm, md or lg. Default "md". */
  size?: MorphDialogSize;
  /** The close button at the top end of the panel. Default true. */
  showClose?: boolean;
  /** The element that opens it (rendered with `asChild`); it gets focus back on close. */
  trigger?: React.ReactNode;
  /** Runs when the open or close flight has finished (at once under reduced motion). */
  onMorphEnd?: (phase: "open" | "close") => void;
  /** Runs when focus moves into the panel; `preventDefault()` keeps Radix from choosing the element. */
  onOpenAutoFocus?: (event: Event) => void;
  /** Runs when focus is handed back; `preventDefault()` keeps the default (the trigger, or whatever had focus). */
  onCloseAutoFocus?: (event: Event) => void;
  /** Classes of the panel. */
  className?: string;
  /** Classes of the scrim. */
  overlayClassName?: string;
  /** The panel content. Parts marked `data-morph-fade` appear late and go early. */
  children?: React.ReactNode;
}

const sizeClass: Record<MorphDialogSize, string> = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" };
const layoutClass: Record<MorphDialogVariant, string> = {
  dialog: "place-items-center p-4",
  sheet: "place-items-end p-0",
  auto: "place-items-center p-4 max-sm:place-items-end max-sm:p-0",
};
const frameClass: Record<MorphDialogVariant, string> = {
  dialog: "w-full",
  sheet: "w-full sm:max-w-2xl",
  auto: "w-full max-sm:max-w-none",
};
const panelShape: Record<MorphDialogVariant, string> = {
  dialog: "rounded-box",
  sheet: "rounded-t-2xl rounded-b-none",
  auto: "rounded-box max-sm:rounded-t-2xl max-sm:rounded-b-none",
};

interface PanelProps {
  from: MorphOrigin | null;
  closing: boolean;
  origin: MorphDialogOrigin;
  overlay: React.RefObject<HTMLDivElement | null>;
  onEntered: () => void;
  onExited: () => void;
  variant: MorphDialogVariant;
  size: MorphDialogSize;
  className?: string;
  showClose: boolean;
  children?: React.ReactNode;
}

/** The moving part: runs the opening flight when it mounts and the closing one when `closing` turns on. */
function MorphPanel({ from, closing, origin, overlay, onEntered, onExited, variant, size, className, showClose, children }: PanelProps) {
  const frame = React.useRef<HTMLDivElement | null>(null);
  const panel = React.useRef<HTMLDivElement | null>(null);
  const shadow = React.useRef<HTMLDivElement | null>(null);
  const latest = useLatestRef({ from, origin, onEntered, onExited });

  const targets = () => ({
    frame: frame.current!,
    panel: panel.current!,
    scrim: [shadow.current, overlay.current],
    fade: Array.from(frame.current!.querySelectorAll("[data-morph-fade]")),
  });
  const play = (direction: "in" | "out", done: () => void) => {
    if (!frame.current || !panel.current) return undefined;
    const origin = direction === "out" ? (measureOrigin(latest.current.origin) ?? latest.current.from) : latest.current.from;
    const animations = playRectMorph(targets(), origin, direction);
    if (!animations.length) {
      done();
      return undefined;
    }
    let alive = true;
    Promise.all(animations.map((a) => a.finished)).then(() => alive && done(), () => {});
    return () => {
      alive = false;
      animations.forEach((a) => a.cancel());
    };
  };

  useIsoLayoutEffect(() => play("in", () => latest.current.onEntered()), []); // eslint-disable-line react-hooks/exhaustive-deps
  useIsoLayoutEffect(() => {
    if (!closing) return;
    return play("out", () => latest.current.onExited());
  }, [closing]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={frame} data-slot="morph-dialog-frame" className={cn("pointer-events-auto relative", frameClass[variant], sizeClass[size], closing && "pointer-events-none")}>
      <div ref={shadow} aria-hidden="true" className={cn("pointer-events-none absolute inset-0 shadow-2xl", panelShape[variant])} />
      <div
        ref={panel}
        data-slot="morph-dialog-panel"
        className={cn(
          "relative flex max-h-[calc(100dvh-2rem)] min-w-0 flex-col overflow-hidden border border-border bg-dialog text-foreground max-sm:pb-[env(safe-area-inset-bottom)]",
          panelShape[variant],
          className
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">{children}</div>
        {showClose && (
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon-sm" className="absolute end-3 top-3 z-10 text-muted-foreground hover:text-foreground" aria-label="Close">
              <RiCloseLine aria-hidden="true" />
            </Button>
          </DialogPrimitive.Close>
        )}
      </div>
    </div>
  );
}

/**
 * A dialog (or bottom sheet) that grows out of the rectangle of the thing that opened it and shrinks back into it. The panel is
 * clipped to the origin's box and its radius and slides onto its final place (Web Animations on the spring token, nothing is
 * scaled, so text never stretches); the scrim, the shadow and the parts marked `data-morph-fade` appear late and go early.
 * It is a Radix Dialog underneath: focus is trapped and handed back on close (to the `trigger`, or to whatever had it), Escape,
 * the close button and a press on the scrim close it, and the panel stays mounted until the closing flight ends. Reduced motion
 * (or no `animate`) means no flight at all. Pass `origin` (an element, a ref or a rect), or use `ExpandCard` for a card that is
 * its own origin. Start the panel's content with the same face as the origin and the flight reads as one object.
 */
export function MorphDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  origin,
  title,
  description,
  showTitle = false,
  variant = "auto",
  size = "md",
  showClose = true,
  trigger,
  onMorphEnd,
  onOpenAutoFocus,
  onCloseAutoFocus,
  className,
  overlayClassName,
  children,
}: MorphDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  // The dialog stays mounted through its closing flight; the origin is measured in the render that opens it, before anything changes.
  const [state, setState] = React.useState<{ mounted: boolean; from: MorphOrigin | null }>(() => ({ mounted: open, from: open ? measureOrigin(origin) : null }));
  if (open && !state.mounted) setState({ mounted: true, from: measureOrigin(origin) });
  const closing = state.mounted && !open;
  const forcedDir = React.useContext(DirectionContext);
  const overlay = React.useRef<HTMLDivElement | null>(null);
  const latest = useLatestRef({ onMorphEnd });
  const returnFocus = useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus });
  const onExited = React.useCallback(() => {
    setState((s) => (s.mounted ? { mounted: false, from: s.from } : s));
    latest.current.onMorphEnd?.("close");
  }, [latest]);
  const onEntered = React.useCallback(() => latest.current.onMorphEnd?.("open"), [latest]);

  return (
    <DialogPrimitive.Root open={state.mounted} onOpenChange={setOpen}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay ref={overlay} data-slot="morph-dialog-overlay" className={cn("fixed inset-0 z-50 bg-overlay backdrop-blur-[2px]", overlayClassName)} />
        <DialogPrimitive.Content
          data-slot="morph-dialog"
          dir={state.from?.dir ?? forcedDir}
          data-closing={closing ? "true" : undefined}
          {...(description ? null : { "aria-describedby": undefined })}
          className={cn("pointer-events-none fixed inset-0 z-50 grid outline-none", layoutClass[variant])}
          {...returnFocus}
          onPointerDown={(event) => {
            // The panel is a child of this full-screen layer, so a press on the empty part of it is a press on the scrim.
            if (event.target === event.currentTarget && !closing) setOpen(false);
          }}
        >
          <DialogPrimitive.Title className={showTitle ? "px-4 pt-4 text-lg font-semibold leading-tight tracking-tight" : "sr-only"}>{title}</DialogPrimitive.Title>
          {description && <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>}
          <MorphPanel from={state.from} closing={closing} origin={origin} overlay={overlay} onEntered={onEntered} onExited={onExited} variant={variant} size={size} className={className} showClose={showClose}>
            {children}
          </MorphPanel>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export interface ExpandCardProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title" | "children" | "onToggle"> {
  /** The collapsed card face. It is shown again at the top of the expanded panel (unless `repeatFace` is false), so keep it start-aligned. */
  children: React.ReactNode;
  /** What the expanded panel shows below the face. A function gets `close`. */
  detail: React.ReactNode | ((api: { close: () => void }) => React.ReactNode);
  /** Accessible name of the expanded dialog (the visible title is in the face). */
  title: string;
  /** Accessible description of the dialog. */
  description?: string;
  /** Whether the dialog is open (controlled). */
  open?: boolean;
  /** Start open (uncontrolled). */
  defaultOpen?: boolean;
  /** Asked to open or close: a press on the card, Escape, the close button or the scrim. */
  onOpenChange?: (open: boolean) => void;
  /** `"dialog"` is centred, `"sheet"` docks to the bottom edge, `"auto"` is a sheet below the `sm` breakpoint. Default "auto". */
  variant?: MorphDialogVariant;
  /** Width of the panel: sm, md or lg. Default "md". */
  size?: MorphDialogSize;
  /** Draw the face again at the top of the panel, which is what makes the morph read as one object. The copy is hidden from assistive technology and inert, so the detail must carry what the face says. Default true. */
  repeatFace?: boolean;
  /** The close button at the top end of the panel. Default true. */
  showClose?: boolean;
  /** Classes of the expanded panel. */
  panelClassName?: string;
  /** Runs when the open or close flight has finished. */
  onMorphEnd?: (phase: "open" | "close") => void;
}

/**
 * A card that grows into its dialog: the card is the button that opens a `MorphDialog` and also the origin it flies out of and
 * back into. While the dialog is open the card is hidden (it comes back as the panel lands on it). The card is a native button
 * with `aria-haspopup="dialog"`; its content may use blocks. Controlled with `open` / `defaultOpen` / `onOpenChange`.
 */
export const ExpandCard = React.forwardRef<HTMLButtonElement, ExpandCardProps>(function ExpandCard(
  { children, detail, title, description, open: openProp, defaultOpen = false, onOpenChange, variant, size, repeatFace = true, showClose, panelClassName, onMorphEnd, className, ...props },
  forwardedRef
) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const card = React.useRef<HTMLButtonElement | null>(null);
  const setRefs = useMergedRefs(card, forwardedRef);
  const close = React.useCallback(() => setOpen(false), [setOpen]);
  return (
    <MorphDialog
      open={open}
      onOpenChange={setOpen}
      origin={card}
      title={title}
      description={description}
      variant={variant}
      size={size}
      showClose={showClose}
      onMorphEnd={onMorphEnd}
      className={cn("bg-card", panelClassName)}
      trigger={
        <button
          type="button"
          aria-haspopup="dialog"
          data-slot="expand-card"
          data-open={open ? "true" : undefined}
          {...props}
          ref={setRefs}
          className={cn(
            "block w-full min-w-0 rounded-box border border-border bg-card p-4 text-start text-card-foreground shadow-xs transition-shadow hover:shadow-sm disabled:pointer-events-none disabled:opacity-50 data-[open=true]:opacity-0 data-[open=true]:transition-none",
            focusRing,
            className
          )}
        >
          {children}
        </button>
      }
    >
      {repeatFace && (
        <div data-slot="expand-card-face" aria-hidden="true" inert className="p-4 pe-14">
          {children}
        </div>
      )}
      <div data-morph-fade data-slot="expand-card-detail" className={cn("px-4 pb-4 text-sm", !repeatFace && "pt-4 pe-14")}>
        {typeof detail === "function" ? detail({ close }) : detail}
      </div>
    </MorphDialog>
  );
});
ExpandCard.displayName = "ExpandCard";
