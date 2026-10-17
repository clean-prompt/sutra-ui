import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { Kbd } from "./typography";
import { ShortcutKeys, isShortcutKeys } from "./shortcuts";

const TooltipProviderPresence = React.createContext(false);

/** True when rendered inside a `TooltipProvider`. */
export function useHasTooltipProvider() {
  return React.useContext(TooltipProviderPresence);
}

/** Shares hover delay between tooltips. Mount once near the app root. */
export const TooltipProvider = ({
  delayDuration = 200,
  skipDelayDuration = 300,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>) => (
  <TooltipProviderPresence.Provider value={true}>
    <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration} {...props} />
  </TooltipProviderPresence.Provider>
);
TooltipProvider.displayName = "TooltipProvider";

/**
 * Tooltip root. Uses the nearest `TooltipProvider` (so skip-delay works across tooltips)
 * and falls back to its own provider when there is none.
 */
export function Tooltip({ delayDuration, ...props }: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) {
  const hasProvider = React.useContext(TooltipProviderPresence);
  if (hasProvider) return <TooltipPrimitive.Root delayDuration={delayDuration} {...props} />;
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration ?? 200}>
      <TooltipPrimitive.Root {...props} />
    </TooltipPrimitive.Provider>
  );
}
Tooltip.displayName = "Tooltip";

/** Element that opens the tooltip on hover/focus. */
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const tooltipContentVariants = cva(
  [
    "z-50 max-w-xs overflow-hidden rounded-md px-2.5 py-1.5 text-xs font-medium leading-snug text-balance",
    "origin-(--radix-tooltip-content-transform-origin) animate-in fade-in-0 zoom-in-95",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
    "data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
  ],
  {
    variants: {
      variant: {
        inverse: "bg-inverse text-inverse-foreground shadow-md",
        light: "border border-border bg-popover text-popover-foreground shadow-lg",
      },
    },
    defaultVariants: { variant: "inverse" },
  }
);

export interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipContentVariants> {
  /** Show the pointing arrow. Default true. */
  arrow?: boolean;
}

/** Floating tooltip bubble (dark inverse by default). */
export const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, TooltipContentProps>(
  ({ className, variant, sideOffset = 6, arrow = true, children, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(tooltipContentVariants({ variant }), className)}
        {...props}
      >
        {children}
        {arrow && (
          <TooltipPrimitive.Arrow
            width={10}
            height={5}
            className={cn(
              variant === "light"
                ? "fill-popover drop-shadow-[0_1px_0_var(--border)]"
                : "fill-inverse"
            )}
          />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
);
TooltipContent.displayName = "TooltipContent";

export interface SimpleTooltipProps
  extends Omit<React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>, "children"> {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: TooltipContentProps["side"];
  align?: TooltipContentProps["align"];
  variant?: TooltipContentProps["variant"];
  /**
   * Keyboard shortcut. A keys spec ("mod+k", "g t") renders platform-aware chips; a glyph string ("⌘K")
   * or an array (["⌘", "K"]) renders one Kbd per entry.
   */
  shortcut?: string | string[];
  contentClassName?: string;
  /** Skip the tooltip entirely (renders children only). */
  disabled?: boolean;
}

/** One-line tooltip wrapper: `<SimpleTooltip content="Save" shortcut="⌘S"><Button/></SimpleTooltip>`. */
export function SimpleTooltip({
  content,
  children,
  side = "top",
  align,
  variant,
  shortcut,
  contentClassName,
  disabled,
  ...rootProps
}: SimpleTooltipProps) {
  if (disabled || content == null || content === false) return <>{children}</>;
  const spec = isShortcutKeys(shortcut) ? shortcut : null;
  const keys = shortcut == null || spec ? [] : Array.isArray(shortcut) ? shortcut : [shortcut];
  const kbdClass = cn(
    variant === "light" ? "" : "border-inverse-foreground/20 bg-inverse-foreground/10 text-inverse-foreground/80 shadow-none"
  );
  return (
    <Tooltip {...rootProps}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipContent side={side} align={align} variant={variant} className={contentClassName}>
        <span className="inline-flex items-center gap-2">
          <span>{content}</span>
          {spec && <ShortcutKeys keys={spec} kbdClassName={kbdClass} />}
          {keys.length > 0 && (
            <span className="inline-flex items-center gap-0.5">
              {keys.map((k, i) => (
                <Kbd
                  key={i}
                  className={cn(
                    variant === "light"
                      ? ""
                      : "border-inverse-foreground/20 bg-inverse-foreground/10 text-inverse-foreground/80 shadow-none"
                  )}
                >
                  {k}
                </Kbd>
              ))}
            </span>
          )}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
SimpleTooltip.displayName = "SimpleTooltip";
