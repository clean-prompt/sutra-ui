/* Compact relative-time preset shared by sync and comment timestamps. Pure; never throws. */
import { formatRelative } from "./time";

/** Short relative time: "just now", "5 min ago", "2 h ago", "yesterday", "3 days ago" ("—" for unparseable input). */
export function formatRelativeTime(value: Date | number | string, now: Date | number = Date.now()) {
  return formatRelative(value, { now, style: "long", maxRelativeDays: 29, unitLabels: { hour: " h" } });
}
