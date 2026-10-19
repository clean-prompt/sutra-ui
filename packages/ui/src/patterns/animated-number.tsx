import * as React from "react";
import { cn } from "../lib/cn";
import { splitNumberParts } from "../lib/number-parts";
import { useAddedKeys } from "../hooks/use-added-keys";

export interface AnimatedNumberProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number;
  /** `Intl.NumberFormat` options (currency, percent, compact, fraction digits …). */
  format?: Intl.NumberFormatOptions;
  /** BCP 47 locale. Pass one explicitly when the server and the browser must agree (SSR). Defaults to the runtime locale. */
  locale?: string | string[];
  /** Milliseconds for a digit to roll. Defaults to the fill speed token (`--sutra-duration-fill`). */
  duration?: number;
  /** Roll the digits when `value` changes. `false` renders plain formatted text. Default true. */
  animate?: boolean;
}

/**
 * A number whose digits roll to their new values, in tabular figures. Each digit is a column of 0 to 9 slid with a CSS
 * transition, so the first render shows the value without motion and reduced motion shows changes at once. Screen
 * readers get the formatted value once as text (the columns are hidden from them, and from copy and paste); add
 * `aria-live="polite"` to announce changes. Numbers only: format other values yourself.
 */
export const AnimatedNumber = React.forwardRef<HTMLSpanElement, AnimatedNumberProps>(
  ({ value, format, locale, duration, animate = true, className, style, ...props }, ref) => {
    const formatKey = JSON.stringify(format ?? null);
    const localeKey = Array.isArray(locale) ? locale.join(",") : locale;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const { text, columns, glyphs } = React.useMemo(() => splitNumberParts(value, format, locale), [value, formatKey, localeKey]);
    const added = useAddedKeys(columns.map((c) => c.key));

    if (!animate) {
      return (
        <span ref={ref} data-slot="animated-number" data-animate="false" className={cn("tabular-nums", className)} style={style} {...props}>
          {text}
        </span>
      );
    }
    const timing = duration != null && duration >= 0 ? { transitionDuration: `${duration}ms` } : undefined;
    return (
      <span
        ref={ref}
        data-slot="animated-number"
        data-animate="true"
        className={cn("relative inline-flex items-baseline whitespace-pre tabular-nums", className)}
        style={style}
        {...props}
      >
        <span className="sr-only">{text}</span>
        <span aria-hidden="true" className="inline-flex select-none items-baseline">
          {columns.map((col) =>
            col.kind === "digit" ? (
              <span
                key={col.key}
                data-slot="animated-number-digit"
                data-digit={col.digit}
                className={cn("relative inline-block overflow-clip", added.has(col.key) && "animate-fade-in")}
              >
                <span className="invisible">{glyphs[0]}</span>
                <span
                  className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-(--sutra-duration-fill) ease-(--sutra-ease)"
                  style={{ transform: `translateY(${-(col.digit ?? 0) * 10}%)`, ...timing }}
                >
                  {glyphs.map((glyph, i) => (
                    <span key={i} className="block text-center">
                      {glyph}
                    </span>
                  ))}
                </span>
              </span>
            ) : (
              <span key={col.key} data-slot="animated-number-text">
                {col.text}
              </span>
            )
          )}
        </span>
      </span>
    );
  }
);
AnimatedNumber.displayName = "AnimatedNumber";
