import * as React from "react";
import { cva } from "class-variance-authority";
import { RiCheckLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { CloseButton } from "./close-button";
import { normalizeTone, toneClasses, type Tone, type ToneInput } from "../lib/tone";

export type ChipVariant = "outline" | "soft" | "solid";
/** @deprecated Use `ToneInput` with the `tone` prop (`brand` is `primary`). */
export type ChipColor = "neutral" | "brand" | "success" | "warning" | "destructive" | "info";

/** Resolve `tone` (canonical) or the legacy `color` to the chip's internal colour key. */
function chipColor(tone: ToneInput | undefined, color: ChipColor | undefined): ChipColor | undefined {
  if (tone) {
    const t = normalizeTone(tone);
    return t === "primary" ? "brand" : t;
  }
  return color;
}
export type ChipSize = "sm" | "md" | "lg";

const toneForColor: Record<ChipColor, Tone> = {
  neutral: "neutral",
  brand: "primary",
  success: "success",
  warning: "warning",
  destructive: "destructive",
  info: "info",
};

/** Soft and solid fills come from `toneClasses`, except neutral soft (full-strength text, hover) and the brand solid highlight. */
const filledCompounds = (Object.keys(toneForColor) as ChipColor[]).flatMap((color) => {
  const tone = toneForColor[color];
  return [
    {
      idle: false,
      variant: "soft" as const,
      color,
      className: color === "neutral" ? "bg-muted text-foreground hover:bg-border/70" : toneClasses.soft[tone],
    },
    {
      idle: false,
      variant: "solid" as const,
      color,
      className: color === "brand" ? `${toneClasses.solid.primary} shadow-inner-highlight` : toneClasses.solid[tone],
    },
  ];
});

export const chipVariants = cva(
  [
    "relative inline-flex max-w-full shrink-0 select-none items-center rounded-control border font-medium",
    "transition-[color,background-color,border-color,box-shadow,transform] duration-150",
    "has-[>button:first-child:active]:scale-[0.97]",
    "has-[>button:focus-visible]:ring-[3px] has-[>button:focus-visible]:ring-ring/35",
    "has-[>button:disabled]:pointer-events-none has-[>button:disabled]:opacity-50",
  ],
  {
    variants: {
      variant: {
        outline: "bg-background shadow-xs",
        soft: "border-transparent",
        solid: "border-transparent shadow-xs",
      },
      color: {
        neutral: "",
        brand: "",
        success: "",
        warning: "",
        destructive: "",
        info: "",
      },
      size: {
        sm: "h-7 gap-1 px-2 text-xs [&_svg]:size-3.5",
        md: "h-8 gap-1.5 px-2.5 text-sm [&_svg]:size-4",
        lg: "h-9 gap-1.5 px-3 text-sm [&_svg]:size-4",
      },
      idle: {
        true: "border-border bg-background text-muted-foreground shadow-xs hover:bg-accent hover:text-foreground",
        false: "",
      },
    },
    compoundVariants: [
      { idle: false, variant: "outline", color: "neutral", className: "border-border-strong text-foreground hover:bg-accent" },
      { idle: false, variant: "outline", color: "brand", className: "border-primary/50 bg-primary-soft/50 text-primary-soft-foreground" },
      { idle: false, variant: "outline", color: "success", className: "border-success/40 bg-success-soft/50 text-success-soft-foreground" },
      { idle: false, variant: "outline", color: "warning", className: "border-warning/50 bg-warning-soft/50 text-warning-soft-foreground" },
      { idle: false, variant: "outline", color: "destructive", className: "border-destructive/40 bg-destructive-soft/50 text-destructive-soft-foreground" },
      { idle: false, variant: "outline", color: "info", className: "border-info/40 bg-info-soft/50 text-info-soft-foreground" },
      ...filledCompounds,
    ],
    defaultVariants: { variant: "outline", color: "neutral", size: "md", idle: false },
  }
);

interface ChipGroupContextValue {
  isSelected: (value: string) => boolean;
  toggle: (value: string) => void;
  variant?: ChipVariant;
  color?: ChipColor;
  size?: ChipSize;
  disabled?: boolean;
}

const ChipGroupContext = React.createContext<ChipGroupContextValue | null>(null);

export interface ChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color" | "value"> {
  variant?: ChipVariant;
  /** Semantic colour. Default `neutral` (`primary` inside a `ChipGroup`). */
  tone?: ToneInput;
  /** @deprecated Use `tone` (`brand` is `primary`). */
  color?: ChipColor;
  size?: ChipSize;
  /** Controlled toggle state (renders `aria-pressed`). */
  selected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Identifies the chip inside a `ChipGroup`. */
  value?: string;
  /** Shows a remove button; Backspace/Delete also trigger it. */
  onRemove?: () => void;
  removeLabel?: string;
  leadingIcon?: React.ReactNode;
  /** Small avatar or image at the start (sized automatically). */
  avatar?: React.ReactNode;
  /** Show a check mark when selected and no leading icon is set. Default true. */
  showCheck?: boolean;
  /** Classes for the outer pill. `className` also targets the pill. */
  wrapperClassName?: string;
}

/** Interactive pill: toggleable filter, removable tag or selectable option. */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  (
    {
      className,
      wrapperClassName,
      variant: variantProp,
      tone: toneProp,
      color: colorProp,
      size: sizeProp,
      selected: selectedProp,
      defaultSelected,
      onSelectedChange,
      value,
      onRemove,
      removeLabel,
      leadingIcon,
      avatar,
      showCheck = true,
      disabled: disabledProp,
      onClick,
      onKeyDown,
      children,
      type,
      ...props
    },
    ref
  ) => {
    const group = React.useContext(ChipGroupContext);
    const variant = variantProp ?? group?.variant ?? "outline";
    const color = chipColor(toneProp, colorProp) ?? group?.color ?? (group ? "brand" : "neutral");
    const size = sizeProp ?? group?.size ?? "md";
    const disabled = disabledProp ?? group?.disabled;

    const [innerSelected, setInnerSelected] = React.useState(!!defaultSelected);
    const inGroup = !!group && value !== undefined;
    const selectable =
      inGroup || selectedProp !== undefined || defaultSelected !== undefined || !!onSelectedChange;
    const selected = inGroup
      ? group!.isSelected(value!)
      : selectedProp !== undefined
        ? selectedProp
        : innerSelected;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || !selectable) return;
      if (inGroup) group!.toggle(value!);
      else {
        if (selectedProp === undefined) setInnerSelected(!selected);
        onSelectedChange?.(!selected);
      }
    };

    const idle = selectable && !selected;
    const icon =
      leadingIcon ??
      (selectable && showCheck && !avatar ? (
        <span
          aria-hidden
          className={cn(
            "-ml-0.5 inline-flex overflow-hidden transition-[width,opacity] duration-200 ease-out-quart",
            selected ? "opacity-100" : "w-0 opacity-0",
            selected && (size === "sm" ? "w-3.5" : "w-4")
          )}
        >
          <RiCheckLine aria-hidden />
        </span>
      ) : null);

    return (
      <span
        data-state={selectable ? (selected ? "on" : "off") : undefined}
        className={cn(
          chipVariants({ variant, color, size, idle }),
          onRemove && (size === "sm" ? "pr-1" : "pr-1.5"),
          wrapperClassName,
          className
        )}
      >
        <button
          ref={ref}
          type={type ?? "button"}
          disabled={disabled}
          aria-pressed={selectable ? selected : undefined}
          onClick={handleClick}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (onRemove && (e.key === "Backspace" || e.key === "Delete")) {
              e.preventDefault();
              onRemove();
            }
          }}
          className={cn(
            "inline-flex min-w-0 items-center gap-[inherit] outline-none [&_svg]:shrink-0",
            !selectable && !onClick && !onRemove ? "cursor-default" : "cursor-pointer",
            "before:absolute before:inset-0 before:rounded-[inherit] before:content-['']"
          )}
          {...props}
        >
          {avatar ? (
            <span
              className={cn(
                "relative -ml-1 inline-flex shrink-0 overflow-hidden rounded-full [&_img]:size-full [&_img]:object-cover",
                size === "sm" ? "size-4" : size === "md" ? "size-5" : "size-6"
              )}
            >
              {avatar}
            </span>
          ) : null}
          {icon}
          <span className="relative truncate">{children}</span>
        </button>
        {onRemove ? (
          <CloseButton
            shape="pill"
            variant="current"
            size={size === "sm" ? "3xs" : "2xs"}
            disabled={disabled}
            tabIndex={-1}
            aria-label={removeLabel ?? "Remove"}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="relative z-[1] -mr-0.5 hover:bg-current/10"
          />
        ) : null}
      </span>
    );
  }
);
Chip.displayName = "Chip";

interface ChipGroupBaseProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color" | "defaultValue" | "onChange"> {
  variant?: ChipVariant;
  /** Semantic colour for every chip in the group. Default `primary`. */
  tone?: ToneInput;
  /** @deprecated Use `tone` (`brand` is `primary`). */
  color?: ChipColor;
  size?: ChipSize;
  disabled?: boolean;
}

export interface ChipGroupSingleProps extends ChipGroupBaseProps {
  type?: "single";
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Allow clicking the selected chip to clear the selection. Default true. */
  allowDeselect?: boolean;
}

export interface ChipGroupMultipleProps extends ChipGroupBaseProps {
  type: "multiple";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}

export type ChipGroupProps = ChipGroupSingleProps | ChipGroupMultipleProps;

function toArray(v: string | string[] | null | undefined): string[] {
  if (v === null || v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

/** Group of chips with single or multiple selection. */
export const ChipGroup = React.forwardRef<HTMLDivElement, ChipGroupProps>((allProps, ref) => {
  const {
    className,
    variant,
    tone,
    color: colorProp,
    size,
    disabled,
    type = "single",
    value,
    defaultValue,
    onValueChange,
    ...rest
  } = allProps;
  const { allowDeselect = true, ...props } = rest as typeof rest & { allowDeselect?: boolean };

  const color = chipColor(tone, colorProp);
  const [inner, setInner] = React.useState<string[]>(() => toArray(defaultValue));
  const controlled = value !== undefined;
  const current = controlled ? toArray(value) : inner;

  const ctx = React.useMemo<ChipGroupContextValue>(
    () => ({
      variant,
      color,
      size,
      disabled,
      isSelected: (v) => current.includes(v),
      toggle: (v) => {
        let next: string[];
        if (type === "multiple") {
          next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
        } else if (current.includes(v)) {
          if (!allowDeselect) return;
          next = [];
        } else {
          next = [v];
        }
        if (!controlled) setInner(next);
        if (type === "multiple") (onValueChange as ((v: string[]) => void) | undefined)?.(next);
        else (onValueChange as ((v: string | null) => void) | undefined)?.(next[0] ?? null);
      },
    }),
    [variant, color, size, disabled, current, type, allowDeselect, controlled, onValueChange]
  );

  return (
    <ChipGroupContext.Provider value={ctx}>
      <div
        ref={ref}
        role="group"
        className={cn("flex flex-wrap items-center gap-2", className)}
        {...props}
      />
    </ChipGroupContext.Provider>
  );
});
ChipGroup.displayName = "ChipGroup";
