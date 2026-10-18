import * as React from "react";
import { RiCloseCircleFill, RiTimeLine } from "@remixicon/react";
import { cn, focusRing, type Size } from "../lib/cn";
import { pad2 } from "../lib/time";
import { useField, useFieldContext } from "./field";

/* ---------------------------------------------------------------- */
/* Time value helpers                                                */
/* ---------------------------------------------------------------- */

/** Precision of a `TimePicker`: `"minute"` gives `"HH:mm"`, `"second"` gives `"HH:mm:ss"`. */
export type TimeGranularity = "minute" | "second";

/** Seconds since midnight for `"HH:mm"` / `"HH:mm:ss"`, or `null` when the string isn't a valid time. */
function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const s = m[3] ? Number(m[3]) : 0;
  if (h > 23 || min > 59 || s > 59) return null;
  return h * 3600 + min * 60 + s;
}

function formatTime(total: number, granularity: TimeGranularity) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return granularity === "second" ? `${pad2(h)}:${pad2(m)}:${pad2(s)}` : `${pad2(h)}:${pad2(m)}`;
}

type SegmentType = "hour" | "minute" | "second" | "dayPeriod";

interface Segments {
  /** Display hour: 0–23 on a 24-hour clock, 1–12 on a 12-hour clock. */
  hour: number | null;
  minute: number | null;
  second: number | null;
  /** 0 = AM, 1 = PM. Only used on a 12-hour clock. */
  period: 0 | 1;
}

const EMPTY: Segments = { hour: null, minute: null, second: null, period: 0 };

function toSegments(total: number | null, is12: boolean): Segments {
  if (total == null) return EMPTY;
  const h = Math.floor(total / 3600);
  return {
    hour: is12 ? h % 12 || 12 : h,
    minute: Math.floor((total % 3600) / 60),
    second: total % 60,
    period: h >= 12 ? 1 : 0,
  };
}

/** Seconds since midnight, or `null` while a needed segment is empty. */
function segmentsToTotal(s: Segments, is12: boolean, granularity: TimeGranularity): number | null {
  if (s.hour == null || s.minute == null) return null;
  if (granularity === "second" && s.second == null) return null;
  const h = is12 ? (s.hour % 12) + (s.period ? 12 : 0) : s.hour;
  return h * 3600 + s.minute * 60 + (granularity === "second" ? (s.second ?? 0) : 0);
}

/** Clamp seconds-of-day into `[min, max]`. */
function clampTotal(total: number, min: number | null, max: number | null) {
  if (min != null && total < min) return min;
  if (max != null && total > max) return max;
  return total;
}

/** Resolve whether a locale uses a 12-hour clock. */
function localeUses12h(locale?: string) {
  try {
    const cycle = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle;
    return cycle === "h11" || cycle === "h12";
  } catch {
    return false;
  }
}

interface LayoutPart {
  type: SegmentType;
  /** Separator rendered before this segment. */
  before: string;
}

/** Segment order and separators for a locale, e.g. `오후 3:04` puts the day period first. */
function segmentLayout(locale: string | undefined, is12: boolean, granularity: TimeGranularity) {
  let periods: [string, string] = ["AM", "PM"];
  let layout: LayoutPart[] = [];
  try {
    const opts: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      ...(granularity === "second" ? { second: "2-digit" } : null),
      hour12: is12,
    };
    const fmt = new Intl.DateTimeFormat(locale, opts);
    const parts = fmt.formatToParts(new Date(2000, 0, 1, 15, 4, 5));
    let pending = "";
    for (const p of parts) {
      if (p.type === "literal") pending += p.value;
      else if (p.type === "hour" || p.type === "minute" || p.type === "second" || p.type === "dayPeriod") {
        layout.push({ type: p.type, before: layout.length ? pending : "" });
        pending = "";
      }
    }
    if (is12) {
      const am = new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true })
        .formatToParts(new Date(2000, 0, 1, 3))
        .find((p) => p.type === "dayPeriod")?.value;
      const pm = parts.find((p) => p.type === "dayPeriod")?.value;
      if (am && pm) periods = [am, pm];
    }
  } catch {
    layout = [];
  }
  const wanted: SegmentType[] = ["hour", "minute", ...(granularity === "second" ? ["second" as const] : []), ...(is12 ? ["dayPeriod" as const] : [])];
  if (wanted.some((t) => !layout.some((l) => l.type === t))) {
    layout = wanted.map((type, i) => ({ type, before: i === 0 ? "" : type === "dayPeriod" ? " " : ":" }));
  }
  return { layout: layout.filter((l) => wanted.includes(l.type)), periods };
}

/* ---------------------------------------------------------------- */
/* TimePicker                                                        */
/* ---------------------------------------------------------------- */

export interface TimePickerLabels {
  hour?: string;
  minute?: string;
  second?: string;
  dayPeriod?: string;
  clear?: string;
  /** Spoken value of an empty segment. */
  empty?: string;
}

const defaultLabels: Required<TimePickerLabels> = {
  hour: "Hour",
  minute: "Minute",
  second: "Second",
  dayPeriod: "AM/PM",
  clear: "Clear time",
  empty: "Empty",
};

export interface TimePickerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "role" | "children"> {
  /** Time as `"HH:mm"` (24-hour), or `"HH:mm:ss"` with `granularity="second"`. `undefined` means empty. */
  value?: string;
  defaultValue?: string;
  /** Called with the new time, or `undefined` when it is cleared or no longer complete. */
  onValueChange?: (value: string | undefined) => void;
  /** Force a 12- or 24-hour clock. Defaults to the locale's convention. */
  hourCycle?: 12 | 24;
  /** BCP 47 locale for the clock convention, segment order and AM/PM labels. */
  locale?: string;
  /** Show a seconds segment. Default `"minute"`. */
  granularity?: TimeGranularity;
  /** Minutes moved by the minute segment's arrow keys (snaps to multiples). Default 1. */
  step?: number;
  /** Earliest allowed time (`"HH:mm"`). Values outside the range are clamped. */
  min?: string;
  /** Latest allowed time (`"HH:mm"`). */
  max?: string;
  /** Show an inline button that clears the time. */
  clearable?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** Marks the field required. Inherited from a surrounding `Field` when omitted. */
  required?: boolean;
  invalid?: boolean;
  size?: Size;
  /** Submits the value under this name through a hidden input. */
  name?: string;
  /** Override the segment names and the clear button label (i18n). */
  labels?: TimePickerLabels;
  /** Show the leading clock icon. Default true. */
  icon?: boolean;
}

const wrapperClass = cn(
  "group/time relative flex w-full min-w-0 cursor-text items-center gap-2 rounded-control border border-input bg-background text-sm text-foreground shadow-xs",
  "transition-[color,box-shadow,border-color] duration-150 hover:border-border-strong",
  "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/35",
  "data-[invalid]:border-destructive data-[invalid]:ring-[3px] data-[invalid]:ring-destructive/20",
  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"
);

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-2.5 [&_svg]:size-4",
  md: "h-9 px-3 [&_svg]:size-4",
  lg: "h-10 px-3.5 [&_svg]:size-[18px]",
};

const segmentClass = cn(
  "h-6 min-w-0 rounded-xs bg-transparent px-0.5 text-center tabular-nums caret-transparent outline-none",
  "selection:bg-transparent focus:bg-primary-soft focus:text-primary-soft-foreground",
  "disabled:cursor-not-allowed read-only:cursor-default"
);

/**
 * Time field with hour, minute (and optional second / AM-PM) segments. Each segment is a spinbutton:
 * arrows step it, digits type into it, Backspace clears it. Value is a 24-hour `"HH:mm"` string.
 */
export const TimePicker = React.forwardRef<HTMLDivElement, TimePickerProps>((props, ref) => {
  const {
    value: valueProp,
    defaultValue,
    onValueChange,
    hourCycle,
    locale,
    granularity = "minute",
    step: stepProp = 1,
    min,
    max,
    clearable,
    disabled: disabledProp,
    readOnly,
    required: requiredProp,
    invalid: invalidProp,
    size = "md",
    name,
    labels: labelsProp,
    icon = true,
    id,
    className,
    onMouseDown,
    onBlur,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...rest
  } = props;

  const fieldCtx = useFieldContext();
  const field = useField({
    id,
    disabled: disabledProp,
    required: requiredProp,
    invalid: invalidProp,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });
  const disabled = !!field.disabled;
  const labels = { ...defaultLabels, ...labelsProp };
  const step = Math.min(59, Math.max(1, Math.round(stepProp) || 1));

  const is12 = hourCycle ? hourCycle === 12 : localeUses12h(locale);
  const { layout, periods } = React.useMemo(() => segmentLayout(locale, is12, granularity), [locale, is12, granularity]);
  const minTotal = parseTime(min);
  const maxTotal = parseTime(max);

  const isControlled = "value" in props;
  const [internal, setInternal] = React.useState<string | undefined>(defaultValue);
  const rawValue = isControlled ? valueProp : internal;
  const valueTotal = parseTime(rawValue);
  const value = valueTotal == null ? undefined : formatTime(valueTotal, granularity);

  const [segs, setSegs] = React.useState<Segments>(() => toSegments(valueTotal, is12));
  const syncKey = `${value ?? ""}|${is12}`;
  const [prevSyncKey, setPrevSyncKey] = React.useState(syncKey);
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    const current = segmentsToTotal(segs, is12, granularity);
    if (current !== valueTotal || prevSyncKey.split("|")[1] !== String(is12)) setSegs(toSegments(valueTotal, is12));
  }

  const segsRef = React.useRef(segs);
  segsRef.current = segs;
  const valueRef = React.useRef(value);
  valueRef.current = value;
  /** Digits typed into a segment that may still take another digit. */
  const pending = React.useRef<{ type: SegmentType; digits: string } | null>(null);
  const inputs = React.useRef<Partial<Record<SegmentType, HTMLInputElement | null>>>({});

  const emit = (next: string | undefined) => {
    if (next === valueRef.current) return;
    valueRef.current = next;
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  };

  /** Store segments; with `commit`, clamp to min/max and report the value. */
  const update = (next: Segments, commit = true) => {
    let total = segmentsToTotal(next, is12, granularity);
    if (commit && total != null) {
      const clamped = clampTotal(total, minTotal, maxTotal);
      if (clamped !== total) {
        total = clamped;
        next = toSegments(clamped, is12);
      }
    }
    segsRef.current = next;
    setSegs(next);
    if (commit) emit(total == null ? undefined : formatTime(total, granularity));
  };

  const order = layout.map((l) => l.type);
  const focusSegment = (type: SegmentType | undefined) => {
    if (type) inputs.current[type]?.focus();
  };
  const neighbour = (type: SegmentType, dir: 1 | -1) => order[order.indexOf(type) + dir];

  const range = (type: SegmentType): [number, number] =>
    type === "hour" ? (is12 ? [1, 12] : [0, 23]) : type === "dayPeriod" ? [0, 1] : [0, 59];

  const segValue = (s: Segments, type: SegmentType) =>
    type === "dayPeriod" ? s.period : type === "hour" ? s.hour : type === "minute" ? s.minute : s.second;

  const withSeg = (s: Segments, type: SegmentType, v: number | null): Segments =>
    type === "dayPeriod" ? { ...s, period: v ? 1 : 0 } : { ...s, [type]: v };

  const stepSegment = (type: SegmentType, dir: 1 | -1) => {
    pending.current = null;
    const s = segsRef.current;
    const [lo, hi] = range(type);
    const cur = segValue(s, type);
    let next: number;
    if (type === "dayPeriod") next = cur ? 0 : 1;
    else if (type === "minute" && step > 1) {
      const marks: number[] = [];
      for (let m = 0; m < 60; m += step) marks.push(m);
      if (cur == null) next = dir > 0 ? marks[0]! : marks[marks.length - 1]!;
      else if (dir > 0) next = marks.find((m) => m > cur) ?? marks[0]!;
      else next = [...marks].reverse().find((m) => m < cur) ?? marks[marks.length - 1]!;
    } else if (cur == null) next = dir > 0 ? lo : hi;
    else next = cur + dir > hi ? lo : cur + dir < lo ? hi : cur + dir;
    update(withSeg(s, type, next));
  };

  const typeDigit = (type: SegmentType, digit: string) => {
    if (type === "dayPeriod") return;
    const hi = type === "hour" ? (is12 ? 12 : 23) : 59;
    let digits = pending.current?.type === type ? pending.current.digits + digit : digit;
    let n = Number(digits);
    if (n > hi) {
      digits = digit;
      n = Number(digit);
    }
    const done = digits.length >= 2 || n * 10 > hi;
    if (done && type === "hour" && is12 && n === 0) n = 12;
    pending.current = done ? null : { type, digits };
    update(withSeg(segsRef.current, type, n), done);
    if (done) focusSegment(neighbour(type, 1));
  };

  const typePeriod = (key: string) => {
    const k = key.toLowerCase();
    const am = periods[0].toLowerCase();
    const pm = periods[1].toLowerCase();
    let next: 0 | 1 | null = null;
    if (k === "a" || am.startsWith(k)) next = 0;
    else if (k === "p" || pm.startsWith(k)) next = 1;
    if (next == null) return false;
    pending.current = null;
    update({ ...segsRef.current, period: next });
    return true;
  };

  const flushPending = () => {
    if (!pending.current) return;
    pending.current = null;
    update(segsRef.current);
  };

  const onSegmentKeyDown = (type: SegmentType) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      flushPending();
      focusSegment(neighbour(type, e.key === "ArrowRight" ? 1 : -1));
      return;
    }
    if (disabled || readOnly) return;
    const [lo, hi] = range(type);
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      stepSegment(type, e.key === "ArrowUp" ? 1 : -1);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      pending.current = null;
      update(withSeg(segsRef.current, type, e.key === "Home" ? lo : hi));
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      if (type === "dayPeriod") return;
      pending.current = null;
      update(withSeg(segsRef.current, type, null));
    } else if (/^\d$/.test(e.key)) {
      e.preventDefault();
      if (type === "dayPeriod") return;
      typeDigit(type, e.key);
    } else if (e.key.length === 1) {
      e.preventDefault();
      if (type === "dayPeriod") typePeriod(e.key);
      else if (is12 && typePeriod(e.key)) focusSegment("dayPeriod");
    }
  };

  /** Virtual keyboards may skip keydown and only fire input events; read the typed character from the field. */
  const onSegmentChange = (type: SegmentType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;
    const ch = e.target.value.slice(-1);
    if (!e.target.value) {
      if (type !== "dayPeriod") update(withSeg(segsRef.current, type, null));
    } else if (/\d/.test(ch)) typeDigit(type, ch);
    else if (type === "dayPeriod") typePeriod(ch);
  };

  const clear = () => {
    pending.current = null;
    update({ ...EMPTY, period: segsRef.current.period });
    focusSegment(order[0]);
  };

  const display = (type: SegmentType) => {
    if (type === "dayPeriod") return periods[segs.period];
    const v = segValue(segs, type);
    return v == null ? "--" : pad2(v);
  };

  const hasAny = segs.hour != null || segs.minute != null || segs.second != null;
  const showClear = clearable && hasAny && !disabled && !readOnly;
  const labelledBy = ariaLabelledBy ?? (fieldCtx && !ariaLabel ? fieldCtx.labelId : undefined);

  return (
    <div
      ref={ref}
      role="group"
      id={field.id}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      aria-describedby={field["aria-describedby"]}
      aria-disabled={disabled || undefined}
      data-slot="time-picker"
      data-invalid={field.invalid || undefined}
      data-disabled={disabled || undefined}
      className={cn(wrapperClass, sizeClass[size], showClear && "pr-9", className)}
      onMouseDown={(e) => {
        onMouseDown?.(e);
        const target = e.target as HTMLElement;
        if (e.defaultPrevented || disabled || target.closest("input, button")) return;
        e.preventDefault();
        const firstEmpty = order.find((t) => t !== "dayPeriod" && segValue(segsRef.current, t) == null);
        focusSegment(firstEmpty ?? order[0]);
      }}
      onBlur={(e) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) flushPending();
      }}
      {...rest}
    >
      {icon && <RiTimeLine aria-hidden className="text-muted-foreground" />}
      <div className="flex min-w-0 flex-1 items-center" dir="ltr">
        {layout.map(({ type, before }) => {
          const v = segValue(segs, type);
          const text = display(type);
          const isPlaceholder = type === "dayPeriod" ? !hasAny : v == null;
          return (
            <React.Fragment key={type}>
              {before && (
                <span aria-hidden className={cn("text-muted-foreground", /^\s+$/.test(before) && "w-1")}>
                  {/^\s+$/.test(before) ? "" : before.trim()}
                </span>
              )}
              <input
                ref={(el) => {
                  inputs.current[type] = el;
                }}
                type="text"
                role="spinbutton"
                inputMode={type === "dayPeriod" ? "text" : "numeric"}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                aria-label={labels[type]}
                aria-valuemin={range(type)[0]}
                aria-valuemax={range(type)[1]}
                aria-valuenow={v ?? undefined}
                aria-valuetext={v == null ? labels.empty : text}
                aria-invalid={field["aria-invalid"]}
                aria-required={field.required}
                aria-readonly={readOnly || undefined}
                disabled={disabled}
                readOnly={readOnly}
                value={text}
                size={Math.max(2, text.length)}
                style={{ width: `${Math.max(2, text.length) + 0.5}ch` }}
                onChange={onSegmentChange(type)}
                onKeyDown={onSegmentKeyDown(type)}
                onFocus={(e) => {
                  if (pending.current && pending.current.type !== type) flushPending();
                  e.currentTarget.select();
                }}
                className={cn(segmentClass, isPlaceholder && "text-muted-foreground")}
              />
            </React.Fragment>
          );
        })}
      </div>
      {showClear && (
        <button
          type="button"
          aria-label={labels.clear}
          onClick={clear}
          className={cn(
            "absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
            size === "sm" ? "right-2" : size === "lg" ? "right-3" : "right-2.5",
            focusRing
          )}
        >
          <RiCloseCircleFill aria-hidden className="size-4" />
        </button>
      )}
      {name && <input type="hidden" name={name} value={value ?? ""} />}
    </div>
  );
});
TimePicker.displayName = "TimePicker";
