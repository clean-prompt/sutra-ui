import * as React from "react";
import { Toggle as TogglePrimitive, ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useRootDirection } from "../hooks/use-direction";

export const toggleVariants = cva(
  [
    "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium",
    "transition-[color,background-color,border-color,box-shadow] disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    focusRing,
  ],
  {
    variants: {
      /**
       * Look of the items: `default` (ghost), `outline` or `soft` (tinted when on).
       * @default "default"
       */
      variant: {
        default: "text-muted-foreground hover:bg-accent hover:text-foreground data-[state=on]:bg-muted data-[state=on]:text-foreground",
        outline:
          "border border-input bg-background text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground data-[state=on]:border-border-strong data-[state=on]:bg-muted data-[state=on]:text-foreground",
        soft: "text-muted-foreground hover:bg-accent hover:text-foreground data-[state=on]:bg-primary-soft data-[state=on]:text-primary-soft-foreground",
      },
      /**
       * Item height and padding.
       * @default "md"
       */
      size: {
        sm: "h-8 min-w-8 px-2.5 text-sm [&_svg]:size-4",
        md: "h-9 min-w-9 px-3 text-sm [&_svg]:size-4",
        lg: "h-10 min-w-10 px-3.5 text-sm [&_svg]:size-[18px]",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface ToggleButtonProps
  extends Omit<React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>, "onChange">,
    VariantProps<typeof toggleVariants> {}

/** A button that stays pressed (`aria-pressed`): bold, mute, pin. Controlled with `pressed`, or uncontrolled with `defaultPressed`. */
export const ToggleButton = React.forwardRef<React.ComponentRef<typeof TogglePrimitive.Root>, ToggleButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <TogglePrimitive.Root ref={ref} data-slot="toggle-button" className={cn(toggleVariants({ variant, size }), className)} {...props} />
  )
);
ToggleButton.displayName = "ToggleButton";

interface ToggleGroupContextValue extends VariantProps<typeof toggleVariants> {
  values: readonly string[];
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({ values: [] });

interface ToggleGroupBaseProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "dir" | "onChange">,
    VariantProps<typeof toggleVariants> {
  /** Disables every item. */
  disabled?: boolean;
  /** Arrow keys move along this axis (default horizontal). */
  orientation?: "horizontal" | "vertical";
  /** Wrap focus from the last item to the first (default true). */
  loop?: boolean;
  /** Reading direction for arrow-key navigation; inherits the surrounding direction by default. */
  dir?: "ltr" | "rtl";
}

export interface ToggleGroupSingleProps extends ToggleGroupBaseProps {
  /** At most one item pressed; pressing it again clears the value to `""`. */
  type?: "single";
  /** Controlled pressed item value (empty string for none). Use with `onValueChange`. */
  value?: string;
  /** Initially pressed item value when uncontrolled. */
  defaultValue?: string;
  /** Called with the pressed item value, or an empty string when it is toggled off. */
  onValueChange?: (value: string) => void;
}

export interface ToggleGroupMultipleProps extends ToggleGroupBaseProps {
  /** Any number of items pressed. */
  type: "multiple";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}

export type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;

/**
 * Row of toggle buttons, `type="single"` or `"multiple"`, with roving focus (one tab stop, arrow keys move). Each item
 * is a button with `aria-pressed`; give the group an `aria-label`. For an exclusive choice that reads as a tab-like
 * switch, `SegmentedControl` is the better fit.
 */
export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>((props, ref) => {
  const { ref: rootRef, dir } = useRootDirection(ref);
  const { type = "single", variant, size, className, value, defaultValue, onValueChange, ...rest } = props as ToggleGroupProps & {
    value?: string | string[];
    defaultValue?: string | string[];
    onValueChange?: (value: never) => void;
  };
  const multiple = type === "multiple";
  const [current, setCurrent] = useControllableState<string | string[]>({
    value,
    defaultValue: defaultValue ?? (multiple ? [] : ""),
    onChange: onValueChange as ((value: string | string[]) => void) | undefined,
  });
  const values = React.useMemo(
    () => (Array.isArray(current) ? current : current ? [current] : []),
    [current]
  );
  const ctx = React.useMemo(() => ({ values, variant, size }), [values, variant, size]);
  const root = { ref: rootRef, dir, role: "group", "data-slot": "toggle-group", className: cn("inline-flex min-w-0 max-w-full flex-wrap items-center gap-1", className), ...rest };
  return (
    <ToggleGroupContext.Provider value={ctx}>
      {multiple ? (
        <ToggleGroupPrimitive.Root type="multiple" value={current as string[]} onValueChange={setCurrent} {...root} />
      ) : (
        <ToggleGroupPrimitive.Root type="single" value={current as string} onValueChange={setCurrent} {...root} />
      )}
    </ToggleGroupContext.Provider>
  );
});
ToggleGroup.displayName = "ToggleGroup";

export interface ToggleGroupItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>, "role" | "aria-checked">,
    VariantProps<typeof toggleVariants> {}

/** One toggle in a `ToggleGroup`; `value` identifies it. */
export const ToggleGroupItem = React.forwardRef<React.ComponentRef<typeof ToggleGroupPrimitive.Item>, ToggleGroupItemProps>(
  ({ className, variant, size, value, ...props }, ref) => {
    const ctx = React.useContext(ToggleGroupContext);
    const pressed = ctx.values.includes(value);
    return (
      <ToggleGroupPrimitive.Item
        ref={ref}
        value={value}
        data-slot="toggle-group-item"
        // Radix marks single-mode items as radios; these are toggle buttons in both modes.
        role={undefined}
        aria-checked={undefined}
        aria-pressed={pressed}
        className={cn(toggleVariants({ variant: variant ?? ctx.variant, size: size ?? ctx.size }), className)}
        {...props}
      />
    );
  }
);
ToggleGroupItem.displayName = "ToggleGroupItem";
