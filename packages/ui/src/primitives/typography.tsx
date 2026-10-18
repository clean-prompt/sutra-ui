import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

export const headingVariants = cva("font-semibold text-foreground text-balance", {
  variants: {
    size: {
      "display-2xl": "text-display-lg md:text-display-2xl",
      "display-xl": "text-display-md md:text-display-xl",
      "display-lg": "text-display-sm md:text-display-lg",
      "display-md": "text-display-xs md:text-display-md",
      "display-sm": "text-display-xs md:text-display-sm",
      "display-xs": "text-xl md:text-display-xs",
      xl: "text-xl tracking-tight",
      lg: "text-lg tracking-tight",
      md: "text-base",
      sm: "text-sm",
    },
  },
  defaultVariants: { size: "display-sm" },
});

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: HeadingLevel;
  asChild?: boolean;
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ as = "h2", asChild, size, className, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot.Root : as;
    return <Comp ref={ref} className={cn(headingVariants({ size }), className)} {...props} />;
  }
);
Heading.displayName = "Heading";

export const textVariants = cva("", {
  variants: {
    size: { xs: "text-xs", sm: "text-sm", md: "text-base", lg: "text-lg", xl: "text-xl" },
    /** `default` is plain foreground text; the semantic tones follow `Tone` (`muted` is the legacy name of `neutral`). */
    tone: {
      default: "text-foreground",
      neutral: "text-muted-foreground",
      muted: "text-muted-foreground",
      primary: "text-primary",
      success: "text-success",
      warning: "text-warning-soft-foreground",
      destructive: "text-destructive",
      info: "text-info",
    },
    weight: { regular: "font-normal", medium: "font-medium", semibold: "font-semibold" },
  },
  defaultVariants: { size: "md", tone: "default", weight: "regular" },
});

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {
  as?: "p" | "span" | "div" | "small" | "strong" | "em";
  asChild?: boolean;
}

export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ as = "p", asChild, size, tone, weight, className, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot.Root : as;
    return <Comp ref={ref} className={cn(textVariants({ size, tone, weight }), className)} {...props} />;
  }
);
Text.displayName = "Text";

/** Small all-caps label above headings. */
export const Eyebrow = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs font-semibold uppercase tracking-[0.08em] text-primary", className)} {...props} />
  )
);
Eyebrow.displayName = "Eyebrow";

/** Keyboard key hint. */
export const Kbd = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <kbd
      ref={ref}
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-xs border border-border bg-muted px-1 font-sans text-[11px] font-medium text-muted-foreground shadow-[inset_0_-1px_0_var(--border)]",
        className
      )}
      {...props}
    />
  )
);
Kbd.displayName = "Kbd";

/** Inline code. */
export const InlineCode = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <code
      ref={ref}
      className={cn("rounded-xs border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground", className)}
      {...props}
    />
  )
);
InlineCode.displayName = "InlineCode";
