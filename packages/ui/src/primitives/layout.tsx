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

/** Card surface used across components and blocks. */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }>(
  ({ className, padded = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-box border border-border bg-card text-card-foreground shadow-xs", padded && "p-6", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";
