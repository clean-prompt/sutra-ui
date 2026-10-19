import * as React from "react";
import { RiStarFill } from "@remixicon/react";
import { cn, type Size } from "../lib/cn";
import { pluralize } from "../lib/format";
import { clamp, toPercent } from "../lib/math";
import { useControllableState } from "../hooks/use-controllable-state";

const iconSizes: Record<Size, string> = { sm: "size-4", md: "size-5", lg: "size-6" };

export interface RatingProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "dir"> {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Number of stars. */
  max?: number;
  /** Allow half-star values (0.5 steps). */
  allowHalf?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  size?: Size;
  /** Icon component used for every star; receives `className`. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Class applied to the filled part of each icon (defaults to an amber fill). */
  activeClassName?: string;
  /** Class applied to the empty part of each icon. */
  inactiveClassName?: string;
  /** Builds the accessible label for each option. */
  getLabel?: (value: number, max: number) => string;
  /** Name for a hidden input, for native form submission. */
  name?: string;
}

const defaultGetLabel = (value: number, max: number) =>
  `${value} ${pluralize(value, "star")} out of ${max}`;

/** Star rating input with hover preview, half steps and radiogroup keyboard support. */
export const Rating = React.forwardRef<HTMLDivElement, RatingProps>(
  (
    {
      value: valueProp,
      defaultValue = 0,
      onValueChange,
      max = 5,
      allowHalf = false,
      readOnly = false,
      disabled = false,
      size = "md",
      icon: Icon = RiStarFill,
      activeClassName = "text-warning",
      inactiveClassName = "text-border-strong",
      getLabel = defaultGetLabel,
      name,
      className,
      onKeyDown,
      onMouseLeave,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState<number>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    });
    const [hover, setHover] = React.useState<number | null>(null);
    const starRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
    const interactive = !readOnly && !disabled;
    const display = interactive && hover !== null ? hover : value;
    const step = allowHalf ? 0.5 : 1;

    const valueFromPointer = (index: number, e: React.MouseEvent<HTMLElement>) => {
      if (!allowHalf) return index + 1;
      const rect = e.currentTarget.getBoundingClientRect();
      const isRtl = getComputedStyle(e.currentTarget).direction === "rtl";
      const x = isRtl ? rect.right - e.clientX : e.clientX - rect.left;
      return x < rect.width / 2 ? index + 0.5 : index + 1;
    };

    const commit = (next: number) => {
      const clamped = clamp(next, 0, max);
      setValue(clamped);
      const focusIndex = Math.max(0, Math.ceil(clamped) - 1);
      starRefs.current[focusIndex]?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || !interactive) return;
      const map: Record<string, () => number> = {
        ArrowRight: () => value + step,
        ArrowUp: () => value + step,
        ArrowLeft: () => value - step,
        ArrowDown: () => value - step,
        Home: () => step,
        End: () => max,
      };
      const fn = map[e.key];
      if (fn) {
        e.preventDefault();
        commit(fn());
      } else if (/^[0-9]$/.test(e.key) && Number(e.key) <= max) {
        e.preventDefault();
        commit(Number(e.key));
      }
    };

    const checkedIndex = Math.ceil(value) - 1;

    if (!interactive) {
      return (
        <div
          ref={ref}
          role="img"
          aria-label={`Rated ${value} out of ${max}`}
          aria-disabled={disabled || undefined}
          className={cn("inline-flex items-center gap-0.5", disabled && "opacity-50", className)}
          onKeyDown={onKeyDown}
          onMouseLeave={onMouseLeave}
          {...props}
        >
          {Array.from({ length: max }, (_, i) => (
            <RatingStar
              key={i}
              Icon={Icon}
              fill={clamp(display - i, 0, 1)}
              sizeClass={iconSizes[size]}
              activeClassName={activeClassName}
              inactiveClassName={inactiveClassName}
            />
          ))}
          {name && <input type="hidden" name={name} value={value} />}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        role="radiogroup"
        className={cn("inline-flex items-center gap-0.5", className)}
        onKeyDown={handleKeyDown}
        onMouseLeave={(e) => {
          setHover(null);
          onMouseLeave?.(e);
        }}
        {...props}
      >
        {Array.from({ length: max }, (_, i) => {
          const starValue = i + 1;
          const checked = i === checkedIndex;
          const focusable = checked || (checkedIndex < 0 && i === 0);
          return (
            <span
              key={i}
              ref={(el) => {
                starRefs.current[i] = el;
              }}
              role="radio"
              aria-checked={checked}
              aria-label={getLabel(checked && allowHalf ? value : starValue, max)}
              tabIndex={focusable ? 0 : -1}
              onMouseMove={(e) => setHover(valueFromPointer(i, e))}
              onClick={(e) => {
                const next = valueFromPointer(i, e);
                commit(next === value ? 0 : next);
              }}
              className={cn(
                "relative inline-flex cursor-pointer rounded-xs outline-none transition-transform duration-150",
                "hover:scale-110 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/35"
              )}
            >
              <RatingStar
                Icon={Icon}
                fill={clamp(display - i, 0, 1)}
                sizeClass={iconSizes[size]}
                activeClassName={cn(activeClassName, hover !== null && "opacity-90")}
                inactiveClassName={inactiveClassName}
              />
            </span>
          );
        })}
        {name && <input type="hidden" name={name} value={value} />}
      </div>
    );
  }
);
Rating.displayName = "Rating";

interface RatingStarProps {
  Icon: React.ComponentType<{ className?: string }>;
  /** 0 to 1. */
  fill: number;
  sizeClass: string;
  activeClassName: string;
  inactiveClassName: string;
}

function RatingStar({ Icon, fill, sizeClass, activeClassName, inactiveClassName }: RatingStarProps) {
  return (
    <span aria-hidden className={cn("relative inline-flex shrink-0", sizeClass)}>
      <Icon className={cn("size-full", inactiveClassName)} />
      {fill > 0 && (
        <span
          className="absolute inset-y-0 start-0 overflow-hidden transition-[width] duration-150"
          style={{ width: `${fill * 100}%` }}
        >
          <Icon className={cn("h-full", sizeClass, "max-w-none", activeClassName)} />
        </span>
      )}
    </span>
  );
}

export interface RatingSummaryProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Average score, e.g. 4.3. */
  average: number;
  /** Total number of ratings. Defaults to the sum of `distribution`. */
  count?: number;
  /** Ratings per star, keyed by star value: `{ 5: 120, 4: 40, … }`. */
  distribution?: Partial<Record<number, number>>;
  max?: number;
  /** Text after the count. */
  countLabel?: (count: number) => React.ReactNode;
  locale?: string;
}

/** Review summary: average score, stars, count and a 5→1 distribution chart. */
export const RatingSummary = React.forwardRef<HTMLDivElement, RatingSummaryProps>(
  (
    {
      average,
      count,
      distribution,
      max = 5,
      countLabel = (n) => pluralize(n, "rating"),
      locale,
      className,
      ...props
    },
    ref
  ) => {
    const rows = Array.from({ length: max }, (_, i) => max - i);
    const sum = rows.reduce((acc, star) => acc + (distribution?.[star] ?? 0), 0);
    const total = count ?? sum;
    const number = new Intl.NumberFormat(locale);
    const score = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8", className)}
        {...props}
      >
        <div className="flex shrink-0 flex-col gap-1.5">
          <span className="text-display-sm font-semibold tracking-tight text-foreground tabular-nums">
            {score.format(average)}
          </span>
          <Rating value={Math.round(average * 2) / 2} max={max} allowHalf readOnly size="sm" />
          <span className="text-sm text-muted-foreground">
            {number.format(total)} {countLabel(total)}
          </span>
        </div>
        {distribution && (
          <ul className="flex flex-1 flex-col gap-1.5" aria-label="Rating distribution">
            {rows.map((star) => {
              const n = distribution[star] ?? 0;
              const pct = toPercent(n, sum);
              return (
                <li key={star} className="flex items-center gap-3 text-sm">
                  <span className="flex w-8 shrink-0 items-center gap-1 text-muted-foreground tabular-nums">
                    {star}
                    <RiStarFill aria-hidden className="size-3 text-warning" />
                  </span>
                  <span
                    role="meter"
                    aria-label={`${star} star`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pct)}
                    className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted"
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-warning transition-[width] duration-500 ease-out-quart"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-muted-foreground tabular-nums">
                    {number.format(n)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
);
RatingSummary.displayName = "RatingSummary";
