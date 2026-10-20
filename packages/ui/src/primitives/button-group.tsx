import * as React from "react";
import { Slot, ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, focusRing, type Size } from "../lib/cn";
import { useRootDirection } from "../hooks/use-direction";

type ButtonGroupOrientation = "horizontal" | "vertical";

interface ButtonGroupContextValue {
  size: Size;
  orientation: ButtonGroupOrientation;
  attached: boolean;
  toggle: boolean;
}

const ButtonGroupContext = React.createContext<ButtonGroupContextValue>({
  size: "md",
  orientation: "horizontal",
  attached: true,
  toggle: false,
});

export const buttonGroupVariants = cva("isolate inline-flex w-fit", {
  variants: {
    orientation: { horizontal: "flex-row items-stretch", vertical: "flex-col items-stretch" },
    attached: { true: "rounded-control shadow-xs [&>*]:shadow-none [&>*:focus-visible]:z-10", false: "gap-2" },
  },
  compoundVariants: [
    {
      orientation: "horizontal",
      attached: true,
      className: [
        "[&>*:not(:first-child)]:rounded-s-none [&>*:not(:last-child)]:rounded-e-none",
        "[&>*:not(:first-child)]:-ms-px [&>[data-slot=button-group-separator]]:ms-0! [&>[data-slot=button-group-separator]+*]:ms-0!",
      ],
    },
    {
      orientation: "vertical",
      attached: true,
      className: [
        "[&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none",
        "[&>*:not(:first-child)]:-mt-px [&>[data-slot=button-group-separator]]:mt-0! [&>[data-slot=button-group-separator]+*]:mt-0!",
      ],
    },
  ],
  defaultVariants: { orientation: "horizontal", attached: true },
});

interface ButtonGroupOwnProps {
  /**
   * Lays the buttons out in a row or a column.
   * @default "horizontal"
   */
  orientation?: ButtonGroupOrientation;
  /** Size applied to every `ButtonGroupItem`. */
  size?: Size;
  /** Merge borders and radii into one segmented control. Default true. */
  attached?: boolean;
  /** Classes for the group container. */
  className?: string;
}

export type ButtonGroupProps =
  | (ButtonGroupOwnProps &
      React.HTMLAttributes<HTMLDivElement> & {
        /** Leave it out for a plain attached row of buttons; `"single"` or `"multiple"` turns the group into toggle buttons. */
        type?: undefined;
      })
  | (ButtonGroupOwnProps &
      Omit<ToggleGroupPrimitive.ToggleGroupSingleProps, "orientation" | "type"> & {
        /** Toggle mode: at most one item is pressed (radio roles); `ButtonGroupItem` then needs a `value`. */
        type: "single";
      })
  | (ButtonGroupOwnProps &
      Omit<ToggleGroupPrimitive.ToggleGroupMultipleProps, "orientation" | "type"> & {
        /** Toggle mode: any number of items can be pressed (`aria-pressed`); `ButtonGroupItem` then needs a `value`. */
        type: "multiple";
      });

function omitOwn<T extends ButtonGroupOwnProps>(props: T): Omit<T, keyof ButtonGroupOwnProps> {
  const { orientation: _o, size: _s, attached: _a, className: _c, ...rest } = props;
  return rest;
}

/**
 * Attached row (or column) of buttons. Pass `type="single" | "multiple"` to turn it
 * into a toggle group whose `ButtonGroupItem`s can be pressed.
 */
export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>((props, ref) => {
  const { orientation = "horizontal", size = "md", attached = true, className } = props;
  const { ref: rootRef, dir } = useRootDirection(ref);
  const toggle = props.type === "single" || props.type === "multiple";
  const ctx = React.useMemo<ButtonGroupContextValue>(
    () => ({ size, orientation, attached, toggle }),
    [size, orientation, attached, toggle]
  );
  const classes = cn(buttonGroupVariants({ orientation, attached }), className);

  let content: React.ReactNode;
  if (props.type === "single") {
    content = (
      <ToggleGroupPrimitive.Root
        ref={rootRef}
        data-slot="button-group"
        dir={dir}
        {...omitOwn(props)}
        orientation={orientation}
        className={classes}
      />
    );
  } else if (props.type === "multiple") {
    content = (
      <ToggleGroupPrimitive.Root
        ref={rootRef}
        data-slot="button-group"
        dir={dir}
        {...omitOwn(props)}
        orientation={orientation}
        className={classes}
      />
    );
  } else {
    const { type: _t, ...rest } = omitOwn(props);
    content = (
      <div
        ref={ref}
        role="group"
        data-slot="button-group"
        // aria-orientation is not a supported attribute on role="group".
        data-orientation={orientation}
        {...rest}
        className={classes}
      />
    );
  }

  return <ButtonGroupContext.Provider value={ctx}>{content}</ButtonGroupContext.Provider>;
});
ButtonGroup.displayName = "ButtonGroup";

export const buttonGroupItemVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control",
    "border border-input bg-background font-medium text-foreground",
    "transition-[color,background-color,border-color,box-shadow] duration-150",
    "hover:bg-muted active:bg-accent",
    "data-[state=off]:text-muted-foreground data-[state=off]:hover:text-foreground",
    "data-[state=on]:bg-muted data-[state=on]:text-foreground data-[state=on]:shadow-[inset_0_1px_2px_rgb(10_13_18/0.06)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    focusRing,
  ],
  {
    variants: {
      size: {
        sm: "h-8 px-3 text-sm [&_svg]:size-4",
        md: "h-9 px-3.5 text-sm [&_svg]:size-4",
        lg: "h-10 px-4 text-sm [&_svg]:size-[18px]",
      },
      /** Makes the item square for an icon-only button; set it together with an `aria-label`. */
      iconOnly: { true: "aspect-square px-0" },
    },
    defaultVariants: { size: "md" },
  }
);

export interface ButtonGroupItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value">,
    Omit<VariantProps<typeof buttonGroupItemVariants>, "size"> {
  /** Required when the parent `ButtonGroup` has a `type` (toggle mode). */
  value?: string;
  /** Overrides the size from the group. */
  size?: Size;
  /** Render as the child element (e.g. a link) while keeping the item styles. */
  asChild?: boolean;
  /** Icon before the label. */
  leadingIcon?: React.ReactNode;
  /** Icon after the label. */
  trailingIcon?: React.ReactNode;
}

/** Segment of a `ButtonGroup`; becomes a toggle item when the group has a `type`. */
export const ButtonGroupItem = React.forwardRef<HTMLButtonElement, ButtonGroupItemProps>(
  ({ className, size, iconOnly, value, asChild, leadingIcon, trailingIcon, children, type, ...props }, ref) => {
    const ctx = React.useContext(ButtonGroupContext);
    const classes = cn(
      buttonGroupItemVariants({ size: size ?? ctx.size, iconOnly }),
      ctx.orientation === "vertical" && "w-full justify-start",
      !ctx.attached && "shadow-xs",
      className
    );
    if (ctx.toggle) {
      return (
        <ToggleGroupPrimitive.Item
          ref={ref}
          value={value ?? ""}
          asChild={asChild}
          data-slot="button-group-item"
          className={classes}
          {...props}
        >
          {leadingIcon}
          <Slot.Slottable>{children}</Slot.Slottable>
          {trailingIcon}
        </ToggleGroupPrimitive.Item>
      );
    }

    if (asChild) {
      return (
        <Slot.Root ref={ref} data-slot="button-group-item" className={classes} {...props}>
          {leadingIcon}
          <Slot.Slottable>{children}</Slot.Slottable>
          {trailingIcon}
        </Slot.Root>
      );
    }
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        data-slot="button-group-item"
        className={classes}
        {...props}
      >
        {leadingIcon}
        {children}
        {trailingIcon}
      </button>
    );
  }
);
ButtonGroupItem.displayName = "ButtonGroupItem";

export interface ButtonGroupSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

/** Thin divider between segments, useful for filled (e.g. primary) split buttons. */
export const ButtonGroupSeparator = React.forwardRef<HTMLDivElement, ButtonGroupSeparatorProps>(
  ({ className, ...props }, ref) => {
    const { orientation } = React.useContext(ButtonGroupContext);
    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation={orientation === "horizontal" ? "vertical" : "horizontal"}
        data-slot="button-group-separator"
        className={cn(
          "relative z-[1] shrink-0 self-stretch bg-border",
          orientation === "horizontal" ? "w-px" : "h-px",
          className
        )}
        {...props}
      />
    );
  }
);
ButtonGroupSeparator.displayName = "ButtonGroupSeparator";
