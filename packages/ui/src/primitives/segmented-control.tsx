import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cva } from "class-variance-authority";
import { cn, focusRing, type Size } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useActiveIndicator } from "../hooks/use-active-indicator";
import { useMergedRefs } from "../hooks/use-merged-refs";

const SegmentedControlContext = React.createContext<{ size: Size; fullWidth: boolean }>({
  size: "md",
  fullWidth: false,
});

const rootVariants = cva(
  "relative isolate inline-flex items-center rounded-control bg-muted p-0.5 shadow-[inset_0_0_0_1px_var(--color-border)]",
  {
    variants: {
      size: { sm: "h-8", md: "h-9", lg: "h-10" },
      fullWidth: { true: "flex w-full" },
    },
    defaultVariants: { size: "md" },
  }
);

const itemVariants = cva(
  [
    "relative z-10 inline-flex h-full select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-control font-medium text-muted-foreground",
    "transition-colors duration-200 hover:text-foreground data-[state=on]:text-foreground",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    focusRing,
  ],
  {
    variants: {
      size: {
        sm: "px-2.5 text-xs [&_svg]:size-3.5",
        md: "px-3 text-sm [&_svg]:size-4",
        lg: "px-3.5 text-sm [&_svg]:size-[18px]",
      },
      iconOnly: { true: "aspect-square px-0" },
      fullWidth: { true: "flex-1" },
    },
    defaultVariants: { size: "md" },
  }
);

export interface SegmentedControlOption {
  value: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Required for icon-only options. */
  "aria-label"?: string;
}

export interface SegmentedControlProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>,
    "type" | "value" | "defaultValue" | "onValueChange"
  > {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: Size;
  /** Stretch to the container and split segments evenly. */
  fullWidth?: boolean;
  /** Data-driven alternative to `SegmentedControlItem` children. */
  options?: SegmentedControlOption[];
}

/** Single-choice segmented control with an animated sliding thumb. */
export const SegmentedControl = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  SegmentedControlProps
>(
  (
    { value: valueProp, defaultValue, onValueChange, size = "md", fullWidth = false, options, className, children, ...props },
    forwardedRef
  ) => {
    const [value, setValue] = useControllableState<string>({
      value: valueProp,
      defaultValue: defaultValue ?? options?.[0]?.value ?? "",
      onChange: onValueChange,
    });
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const setRefs = useMergedRefs(rootRef, forwardedRef);
    // Re-measures on these changes and whenever the root or a segment resizes.
    const { rect: thumb, animate } = useActiveIndicator(
      rootRef,
      '[data-segment][data-state="on"]',
      [value, size, fullWidth, options, children],
      { itemSelector: "[data-segment]" }
    );

    const contextValue = React.useMemo(() => ({ size, fullWidth }), [size, fullWidth]);

    return (
      <SegmentedControlContext.Provider value={contextValue}>
        <ToggleGroupPrimitive.Root
          ref={setRefs}
          type="single"
          value={value}
          onValueChange={(next: string) => {
            if (next) setValue(next);
          }}
          className={cn(rootVariants({ size, fullWidth }), className)}
          {...props}
        >
          {thumb && (
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0.5 left-0 -z-10 rounded-control bg-background shadow-sm ring-1 ring-border/60",
                animate && "transition-[transform,width] duration-300 ease-out-quart"
              )}
              style={{ width: thumb.width, transform: `translateX(${thumb.left}px)` }}
            />
          )}
          {options
            ? options.map((option) => (
                <SegmentedControlItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  icon={option.icon}
                  aria-label={option["aria-label"]}
                >
                  {option.label}
                </SegmentedControlItem>
              ))
            : children}
        </ToggleGroupPrimitive.Root>
      </SegmentedControlContext.Provider>
    );
  }
);
SegmentedControl.displayName = "SegmentedControl";

export interface SegmentedControlItemProps
  extends React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> {
  icon?: React.ReactNode;
}

/** One segment. Renders icon-only (square) when it has an icon and no label. */
export const SegmentedControlItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  SegmentedControlItemProps
>(({ className, icon, children, ...props }, ref) => {
  const { size, fullWidth } = React.useContext(SegmentedControlContext);
  const iconOnly = !!icon && (children === undefined || children === null || children === false);
  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      data-segment=""
      className={cn(itemVariants({ size, iconOnly, fullWidth }), className)}
      {...props}
    >
      {icon}
      {children}
    </ToggleGroupPrimitive.Item>
  );
});
SegmentedControlItem.displayName = "SegmentedControlItem";
