import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, focusRing, hitArea } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useField } from "./field";

function joinIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(" ") || undefined;
}

export const switchVariants = cva(
  [
    "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
    "bg-border-strong shadow-inner transition-colors duration-200",
    "hover:bg-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:hover:bg-primary-hover",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:data-[state=unchecked]:bg-destructive/40",
    hitArea,
    focusRing,
  ],
  {
    variants: {
      size: {
        sm: "h-4 w-7",
        md: "h-5 w-9",
        lg: "h-6 w-11",
      },
    },
    defaultVariants: { size: "md" },
  }
);

const thumbSize = {
  sm: "size-3 data-[state=checked]:translate-x-3 rtl:data-[state=checked]:-translate-x-3 [&_svg]:size-2",
  md: "size-4 data-[state=checked]:translate-x-4 rtl:data-[state=checked]:-translate-x-4 [&_svg]:size-2.5",
  lg: "size-5 data-[state=checked]:translate-x-5 rtl:data-[state=checked]:-translate-x-5 [&_svg]:size-3",
} as const;

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
    VariantProps<typeof switchVariants> {
  invalid?: boolean;
  /** Icon shown in the thumb while on. */
  checkedIcon?: React.ReactNode;
  /** Icon shown in the thumb while off. */
  uncheckedIcon?: React.ReactNode;
  thumbClassName?: string;
}

/** Toggle switch with a springy thumb and optional thumb icons. Consumes `Field` context. */
export const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  (
    { className, thumbClassName, size, invalid, checkedIcon, uncheckedIcon, id, disabled, required, ...props },
    ref
  ) => {
    const field = useField({
      id,
      disabled,
      required,
      invalid,
      "aria-describedby": props["aria-describedby"],
      "aria-invalid": props["aria-invalid"],
    });
    return (
      <SwitchPrimitive.Root
        ref={ref}
        data-slot="switch"
        {...props}
        id={field.id}
        disabled={field.disabled}
        required={field.required}
        aria-invalid={field["aria-invalid"]}
        aria-describedby={field["aria-describedby"]}
        className={cn(switchVariants({ size }), className)}
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className={cn(
            "pointer-events-none relative flex translate-x-0 items-center justify-center rounded-full bg-white shadow-sm ring-0",
            "transition-transform duration-300 ease-spring",
            thumbSize[size ?? "md"],
            thumbClassName
          )}
        >
          {checkedIcon != null && (
            <span className="absolute inset-0 flex items-center justify-center text-primary opacity-0 transition-opacity duration-150 group-data-[state=checked]/switch:opacity-100">
              {checkedIcon}
            </span>
          )}
          {uncheckedIcon != null && (
            <span className="absolute inset-0 flex items-center justify-center text-muted-foreground opacity-100 transition-opacity duration-150 group-data-[state=checked]/switch:opacity-0">
              {uncheckedIcon}
            </span>
          )}
        </SwitchPrimitive.Thumb>
      </SwitchPrimitive.Root>
    );
  }
);
Switch.displayName = "Switch";

export interface SwitchFieldProps extends SwitchProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** `left` puts the label before the switch (settings style), `right` after it. Inside a `SettingsGroup`, use `SettingsRow type="toggle"`. */
  labelPosition?: "left" | "right";
  labelClassName?: string;
  wrapperClassName?: string;
}

/** Switch with a label and optional description, for forms. For settings pages use `SettingsRow type="toggle"` (whole-row target, icon, `disabledReason`). */
export const SwitchField = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchFieldProps>(
  ({ label, description, labelPosition = "right", labelClassName, wrapperClassName, id, size, ...props }, ref) => {
    const generated = React.useId();
    const switchId = id ?? `switch-${generated.replace(/:/g, "")}`;
    const descriptionId = description != null ? `${switchId}-description` : undefined;
    const left = labelPosition === "left";
    return (
      <div
        data-slot="switch-field"
        data-disabled={props.disabled ? "true" : undefined}
        className={cn("group flex items-start gap-3", left && "justify-between", wrapperClassName)}
      >
        <Switch
          ref={ref}
          id={switchId}
          size={size}
          {...props}
          aria-describedby={joinIds(props["aria-describedby"], descriptionId)}
          className={cn(left && "order-last", size === "lg" ? "mt-0" : size === "sm" ? "mt-0.5" : "mt-px", props.className)}
        />
        <div className={cn("grid gap-1", left && "flex-1")}>
          <label
            htmlFor={switchId}
            className={cn(
              "cursor-pointer select-none text-sm font-medium leading-5 text-foreground",
              "group-data-[disabled=true]:cursor-not-allowed group-data-[disabled=true]:opacity-60",
              labelClassName
            )}
          >
            {label}
          </label>
          {description != null && (
            <p id={descriptionId} className="text-sm leading-snug text-muted-foreground group-data-[disabled=true]:opacity-60">
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }
);
SwitchField.displayName = "SwitchField";

export interface SwitchGroupOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

export interface SwitchGroupProps
  extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "defaultValue" | "onChange"> {
  legend?: React.ReactNode;
  description?: React.ReactNode;
  options?: SwitchGroupOption[];
  value?: Record<string, boolean>;
  defaultValue?: Record<string, boolean>;
  onValueChange?: (value: Record<string, boolean>) => void;
  /** `card` wraps the rows in a bordered panel. */
  variant?: "plain" | "card";
  /** Label placement for generated rows. Defaults to `left` (settings style). */
  labelPosition?: "left" | "right";
  size?: "sm" | "md" | "lg";
}

/** Fieldset of switch rows separated by dividers. Use `options` + `value` record, or children. */
export const SwitchGroup = React.forwardRef<HTMLFieldSetElement, SwitchGroupProps>(
  (
    {
      legend,
      description,
      options,
      value: valueProp,
      defaultValue = {},
      onValueChange,
      variant = "plain",
      labelPosition = "left",
      size,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState<Record<string, boolean>>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    });
    const generated = React.useId();
    const descriptionId = description != null ? `switch-group-${generated.replace(/:/g, "")}-description` : undefined;
    return (
      <fieldset
        ref={ref}
        data-slot="switch-group"
        disabled={disabled}
        aria-describedby={descriptionId}
        className={cn("m-0 flex min-w-0 flex-col gap-3 border-0 p-0", className)}
        {...props}
      >
        {legend != null && <legend className="mb-1 p-0 text-sm font-semibold text-foreground">{legend}</legend>}
        {description != null && (
          <p id={descriptionId} className="-mt-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}
        <div
          className={cn(
            "flex flex-col divide-y divide-border",
            variant === "card" ? "rounded-box border border-border bg-card px-4 shadow-xs" : "",
            "[&>*]:py-3.5",
            variant === "plain" && "[&>*:first-child]:pt-1 [&>*:last-child]:pb-1"
          )}
        >
          {options
            ? options.map((o) => (
                <SwitchField
                  key={o.value}
                  name={o.value}
                  label={o.label}
                  description={o.description}
                  disabled={disabled || o.disabled}
                  labelPosition={labelPosition}
                  size={size}
                  checked={Boolean(value[o.value])}
                  onCheckedChange={(checked) => setValue({ ...value, [o.value]: checked })}
                />
              ))
            : children}
        </div>
      </fieldset>
    );
  }
);
SwitchGroup.displayName = "SwitchGroup";
