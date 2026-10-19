import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, focusRing, hitArea } from "../lib/cn";
import { useField } from "./field";

function joinIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(" ") || undefined;
}

export interface RadioGroupProps extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {
  invalid?: boolean;
}

/** Single-choice group of radio items. Consumes `Field` context. */
export const RadioGroup = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Root>, RadioGroupProps>(
  ({ className, orientation = "vertical", invalid, id, disabled, required, ...props }, ref) => {
    const field = useField({
      id,
      disabled,
      required,
      invalid,
      "aria-describedby": props["aria-describedby"],
      "aria-invalid": props["aria-invalid"],
    });
    return (
      <RadioGroupPrimitive.Root
        ref={ref}
        data-slot="radio-group"
        orientation={orientation}
        {...props}
        id={field.id}
        disabled={field.disabled}
        required={field.required}
        aria-invalid={field["aria-invalid"]}
        aria-describedby={field["aria-describedby"]}
        className={cn(
          "group/radio-group",
          orientation === "vertical" ? "grid gap-3" : "flex flex-row flex-wrap items-start gap-x-6 gap-y-3",
          className
        )}
      />
    );
  }
);
RadioGroup.displayName = "RadioGroup";

export const radioItemVariants = cva(
  [
    "peer group/radio relative inline-flex shrink-0 items-center justify-center rounded-full border border-border-strong bg-background shadow-xs",
    "transition-[background-color,border-color,box-shadow,transform,translate,scale,rotate] duration-150 active:scale-90",
    "hover:border-primary/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
    "group-aria-invalid/radio-group:border-destructive aria-invalid:border-destructive",
    hitArea,
    focusRing,
  ],
  {
    variants: {
      size: {
        sm: "size-3.5 [&_[data-slot=radio-dot]]:size-1.5",
        md: "size-4 [&_[data-slot=radio-dot]]:size-1.5",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface RadioGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>,
    VariantProps<typeof radioItemVariants> {}

/** A radio button with a springy dot indicator. */
export const RadioGroupItem = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Item>, RadioGroupItemProps>(
  ({ className, size, ...props }, ref) => (
    <RadioGroupPrimitive.Item
      ref={ref}
      data-slot="radio-group-item"
      className={cn(radioItemVariants({ size }), className)}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        forceMount
        className="flex items-center justify-center transition-transform duration-200 ease-spring data-[state=checked]:scale-100 data-[state=unchecked]:scale-0"
      >
        <span data-slot="radio-dot" className="block rounded-full bg-primary-foreground" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
);
RadioGroupItem.displayName = "RadioGroupItem";

export interface RadioFieldProps extends RadioGroupItemProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  labelClassName?: string;
  wrapperClassName?: string;
}

/** Radio item with a label and optional description. */
export const RadioField = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Item>, RadioFieldProps>(
  ({ label, description, labelClassName, wrapperClassName, className, id, size, ...props }, ref) => {
    const generated = React.useId();
    const itemId = id ?? `radio-${generated.replace(/:/g, "")}`;
    const descriptionId = description != null ? `${itemId}-description` : undefined;
    return (
      <div
        data-slot="radio-field"
        data-disabled={props.disabled ? "true" : undefined}
        className={cn("group flex items-start gap-2.5", wrapperClassName)}
      >
        <RadioGroupItem
          ref={ref}
          id={itemId}
          size={size}
          {...props}
          aria-describedby={joinIds(props["aria-describedby"], descriptionId)}
          className={cn(size === "sm" ? "mt-[3px]" : "mt-0.5", className)}
        />
        {(label != null || description != null) && (
          <div className="grid gap-1">
            {label != null && (
              <label
                htmlFor={itemId}
                className={cn(
                  "cursor-pointer select-none text-sm font-medium leading-5 text-foreground",
                  "group-data-[disabled=true]:cursor-not-allowed group-data-[disabled=true]:opacity-60",
                  "group-data-[disabled]/radio-group:cursor-not-allowed group-data-[disabled]/radio-group:opacity-60",
                  labelClassName
                )}
              >
                {label}
              </label>
            )}
            {description != null && (
              <p id={descriptionId} className="text-sm leading-snug text-muted-foreground group-data-[disabled=true]:opacity-60">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);
RadioField.displayName = "RadioField";

export interface RadioCardProps extends RadioGroupItemProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  indicatorPosition?: "start" | "end";
  /** Class for the radio control (`className` styles the card). */
  radioClassName?: string;
}

/** Bordered, selectable card variant of a radio item. */
export const RadioCard = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Item>, RadioCardProps>(
  ({ label, description, icon, indicatorPosition = "end", className, radioClassName, id, ...props }, ref) => {
    const generated = React.useId();
    const itemId = id ?? `radio-card-${generated.replace(/:/g, "")}`;
    const descriptionId = description != null ? `${itemId}-description` : undefined;
    const item = (
      <RadioGroupItem
        ref={ref}
        id={itemId}
        {...props}
        aria-describedby={joinIds(props["aria-describedby"], descriptionId)}
        className={cn("mt-0.5 focus-visible:ring-0", radioClassName)}
      />
    );
    return (
      <label
        htmlFor={itemId}
        data-slot="radio-card"
        className={cn(
          "group relative flex cursor-pointer items-start gap-3 rounded-box border border-border bg-card p-4 text-card-foreground shadow-xs",
          "transition-[background-color,border-color,box-shadow] duration-150 hover:border-border-strong hover:bg-subtle",
          "has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary-soft/40 has-[button[data-state=checked]]:ring-1 has-[button[data-state=checked]]:ring-primary",
          "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/35",
          "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
          className
        )}
      >
        {indicatorPosition === "start" && item}
        {icon != null && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-xs transition-colors group-has-[button[data-state=checked]]:text-primary [&_svg]:size-[18px]">
            {icon}
          </span>
        )}
        <span className="grid flex-1 gap-1">
          <span className="text-sm font-medium leading-5 text-foreground">{label}</span>
          {description != null && (
            <span id={descriptionId} className="text-sm leading-snug text-muted-foreground">
              {description}
            </span>
          )}
        </span>
        {indicatorPosition === "end" && item}
      </label>
    );
  }
);
RadioCard.displayName = "RadioCard";

export interface RadioGroupOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupFieldProps extends RadioGroupProps {
  options: RadioGroupOption[];
  label?: React.ReactNode;
  description?: React.ReactNode;
  /** `card` renders each option as a `RadioCard`. */
  variant?: "default" | "card";
  size?: "sm" | "md";
  /** Class for the outer wrapper. */
  wrapperClassName?: string;
}

/** Data-driven radio group with a label, description and an `options` array. */
export const RadioGroupField = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Root>, RadioGroupFieldProps>(
  (
    { options, label, description, variant = "default", size, orientation = "vertical", wrapperClassName, className, ...props },
    ref
  ) => {
    const generated = React.useId();
    const baseId = `radio-group-${generated.replace(/:/g, "")}`;
    const labelId = label != null ? `${baseId}-label` : undefined;
    const descriptionId = description != null ? `${baseId}-description` : undefined;
    return (
      <div data-slot="radio-group-field" className={cn("flex flex-col gap-3", wrapperClassName)}>
        {(label != null || description != null) && (
          <div className="grid gap-1">
            {label != null && (
              <div id={labelId} className="text-sm font-medium leading-none text-foreground">
                {label}
              </div>
            )}
            {description != null && (
              <p id={descriptionId} className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
        <RadioGroup
          ref={ref}
          orientation={orientation}
          aria-labelledby={props["aria-labelledby"] ?? labelId}
          {...props}
          aria-describedby={joinIds(props["aria-describedby"], descriptionId)}
          className={cn(
            variant === "card" && (orientation === "vertical" ? "gap-2" : "grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-3"),
            className
          )}
        >
          {options.map((o) =>
            variant === "card" ? (
              <RadioCard
                key={o.value}
                value={o.value}
                label={o.label}
                description={o.description}
                icon={o.icon}
                disabled={o.disabled}
                size={size}
              />
            ) : (
              <RadioField
                key={o.value}
                value={o.value}
                label={o.label}
                description={o.description}
                disabled={o.disabled}
                size={size}
              />
            )
          )}
        </RadioGroup>
      </div>
    );
  }
);
RadioGroupField.displayName = "RadioGroupField";
