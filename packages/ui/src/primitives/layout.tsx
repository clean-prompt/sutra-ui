import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/* Grid & responsive layout: 4-col mobile, 8-col tablet, 12-col desktop. */

export const containerVariants = cva("mx-auto w-full px-4 md:px-6 lg:px-8", {
  variants: {
    size: {
      sm: "max-w-3xl",
      md: "max-w-5xl",
      lg: "max-w-7xl",
      xl: "max-w-[90rem]",
      full: "max-w-none",
    },
  },
  defaultVariants: { size: "lg" },
});

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  asChild?: boolean;
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, asChild, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot.Root : "div";
    return <Comp ref={ref} className={cn(containerVariants({ size }), className)} {...props} />;
  }
);
Container.displayName = "Container";

/** 12-column responsive grid (4 → 8 → 12 columns). Use `GridItem span` to size children. */
export const Grid = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { gap?: "sm" | "md" | "lg" }>(
  ({ className, gap = "md", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12",
        { sm: "gap-3", md: "gap-4 md:gap-6", lg: "gap-6 md:gap-8" }[gap],
        className
      )}
      {...props}
    />
  )
);
Grid.displayName = "Grid";

type Span = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | "full";
const spanClass: Record<string, string> = {
  1: "col-span-1", 2: "col-span-2", 3: "col-span-3", 4: "col-span-4", 5: "col-span-5", 6: "col-span-6",
  7: "col-span-7", 8: "col-span-8", 9: "col-span-9", 10: "col-span-10", 11: "col-span-11", 12: "col-span-12",
  full: "col-span-full",
};
const mdSpan: Record<string, string> = {
  1: "md:col-span-1", 2: "md:col-span-2", 3: "md:col-span-3", 4: "md:col-span-4", 5: "md:col-span-5", 6: "md:col-span-6",
  7: "md:col-span-7", 8: "md:col-span-8", full: "md:col-span-full",
};
const lgSpan: Record<string, string> = {
  1: "lg:col-span-1", 2: "lg:col-span-2", 3: "lg:col-span-3", 4: "lg:col-span-4", 5: "lg:col-span-5", 6: "lg:col-span-6",
  7: "lg:col-span-7", 8: "lg:col-span-8", 9: "lg:col-span-9", 10: "lg:col-span-10", 11: "lg:col-span-11", 12: "lg:col-span-12",
  full: "lg:col-span-full",
};

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Columns on mobile (of 4). Default: full. */
  span?: Span;
  /** Columns on tablet (of 8). */
  md?: Span;
  /** Columns on desktop (of 12). */
  lg?: Span;
}

export const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ className, span = "full", md, lg, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(spanClass[span], md && mdSpan[md], lg && lgSpan[lg], className)}
      {...props}
    />
  )
);
GridItem.displayName = "GridItem";

const stackVariants = cva("flex", {
  variants: {
    direction: { row: "flex-row", column: "flex-col" },
    gap: { 0: "gap-0", 1: "gap-1", 2: "gap-2", 3: "gap-3", 4: "gap-4", 5: "gap-5", 6: "gap-6", 8: "gap-8", 10: "gap-10", 12: "gap-12" },
    align: { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch", baseline: "items-baseline" },
    justify: { start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between" },
    wrap: { true: "flex-wrap" },
  },
  defaultVariants: { direction: "column", gap: 4 },
});

export interface StackProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof stackVariants> {
  asChild?: boolean;
}

/** Flex stack on the 4px spacing grid. */
export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, direction, gap, align, justify, wrap, asChild, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot.Root : "div";
    return <Comp ref={ref} className={cn(stackVariants({ direction, gap, align, justify, wrap }), className)} {...props} />;
  }
);
Stack.displayName = "Stack";

export const HStack = React.forwardRef<HTMLDivElement, Omit<StackProps, "direction">>((props, ref) => (
  <Stack ref={ref} direction="row" align="center" {...props} />
));
HStack.displayName = "HStack";

export type CardElement = "div" | "section" | "article" | "aside" | "li";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds 24px (16px at `size="sm"`) of padding on the card itself; the parts carry their own padding instead. */
  padded?: boolean;
  /** Element to render, so a card can sit in the page outline as an `article`, `section` or list item. */
  as?: CardElement;
  /** `sm` tightens the padding of the card and its parts. */
  size?: "sm" | "md";
}

/** Card surface used across components and blocks; compose it with `CardHeader`, `CardContent` and `CardFooter`. */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padded = false, as, size = "md", ...props }, ref) => {
    const Comp = (as ?? "div") as React.ElementType;
    return (
      <Comp
        ref={ref}
        data-slot="card"
        data-size={size === "sm" ? "sm" : undefined}
        className={cn(
          "rounded-box border border-border bg-card text-card-foreground shadow-xs",
          size === "sm"
            ? "[--card-gap:0.5rem] [--card-pad:1rem] [--card-text:0.875rem] [--card-text-sm:0.75rem]"
            : "[--card-gap:0.75rem] [--card-pad:1.5rem] [--card-text:1rem] [--card-text-sm:0.875rem]",
          padded && "p-(--card-pad)",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

/** Title row of a card; becomes two columns when it holds a `CardAction`. */
export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn(
        "grid grid-cols-1 items-start gap-1 px-(--card-pad) pt-(--card-pad) pb-(--card-gap) last:pb-(--card-pad) has-[[data-slot=card-action]]:grid-cols-[minmax(0,1fr)_auto]",
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

export interface CardTitleProps extends React.HTMLAttributes<HTMLElement> {
  /** Element to render; pick the heading level that fits the page outline. Defaults to a plain `div`. */
  as?: "h2" | "h3" | "h4" | "div";
}

/** Card title; pass `as="h3"` (or h2, h4) to make it a heading. */
export const CardTitle = React.forwardRef<HTMLElement, CardTitleProps>(({ className, as, ...props }, ref) => {
  const Comp = (as ?? "div") as React.ElementType;
  return (
    <Comp
      ref={ref}
      data-slot="card-title"
      className={cn(
        "min-w-0 text-(length:--card-text) leading-snug font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  );
});
CardTitle.displayName = "CardTitle";

/** Muted supporting line under the card title. */
export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      data-slot="card-description"
      className={cn("min-w-0 text-(length:--card-text-sm) text-muted-foreground", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

/** Control placed at the end of the card header (a button, menu or badge). */
export const CardAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 flex shrink-0 items-center gap-2 self-start justify-self-end", className)}
      {...props}
    />
  )
);
CardAction.displayName = "CardAction";

/** Card body. */
export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn(
        "min-w-0 px-(--card-pad) py-(--card-gap) first:pt-(--card-pad) last:pb-(--card-pad)",
        className
      )}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `panel` draws a muted band with a top border, flush with the card edges. */
  variant?: "plain" | "panel";
}

/** Card footer row for actions or meta text; wraps when it cannot fit. */
export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, variant = "plain", ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-footer"
      data-variant={variant}
      className={cn(
        "flex flex-wrap items-center gap-2 px-(--card-pad)",
        variant === "panel"
          ? "rounded-b-[calc(var(--radius-box)-1px)] border-t border-border bg-subtle py-[calc(var(--card-pad)*0.75)]"
          : "pt-(--card-gap) pb-(--card-pad)",
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";
