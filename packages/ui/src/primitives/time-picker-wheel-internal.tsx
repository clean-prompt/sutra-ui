import * as React from "react";
import { clamp } from "../lib/math";
import { pad2 } from "../lib/time";
import { Button } from "./button";
import { PopoverClose } from "./popover";
import { WheelPickerGroup, type WheelPickerColumn, type WheelPickerOption } from "./wheel-picker";

/* Wheels for TimePicker (`wheel` prop). Private to the picker: it works in seconds since midnight, like the picker's value,
   and knows nothing of the segment state. */

type WheelSegment = "hour" | "minute" | "second" | "dayPeriod";

export interface TimeWheelsProps {
  /** Seconds since midnight, or `null` while the field is empty (the wheels then start from `min`, or midnight). */
  total: number | null;
  /** Wheels in the field's order (the locale decides: hour, minute, AM/PM; the day period first in Korean). */
  order: readonly WheelSegment[];
  is12: boolean;
  /** Show a seconds wheel (the picker's `granularity="second"`). */
  seconds: boolean;
  /** Minute wheel steps (the picker's `step`); a minute that is not a multiple stays on the wheel while it is the value. */
  step: number;
  min: number | null;
  max: number | null;
  periods: readonly [string, string];
  labels: Record<WheelSegment | "done", string>;
  disabled?: boolean;
  /** The wheels changed the time (already clamped to `min` and `max`). */
  onChange: (total: number) => void;
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** The time of day split into the parts the wheels show. */
function split(total: number) {
  const h24 = Math.floor(total / 3600);
  return { h24, m: Math.floor((total % 3600) / 60), s: total % 60, period: h24 >= 12 ? 1 : 0 };
}

/** The wheels of a `TimePicker` in a popover: hours, minutes, optional seconds and AM/PM, and a Done button. */
export function TimeWheels({ total, order, is12, seconds, step, min, max, periods, labels, disabled, onChange }: TimeWheelsProps) {
  const fits = (from: number, to: number) => (min == null || to >= min) && (max == null || from <= max);
  const clampTotal = (t: number) => clamp(t, min ?? 0, max ?? 86399);
  const [draft, setDraft] = React.useState(() => clampTotal(0));
  const now = split(total ?? draft);

  const commit = (next: number) => {
    const t = clampTotal(next);
    setDraft(t);
    onChange(t);
  };
  const compose = (h24: number, m: number, s: number) => commit(h24 * 3600 + m * 60 + (seconds ? s : 0));
  const hour24 = (value: string) => (is12 ? (Number(value) % 12) + now.period * 12 : Number(value));

  const option = (value: number, label: string, disabledRow: boolean): WheelPickerOption => ({ value: String(value), label, disabled: disabledRow });
  const columns = order.map((type, at): WheelPickerColumn => {
    /** A colon joins two numeric wheels; the day period stands apart. */
    const separator = order[at + 1] && order[at + 1] !== "dayPeriod" ? ":" : undefined;
    if (type === "hour") {
      const hours = is12 ? range(1, 12) : range(0, 23);
      return {
        id: "hour",
        label: labels.hour,
        separator,
        className: "w-16",
        options: hours.map((h) => {
          const h24 = is12 ? (h % 12) + now.period * 12 : h;
          return option(h, pad2(h), !fits(h24 * 3600, h24 * 3600 + 3599));
        }),
      };
    }
    if (type === "minute") {
      const marks = range(0, 59).filter((m) => m % step === 0 || m === now.m);
      return {
        id: "minute",
        label: labels.minute,
        separator,
        className: "w-16",
        options: marks.map((m) => option(m, pad2(m), !fits(now.h24 * 3600 + m * 60, now.h24 * 3600 + m * 60 + (seconds ? 59 : 0)))),
      };
    }
    if (type === "second") {
      return {
        id: "second",
        label: labels.second,
        className: "w-16",
        options: range(0, 59).map((s) => option(s, pad2(s), !fits(now.h24 * 3600 + now.m * 60 + s, now.h24 * 3600 + now.m * 60 + s))),
      };
    }
    return {
      id: "dayPeriod",
      label: labels.dayPeriod,
      className: "w-20",
      options: [0, 1].map((p) => option(p, periods[p]!, !fits(p * 43200, p * 43200 + 43199))),
    };
  });

  const shownHour = is12 ? now.h24 % 12 || 12 : now.h24;
  const current: Record<WheelSegment, string> = {
    hour: String(shownHour),
    minute: String(now.m),
    second: String(now.s),
    dayPeriod: String(now.period),
  };

  return (
    <div className="flex flex-col gap-3">
      {/* The time is read left to right in every reading direction, like the segments of the field. */}
      <WheelPickerGroup
        dir="ltr"
        columns={columns}
        value={order.map((t) => current[t])}
        disabled={disabled}
        onValueChange={(values, { columnId }) => {
          const picked = values[order.indexOf(columnId as WheelSegment)]!;
          if (columnId === "hour") compose(hour24(picked), now.m, now.s);
          else if (columnId === "minute") compose(now.h24, Number(picked), now.s);
          else if (columnId === "second") compose(now.h24, now.m, Number(picked));
          else compose((now.h24 % 12) + Number(picked) * 12, now.m, now.s);
        }}
      />
      <PopoverClose asChild>
        <Button size="sm" variant="secondary" className="w-full" onClick={() => total == null && onChange(draft)}>
          {labels.done}
        </Button>
      </PopoverClose>
    </div>
  );
}
