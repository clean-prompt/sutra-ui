import * as React from "react";
import { RiAddLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { AvatarContext, avatarVariants, type AvatarShape, type AvatarSize } from "./avatar";

/** One step smaller text so 3-character counts like "+42" or "99+" fit the circle. */
const countText: Record<AvatarSize, string> = {
  xs: "text-[9px]",
  sm: "text-2xs",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-base",
  "2xl": "text-lg",
};

const overlap: Record<"tight" | "normal", Record<AvatarSize, string>> = {
  normal: {
    xs: "-space-x-1",
    sm: "-space-x-1.5",
    md: "-space-x-2",
    lg: "-space-x-2.5",
    xl: "-space-x-3",
    "2xl": "-space-x-3.5",
  },
  tight: {
    xs: "-space-x-2",
    sm: "-space-x-2.5",
    md: "-space-x-3",
    lg: "-space-x-4",
    xl: "-space-x-5",
    "2xl": "-space-x-6",
  },
};

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: AvatarSize;
  shape?: AvatarShape;
  /** Maximum avatars to show before collapsing the rest into a "+N" bubble. */
  max?: number;
  /** Override the overflow count (e.g. when only a page of users is loaded). */
  total?: number;
  spacing?: "tight" | "normal";
  /** Renders a dashed "add" button at the end. */
  onAdd?: () => void;
  addLabel?: string;
}

/** Overlapping stack of avatars with overflow count and optional add button. */
export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  (
    {
      className,
      size = "md",
      shape = "circle",
      max,
      total,
      spacing = "normal",
      onAdd,
      addLabel = "Add member",
      children,
      ...props
    },
    ref
  ) => {
    const items = React.Children.toArray(children).filter(React.isValidElement);
    const visible = max !== undefined && max >= 0 ? items.slice(0, max) : items;
    const count = total ?? items.length;
    const hidden = Math.max(0, count - visible.length);
    const ctx = React.useMemo(() => ({ size, shape, ring: true }), [size, shape]);

    return (
      <AvatarContext.Provider value={ctx}>
        <div
          ref={ref}
          role="group"
          className={cn(
            "flex items-center",
            overlap[spacing][size],
            "[&>*]:relative [&>*]:transition-transform [&>*]:duration-200 [&>*]:ease-out-quart [&>*:hover]:z-10 [&>*:hover]:-translate-y-0.5",
            className
          )}
          {...props}
        >
          {visible}
          {hidden > 0 ? (
            <span
              className={cn(
                avatarVariants({ size, shape, ring: true }),
                "z-[1] bg-muted font-semibold tracking-tight text-muted-foreground",
                hidden > 9 && countText[size]
              )}
              role="img"
              aria-label={`${hidden} more`}
              title={`${hidden} more`}
            >
              {hidden > 99 ? "99+" : `+${hidden}`}
            </span>
          ) : null}
          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              aria-label={addLabel}
              title={addLabel}
              className={cn(
                avatarVariants({ size, shape, ring: true }),
                "cursor-pointer border border-dashed border-border-strong bg-background text-muted-foreground transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary",
                focusRing
              )}
            >
              <RiAddLine aria-hidden />
            </button>
          ) : null}
        </div>
      </AvatarContext.Provider>
    );
  }
);
AvatarGroup.displayName = "AvatarGroup";
