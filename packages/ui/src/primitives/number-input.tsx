import * as React from "react";
import { RiAddLine, RiArrowDownSLine, RiArrowUpSLine, RiSubtractLine } from "@remixicon/react";
import { cn, type Size } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { roundTo } from "../lib/math";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { useField } from "./field";
import { inputShellVariants } from "./input";

export interface NumberInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "defaultValue" | "onChange" | "size" | "min" | "max" | "step" | "type" | "prefix"
  > {
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Step used by PageUp / PageDown and Shift+Arrow. Defaults to `step * 10`. */
  largeStep?: number;
  /** Fixed number of decimals; values are rounded to it. */
  precision?: number;
  /** Display formatting, e.g. `{ style: "currency", currency: "USD" }`. */
  formatOptions?: Intl.NumberFormatOptions;
  locale?: string;
  /** `split` renders − value +, `stacked` renders chevrons on the right. */
  layout?: "split" | "stacked";
  size?: Size;
  invalid?: boolean;
  /** Clamp typed values to min/max on blur. */
  clampOnBlur?: boolean;
  /** Class for the outer group. */
  wrapperClassName?: string;
  incrementLabel?: string;
  decrementLabel?: string;
}

function decimalsOf(n: number) {
  if (!Number.isFinite(n)) return 0;
  const s = String(n);
  if (s.includes("e-")) return Number(s.split("e-")[1]);
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
}


const splitButton: Record<Size, string> = { sm: "w-8", md: "w-9", lg: "w-10" };

/** Numeric stepper with keyboard support, press-and-hold repeat and locale-aware formatting. */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value: valueProp,
      defaultValue = null,
      onValueChange,
      min,
      max,
      step = 1,
      largeStep,
      precision,
      formatOptions,
      locale,
      layout = "split",
      size = "md",
      invalid,
      clampOnBlur = true,
      className,
      wrapperClassName,
      incrementLabel = "Increase",
      decrementLabel = "Decrease",
      id,
      disabled,
      required,
      readOnly,
      name,
      placeholder,
      onBlur,
      onFocus,
      onKeyDown,
      ...props
    },
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
    const generatedId = React.useId();
    const inputId = field.id ?? `number-input-${generatedId.replace(/:/g, "")}`;

    const [value, setValue] = useControllableState<number | null>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    });
    const [draft, setDraft] = React.useState<string | null>(null);

    const decimals = precision ?? decimalsOf(step);
    const formatter = React.useMemo(() => {
      const opts: Intl.NumberFormatOptions = { ...formatOptions };
      if (precision != null) {
        opts.minimumFractionDigits = precision;
        opts.maximumFractionDigits = precision;
      } else if (opts.maximumFractionDigits == null && opts.style !== "currency" && opts.style !== "percent") {
        opts.maximumFractionDigits = Math.max(3, decimals);
      }
      return new Intl.NumberFormat(locale, opts);
    }, [locale, formatOptions, precision, decimals]);

    const separators = React.useMemo(() => {
      const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
      return {
        group: parts.find((p) => p.type === "group")?.value ?? ",",
        decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
      };
    }, [locale]);

    /** Currency, percent and literal affixes to strip, and the locale's native digits mapped to ASCII. */
    const parseInfo = React.useMemo(() => {
      const affixTypes = new Set(["currency", "percentSign", "unit", "literal", "compact"]);
      const affixes = [
        ...new Set(
          formatter
            .formatToParts(-1234.5)
            .filter((p) => affixTypes.has(p.type))
            .map((p) => p.value.trim())
            .filter(Boolean)
        ),
      ].sort((a, b) => b.length - a.length);
      const digits = new Map<string, string>();
      try {
        const native = new Intl.NumberFormat(locale, {
          numberingSystem: formatter.resolvedOptions().numberingSystem,
          useGrouping: false,
        });
        for (let d = 0; d < 10; d++) {
          const ch = native.format(d);
          if (ch !== String(d)) digits.set(ch, String(d));
        }
      } catch {
        /* ASCII digits only */
      }
      return { affixes, digits };
    }, [formatter, locale]);

    const isPercent = formatOptions?.style === "percent";

    const format = React.useCallback((n: number | null) => (n == null ? "" : formatter.format(n)), [formatter]);

    const parse = React.useCallback(
      (text: string): number | null => {
        let s = text.trim();
        if (!s) return null;
        // Strip affixes first: a symbol such as "лв." would otherwise leave a stray decimal point.
        for (const affix of parseInfo.affixes) s = s.split(affix).join("");
        s = s.split(separators.group).join("").replace(/[\s  ]/g, "");
        if (separators.decimal !== ".") s = s.split(separators.decimal).join(".");
        if (parseInfo.digits.size) s = Array.from(s, (ch) => parseInfo.digits.get(ch) ?? ch).join("");
        s = s.replace(/[−‒–]/g, "-").replace(/[^0-9.\-]/g, "");
        const negative = s.startsWith("-");
        s = s.replace(/-/g, "");
        const n = Number((negative ? "-" : "") + s);
        if (!Number.isFinite(n) || s === "" || s === ".") return null;
        return isPercent ? n / 100 : n;
      },
      [separators, parseInfo, isPercent]
    );

    const clamp = React.useCallback(
      (n: number) => {
        let r = n;
        if (min != null) r = Math.max(min, r);
        if (max != null) r = Math.min(max, r);
        return r;
      },
      [min, max]
    );

    const normalize = React.useCallback(
      (n: number, doClamp = true) => {
        const rounded = precision != null ? roundTo(n, precision) : n;
        return doClamp ? clamp(rounded) : rounded;
      },
      [precision, clamp]
    );

    const valueRef = React.useRef(value);
    valueRef.current = value;
    const draftRef = React.useRef(draft);
    draftRef.current = draft;
    const setValueRef = useLatestRef(setValue);

    const interactive = !field.disabled && !readOnly;
    const canIncrement = interactive && (max == null || value == null || value < max);
    const canDecrement = interactive && (min == null || value == null || value > min);

    const stepBy = React.useCallback(
      (direction: 1 | -1, amount = step) => {
        const pending = draftRef.current;
        const base = pending != null ? parse(pending) : valueRef.current;
        let next: number;
        if (base == null) {
          next = direction > 0 ? (min ?? 0) : (max ?? 0);
          if (min == null && max == null) next = direction * amount;
        } else {
          next = base + direction * amount;
        }
        next = clamp(roundTo(next, Math.max(decimals, decimalsOf(amount))));
        if (precision != null) next = roundTo(next, precision);
        valueRef.current = next;
        draftRef.current = null;
        setDraft(null);
        setValueRef.current(next);
        return next;
      },
      [step, parse, min, max, clamp, decimals, precision]
    );

    const commit = React.useCallback(() => {
      const pending = draftRef.current;
      if (pending == null) return;
      const parsed = parse(pending);
      const next = parsed == null ? null : normalize(parsed, clampOnBlur);
      draftRef.current = null;
      setDraft(null);
      valueRef.current = next;
      setValueRef.current(next);
    }, [parse, normalize, clampOnBlur]);

    const timers = React.useRef<{ timeout?: ReturnType<typeof setTimeout>; interval?: ReturnType<typeof setInterval> }>({});
    const stopRepeat = React.useCallback(() => {
      clearTimeout(timers.current.timeout);
      clearInterval(timers.current.interval);
      timers.current = {};
    }, []);
    React.useEffect(() => stopRepeat, [stopRepeat]);

    const startRepeat = (direction: 1 | -1) => {
      stopRepeat();
      const atBound = (n: number) => (direction > 0 ? max != null && n >= max : min != null && n <= min);
      const first = stepBy(direction);
      if (atBound(first)) return;
      timers.current.timeout = setTimeout(() => {
        timers.current.interval = setInterval(() => {
          const n = stepBy(direction);
          if (atBound(n)) stopRepeat();
        }, 60);
      }, 400);
      const stop = () => {
        stopRepeat();
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
        window.removeEventListener("blur", stop);
      };
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
      window.addEventListener("blur", stop);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || !interactive) return;
      const big = largeStep ?? step * 10;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          stepBy(1, e.shiftKey ? big : step);
          break;
        case "ArrowDown":
          e.preventDefault();
          stepBy(-1, e.shiftKey ? big : step);
          break;
        case "PageUp":
          e.preventDefault();
          stepBy(1, big);
          break;
        case "PageDown":
          e.preventDefault();
          stepBy(-1, big);
          break;
        case "Home":
          if (min != null) {
            e.preventDefault();
            setDraft(null);
            setValue(min);
          }
          break;
        case "End":
          if (max != null) {
            e.preventDefault();
            setDraft(null);
            setValue(max);
          }
          break;
        case "Enter":
          commit();
          break;
      }
    };

    const display = draft ?? format(value);

    const stepButton = (direction: 1 | -1, className: string) => {
      const enabled = direction > 0 ? canIncrement : canDecrement;
      const Icon =
        layout === "split" ? (direction > 0 ? RiAddLine : RiSubtractLine) : direction > 0 ? RiArrowUpSLine : RiArrowDownSLine;
      return (
        <button
          type="button"
          tabIndex={-1}
          aria-label={direction > 0 ? incrementLabel : decrementLabel}
          aria-controls={inputId}
          disabled={!enabled}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            startRepeat(direction);
          }}
          onMouseDown={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              stepBy(direction);
            }
          }}
          className={cn(
            "flex shrink-0 touch-manipulation select-none items-center justify-center text-muted-foreground transition-[color,background-color] duration-150",
            "hover:bg-muted hover:text-foreground active:bg-accent disabled:pointer-events-none disabled:opacity-40",
            className
          )}
        >
          <Icon className={layout === "split" ? "size-4" : "size-3.5"} aria-hidden />
        </button>
      );
    };

    return (
      <div
        data-slot="number-input"
        data-layout={layout}
        className={cn(
          "group/number relative flex w-full min-w-0 items-stretch overflow-hidden",
          inputShellVariants({ focus: "within", invalid: field.invalid, disabled: field.disabled, size }),
          wrapperClassName
        )}
      >
        {layout === "split" && stepButton(-1, cn("border-r border-input", splitButton[size]))}
        <input
          ref={ref}
          data-slot="number-input-field"
          type="text"
          inputMode={decimals > 0 || (min != null && min < 0) ? "decimal" : "numeric"}
          role="spinbutton"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          {...props}
          id={inputId}
          disabled={field.disabled}
          required={field.required}
          readOnly={readOnly}
          placeholder={placeholder}
          aria-invalid={field["aria-invalid"]}
          aria-describedby={field["aria-describedby"]}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value ?? undefined}
          aria-valuetext={value != null ? format(value) : undefined}
          value={display}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={onFocus}
          onBlur={(e) => {
            commit();
            onBlur?.(e);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
            layout === "split" ? "text-center" : "text-left",
            className
          )}
        />
        {layout === "split" ? (
          stepButton(1, cn("border-l border-input", splitButton[size]))
        ) : (
          <div className="flex w-7 shrink-0 flex-col border-l border-input">
            {stepButton(1, "flex-1 border-b border-input")}
            {stepButton(-1, "flex-1")}
          </div>
        )}
        {name && <input type="hidden" name={name} value={value ?? ""} disabled={field.disabled} />}
      </div>
    );
  }
);
NumberInput.displayName = "NumberInput";
