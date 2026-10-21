/*
 * @sutra/ui/format: number, duration, date and relative-time formatters and the date helpers behind them (subpath only).
 *
 * Deliberately NOT part of the root `@sutra/ui`: names like `toMs`, `formatCompact` and `formatDuration` are generic enough to
 * collide with an app's own, so they are imported from here on purpose. (`pad2` stays internal: no public signature needs it.) `formatBytes`, `splitDuration` and
 * `base32Decode` are not here: the root and their components' modules have their own versions (`FileUpload`, `Countdown`, `TOTP`).
 * An explicit list (no `export *`): test/api-surface.test.ts keeps every name off the root, and scripts/gen-index.mjs lists this
 * entry in SUBPATH_ONLY so the root can never include it.
 */
export {
  formatBadgeCount,
  formatCompact,
  formatCost,
  formatList,
  formatTokens,
  pluralize,
  type FormatCompactOptions,
  type FormatCostOptions,
  type FormatListOptions,
  type FormatTokensOptions,
} from "../lib/format";
export {
  formatClock,
  formatCountdown,
  formatDuration,
  type DurationSplit,
  type DurationUnit,
  type FormatClockOptions,
  type FormatDurationOptions,
  type SplitDurationOptions,
} from "../lib/duration";
export {
  DAY_MS,
  HOUR_MS,
  MINUTE_MS,
  SECOND_MS,
  addDays,
  calendarDayDiff,
  dateKey,
  formatClockTime,
  formatDateTime,
  formatDayLabel,
  formatRelative,
  formatShortDate,
  isValidDate,
  safeISO,
  startOfDay,
  toDate,
  toMs,
  toValidDate,
  type DateInput,
  type FormatClockTimeOptions,
  type FormatDateTimeOptions,
  type FormatDayLabelOptions,
  type FormatRelativeOptions,
  type FormatShortDateOptions,
  type RelativeTimeStyle,
  type RelativeTimeUnit,
  type TimeInput,
} from "../lib/time";
export { formatRelativeTime } from "../lib/relative-time";
export { formatTokenCount } from "../lib/token-count";
