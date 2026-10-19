import * as React from "react";
import { Separator as SeparatorPrimitive } from "radix-ui";
import { cn } from "../lib/cn";

export interface SeparatorProps
  extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  /**
   * Line style.
   * @default "solid"
   */
  variant?: "solid" | "dashed";
  /** Text or content shown inside the line. `children` works too. */
  label?: React.ReactNode;
  /**
   * Where the label sits along the line.
   * @default "center"
   */
  labelPosition?: "start" | "center" | "end";
}

/** Horizontal or vertical rule, optionally with a centered label. */
export const Separator = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  SeparatorProps
>(
  (
    {
      className,
      orientation = "horizontal",
      decorative = true,
      variant = "solid",
      label,
      labelPosition = "center",
      children,
      ...props
    },
    ref
  ) => {
    const content = label ?? children;
    const vertical = orientation === "vertical";
    const lineStyle = cn(
      "shrink-0 border-border",
      variant === "dashed" ? "border-dashed" : "border-solid"
    );

    if (content === undefined || content === null || content === false) {
      return (
        <SeparatorPrimitive.Root
          ref={ref}
          orientation={orientation}
          decorative={decorative}
          className={cn(
            lineStyle,
            vertical
              ? cn(
                  "min-h-4 border-s",
                  // A fixed height (e.g. h-5) is centered; otherwise the rule stretches to the row.
                  /(^|\s)(h|size)-/.test(className ?? "") ? "self-center" : "h-full self-stretch"
                )
              : "w-full border-t",
            className
          )}
          {...props}
        />
      );
    }

    const line = cn(lineStyle, vertical ? "w-0 flex-1 border-s" : "h-0 flex-1 border-t");
    return (
      <SeparatorPrimitive.Root
        ref={ref}
        orientation={orientation}
        decorative={decorative}
        className={cn(
          "flex items-center gap-3 text-xs font-medium text-muted-foreground",
          vertical ? "h-full min-h-16 flex-col self-stretch" : "w-full",
          className
        )}
        {...props}
      >
        <span className={cn(line, labelPosition === "start" && (vertical ? "max-h-2" : "max-w-4"))} />
        <span className="shrink-0 whitespace-nowrap">{content}</span>
        <span className={cn(line, labelPosition === "end" && (vertical ? "max-h-2" : "max-w-4"))} />
      </SeparatorPrimitive.Root>
    );
  }
);
Separator.displayName = "Separator";

/** Alias of `Separator`. @deprecated Use `Separator` (it takes a `label`). */
export const ContentDivider = Separator;
/** @deprecated Use `SeparatorProps`. */
export type ContentDividerProps = SeparatorProps;
