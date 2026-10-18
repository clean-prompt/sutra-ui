import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, focusRing } from "../lib/cn";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium",
    "transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    focusRing,
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-xs shadow-inner-highlight hover:bg-primary-hover",
        secondary:
          "border border-border bg-background text-foreground shadow-xs hover:bg-muted",
        tertiary: "bg-muted text-foreground hover:bg-border",
        soft: "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/70",
        ghost: "text-foreground hover:bg-accent",
        outline:
          "border border-primary/40 text-primary-soft-foreground hover:bg-primary-soft",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive-hover",
        "destructive-soft":
          "bg-destructive-soft text-destructive-soft-foreground hover:bg-destructive-soft/70",
        inverse: "bg-inverse text-inverse-foreground hover:bg-inverse/90",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        xs: "h-7 px-2.5 text-xs [&_svg]:size-3.5",
        sm: "h-8 px-3 text-sm [&_svg]:size-4",
        md: "h-9 px-3.5 text-sm [&_svg]:size-4",
        lg: "h-10 px-4 text-sm [&_svg]:size-[18px]",
        xl: "h-12 px-5 text-base [&_svg]:size-5",
        "icon-xs": "size-7 [&_svg]:size-3.5",
        "icon-sm": "size-8 [&_svg]:size-4",
        icon: "size-9 [&_svg]:size-4",
        "icon-lg": "size-10 [&_svg]:size-[18px]",
        "icon-xl": "size-12 [&_svg]:size-5",
      },
      fullWidth: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. a link) while keeping button styles. */
  asChild?: boolean;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild,
      loading,
      leadingIcon,
      trailingIcon,
      disabled,
      children,
      type,
      ...props
    },
    ref
  ) => {
    const classes = cn(buttonVariants({ variant, size, fullWidth }), className);
    if (asChild) {
      // The child (often a link) can't take `disabled`, so mark it with aria-disabled and swallow
      // activation in the capture phase, before the child's own handler (e.g. a router Link) runs.
      const inert = disabled || loading;
      return (
        <Slot.Root
          ref={ref}
          className={classes}
          aria-disabled={inert || undefined}
          aria-busy={loading || undefined}
          data-disabled={inert ? "" : undefined}
          tabIndex={inert ? -1 : undefined}
          {...props}
          onClickCapture={
            inert
              ? (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                }
              : props.onClickCapture
          }
        >
          {loading ? <Spinner size="sm" className="text-current" /> : leadingIcon}
          <Slot.Slottable>{children}</Slot.Slottable>
          {trailingIcon}
        </Slot.Root>
      );
    }
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Spinner size="sm" className="text-current" /> : leadingIcon}
        {children}
        {trailingIcon}
      </button>
    );
  }
);
Button.displayName = "Button";
