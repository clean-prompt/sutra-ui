import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { cn, focusRing, type Size } from "../lib/cn";
import { toPercent } from "../lib/math";
import { accentClasses, accentStyle, type Accent } from "../lib/accent";
import { normalizeTone, type ToneInput } from "../lib/tone";

const sizes: Record<Size, { track: string; thumb: string; thumbPx: number }> = {
  sm: { track: "h-1", thumb: "size-3.5", thumbPx: 14 },
  md: { track: "h-1.5", thumb: "size-4", thumbPx: 16 },
  lg: { track: "h-2", thumb: "size-5", thumbPx: 20 },
};

export interface SliderMark {
  value: number;
  label?: React.ReactNode;
}

export interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  size?: Size;
  /** Show a value bubble above the thumb on hover, focus and drag. `"always"` keeps it visible. */
  showValue?: boolean | "always";
  /** Tick marks under the track; numbers or `{ value, label }`. */
  marks?: (number | SliderMark)[];
  formatValue?: (value: number) => React.ReactNode;
  /** Accessible labels per thumb, e.g. `["Minimum", "Maximum"]`. */
  thumbLabels?: string[];
  /** Accessible value text per thumb (`aria-valuetext`), e.g. `(v) => v + "%"`. */
  getValueText?: (value: number, index: number) => string;
  invalid?: boolean;
  /** Categorical colour for the range, thumb border and active marks. Default primary. */
  accent?: Accent;
  /** Semantic colour (`success`, `warning`, …). Takes precedence over `accent`. */
  tone?: ToneInput;
}

/**
 * Range input with one or more thumbs, optional value bubble and labeled marks. `ref` and `className` land on the
 * outer wrapper (which also holds the marks); the other props go to the Radix slider root inside it.
 */
export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      className,
      size = "md",
      showValue = false,
      marks,
      formatValue = (v) => v,
      thumbLabels,
      getValueText,
      invalid,
      accent: accentProp,
      tone,
      min = 0,
      max = 100,
      value,
      defaultValue,
      onValueChange,
      onPointerDown,
      ...props
    },
    ref
  ) => {
    const [internal, setInternal] = React.useState<number[]>(value ?? defaultValue ?? [min]);
    const current = value ?? internal;
    const [dragging, setDragging] = React.useState(false);
    const s = sizes[size];
    const accent: Accent | undefined = tone ? normalizeTone(tone) : accentProp;
    /* `invalid` wins over the accent. */
    const accented = Boolean(accent) && !invalid;

    React.useEffect(() => {
      if (!dragging) return;
      const stop = () => setDragging(false);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
      return () => {
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
      };
    }, [dragging]);

    const normalizedMarks = (marks ?? []).map((m) => (typeof m === "number" ? { value: m } : m));
    const hasMarkLabels = normalizedMarks.some((m) => m.label !== undefined);
    const percent = (v: number) => toPercent(v, max, min);
    const inBounds = (p: number) => `calc(${p}% + ${(s.thumbPx / 2) * (1 - p / 50)}px)`;

    return (
      <div ref={ref} className={cn("relative w-full", className)} style={accentStyle(accent)}>
        <SliderPrimitive.Root
          min={min}
          max={max}
          value={value}
          defaultValue={defaultValue}
          onValueChange={(next: number[]) => {
            if (value === undefined) setInternal(next);
            onValueChange?.(next);
          }}
          onPointerDown={(e: React.PointerEvent<HTMLSpanElement>) => {
            setDragging(true);
            onPointerDown?.(e);
          }}
          data-dragging={dragging ? "" : undefined}
          aria-invalid={invalid || undefined}
          className={cn(
            "relative flex w-full touch-none select-none items-center py-1.5",
            "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
            "data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:px-1.5 data-[orientation=vertical]:py-0"
          )}
          {...props}
        >
          <SliderPrimitive.Track
            className={cn(
              "relative w-full grow overflow-hidden rounded-full bg-muted",
              "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
              s.track,
              invalid && "bg-destructive-soft"
            )}
          >
            <SliderPrimitive.Range
              className={cn(
                "absolute h-full rounded-full data-[orientation=vertical]:w-full",
                invalid ? "bg-destructive" : accented ? accentClasses.solid : "bg-primary"
              )}
            />
          </SliderPrimitive.Track>
          {current.map((v, i) => (
            <SliderPrimitive.Thumb
              key={i}
              aria-label={thumbLabels?.[i] ?? (current.length > 1 ? (i === 0 ? "Minimum" : "Maximum") : undefined)}
              aria-valuetext={getValueText?.(v, i)}
              className={cn(
                "group/thumb relative block rounded-full border-2 bg-background shadow-sm",
                "transition-[box-shadow,transform] duration-150 hover:ring-[3px] active:scale-110",
                accented
                  ? "border-[var(--sutra-accent,var(--primary))] hover:ring-[color-mix(in_oklab,var(--sutra-accent,var(--primary))_15%,transparent)]"
                  : "border-primary hover:ring-primary/15",
                focusRing,
                "data-[disabled]:pointer-events-none",
                invalid && "border-destructive",
                s.thumb
              )}
            >
              {showValue && (
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-inverse px-1.5 py-0.5 text-xs font-medium text-inverse-foreground tabular-nums shadow-md",
                    "after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-inverse after:content-['']",
                    "transition-[opacity,transform] duration-150",
                    showValue === "always"
                      ? "opacity-100"
                      : cn(
                          "translate-y-1 opacity-0",
                          "group-hover/thumb:translate-y-0 group-hover/thumb:opacity-100",
                          "group-focus-visible/thumb:translate-y-0 group-focus-visible/thumb:opacity-100",
                          dragging && "translate-y-0 opacity-100"
                        )
                  )}
                >
                  {formatValue(v)}
                </span>
              )}
            </SliderPrimitive.Thumb>
          ))}
        </SliderPrimitive.Root>
        {normalizedMarks.length > 0 && (
          <div aria-hidden className={cn("pointer-events-none relative w-full", hasMarkLabels ? "h-6" : "h-2")}>
            {normalizedMarks.map((mark) => {
              const p = percent(mark.value);
              const active =
                current.length > 1
                  ? mark.value >= current[0] && mark.value <= current[current.length - 1]
                  : mark.value <= (current[0] ?? min);
              return (
                <div
                  key={mark.value}
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1"
                  style={{ left: inBounds(p) }}
                >
                  <span
                    className={cn(
                      "h-1.5 w-px",
                      active
                        ? accented
                          ? "bg-[color-mix(in_oklab,var(--sutra-accent,var(--primary))_60%,transparent)]"
                          : "bg-primary/60"
                        : "bg-border-strong"
                    )}
                  />
                  {mark.label !== undefined && (
                    <span className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">{mark.label}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);
Slider.displayName = "Slider";

export interface RangeSliderProps extends SliderProps {}

/** `Slider` preset with two thumbs (defaults to the full min–max range). */
export const RangeSlider = React.forwardRef<HTMLDivElement, RangeSliderProps>(
  ({ min = 0, max = 100, defaultValue, value, minStepsBetweenThumbs = 1, ...props }, ref) => (
    <Slider
      ref={ref}
      min={min}
      max={max}
      value={value}
      defaultValue={value ? undefined : (defaultValue ?? [min, max])}
      minStepsBetweenThumbs={minStepsBetweenThumbs}
      {...props}
    />
  )
);
RangeSlider.displayName = "RangeSlider";
