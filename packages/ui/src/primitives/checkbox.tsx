import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { RiCheckLine, RiSubtractLine } from "@remixicon/react";
import { cn, focusRing, hitArea } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useSafeId } from "../hooks/use-safe-id";
import { useField } from "./field";

function joinIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(" ") || undefined;
}

export const checkboxVariants = cva(
  [
    "peer group/checkbox relative inline-flex shrink-0 items-center justify-center rounded-xs border border-border-strong bg-background text-primary-foreground shadow-xs",
    "transition-[background-color,border-color,box-shadow,transform,translate,scale,rotate] duration-150 active:scale-90",
    "hover:border-primary/60",
    "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
    "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
    hitArea,
    focusRing,
  ],
  {
    variants: {
      /**
       * Box size: `sm` 14px or `md` 16px.
       * @default "md"
       */
      size: {
        sm: "size-3.5 [&_svg]:size-3",
        md: "size-4 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {
  /** Marks the checkbox invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. */
  invalid?: boolean;
}

/** Checkbox with checked, indeterminate and invalid states. Consumes `Field` context. */
export const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, size, invalid, id, disabled, required, ...props }, ref) => {
    const field = useField({
      id,
      disabled,
      required,
      invalid,
      "aria-describedby": props["aria-describedby"],
      "aria-invalid": props["aria-invalid"],
    });
    return (
      <CheckboxPrimitive.Root
        ref={ref}
        data-slot="checkbox"
        {...props}
        id={field.id}
        disabled={field.disabled}
        required={field.required}
        aria-invalid={field["aria-invalid"]}
        aria-describedby={field["aria-describedby"]}
        className={cn(checkboxVariants({ size }), className)}
      >
        <CheckboxPrimitive.Indicator
          data-slot="checkbox-indicator"
          className="flex items-center justify-center text-current data-[state=checked]:animate-in data-[state=checked]:zoom-in-50 data-[state=indeterminate]:animate-in data-[state=indeterminate]:zoom-in-50 duration-150"
        >
          <RiCheckLine aria-hidden className="hidden group-data-[state=checked]/checkbox:block" />
          <RiSubtractLine aria-hidden className="hidden group-data-[state=indeterminate]/checkbox:block" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  }
);
Checkbox.displayName = "Checkbox";

export interface CheckboxFieldProps extends CheckboxProps {
  /** Label shown beside the box and wired to it (`htmlFor`), so clicking it toggles the checkbox. */
  label?: React.ReactNode;
  /** Secondary text under the label, announced as the checkbox description. */
  description?: React.ReactNode;
  /** Classes for the `<label>` element. */
  labelClassName?: string;
  /** Class for the outer row. */
  wrapperClassName?: string;
}

/** Checkbox with a label and optional description. */
export const CheckboxField = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxFieldProps>(
  ({ label, description, labelClassName, wrapperClassName, className, id, size, ...props }, ref) => {
    const generated = useSafeId("checkbox");
    const inputId = id ?? generated;
    const descriptionId = description ? `${inputId}-description` : undefined;
    if (label == null && description == null) {
      return <Checkbox ref={ref} id={id} size={size} className={className} {...props} />;
    }
    return (
      <div
        data-slot="checkbox-field"
        data-disabled={props.disabled ? "true" : undefined}
        className={cn("group flex items-start gap-2.5", wrapperClassName)}
      >
        <Checkbox
          ref={ref}
          id={inputId}
          size={size}
          {...props}
          aria-describedby={joinIds(props["aria-describedby"], descriptionId)}
          className={cn(size === "sm" ? "mt-[3px]" : "mt-0.5", className)}
        />
        <div className="grid gap-1">
          {label != null && (
            <label
              htmlFor={inputId}
              className={cn(
                "cursor-pointer select-none text-sm font-medium leading-5 text-foreground",
                "peer-disabled:cursor-not-allowed group-data-[disabled=true]:cursor-not-allowed group-data-[disabled=true]:opacity-60",
                labelClassName
              )}
            >
              {label}
            </label>
          )}
          {description != null && (
            <p
              id={descriptionId}
              className="text-sm leading-snug text-muted-foreground group-data-[disabled=true]:opacity-60"
            >
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }
);
CheckboxField.displayName = "CheckboxField";

export interface CheckboxCardProps extends CheckboxProps {
  /** Primary text of the card (the whole card is the label and click target). */
  label: React.ReactNode;
  /** Supporting text under the label. */
  description?: React.ReactNode;
  /** Optional leading icon or media. */
  icon?: React.ReactNode;
  /** Where the checkbox sits in the card. */
  indicatorPosition?: "start" | "end";
  /** Class for the checkbox control (`className` styles the card). */
  checkboxClassName?: string;
}

/** Bordered, selectable card that toggles a checkbox. Highlighted when checked. */
export const CheckboxCard = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxCardProps>(
  ({ label, description, icon, indicatorPosition = "end", className, checkboxClassName, id, ...props }, ref) => {
    const generated = useSafeId("checkbox-card");
    const inputId = id ?? generated;
    const descriptionId = description ? `${inputId}-description` : undefined;
    return (
      <label
        htmlFor={inputId}
        data-slot="checkbox-card"
        className={cn(
          "group relative flex cursor-pointer items-start gap-3 rounded-box border border-border bg-card p-4 text-card-foreground shadow-xs",
          "transition-[background-color,border-color,box-shadow] duration-150 hover:border-border-strong hover:bg-subtle",
          "has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft/40 has-[[data-state=checked]]:ring-1 has-[[data-state=checked]]:ring-primary",
          "has-[[data-state=indeterminate]]:border-primary",
          "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/35",
          "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
          "[&_button[data-slot=checkbox]:focus-visible]:ring-0",
          className
        )}
      >
        {indicatorPosition === "start" && (
          <Checkbox
            ref={ref}
            id={inputId}
            {...props}
            aria-describedby={joinIds(props["aria-describedby"], descriptionId)}
            className={cn("mt-0.5", checkboxClassName)}
          />
        )}
        {icon != null && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-xs transition-colors group-has-[[data-state=checked]]:text-primary [&_svg]:size-[18px]">
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
        {indicatorPosition === "end" && (
          <Checkbox
            ref={ref}
            id={inputId}
            {...props}
            aria-describedby={joinIds(props["aria-describedby"], descriptionId)}
            className={cn("mt-0.5", checkboxClassName)}
          />
        )}
      </label>
    );
  }
);
CheckboxCard.displayName = "CheckboxCard";

/* ------------------------------------------------------------------ */
/* Group                                                               */
/* ------------------------------------------------------------------ */

interface CheckboxGroupContextValue {
  value: string[];
  toggle: (item: string, checked: boolean) => void;
  setAll: (checked: boolean) => void;
  items: Array<{ value: string; disabled: boolean }>;
  register: (item: string, disabled: boolean) => () => void;
  disabled: boolean;
  name?: string;
  size: "sm" | "md";
  invalid: boolean;
}

const CheckboxGroupContext = React.createContext<CheckboxGroupContextValue | null>(null);

function useCheckboxGroup(component: string) {
  const ctx = React.useContext(CheckboxGroupContext);
  if (!ctx) throw new Error(`<${component}> must be used inside <CheckboxGroup>.`);
  return ctx;
}

export interface CheckboxGroupOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

export interface CheckboxGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "dir"> {
  /** Controlled list of checked item values. Use with `onValueChange`. */
  value?: string[];
  /** Initially checked item values when uncontrolled. */
  defaultValue?: string[];
  /** Called with the full list of checked values after every toggle. */
  onValueChange?: (value: string[]) => void;
  /** Render items from data instead of children. */
  options?: CheckboxGroupOption[];
  /**
   * Stacks the items in a column or lays them out in a row.
   * @default "vertical"
   */
  orientation?: "vertical" | "horizontal";
  /** Group label shown above the items; it is the accessible name of the group. */
  label?: React.ReactNode;
  /** Help text under the group label. */
  description?: React.ReactNode;
  /** Disables every item in the group. */
  disabled?: boolean;
  /** Marks the group invalid: error styling on the items and `aria-invalid`. */
  invalid?: boolean;
  /** Form field name submitted for every checked item. */
  name?: string;
  /**
   * Checkbox size for every item in the group.
   * @default "md"
   */
  size?: "sm" | "md";
}

/** A set of checkboxes sharing a `string[]` value. */
export const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(
  (
    {
      value: valueProp,
      defaultValue = [],
      onValueChange,
      options,
      orientation = "vertical",
      label,
      description,
      disabled,
      invalid,
      name,
      size = "md",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const field = useField({ disabled, invalid, "aria-describedby": props["aria-describedby"] });
    const [value, setValue] = useControllableState<string[]>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    });
    const [items, setItems] = React.useState<Array<{ value: string; disabled: boolean }>>([]);
    const baseId = useSafeId("checkbox-group");

    const register = React.useCallback((item: string, itemDisabled: boolean) => {
      setItems((prev) => [...prev.filter((p) => p.value !== item), { value: item, disabled: itemDisabled }]);
      return () => setItems((prev) => prev.filter((p) => p.value !== item));
    }, []);

    const groupDisabled = Boolean(field.disabled);

    const ctx = React.useMemo<CheckboxGroupContextValue>(
      () => ({
        value,
        items,
        register,
        disabled: groupDisabled,
        name,
        size,
        invalid: field.invalid,
        toggle: (item, checked) =>
          setValue(checked ? (value.includes(item) ? value : [...value, item]) : value.filter((v) => v !== item)),
        setAll: (checked) => {
          const enabled = items.filter((i) => !i.disabled).map((i) => i.value);
          if (checked) setValue(Array.from(new Set([...value, ...enabled])));
          else setValue(value.filter((v) => !enabled.includes(v)));
        },
      }),
      [value, items, register, groupDisabled, name, size, field.invalid, setValue]
    );

    const labelId = label != null ? `${baseId}-label` : undefined;
    const descriptionId = description != null ? `${baseId}-description` : undefined;

    return (
      <CheckboxGroupContext.Provider value={ctx}>
        <div
          ref={ref}
          role="group"
          data-slot="checkbox-group"
          data-orientation={orientation}
          aria-labelledby={props["aria-labelledby"] ?? labelId}
          {...props}
          aria-describedby={joinIds(field["aria-describedby"], descriptionId)}
          aria-invalid={field["aria-invalid"]}
          className={cn("flex flex-col gap-3", className)}
        >
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
          <div
            className={cn(
              "flex",
              orientation === "vertical" ? "flex-col gap-3" : "flex-row flex-wrap items-start gap-x-6 gap-y-3"
            )}
          >
            {options
              ? options.map((o) => (
                  <CheckboxGroupItem
                    key={o.value}
                    value={o.value}
                    label={o.label}
                    description={o.description}
                    disabled={o.disabled}
                  />
                ))
              : children}
          </div>
        </div>
      </CheckboxGroupContext.Provider>
    );
  }
);
CheckboxGroup.displayName = "CheckboxGroup";

export interface CheckboxGroupItemProps
  extends Omit<CheckboxFieldProps, "value" | "checked" | "defaultChecked" | "onCheckedChange" | "name"> {
  /** Value added to or removed from the group's value when this item is toggled. */
  value: string;
}

/** A checkbox bound to its parent `CheckboxGroup`. */
export const CheckboxGroupItem = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxGroupItemProps>(
  ({ value, disabled, size, ...props }, ref) => {
    const group = useCheckboxGroup("CheckboxGroupItem");
    const isDisabled = group.disabled || Boolean(disabled);
    const { register } = group;
    React.useEffect(() => register(value, isDisabled), [register, value, isDisabled]);
    return (
      <CheckboxField
        ref={ref}
        value={value}
        name={group.name}
        size={size ?? group.size}
        disabled={isDisabled}
        invalid={group.invalid || undefined}
        checked={group.value.includes(value)}
        onCheckedChange={(c) => group.toggle(value, c === true)}
        {...props}
      />
    );
  }
);
CheckboxGroupItem.displayName = "CheckboxGroupItem";

export interface CheckboxGroupSelectAllProps
  extends Omit<CheckboxFieldProps, "checked" | "defaultChecked" | "onCheckedChange" | "value" | "name"> {}

/** Toggles every enabled item in the parent `CheckboxGroup`; indeterminate when partially selected. */
export const CheckboxGroupSelectAll = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxGroupSelectAllProps
>(({ label = "Select all", size, disabled, ...props }, ref) => {
  const group = useCheckboxGroup("CheckboxGroupSelectAll");
  const enabled = group.items.filter((i) => !i.disabled);
  const selected = enabled.filter((i) => group.value.includes(i.value)).length;
  const state: boolean | "indeterminate" =
    enabled.length > 0 && selected === enabled.length ? true : selected > 0 ? "indeterminate" : false;
  return (
    <CheckboxField
      ref={ref}
      label={label}
      size={size ?? group.size}
      disabled={group.disabled || disabled || enabled.length === 0}
      checked={state}
      onCheckedChange={() => group.setAll(state !== true)}
      {...props}
    />
  );
});
CheckboxGroupSelectAll.displayName = "CheckboxGroupSelectAll";
