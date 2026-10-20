import * as React from "react";
import { Popover as PopoverPrimitive, HoverCard as HoverCardPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { useFloatingSide, type FloatingSide } from "./floating-side-internal";

const floatingMotion = [
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
].join(" ");

interface PopoverLabelContextValue {
  titleId: string;
  descriptionId: string;
  /** Called by PopoverTitle / PopoverDescription while mounted with the id they render (null on unmount). */
  setTitle: (id: string | null) => void;
  setDescription: (id: string | null) => void;
}
const PopoverLabelContext = React.createContext<PopoverLabelContextValue | null>(null);

/** Popover root. */
export const Popover = PopoverPrimitive.Root;
/** Element that toggles the popover. */
export const PopoverTrigger = PopoverPrimitive.Trigger;
/** Positions the popover against an element other than the trigger. */
export const PopoverAnchor = PopoverPrimitive.Anchor;
/** Closes the popover when clicked. */
export const PopoverClose = PopoverPrimitive.Close;

export const popoverContentVariants = cva(
  [
    "z-50 rounded-box border border-border bg-popover text-popover-foreground shadow-lg outline-none",
    "origin-(--radix-popover-content-transform-origin) max-w-[calc(100vw-1rem)]",
    floatingMotion,
  ],
  {
    variants: {
      /**
       * Panel width: `sm` 14rem, `md` 18rem, `lg` 24rem or `auto` (content width).
       * @default "md"
       */
      size: { sm: "w-56", md: "w-72", lg: "w-96", auto: "w-auto" },
      /**
       * Adds inner padding; turn it off for content that supplies its own (lists, menus).
       * @default true
       */
      padded: { true: "p-4", false: "" },
    },
    defaultVariants: { size: "md", padded: true },
  }
);

export interface PopoverContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>, "side">,
    VariantProps<typeof popoverContentVariants> {
  /**
   * Side of the trigger the panel opens on. `start` and `end` follow the reading direction (left and right in LTR, swapped in
   * RTL, read from `DirectionProvider` or `<html dir>`); `left` and `right` stay physical. It flips when there is no room.
   * @default "bottom"
   */
  side?: FloatingSide;
  /** Render the pointing arrow. */
  arrow?: boolean;
  /** Skip the portal (e.g. inside a dialog with its own stacking). */
  disablePortal?: boolean;
}

/** Floating panel. Sizes sm/md/lg set the width; set `padded={false}` when composing Header/Body/Footer. */
export const PopoverContent = React.forwardRef<React.ElementRef<typeof PopoverPrimitive.Content>, PopoverContentProps>(
  ({ className, size, padded, side, align = "center", sideOffset = 6, arrow, disablePortal, children, ...props }, ref) => {
    const physicalSide = useFloatingSide(side);
    const baseId = React.useId();
    const [titleId, setTitle] = React.useState<string | null>(null);
    const [descriptionId, setDescription] = React.useState<string | null>(null);
    const labels = React.useMemo<PopoverLabelContextValue>(
      () => ({ titleId: `${baseId}-title`, descriptionId: `${baseId}-description`, setTitle, setDescription }),
      [baseId]
    );
    const content = (
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(popoverContentVariants({ size, padded }), className)}
        {...props}
        side={physicalSide}
        // A mounted PopoverTitle / PopoverDescription name the dialog unless the caller already did.
        aria-labelledby={props["aria-labelledby"] ?? (props["aria-label"] ? undefined : (titleId ?? undefined))}
        aria-describedby={props["aria-describedby"] ?? descriptionId ?? undefined}
      >
        <PopoverLabelContext.Provider value={labels}>{children}</PopoverLabelContext.Provider>
        {arrow && (
          <PopoverPrimitive.Arrow
            width={12}
            height={6}
            className="fill-popover drop-shadow-[0_1px_0_var(--border)]"
          />
        )}
      </PopoverPrimitive.Content>
    );
    return disablePortal ? content : <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal>;
  }
);
PopoverContent.displayName = "PopoverContent";

/** Top section of a rich popover. */
export const PopoverHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1 px-4 pt-4 pb-2", className)} {...props} />
  )
);
PopoverHeader.displayName = "PopoverHeader";

/** Popover heading. Inside `PopoverContent` it names the dialog (`aria-labelledby`) unless the content has its own label. */
export const PopoverTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, id, ...props }, ref) => {
    const labels = React.useContext(PopoverLabelContext);
    const resolved = id ?? labels?.titleId;
    const setTitle = labels?.setTitle;
    React.useEffect(() => {
      if (!setTitle || !resolved) return;
      setTitle(resolved);
      return () => setTitle(null);
    }, [setTitle, resolved]);
    return (
      <h3 ref={ref} id={resolved} className={cn("text-sm font-semibold leading-tight text-foreground", className)} {...props} />
    );
  }
);
PopoverTitle.displayName = "PopoverTitle";

/** Muted supporting text. Inside `PopoverContent` it describes the dialog (`aria-describedby`). */
export const PopoverDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, id, ...props }, ref) => {
    const labels = React.useContext(PopoverLabelContext);
    const resolved = id ?? labels?.descriptionId;
    const setDescription = labels?.setDescription;
    React.useEffect(() => {
      if (!setDescription || !resolved) return;
      setDescription(resolved);
      return () => setDescription(null);
    }, [setDescription, resolved]);
    return <p ref={ref} id={resolved} className={cn("text-sm text-muted-foreground", className)} {...props} />;
  }
);
PopoverDescription.displayName = "PopoverDescription";

/** Main popover content area. */
export const PopoverBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("px-4 py-2 text-sm", className)} {...props} />
);
PopoverBody.displayName = "PopoverBody";

/** Bottom action row, separated by a border. */
export const PopoverFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "mt-2 flex items-center justify-end gap-2 rounded-b-box border-t border-border bg-subtle px-4 py-3",
        className
      )}
      {...props}
    />
  )
);
PopoverFooter.displayName = "PopoverFooter";

/** Hover card root (preview on hover, e.g. user cards and link previews). */
export const HoverCard = ({
  openDelay = 300,
  closeDelay = 150,
  ...props
}: React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Root>) => (
  <HoverCardPrimitive.Root openDelay={openDelay} closeDelay={closeDelay} {...props} />
);
HoverCard.displayName = "HoverCard";

/** Element that opens the hover card. */
export const HoverCardTrigger = HoverCardPrimitive.Trigger;

export interface HoverCardContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>, "side">,
    VariantProps<typeof popoverContentVariants> {
  /**
   * Side of the trigger the panel opens on. `start` and `end` follow the reading direction (left and right in LTR, swapped in
   * RTL, read from `DirectionProvider` or `<html dir>`); `left` and `right` stay physical. It flips when there is no room.
   * @default "bottom"
   */
  side?: FloatingSide;
  /** Renders the pointing arrow. */
  arrow?: boolean;
}

/** Hover card panel. */
export const HoverCardContent = React.forwardRef<React.ElementRef<typeof HoverCardPrimitive.Content>, HoverCardContentProps>(
  ({ className, size, padded, side, align = "center", sideOffset = 6, arrow, children, ...props }, ref) => {
    const physicalSide = useFloatingSide(side);
    return (
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          ref={ref}
          align={align}
          sideOffset={sideOffset}
          className={cn(
            popoverContentVariants({ size, padded }),
            "origin-(--radix-hover-card-content-transform-origin)",
            className
          )}
          {...props}
          side={physicalSide}
        >
          {children}
          {arrow && (
            <HoverCardPrimitive.Arrow
              width={12}
              height={6}
              className="fill-popover drop-shadow-[0_1px_0_var(--border)]"
            />
          )}
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    );
  }
);
HoverCardContent.displayName = "HoverCardContent";
