import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { RiCloseLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";

export const closeButtonVariants = cva(
  [
    "inline-flex shrink-0 select-none items-center justify-center rounded-control",
    "transition-[color,background-color,transform] duration-150 active:scale-95",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    focusRing,
  ],
  {
    variants: {
      variant: {
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        subtle: "bg-muted text-muted-foreground hover:bg-border hover:text-foreground",
        inverse:
          "text-inverse-foreground/70 hover:bg-inverse-foreground/10 hover:text-inverse-foreground focus-visible:ring-inverse-foreground/40",
      },
      size: {
        xs: "size-6 [&_svg]:size-3.5",
        sm: "size-7 [&_svg]:size-4",
        md: "size-8 [&_svg]:size-[18px]",
        lg: "size-9 [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  }
);

export interface CloseButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof closeButtonVariants> {}

/** Icon-only "X" button for dismissing dialogs, alerts and toasts. */
export const CloseButton = React.forwardRef<HTMLButtonElement, CloseButtonProps>(
  ({ className, variant, size, type, children, "aria-label": ariaLabel, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={ariaLabel ?? "Close"}
      className={cn(closeButtonVariants({ variant, size }), className)}
      {...props}
    >
      {children ?? <RiCloseLine aria-hidden />}
    </button>
  )
);
CloseButton.displayName = "CloseButton";
