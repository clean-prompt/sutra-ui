/** Recurrence rules: the `RecurrenceRule` model, RFC 5545 RRULE serialisation and plain-English descriptions. Pure; never throws. */

import { formatList } from "./format";
import { formatShortDate, pad2 } from "./time";

/* ------------------------------------------------------------------ */
/* Recurrence                                                          */
/* ------------------------------------------------------------------ */

export type RecurrenceWeekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";
export type RecurrenceFrequency = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type RecurrenceEnd =
  | { type: "never" }
  | { type: "on"; date: Date }
  | { type: "after"; count: number };

export interface RecurrenceRule {
  freq: RecurrenceFrequency;
  /** Every n units. Default 1. */
  interval?: number;
  /** Weekly: days of the week. */
  byWeekday?: RecurrenceWeekday[];
  /** Monthly: on a day of the month, or on the nth weekday ("first Monday"). */
  monthlyMode?: "day" | "weekday";
  /** Monthly / yearly day of month (1–31). */
  monthDay?: number;
  /** Monthly weekday mode: 1–4, or -1 for "last". */
  nth?: number;
  nthWeekday?: RecurrenceWeekday;
  /** Yearly: month 1–12. */
  month?: number;
  end?: RecurrenceEnd;
}

export const recurrenceWeekdays: RecurrenceWeekday[] = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const weekdayNames: Record<RecurrenceWeekday, string> = {
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
  SU: "Sunday",
};
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const nthNames: Record<string, string> = { "1": "first", "2": "second", "3": "third", "4": "fourth", "-1": "last" };
const unitNames: Record<Exclude<RecurrenceFrequency, "none">, string> = { daily: "day", weekly: "week", monthly: "month", yearly: "year" };

function sortDays(days: RecurrenceWeekday[]) {
  return [...new Set(days)].sort((a, b) => recurrenceWeekdays.indexOf(a) - recurrenceWeekdays.indexOf(b));
}

/** RFC 5545 RRULE value for a rule ("" when it does not repeat). Pass `{ prefix: true }` for "RRULE:…". */
export function toRRule(rule: RecurrenceRule, options: { prefix?: boolean } = {}): string {
  if (rule.freq === "none") return "";
  const parts = [`FREQ=${rule.freq.toUpperCase()}`];
  const interval = Math.max(1, Math.floor(rule.interval ?? 1));
  if (interval > 1) parts.push(`INTERVAL=${interval}`);
  if (rule.freq === "weekly" && rule.byWeekday?.length) parts.push(`BYDAY=${sortDays(rule.byWeekday).join(",")}`);
  if (rule.freq === "monthly") {
    if (rule.monthlyMode === "weekday" && rule.nthWeekday) parts.push(`BYDAY=${rule.nth ?? 1}${rule.nthWeekday}`);
    else if (rule.monthDay) parts.push(`BYMONTHDAY=${rule.monthDay}`);
  }
  if (rule.freq === "yearly") {
    if (rule.month) parts.push(`BYMONTH=${rule.month}`);
    if (rule.monthDay) parts.push(`BYMONTHDAY=${rule.monthDay}`);
  }
  const end = rule.end;
  if (end?.type === "after") parts.push(`COUNT=${Math.max(1, Math.floor(end.count))}`);
  if (end?.type === "on") {
    const d = end.date;
    parts.push(`UNTIL=${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`);
  }
  const value = parts.join(";");
  return options.prefix ? `RRULE:${value}` : value;
}

/** Plain-English summary, e.g. "Every 2 weeks on Monday and Wednesday, 10 times". */
export function describeRecurrence(rule: RecurrenceRule): string {
  if (rule.freq === "none") return "Does not repeat";
  const interval = Math.max(1, Math.floor(rule.interval ?? 1));
  const unit = unitNames[rule.freq];
  let text = interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;

  if (rule.freq === "weekly" && rule.byWeekday?.length) {
    const days = sortDays(rule.byWeekday);
    const isWeekdays = days.length === 5 && days.every((d) => !["SA", "SU"].includes(d));
    if (isWeekdays && interval === 1) text = "Every weekday";
    else if (days.length === 7) text = interval === 1 ? "Every day" : `${text} on every day`;
    else text += ` on ${formatList(days.map((d) => weekdayNames[d]), { locale: "en-GB" })}`;
  }
  if (rule.freq === "monthly") {
    if (rule.monthlyMode === "weekday" && rule.nthWeekday) text += ` on the ${nthNames[String(rule.nth ?? 1)]} ${weekdayNames[rule.nthWeekday]}`;
    else if (rule.monthDay) text += ` on day ${rule.monthDay}`;
  }
  if (rule.freq === "yearly" && rule.month) {
    text += ` on ${monthNames[rule.month - 1]}${rule.monthDay ? ` ${rule.monthDay}` : ""}`;
  }
  const end = rule.end;
  if (end?.type === "after") text += `, ${end.count} ${end.count === 1 ? "time" : "times"}`;
  if (end?.type === "on") {
    text += `, until ${formatShortDate(end.date, { year: "always", locale: "en-US" })}`;
  }
  return text;
}

/* Name tables shared with the RecurrencePicker UI (not re-exported from the package root). */
export {
  weekdayNames as recurrenceWeekdayNames,
  monthNames as recurrenceMonthNames,
  nthNames as recurrenceNthNames,
  sortDays as sortRecurrenceWeekdays,
};
