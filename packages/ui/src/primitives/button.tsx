import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, focusRing, hitAreaTouch } from "../lib/cn";
import { Spinner, type SpinnerProps } from "./spinner";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium",
    "transition-[color,background-color,border-color,box-shadow,transform,translate,scale,rotate] duration-150 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    focusRing,
  ],
  {
    variants: {
      /**
       * Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`.
       * @default "primary"
       */
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
      /**
       * Button height and padding; `icon-*` sizes are square.
       * @default "md"
       */
      size: {
        xs: "h-7 px-2.5 text-xs [&_svg]:size-3.5",
        sm: "h-8 px-3 text-sm [&_svg]:size-4",
        md: "h-9 px-3.5 text-sm [&_svg]:size-4",
        lg: "h-10 px-4 text-sm [&_svg]:size-[18px]",
        xl: "h-12 rounded-action px-5 text-base [&_svg]:size-5",
        "icon-xs": ["size-7 [&_svg]:size-3.5", hitAreaTouch],
        "icon-sm": ["size-8 [&_svg]:size-4", hitAreaTouch],
        icon: ["size-9 [&_svg]:size-4", hitAreaTouch],
        "icon-lg": ["size-10 [&_svg]:size-[18px]", hitAreaTouch],
        "icon-xl": "size-12 [&_svg]:size-5",
      },
      /** Stretches the button to the width of its container. */
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
  /** Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. */
  spinnerProps?: Partial<SpinnerProps>;
  /** Icon before the label. */
  leadingIcon?: React.ReactNode;
  /** Icon after the label. */
  trailingIcon?: React.ReactNode;
}

/** The standard button. Extra props are spread to the `<button>` (or to the child with `asChild`); icon-only sizes need an `aria-label`. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild,
      loading,
      spinnerProps,
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
          {...props}
          // owned after the spread: a consumer `tabIndex`, `aria-disabled` or `aria-busy` must not undo the inert state
          {...(inert ? { "aria-disabled": true, "data-disabled": "", tabIndex: -1 } : null)}
          aria-busy={loading ? true : props["aria-busy"]}
          onClickCapture={
            inert
              ? (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                }
              : props.onClickCapture
          }
        >
          {loading ? <Spinner size="sm" {...spinnerProps} className={cn("text-current", spinnerProps?.className)} /> : leadingIcon}
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
        {...props}
        disabled={disabled || loading}
        aria-busy={loading ? true : props["aria-busy"]}
      >
        {loading ? <Spinner size="sm" {...spinnerProps} className={cn("text-current", spinnerProps?.className)} /> : leadingIcon}
        {children}
        {trailingIcon}
      </button>
    );
  }
);
Button.displayName = "Button";
