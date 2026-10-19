import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { RiCloseLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";

export const closeButtonVariants = cva("inline-flex shrink-0 items-center justify-center", {
  variants: {
    /**
     * `control` (default): a standalone dismiss button with press, disabled and focus styling.
     * `pill`: the small round remove × inside a chip, tag or badge; the pill supplies the rest.
     */
    shape: {
      control: [
        "select-none rounded-control",
        "transition-[color,background-color,transform,translate,scale,rotate] duration-150 active:scale-95",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        focusRing,
      ],
      pill: "rounded-full",
    },
    variant: {
      ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
      subtle: "bg-muted text-muted-foreground hover:bg-border hover:text-foreground",
      inverse:
        "text-inverse-foreground/70 hover:bg-inverse-foreground/10 hover:text-inverse-foreground focus-visible:ring-inverse-foreground/40",
      /** Inherits the pill's colour, dimmed until hover (add the hover fill per pill). */
      current: "cursor-pointer opacity-60 transition-[opacity,background-color] hover:opacity-100",
      /** Muted icon that darkens on a border-coloured hover fill. */
      muted: "text-muted-foreground transition-colors hover:bg-border hover:text-foreground",
    },
    size: {
      "3xs": "size-4 [&_svg]:size-3",
      "2xs": "size-5 [&_svg]:size-3.5",
      xs: "size-6 [&_svg]:size-3.5",
      sm: "size-7 [&_svg]:size-4",
      md: "size-8 [&_svg]:size-[18px]",
      lg: "size-9 [&_svg]:size-5",
    },
  },
  defaultVariants: { shape: "control", variant: "ghost", size: "md" },
});

export interface CloseButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof closeButtonVariants> {}

/** Icon-only "X" button for dismissing dialogs, alerts and toasts, and (`shape="pill"`) removing a chip or tag. */
export const CloseButton = React.forwardRef<HTMLButtonElement, CloseButtonProps>(
  ({ className, shape, variant, size, type, children, "aria-label": ariaLabel, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={ariaLabel ?? "Close"}
      className={cn(closeButtonVariants({ shape, variant, size }), className)}
      {...props}
    >
      {children ?? <RiCloseLine aria-hidden />}
    </button>
  )
);
CloseButton.displayName = "CloseButton";
