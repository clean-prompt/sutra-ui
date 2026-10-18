import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { RiArrowDownSLine, RiArrowUpSLine, RiCheckLine } from "@remixicon/react";
import { cn, focusRing, invalidRing } from "../lib/cn";
import { useField } from "./field";

/** Root of a select. Re-export of Radix `Select.Root`. */
export const Select = SelectPrimitive.Root;
/** Groups related items under a `SelectLabel`. */
export const SelectGroup = SelectPrimitive.Group;
/** Renders the selected item text or the placeholder. */
export const SelectValue = SelectPrimitive.Value;

export const selectTriggerVariants = cva(
  [
    "group/select-trigger flex w-full items-center gap-2 rounded-control border border-input bg-background text-left text-foreground shadow-xs",
    "transition-[color,border-color,box-shadow] duration-150 hover:border-border-strong",
    "data-[placeholder]:text-muted-foreground data-[state=open]:border-ring data-[state=open]:ring-[3px] data-[state=open]:ring-ring/20",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    focusRing,
    invalidRing,
  ],
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 text-sm [&_svg]:size-4",
        md: "h-9 px-3 text-sm [&_svg]:size-4",
        lg: "h-10 px-3.5 text-sm [&_svg]:size-[18px]",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface SelectTriggerProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>,
    VariantProps<typeof selectTriggerVariants> {
  /** Icon rendered before the value. */
  leadingIcon?: React.ReactNode;
  /** Marks the trigger invalid (same as `aria-invalid`). */
  invalid?: boolean;
}

/** Input-like button that opens the select. */
export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, size, leadingIcon, invalid, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(selectTriggerVariants({ size }), className)}
    {...props}
    aria-invalid={invalid || props["aria-invalid"] || undefined}
  >
    {leadingIcon && <span className="flex text-muted-foreground">{leadingIcon}</span>}
    <span className="flex min-w-0 flex-1 items-center gap-2 truncate [&>span]:truncate">{children}</span>
    <SelectPrimitive.Icon asChild>
      <RiArrowDownSLine aria-hidden className="text-muted-foreground transition-transform duration-200 group-data-[state=open]/select-trigger:rotate-180" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

/** Scroll affordance shown at the top of a long list. */
export const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex h-6 cursor-default items-center justify-center text-muted-foreground", className)}
    {...props}
  >
    <RiArrowUpSLine aria-hidden className="size-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = "SelectScrollUpButton";

/** Scroll affordance shown at the bottom of a long list. */
export const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex h-6 cursor-default items-center justify-center text-muted-foreground", className)}
    {...props}
  >
    <RiArrowDownSLine aria-hidden className="size-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = "SelectScrollDownButton";

export interface SelectContentProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {}

/** Floating list of options, rendered in a portal. */
export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(({ className, children, position = "popper", sideOffset = 6, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={position === "popper" ? sideOffset : undefined}
      className={cn(
        "relative z-50 max-h-(--radix-select-content-available-height) min-w-32 overflow-hidden rounded-box border border-border bg-popover text-popover-foreground shadow-lg",
        "origin-(--radix-select-content-transform-origin)",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
        position === "popper" && "w-full min-w-(--radix-select-trigger-width)",
        className
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport className="scrollbar-thin p-1">{children}</SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

/** Small muted heading for a `SelectGroup`. */
export const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground", className)}
    {...props}
  />
));
SelectLabel.displayName = "SelectLabel";

export interface SelectItemProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> {
  /** Secondary line under the label. Not shown in the trigger. */
  description?: React.ReactNode;
  /** Leading icon; also shown in the trigger when selected. */
  icon?: React.ReactNode;
}

/** A selectable option with a check indicator. */
export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, children, description, icon, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none",
      "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      "[&_svg]:pointer-events-none [&_svg]:shrink-0",
      description && "items-start",
      className
    )}
    {...props}
  >
    {description ? (
      <>
        {icon && <span className="mt-0.5 flex text-muted-foreground [&_svg]:size-4">{icon}</span>}
        <span className="flex min-w-0 flex-col gap-0.5">
          <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
          <span className="text-xs text-muted-foreground">{description}</span>
        </span>
      </>
    ) : (
      <SelectPrimitive.ItemText>
        <span className="flex items-center gap-2 [&_svg]:size-4 [&_svg]:text-muted-foreground">
          {icon}
          {children}
        </span>
      </SelectPrimitive.ItemText>
    )}
    <span className={cn("absolute right-2 flex size-4 items-center justify-center", description ? "top-2" : "")}>
      <SelectPrimitive.ItemIndicator>
        <RiCheckLine aria-hidden className="size-4 text-primary" />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

/** Thin divider between items or groups. */
export const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
));
SelectSeparator.displayName = "SelectSeparator";

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SimpleSelectProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>, "children"> {
  options: SelectOption[];
  placeholder?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  leadingIcon?: React.ReactNode;
  invalid?: boolean;
  className?: string;
  contentClassName?: string;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  /** Disables the select. Inherited from a surrounding `Field` when omitted. */
  disabled?: boolean;
  /** Marks the select required. Inherited from a surrounding `Field` when omitted. */
  required?: boolean;
}

/** Data-driven select: pass `options` and get a styled trigger + list. */
export const SimpleSelect = React.forwardRef<HTMLButtonElement, SimpleSelectProps>(
  (
    {
      options,
      placeholder = "Select…",
      size,
      leadingIcon,
      invalid,
      className,
      contentClassName,
      id,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      disabled,
      required,
      ...rootProps
    },
    ref
  ) => {
    const field = useField({
      id,
      disabled,
      required,
      invalid,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
    });
    return (
    <Select {...rootProps} disabled={field.disabled} required={field.required}>
      <SelectTrigger
        ref={ref}
        id={field.id}
        size={size}
        leadingIcon={leadingIcon}
        invalid={field.invalid}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={field["aria-describedby"]}
        aria-required={field.required}
        className={className}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            icon={option.icon}
            description={option.description}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    );
  }
);
SimpleSelect.displayName = "SimpleSelect";
