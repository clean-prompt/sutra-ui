import * as React from "react";
import { Dialog as DialogPrimitive, AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { RiCloseLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { normalizeTone, type Tone, type ToneInput } from "../lib/tone";
import { Button, type ButtonProps } from "./button";
import { useControllableState } from "../hooks/use-controllable-state";
import { useAsyncAction } from "../hooks/use-async-action";
import { useReturnFocus } from "../hooks/use-return-focus";

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

const overlayClass =
  "fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0";

export const dialogContentVariants = cva(
  [
    "fixed z-50 flex flex-col gap-4 border border-border bg-dialog p-6 text-foreground shadow-2xl outline-none duration-200",
    // Mobile: bottom sheet
    "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]",
    // Desktop: centered modal
    "sm:inset-x-auto sm:bottom-auto sm:start-1/2 sm:top-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-full sm:-translate-x-1/2 rtl:sm:translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-6",
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
    "max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:slide-out-to-bottom",
    "sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95",
  ],
  {
    variants: {
      size: {
        sm: "sm:max-w-sm",
        md: "sm:max-w-lg",
        lg: "sm:max-w-2xl",
        xl: "sm:max-w-4xl",
        full: "sm:h-[calc(100dvh-2rem)] sm:max-w-[calc(100vw-2rem)]",
      },
    },
    defaultVariants: { size: "md" },
  }
);

const closeButtonClass = "absolute end-3 top-3 text-muted-foreground hover:text-foreground";

const MobileHandle = () => (
  <span aria-hidden className="mx-auto -mt-3 mb-1 block h-1 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" />
);

/** Canonical `Tone` values; legacy spellings (`default`, `danger`, …) are accepted as deprecated aliases. */
export type DialogTone = ToneInput;

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-foreground ring-muted/50",
  primary: "bg-primary-soft text-primary ring-primary-soft/50",
  success: "bg-success-soft text-success ring-success-soft/50",
  warning: "bg-warning-soft text-warning-soft-foreground ring-warning-soft/50",
  destructive: "bg-destructive-soft text-destructive ring-destructive-soft/50",
  info: "bg-info-soft text-info ring-info-soft/50",
};

/** Featured icon in a soft ringed circle. */
function FeaturedIcon({ icon, tone = "primary" }: { icon: React.ReactNode; tone?: DialogTone }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mb-3 inline-flex size-11 shrink-0 items-center justify-center rounded-full ring-[6px] [&_svg]:size-5",
        toneClass[normalizeTone(tone, "primary")]
      )}
    >
      {icon}
    </span>
  );
}

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Featured icon shown above the title. */
  icon?: React.ReactNode;
  tone?: DialogTone;
  align?: "start" | "center";
}

function renderHeader(
  { className, icon, tone, align = "start", children, ...props }: DialogHeaderProps,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-1.5 pe-6",
        align === "center" ? "items-center pe-0 text-center" : "items-start text-start",
        className
      )}
      {...props}
    >
      {icon && <FeaturedIcon icon={icon} tone={tone} />}
      {children}
    </div>
  );
}

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Separate the footer with a top border and subtle background. */
  bordered?: boolean;
}

function renderFooter({ className, bordered, ...props }: DialogFooterProps, ref: React.ForwardedRef<HTMLDivElement>) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col-reverse gap-2 max-sm:[&>*]:w-full sm:flex-row sm:items-center sm:justify-end",
        bordered && "-mx-6 -mb-6 mt-2 border-t border-border bg-subtle px-6 py-4 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-b-2xl",
        className
      )}
      {...props}
    />
  );
}

const titleClass = "text-lg font-semibold leading-tight tracking-tight text-foreground";
const descriptionClass = "text-sm text-muted-foreground";
const bodyClass = "-mx-6 min-h-0 flex-1 overflow-y-auto px-6 text-sm scrollbar-thin";

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

/**
 * Modal dialog root.
 *
 * Dialog vs Sheet vs Drawer: `Dialog` is a centred modal (a bottom sheet on phones) for a focused task or decision;
 * `Sheet` slides in from an edge for navigation, detail or filter panels; `Drawer` (`./drawer`) is a touch-first
 * bottom sheet with drag-to-dismiss and snap points. Use `AlertDialog` / `ConfirmDialog` for interrupting confirmations.
 */
export const Dialog = DialogPrimitive.Root;
/** Element that opens the dialog. */
export const DialogTrigger = DialogPrimitive.Trigger;
/** Portal for custom compositions. */
export const DialogPortal = DialogPrimitive.Portal;
/** Closes the dialog when clicked. */
export const DialogClose = DialogPrimitive.Close;

/** Dimmed, blurred backdrop. */
export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => <DialogPrimitive.Overlay ref={ref} className={cn(overlayClass, className)} {...props} />);
DialogOverlay.displayName = "DialogOverlay";

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  /** Show the top-right close button. Default true. */
  showClose?: boolean;
  overlayClassName?: string;
}

/** Dialog panel: centered modal on desktop, bottom sheet on mobile. */
export const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, size, showClose = true, overlayClassName, children, onOpenAutoFocus, onCloseAutoFocus, ...props }, ref) => {
    const returnFocus = useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus });
    return (
      <DialogPrimitive.Portal>
        <DialogOverlay className={overlayClassName} />
        <DialogPrimitive.Content ref={ref} className={cn(dialogContentVariants({ size }), className)} {...props} {...returnFocus}>
          <MobileHandle />
          {children}
          {showClose && (
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" className={closeButtonClass} aria-label="Close">
                <RiCloseLine aria-hidden />
              </Button>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  }
);
DialogContent.displayName = "DialogContent";

/** Title block with optional featured icon. */
export const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(renderHeader);
DialogHeader.displayName = "DialogHeader";

/** Accessible dialog title. */
export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn(titleClass, className)} {...props} />);
DialogTitle.displayName = "DialogTitle";

/** Accessible dialog description. */
export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn(descriptionClass, className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

/** Scrollable main content area. */
export const DialogBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn(bodyClass, className)} {...props} />
);
DialogBody.displayName = "DialogBody";

/** Action row; stacks full-width on mobile. */
export const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(renderFooter);
DialogFooter.displayName = "DialogFooter";

/* ------------------------------------------------------------------ */
/* AlertDialog                                                         */
/* ------------------------------------------------------------------ */

/** Interrupting confirmation dialog root (no outside-click dismiss). */
export const AlertDialog = AlertDialogPrimitive.Root;
/** Element that opens the alert dialog. */
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export interface AlertDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  overlayClassName?: string;
}

/** Alert dialog panel (defaults to the `sm` size). */
export const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  AlertDialogContentProps
>(({ className, size = "sm", overlayClassName, children, onOpenAutoFocus, onCloseAutoFocus, ...props }, ref) => {
  const returnFocus = useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus });
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className={cn(overlayClass, overlayClassName)} />
      <AlertDialogPrimitive.Content ref={ref} className={cn(dialogContentVariants({ size }), className)} {...props} {...returnFocus}>
        <MobileHandle />
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
});
AlertDialogContent.displayName = "AlertDialogContent";

/** Title block with optional featured icon. */
export const AlertDialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>((props, ref) =>
  renderHeader({ ...props, className: cn("pe-0", props.className) }, ref)
);
AlertDialogHeader.displayName = "AlertDialogHeader";

/** Accessible alert title. */
export const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => <AlertDialogPrimitive.Title ref={ref} className={cn(titleClass, className)} {...props} />);
AlertDialogTitle.displayName = "AlertDialogTitle";

/** Accessible alert description. */
export const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description ref={ref} className={cn(descriptionClass, className)} {...props} />
));
AlertDialogDescription.displayName = "AlertDialogDescription";

/** Action row; stacks full-width on mobile. */
export const AlertDialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(renderFooter);
AlertDialogFooter.displayName = "AlertDialogFooter";

/** Confirming action button (closes the dialog). */
export const AlertDialogAction = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", ...props }, ref) => (
    <AlertDialogPrimitive.Action asChild>
      <Button ref={ref} variant={variant} {...props} />
    </AlertDialogPrimitive.Action>
  )
);
AlertDialogAction.displayName = "AlertDialogAction";

/** Dismissing button (receives initial focus). */
export const AlertDialogCancel = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", ...props }, ref) => (
    <AlertDialogPrimitive.Cancel asChild>
      <Button ref={ref} variant={variant} {...props} />
    </AlertDialogPrimitive.Cancel>
  )
);
AlertDialogCancel.displayName = "AlertDialogCancel";

export interface ConfirmDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog (wrapped with `asChild`). */
  trigger?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  /** `destructive` turns the icon and confirm button red. Default `neutral`. `default` is a deprecated alias of `neutral`. */
  tone?: ToneInput;
  icon?: React.ReactNode;
  /** May return a promise; the confirm button shows a spinner until it settles. Throw to keep the dialog open. */
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  /** Extra content between the header and the footer. */
  children?: React.ReactNode;
  className?: string;
}

/** Ready-made confirmation dialog with async-aware confirm. */
export function ConfirmDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone: toneProp,
  icon,
  onConfirm,
  onCancel,
  children,
  className,
}: ConfirmDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  // A rejected confirm keeps the dialog open so the caller can surface the error.
  const confirm = useAsyncAction(async () => {
    await onConfirm?.();
    setOpen(false);
  });
  const loading = confirm.busy;
  const tone = normalizeTone(toneProp);

  const handleConfirm = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    void confirm.run();
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent className={className}>
        <AlertDialogHeader icon={icon} tone={tone === "neutral" ? "primary" : tone}>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter className="sm:pt-2">
          <AlertDialogCancel disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={tone === "destructive" ? "destructive" : "primary"}
            loading={loading}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
ConfirmDialog.displayName = "ConfirmDialog";

/* ------------------------------------------------------------------ */
/* Sheet                                                               */
/* ------------------------------------------------------------------ */

/**
 * Edge-anchored panel root (a Dialog).
 *
 * Dialog vs Sheet vs Drawer: `Sheet` slides in from `side` (left, right, top, bottom) and stays put; `Dialog` is a
 * centred modal; `Drawer` is a touch-first bottom sheet with a grabber, drag-to-dismiss and snap points, built on
 * the Sheet parts below.
 */
export const Sheet = DialogPrimitive.Root;
/** Element that opens the sheet. */
export const SheetTrigger = DialogPrimitive.Trigger;
/** Closes the sheet when clicked. */
export const SheetClose = DialogPrimitive.Close;

export const sheetContentVariants = cva(
  [
    "fixed z-50 flex flex-col gap-4 bg-dialog p-6 text-foreground shadow-2xl outline-none",
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-300 data-[state=closed]:duration-200 ease-out-quart",
    // Stacking: a sheet that has another sheet open on top of it steps back toward its edge.
    "transition-[scale,opacity] data-[nested]:scale-[0.96] data-[nested]:opacity-60",
  ],
  {
    variants: {
      side: {
        // rtl-physical x3: side=left and side=right name a physical edge (side=start and side=end are the logical ones)
        left: "inset-y-0 left-0 h-full w-[85vw] max-w-sm origin-left border-r border-border data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
        right:
          "inset-y-0 right-0 h-full w-[85vw] max-w-sm origin-right border-l border-border data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
        top: "inset-x-0 top-0 max-h-[90dvh] origin-top border-b border-border rounded-b-2xl data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top",
        bottom:
          "inset-x-0 bottom-0 max-h-[90dvh] origin-bottom border-t border-border rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))] data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
        start:
          "inset-y-0 start-0 h-full w-[85vw] max-w-sm origin-left rtl:origin-right border-e border-border data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left rtl:data-[state=open]:slide-in-from-right rtl:data-[state=closed]:slide-out-to-right",
        end: "inset-y-0 end-0 h-full w-[85vw] max-w-sm origin-right rtl:origin-left border-s border-border data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right rtl:data-[state=open]:slide-in-from-left rtl:data-[state=closed]:slide-out-to-left",
      },
    },
    defaultVariants: { side: "right" },
  }
);

export type SheetSide = "left" | "right" | "top" | "bottom" | "start" | "end";
export type SheetSize = "auto" | "sm" | "md" | "lg" | "half" | "full";

const sheetWidth: Record<SheetSize, string> = {
  auto: "w-auto min-w-[min(18rem,100vw)] max-w-[90vw]",
  sm: "w-[85vw] max-w-sm",
  md: "w-[90vw] max-w-lg",
  lg: "w-[92vw] max-w-2xl",
  half: "w-[max(50vw,min(22rem,100vw))] max-w-none",
  full: "w-screen max-w-none rounded-none border-0",
};
const sheetHeight: Record<SheetSize, string> = {
  auto: "h-auto max-h-[90dvh]",
  sm: "h-[min(20rem,90dvh)]",
  md: "h-[min(32rem,90dvh)]",
  lg: "h-[min(48rem,90dvh)]",
  half: "h-[50dvh]",
  full: "h-dvh max-h-none rounded-none border-0",
};
/** Detached panels float 0.5rem off the edges with every corner rounded. */
const sheetDetached: Record<SheetSide, string> = {
  // rtl-physical x2: side=left and side=right name a physical edge (side=start and side=end are the logical ones)
  left: "inset-y-2 left-2 h-auto max-h-[calc(100dvh-1rem)] rounded-2xl border",
  right: "inset-y-2 right-2 h-auto max-h-[calc(100dvh-1rem)] rounded-2xl border",
  start: "inset-y-2 start-2 h-auto max-h-[calc(100dvh-1rem)] rounded-2xl border",
  end: "inset-y-2 end-2 h-auto max-h-[calc(100dvh-1rem)] rounded-2xl border",
  top: "inset-x-2 top-2 rounded-2xl border",
  bottom: "inset-x-2 bottom-2 rounded-2xl border pb-6",
};

function sheetLayoutClass(side: SheetSide, size: SheetSize | undefined, detached: boolean) {
  const horizontal = side === "left" || side === "right" || side === "start" || side === "end";
  const sizeClass = size ? (horizontal ? sheetWidth[size] : sheetHeight[size]) : undefined;
  const full = size === "full";
  return cn(
    sizeClass,
    detached && sheetDetached[side],
    // A full-size detached panel keeps its 0.5rem margin.
    detached && full && (horizontal ? "w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)]" : "h-[calc(100dvh-1rem)] max-h-none"),
    detached && full && "rounded-2xl border"
  );
}

/** Rendered inside the panel only while it is mounted: tells the sheet underneath (the parent context) it has company. */
function SheetStackRegistrar() {
  const parent = React.useContext(SheetStackContext);
  React.useEffect(() => parent?.register(), [parent]);
  return null;
}

interface SheetStackValue {
  /** Called by a nested sheet while it is mounted; returns the cleanup. */
  register: () => () => void;
}

const SheetStackContext = React.createContext<SheetStackValue | null>(null);

export interface SheetContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "children">,
    Omit<VariantProps<typeof sheetContentVariants>, "side"> {
  children?: React.ReactNode;
  /**
   * Edge the panel slides from. `start` and `end` follow the document direction (left and right in LTR); `left` and
   * `right` are fixed.
   */
  side?: SheetSide;
  /** Panel width (left, right, start, end) or height (top, bottom). Without it: 24rem wide, or as tall as its content. */
  size?: SheetSize;
  /** Set to `false` to keep the sheet open on Escape and outside clicks, and to hide the built-in close button. */
  dismissible?: boolean;
  /** Float the panel off the screen edges with rounded corners. */
  detached?: boolean;
  /** Frosted panel: translucent surface with a backdrop blur, so the page shows through. */
  blur?: boolean;
  /** Show the close button (default: when `dismissible`). */
  showClose?: boolean;
  overlayClassName?: string;
}

/**
 * Sheet panel sliding in from `side`. A sheet opened inside another sheet stacks on top of it: the one underneath
 * scales down and fades (`data-nested`), and the reduced-motion net removes the movement.
 */
export const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  (
    {
      className,
      side = "right",
      size,
      dismissible = true,
      detached = false,
      blur = false,
      showClose,
      overlayClassName,
      children,
      onOpenAutoFocus,
      onCloseAutoFocus,
      onEscapeKeyDown,
      onInteractOutside,
      ...props
    },
    ref
  ) => {
    const returnFocus = useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus });
    const [nested, setNested] = React.useState(0);
    const stack = React.useMemo<SheetStackValue>(
      () => ({
        register: () => {
          setNested((n) => n + 1);
          return () => setNested((n) => Math.max(0, n - 1));
        },
      }),
      []
    );
    const guard =
      <E extends Event>(handler?: (event: E) => void) =>
      (event: E) => {
        handler?.(event);
        if (!dismissible && !event.defaultPrevented) event.preventDefault();
      };
    const closeVisible = showClose ?? dismissible;
    return (
      <DialogPrimitive.Portal>
        <DialogOverlay className={overlayClassName} />
        <DialogPrimitive.Content
          ref={ref}
          data-slot="sheet-content"
          data-side={side}
          data-detached={detached ? "" : undefined}
          data-nested={nested > 0 ? "" : undefined}
          className={cn(
            sheetContentVariants({ side }),
            sheetLayoutClass(side, size, detached),
            blur && "bg-dialog/75 backdrop-blur-xl backdrop-saturate-150",
            className
          )}
          {...props}
          {...returnFocus}
          onEscapeKeyDown={guard(onEscapeKeyDown)}
          onInteractOutside={guard(onInteractOutside)}
        >
          <SheetStackRegistrar />
          <SheetStackContext.Provider value={stack}>{children}</SheetStackContext.Provider>
          {closeVisible && (
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" className={cn(closeButtonClass, focusRing)} aria-label="Close">
                <RiCloseLine aria-hidden />
              </Button>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  }
);
SheetContent.displayName = "SheetContent";

/** Sheet title block. */
export const SheetHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex flex-col gap-1.5 pe-8", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

/** Accessible sheet title. */
export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn(titleClass, className)} {...props} />);
SheetTitle.displayName = "SheetTitle";

/** Accessible sheet description. */
export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn(descriptionClass, className)} {...props} />
));
SheetDescription.displayName = "SheetDescription";

/** Scrollable sheet content area. */
export const SheetBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn(bodyClass, className)} {...props} />
);
SheetBody.displayName = "SheetBody";

/** Sheet action row, pinned to the bottom. */
export const SheetFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
);
SheetFooter.displayName = "SheetFooter";
