/* Alert rules for a system monitor: the rule model, per-metric units and ranges, the sentence that describes a rule,
 * validation and evaluation over samples. Pure. */

import { celsiusToFahrenheit, fahrenheitToCelsius, type TemperatureUnit } from "./temperature";

export type AlertMetric = "cpu" | "memory" | "memory-growth" | "disk-read" | "disk-write" | "network" | "temperature" | "gpu";
/** How samples in the window are combined. Omitted: the condition must hold for the whole window (sustained). */
export type AlertAggregate = "average" | "peak";
export type AlertComparator = "above" | "below";
export type AlertScope = { kind: "any-app" } | { kind: "app"; app: string } | { kind: "mac" };
export type AlertScopeKind = AlertScope["kind"];
/** Same values as the thermals kit's unit, so one setting drives both. */
/** Temperature display unit for alert rules (the same type the thermal readouts use). */
export type AlertTemperatureUnit = TemperatureUnit;

export interface AlertRule {
  id: string;
  enabled: boolean;
  metric: AlertMetric;
  aggregate?: AlertAggregate;
  comparator: AlertComparator;
  /** In the metric's unit (`ALERT_METRICS[metric].unit`); temperatures are always stored in °C. */
  threshold: number;
  /** How long the condition must hold (or the span to average, find the peak in, or measure growth over), in ms. */
  window?: number;
  scope: AlertScope;
  /** Apps ignored by an "any app" rule. */
  mutedApps?: string[];
  /** Optional name shown above the sentence. */
  label?: string;
}

export interface AlertMetricInfo {
  id: AlertMetric;
  /** Picker label ("CPU", "Memory growth"). */
  label: string;
  /** Subject of a whole-Mac sentence ("CPU", "disk writes"). */
  noun: string;
  /** Unit of `threshold` and of samples. */
  unit: "%" | "GB" | "MB/s" | "°C";
  /** Unit as shown next to the threshold input ("GB per hour" for growth). */
  unitLabel: string;
  min: number;
  max: number;
  step: number;
  defaultThreshold: number;
  /** Default window in ms (undefined: fires on the latest reading). */
  defaultWindow?: number;
  /** The metric needs a window (growth is measured over one). */
  windowRequired: boolean;
  comparators: readonly AlertComparator[];
  scopes: readonly AlertScopeKind[];
  /** Average / peak make sense for the metric. */
  aggregates: boolean;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const ALL_SCOPES: readonly AlertScopeKind[] = ["mac", "any-app", "app"];
const BOTH: readonly AlertComparator[] = ["above", "below"];

/** Units, ranges and defaults per metric. */
export const ALERT_METRICS: Record<AlertMetric, AlertMetricInfo> = {
  cpu: {
    id: "cpu", label: "CPU", noun: "CPU", unit: "%", unitLabel: "%", min: 1, max: 100, step: 1,
    defaultThreshold: 70, defaultWindow: 10 * MINUTE, windowRequired: false, comparators: BOTH, scopes: ALL_SCOPES, aggregates: true,
  },
  memory: {
    id: "memory", label: "Memory", noun: "memory", unit: "GB", unitLabel: "GB", min: 0.1, max: 512, step: 0.1,
    defaultThreshold: 8, defaultWindow: 5 * MINUTE, windowRequired: false, comparators: BOTH, scopes: ALL_SCOPES, aggregates: true,
  },
  "memory-growth": {
    id: "memory-growth", label: "Memory growth", noun: "memory", unit: "GB", unitLabel: "GB per hour", min: 0.1, max: 64, step: 0.1,
    defaultThreshold: 1.4, defaultWindow: HOUR, windowRequired: true, comparators: ["above"], scopes: ALL_SCOPES, aggregates: false,
  },
  "disk-read": {
    id: "disk-read", label: "Disk reads", noun: "disk reads", unit: "MB/s", unitLabel: "MB/s", min: 1, max: 10_000, step: 10,
    defaultThreshold: 200, defaultWindow: 5 * MINUTE, windowRequired: false, comparators: BOTH, scopes: ALL_SCOPES, aggregates: true,
  },
  "disk-write": {
    id: "disk-write", label: "Disk writes", noun: "disk writes", unit: "MB/s", unitLabel: "MB/s", min: 1, max: 10_000, step: 10,
    defaultThreshold: 200, defaultWindow: 5 * MINUTE, windowRequired: false, comparators: BOTH, scopes: ALL_SCOPES, aggregates: true,
  },
  network: {
    id: "network", label: "Network", noun: "network traffic", unit: "MB/s", unitLabel: "MB/s", min: 0.1, max: 10_000, step: 1,
    defaultThreshold: 50, defaultWindow: 5 * MINUTE, windowRequired: false, comparators: BOTH, scopes: ALL_SCOPES, aggregates: true,
  },
  temperature: {
    id: "temperature", label: "Temperature", noun: "CPU temperature", unit: "°C", unitLabel: "°C", min: 30, max: 110, step: 1,
    defaultThreshold: 90, windowRequired: false, comparators: BOTH, scopes: ["mac"], aggregates: true,
  },
  gpu: {
    id: "gpu", label: "GPU", noun: "GPU", unit: "%", unitLabel: "%", min: 1, max: 100, step: 1,
    defaultThreshold: 80, defaultWindow: 10 * MINUTE, windowRequired: false, comparators: BOTH, scopes: ALL_SCOPES, aggregates: true,
  },
};

/** Picker order. */
export const ALERT_METRIC_ORDER: readonly AlertMetric[] = [
  "cpu", "memory", "memory-growth", "disk-read", "disk-write", "network", "temperature", "gpu",
];

/** Window presets offered by the editor (ms). */
export const ALERT_WINDOW_PRESETS: readonly number[] = [MINUTE, 5 * MINUTE, 10 * MINUTE, 30 * MINUTE, HOUR];

/** Shortest window a rule accepts. */
export const MIN_ALERT_WINDOW = MINUTE;
/** Longest window a rule accepts. */
export const MAX_ALERT_WINDOW = 24 * HOUR;

export function isAlertMetric(value: unknown): value is AlertMetric {
  return typeof value === "string" && Object.hasOwn(ALERT_METRICS, value);
}

/* ------------------------------------------------------------------------------------------------
 * Units and text
 * ----------------------------------------------------------------------------------------------*/


const roundSmall = (n: number) => Math.round(n * 100) / 100;

export interface AlertUnitOptions {
  temperatureUnit?: AlertTemperatureUnit;
  locale?: string;
}

/** Converts a stored threshold to the unit the user sees (°F when asked; other metrics unchanged). */
export function toDisplayThreshold(metric: AlertMetric, value: number, temperatureUnit: AlertTemperatureUnit = "celsius"): number {
  if (metric === "temperature" && temperatureUnit === "fahrenheit") return roundSmall(celsiusToFahrenheit(value));
  return value;
}

/** Converts a threshold the user typed back to the stored unit. */
export function fromDisplayThreshold(metric: AlertMetric, value: number, temperatureUnit: AlertTemperatureUnit = "celsius"): number {
  if (metric === "temperature" && temperatureUnit === "fahrenheit") return roundSmall(fahrenheitToCelsius(value));
  return value;
}

/** The unit and range in display units ("°F" and 86–230 for temperature in Fahrenheit). */
export function alertThresholdRange(
  metric: AlertMetric,
  temperatureUnit: AlertTemperatureUnit = "celsius"
): { min: number; max: number; step: number; unit: string; unitLabel: string } {
  const info = ALERT_METRICS[metric] ?? ALERT_METRICS.cpu;
  if (info.id === "temperature" && temperatureUnit === "fahrenheit") {
    return { min: Math.round(celsiusToFahrenheit(info.min)), max: Math.round(celsiusToFahrenheit(info.max)), step: 1, unit: "°F", unitLabel: "°F" };
  }
  return { min: info.min, max: info.max, step: info.step, unit: info.unit, unitLabel: info.unitLabel };
}

function formatNumber(n: number, locale?: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
}

/** "70%", "1.4 GB", "200 MB/s", "90 °C" / "194 °F". Returns "—" for a non-finite value. */
export function formatAlertThreshold(metric: AlertMetric, value: number, options: AlertUnitOptions = {}): string {
  if (!Number.isFinite(value) || !isAlertMetric(metric)) return "—";
  const { unit } = alertThresholdRange(metric, options.temperatureUnit);
  const n = formatNumber(toDisplayThreshold(metric, value, options.temperatureUnit), options.locale);
  return unit === "%" ? `${n}%` : `${n} ${unit}`;
}

/** "1 minute", "10 minutes", "an hour", "2 hours", "90 minutes", "30 seconds". */
export function formatAlertWindow(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms) || ms <= 0) return "";
  if (ms < MINUTE) {
    const s = Math.round(ms / 1000);
    return `${s} ${s === 1 ? "second" : "seconds"}`;
  }
  if (ms % HOUR === 0) {
    const h = ms / HOUR;
    return h === 1 ? "an hour" : `${h} hours`;
  }
  const m = Math.round(ms / MINUTE);
  return `${m} ${m === 1 ? "minute" : "minutes"}`;
}

/** "Mac", "Any app", or the app's name. */
export function describeAlertScope(scope: AlertScope | undefined): string {
  if (!scope) return "Mac";
  if (scope.kind === "app") return scope.app || "One app";
  return scope.kind === "any-app" ? "Any app" : "Mac";
}

const capitalize = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

/** Verb phrase for a single app: `[verb, object]`, e.g. ["uses", "CPU"] → "uses more than 70% CPU". */
const APP_PHRASE: Record<Exclude<AlertMetric, "memory-growth" | "temperature">, (amount: string) => string> = {
  cpu: (a) => `uses ${a} CPU`,
  gpu: (a) => `uses ${a} GPU`,
  memory: (a) => `uses ${a} of memory`,
  "disk-read": (a) => `reads ${a} from disk`,
  "disk-write": (a) => `writes ${a} to disk`,
  network: (a) => `transfers ${a} over the network`,
};

/**
 * One sentence for a rule: "Average CPU above 70% for 10 minutes", "Memory grows by more than 1.4 GB in an hour",
 * "Any app writes more than 200 MB/s to disk for 5 minutes", "CPU temperature above 90 °C".
 */
export function describeAlertRule(rule: AlertRule, options: AlertUnitOptions = {}): string {
  if (!rule || !isAlertMetric(rule.metric)) return "Unknown alert";
  const info = ALERT_METRICS[rule.metric];
  const amount = formatAlertThreshold(rule.metric, rule.threshold, options);
  const below = rule.comparator === "below";
  const aggregate = info.aggregates ? rule.aggregate : undefined;
  const window = rule.window ?? (info.windowRequired ? info.defaultWindow : undefined);
  const span = formatAlertWindow(window);
  const scope = info.scopes.includes(rule.scope?.kind) ? rule.scope : { kind: "mac" as const };
  const subject = scope.kind === "app" ? scope.app || "The app" : "Any app";

  if (rule.metric === "memory-growth") {
    const who = scope.kind === "mac" ? "Memory" : `${subject}'s memory`;
    return `${who} grows by ${below ? "less" : "more"} than ${amount}${span ? ` in ${span}` : ""}`;
  }

  // "for 10 minutes" (sustained / average) or "within 5 minutes" (peak).
  const tail = span ? (aggregate === "peak" ? ` within ${span}` : ` for ${span}`) : "";

  if (scope.kind === "mac" || rule.metric === "temperature") {
    const noun = aggregate ? `${aggregate === "average" ? "Average" : "Peak"} ${info.noun}` : capitalize(info.noun);
    return `${noun} ${below ? "below" : "above"} ${amount}${tail}`;
  }

  const phrase = APP_PHRASE[rule.metric](`${below ? "less" : "more"} than ${amount}`);
  const how = aggregate === "average" ? " on average" : aggregate === "peak" ? " at some point" : "";
  return `${subject} ${phrase}${how}${tail}`;
}

/* ------------------------------------------------------------------------------------------------
 * Creation, presets and validation
 * ----------------------------------------------------------------------------------------------*/

let idCounter = 0;

/** A fresh rule id ("alert-…"). */
export function newAlertRuleId(): string {
  idCounter += 1;
  return `alert-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/** A rule for `metric` with that metric's default threshold, window and the first allowed scope. */
export function createAlertRule(metric: AlertMetric = "cpu", overrides: Partial<AlertRule> = {}): AlertRule {
  const info = ALERT_METRICS[metric] ?? ALERT_METRICS.cpu;
  return {
    id: overrides.id ?? newAlertRuleId(),
    enabled: true,
    metric: info.id,
    comparator: info.comparators[0]!,
    threshold: info.defaultThreshold,
    ...(info.defaultWindow !== undefined ? { window: info.defaultWindow } : {}),
    scope: info.scopes.includes("mac") ? { kind: "mac" } : { kind: info.scopes[0] as "any-app" },
    ...overrides,
  };
}

/**
 * Switches a rule to another metric, keeping what still applies: the threshold and window reset to the new
 * metric's defaults, and the comparator, scope and aggregate fall back when the new metric doesn't allow them.
 */
export function changeAlertMetric(rule: AlertRule, metric: AlertMetric): AlertRule {
  const info = ALERT_METRICS[metric] ?? ALERT_METRICS.cpu;
  const next: AlertRule = {
    ...rule,
    metric: info.id,
    threshold: info.defaultThreshold,
    comparator: info.comparators.includes(rule.comparator) ? rule.comparator : info.comparators[0]!,
    scope: info.scopes.includes(rule.scope.kind) ? rule.scope : { kind: "mac" },
  };
  if (info.defaultWindow !== undefined) next.window = info.defaultWindow;
  else delete next.window;
  if (!info.aggregates) delete next.aggregate;
  if (next.scope.kind !== "any-app") delete next.mutedApps;
  return next;
}

export interface AlertRulePreset {
  id: string;
  /** Short button text. */
  title: string;
  rule: Omit<AlertRule, "id">;
}

/** Suggested first alerts, from the Vitals feature list. */
export const ALERT_RULE_PRESETS: readonly AlertRulePreset[] = [
  {
    id: "cpu-average",
    title: "CPU average above 70% for 10 minutes",
    rule: { enabled: true, metric: "cpu", aggregate: "average", comparator: "above", threshold: 70, window: 10 * MINUTE, scope: { kind: "any-app" } },
  },
  {
    id: "memory-growth",
    title: "Memory grows 1.4 GB in an hour",
    rule: { enabled: true, metric: "memory-growth", comparator: "above", threshold: 1.4, window: HOUR, scope: { kind: "any-app" } },
  },
  {
    id: "temperature",
    title: "Temperature above 90 °C",
    rule: { enabled: true, metric: "temperature", comparator: "above", threshold: 90, scope: { kind: "mac" } },
  },
];

export type AlertRuleField = "metric" | "comparator" | "threshold" | "window" | "scope";
export type AlertRuleErrors = Partial<Record<AlertRuleField, string>>;

/** Field errors for a rule (an empty object when it's valid). Ranges are reported in the display unit. */
export function validateAlertRule(rule: AlertRule, options: AlertUnitOptions = {}): AlertRuleErrors {
  const errors: AlertRuleErrors = {};
  if (!rule || !isAlertMetric(rule.metric)) {
    errors.metric = "Choose a metric";
    return errors;
  }
  const info = ALERT_METRICS[rule.metric];
  if (!info.comparators.includes(rule.comparator)) {
    errors.comparator = info.comparators.length === 1 ? `${info.label} alerts only fire ${info.comparators[0]} a value` : "Choose above or below";
  }
  if (typeof rule.threshold !== "number" || !Number.isFinite(rule.threshold)) {
    errors.threshold = "Enter a threshold";
  } else if (rule.threshold < info.min || rule.threshold > info.max) {
    errors.threshold = `Enter a value from ${formatAlertThreshold(rule.metric, info.min, options)} to ${formatAlertThreshold(rule.metric, info.max, options)}`;
  }
  if (rule.window === undefined || rule.window === null) {
    if (info.windowRequired) errors.window = "Choose a time window";
    else if (info.aggregates && rule.aggregate) errors.window = `${rule.aggregate === "average" ? "An average" : "A peak"} needs a time window`;
  } else if (!Number.isFinite(rule.window) || rule.window < MIN_ALERT_WINDOW) {
    errors.window = `Use at least ${formatAlertWindow(MIN_ALERT_WINDOW)}`;
  } else if (rule.window > MAX_ALERT_WINDOW) {
    errors.window = "Use 24 hours or less";
  }
  const kind = rule.scope?.kind;
  if (!kind || !info.scopes.includes(kind)) {
    errors.scope = info.scopes.length === 1 ? `${info.label} alerts apply to the whole Mac` : "Choose what to watch";
  } else if (rule.scope.kind === "app" && !rule.scope.app?.trim()) {
    errors.scope = "Choose an app";
  }
  return errors;
}

/** True when `validateAlertRule` finds nothing. */
export function isAlertRuleValid(rule: AlertRule, options: AlertUnitOptions = {}): boolean {
  return Object.keys(validateAlertRule(rule, options)).length === 0;
}

/* ------------------------------------------------------------------------------------------------
 * Evaluation
 * ----------------------------------------------------------------------------------------------*/

export interface AlertSample {
  /** Epoch ms. */
  t: number;
  /** In the metric's unit (temperatures in °C; memory and growth in GB). */
  value: number;
  /** The app the reading belongs to; omit for whole-Mac readings. */
  app?: string;
}

export interface AlertEvaluation {
  firing: boolean;
  /**
   * The reading compared with the threshold: the latest value (no window), the mean (average), the highest or
   * lowest value (peak), the level held for the whole window (sustained) or the growth (memory growth).
   * Undefined when there is no data.
   */
  value: number | undefined;
  /** When the condition started to hold (epoch ms), when known. */
  since?: number;
  /** The app that fired (or comes closest) for an "any app" rule. */
  app?: string;
}

function evaluateSeries(rule: AlertRule, info: AlertMetricInfo, series: AlertSample[], now: number): AlertEvaluation {
  const below = rule.comparator === "below";
  const hits = (v: number) => (below ? v < rule.threshold : v > rule.threshold);
  if (series.length === 0) return { firing: false, value: undefined };
  const latest = series[series.length - 1]!;
  const window = rule.window ?? (info.windowRequired ? info.defaultWindow : undefined);

  if (rule.metric === "memory-growth") {
    const start = now - (window ?? HOUR);
    const inWindow = series.filter((s) => s.t >= start);
    if (inWindow.length < 2) return { firing: false, value: inWindow.length ? 0 : undefined };
    let low = inWindow[0]!.value;
    let since: number | undefined;
    for (const s of inWindow) {
      low = Math.min(low, s.value);
      if (since === undefined && hits(s.value - low)) since = s.t;
    }
    const lowest = Math.min(...inWindow.slice(0, -1).map((s) => s.value));
    const growth = roundSmall(Math.max(0, latest.value - lowest));
    const firing = hits(growth);
    return { firing, value: growth, ...(firing && since !== undefined ? { since } : {}) };
  }

  // Run of consecutive matching readings ending at the latest one.
  const runStart = (): number | undefined => {
    if (!hits(latest.value)) return undefined;
    let start = latest.t;
    for (let i = series.length - 1; i >= 0 && hits(series[i]!.value); i--) start = series[i]!.t;
    return start;
  };

  if (window === undefined) {
    const firing = hits(latest.value);
    const since = runStart();
    return { firing, value: latest.value, ...(since !== undefined ? { since } : {}) };
  }

  const start = now - window;
  const inWindow = series.filter((s) => s.t >= start);
  if (inWindow.length === 0) return { firing: false, value: undefined };
  const values = inWindow.map((s) => s.value);
  const extreme = (pickLow: boolean) => (pickLow ? Math.min(...values) : Math.max(...values));
  const aggregate = info.aggregates ? rule.aggregate : undefined;

  if (aggregate === "peak") {
    const value = extreme(below);
    const firing = hits(value);
    const first = inWindow.find((s) => hits(s.value));
    return { firing, value, ...(firing && first ? { since: first.t } : {}) };
  }

  if (aggregate === "average") {
    const value = roundSmall(values.reduce((a, b) => a + b, 0) / values.length);
    // The readings must reach back over the whole window, so a short burst right after start-up doesn't count.
    const covered = series[0]!.t <= start;
    return { firing: covered && hits(value), value };
  }

  // Sustained: every reading over at least `window` matched.
  const value = extreme(!below);
  const since = runStart();
  const firing = since !== undefined && latest.t - since >= window;
  return { firing, value, ...(since !== undefined ? { since } : {}) };
}

const closerToFiring = (rule: AlertRule, a: AlertEvaluation, b: AlertEvaluation) => {
  if (a.firing !== b.firing) return a.firing;
  if (b.value === undefined) return true;
  if (a.value === undefined) return false;
  return rule.comparator === "below" ? a.value < b.value : a.value > b.value;
};

/**
 * Evaluates a rule over readings at `now`. Whole-Mac rules read samples without an `app`; "any app" rules check
 * each app separately (skipping `mutedApps`) and fire when one does; one-app rules read that app's samples.
 * Readings after `now` and non-finite values are ignored. A disabled rule never fires (its value is still computed).
 */
export function evaluateAlertRule(rule: AlertRule, samples: readonly AlertSample[], now: number): AlertEvaluation {
  if (!rule || !isAlertMetric(rule.metric) || !Number.isFinite(rule.threshold)) return { firing: false, value: undefined };
  const info = ALERT_METRICS[rule.metric];
  const scope: AlertScope = info.scopes.includes(rule.scope?.kind) ? rule.scope : { kind: "mac" };
  const muted = new Set(rule.mutedApps ?? []);
  const valid = samples
    .filter((s) => s && Number.isFinite(s.t) && Number.isFinite(s.value) && s.t <= now)
    .slice()
    .sort((a, b) => a.t - b.t);

  let result: AlertEvaluation;
  if (scope.kind === "mac") {
    result = evaluateSeries(rule, info, valid.filter((s) => s.app === undefined), now);
  } else if (scope.kind === "app") {
    result = muted.has(scope.app)
      ? { firing: false, value: undefined }
      : evaluateSeries(rule, info, valid.filter((s) => s.app === scope.app), now);
  } else {
    const byApp = new Map<string, AlertSample[]>();
    for (const s of valid) {
      if (s.app === undefined || muted.has(s.app)) continue;
      const list = byApp.get(s.app);
      if (list) list.push(s);
      else byApp.set(s.app, [s]);
    }
    result = { firing: false, value: undefined };
    for (const [app, series] of byApp) {
      const r = { ...evaluateSeries(rule, info, series, now), app };
      if (r.value !== undefined && closerToFiring(rule, r, result)) result = r;
    }
  }
  return rule.enabled === false ? { ...result, firing: false } : result;
}
