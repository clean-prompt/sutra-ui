import * as React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ALERT_METRICS,
  ALERT_METRIC_ORDER,
  ALERT_RULE_PRESETS,
  alertThresholdRange,
  changeAlertMetric,
  createAlertRule,
  describeAlertRule,
  describeAlertScope,
  evaluateAlertRule,
  formatAlertThreshold,
  formatAlertWindow,
  isAlertRuleValid,
  validateAlertRule,
  type AlertRule,
  type AlertSample,
} from "../src/lib/alert-rules";
import { AlertRuleDialog, AlertRuleEditor, AlertRuleList, MutedAppsList } from "../src/kits/system/alert-rules";
import { axeViolations } from "./a11y";

const NOW = new Date("2026-10-19T12:00:00Z").getTime();
const MIN = 60_000;
const HOUR = 60 * MIN;

const rule = (overrides: Partial<AlertRule>): AlertRule => ({
  id: "r",
  enabled: true,
  metric: "cpu",
  comparator: "above",
  threshold: 70,
  scope: { kind: "mac" },
  ...overrides,
});

/** One sample per minute, oldest first, ending at NOW. */
const perMinute = (values: number[], app?: string): AlertSample[] =>
  values.map((value, i) => ({ t: NOW - (values.length - 1 - i) * MIN, value, ...(app ? { app } : {}) }));

/* ------------------------------------------------------------------------------------------------
 * lib
 * ----------------------------------------------------------------------------------------------*/

describe("describeAlertRule", () => {
  it("reads like the Vitals feature list", () => {
    expect(describeAlertRule(rule({ aggregate: "average", window: 10 * MIN }))).toBe("Average CPU above 70% for 10 minutes");
    expect(describeAlertRule(rule({ metric: "memory-growth", threshold: 1.4, window: HOUR }))).toBe(
      "Memory grows by more than 1.4 GB in an hour"
    );
    expect(describeAlertRule(rule({ metric: "disk-write", threshold: 200, window: 5 * MIN, scope: { kind: "any-app" } }))).toBe(
      "Any app writes more than 200 MB/s to disk for 5 minutes"
    );
    expect(describeAlertRule(rule({ metric: "temperature", threshold: 90 }))).toBe("CPU temperature above 90 °C");
  });

  it("covers each metric, scope, aggregate and comparator", () => {
    expect(describeAlertRule(rule({ aggregate: "peak", threshold: 90, window: 5 * MIN, scope: { kind: "app", app: "Safari" } }))).toBe(
      "Safari uses more than 90% CPU at some point within 5 minutes"
    );
    expect(describeAlertRule(rule({ metric: "memory", comparator: "below", threshold: 2, window: MIN }))).toBe("Memory below 2 GB for 1 minute");
    expect(describeAlertRule(rule({ metric: "memory", threshold: 4, scope: { kind: "app", app: "Xcode" } }))).toBe("Xcode uses more than 4 GB of memory");
    expect(
      describeAlertRule(rule({ metric: "network", aggregate: "average", threshold: 50, window: 5 * MIN, scope: { kind: "any-app" } }))
    ).toBe("Any app transfers more than 50 MB/s over the network on average for 5 minutes");
    expect(describeAlertRule(rule({ metric: "network", threshold: 50 }))).toBe("Network traffic above 50 MB/s");
    expect(describeAlertRule(rule({ metric: "disk-read", threshold: 500, window: 2 * HOUR, scope: { kind: "app", app: "Photos" } }))).toBe(
      "Photos reads more than 500 MB/s from disk for 2 hours"
    );
    expect(describeAlertRule(rule({ metric: "disk-write", aggregate: "average", threshold: 300, window: 30 * MIN }))).toBe(
      "Average disk writes above 300 MB/s for 30 minutes"
    );
    expect(describeAlertRule(rule({ metric: "gpu", aggregate: "peak", threshold: 95, window: 30 * MIN }))).toBe("Peak GPU above 95% within 30 minutes");
    expect(describeAlertRule(rule({ metric: "gpu", comparator: "below", threshold: 5, window: 90 * MIN, scope: { kind: "any-app" } }))).toBe(
      "Any app uses less than 5% GPU for 90 minutes"
    );
    expect(describeAlertRule(rule({ metric: "memory-growth", threshold: 2, window: 30 * MIN, scope: { kind: "app", app: "Slack" } }))).toBe(
      "Slack's memory grows by more than 2 GB in 30 minutes"
    );
    expect(describeAlertRule(rule({ metric: "memory-growth", threshold: 1.4, scope: { kind: "any-app" } }))).toBe(
      "Any app's memory grows by more than 1.4 GB in an hour"
    );
  });

  it("converts temperatures and falls back for scopes a metric doesn't support", () => {
    const hot = rule({ metric: "temperature", threshold: 90, window: 5 * MIN });
    expect(describeAlertRule(hot, { temperatureUnit: "fahrenheit" })).toBe("CPU temperature above 194 °F for 5 minutes");
    expect(describeAlertRule({ ...hot, scope: { kind: "any-app" } })).toBe("CPU temperature above 90 °C for 5 minutes");
    expect(describeAlertRule({ ...hot, aggregate: "average" })).toBe("Average CPU temperature above 90 °C for 5 minutes");
    expect(describeAlertRule(rule({ metric: "bogus" as never }))).toBe("Unknown alert");
  });

  it("formats thresholds, windows and scopes", () => {
    expect(formatAlertThreshold("cpu", 70)).toBe("70%");
    expect(formatAlertThreshold("memory", 1.25)).toBe("1.25 GB");
    expect(formatAlertThreshold("temperature", 100, { temperatureUnit: "fahrenheit" })).toBe("212 °F");
    expect(formatAlertThreshold("cpu", Number.NaN)).toBe("—");
    expect(formatAlertWindow(MIN)).toBe("1 minute");
    expect(formatAlertWindow(HOUR)).toBe("an hour");
    expect(formatAlertWindow(3 * HOUR)).toBe("3 hours");
    expect(formatAlertWindow(30_000)).toBe("30 seconds");
    expect(formatAlertWindow(undefined)).toBe("");
    expect(describeAlertScope({ kind: "app", app: "Mail" })).toBe("Mail");
    expect(describeAlertScope({ kind: "any-app" })).toBe("Any app");
    expect(describeAlertScope({ kind: "mac" })).toBe("Mac");
  });
});

describe("ALERT_METRICS", () => {
  it("has units, ranges and defaults that validate for every metric", () => {
    expect(ALERT_METRIC_ORDER).toHaveLength(Object.keys(ALERT_METRICS).length);
    expect(ALERT_METRICS["memory-growth"].unitLabel).toBe("GB per hour");
    expect(ALERT_METRICS["disk-write"].unit).toBe("MB/s");
    expect(ALERT_METRICS.temperature.unit).toBe("°C");
    expect(alertThresholdRange("temperature", "fahrenheit")).toMatchObject({ min: 86, max: 230, unit: "°F" });
    for (const m of ALERT_METRIC_ORDER) {
      const info = ALERT_METRICS[m];
      expect(info.defaultThreshold).toBeGreaterThanOrEqual(info.min);
      expect(info.defaultThreshold).toBeLessThanOrEqual(info.max);
      expect(isAlertRuleValid(createAlertRule(m))).toBe(true);
    }
    for (const preset of ALERT_RULE_PRESETS) expect(isAlertRuleValid({ ...preset.rule, id: preset.id })).toBe(true);
  });

  it("switches metric while keeping what still applies", () => {
    const start = rule({ aggregate: "peak", window: 30 * MIN, scope: { kind: "any-app" }, mutedApps: ["Xcode"] });
    const growth = changeAlertMetric(start, "memory-growth");
    expect(growth).toMatchObject({ metric: "memory-growth", threshold: 1.4, window: HOUR, scope: { kind: "any-app" }, mutedApps: ["Xcode"] });
    expect(growth.aggregate).toBeUndefined();
    const temp = changeAlertMetric({ ...start, comparator: "below" }, "temperature");
    expect(temp).toMatchObject({ metric: "temperature", threshold: 90, comparator: "below", scope: { kind: "mac" } });
    expect(temp.window).toBeUndefined();
    expect(temp.mutedApps).toBeUndefined();
  });
});

describe("validateAlertRule", () => {
  it("accepts a valid rule", () => {
    expect(validateAlertRule(rule({ window: 10 * MIN }))).toEqual({});
  });

  it("reports thresholds out of range in the display unit", () => {
    expect(validateAlertRule(rule({ threshold: 150 })).threshold).toBe("Enter a value from 1% to 100%");
    expect(validateAlertRule(rule({ threshold: Number.NaN })).threshold).toBe("Enter a threshold");
    expect(validateAlertRule(rule({ metric: "temperature", threshold: 200 }), { temperatureUnit: "fahrenheit" }).threshold).toBe(
      "Enter a value from 86 °F to 230 °F"
    );
  });

  it("checks the scope, window and comparator", () => {
    expect(validateAlertRule(rule({ scope: { kind: "app", app: "  " } })).scope).toBe("Choose an app");
    expect(validateAlertRule(rule({ metric: "temperature", scope: { kind: "any-app" } })).scope).toBe(
      "Temperature alerts apply to the whole Mac"
    );
    expect(validateAlertRule(rule({ window: 30_000 })).window).toBe("Use at least 1 minute");
    expect(validateAlertRule(rule({ window: 48 * HOUR })).window).toBe("Use 24 hours or less");
    expect(validateAlertRule(rule({ metric: "memory-growth", threshold: 1 })).window).toBe("Choose a time window");
    expect(validateAlertRule(rule({ aggregate: "average" })).window).toBe("An average needs a time window");
    expect(validateAlertRule(rule({ metric: "memory-growth", threshold: 1, window: HOUR, comparator: "below" })).comparator).toMatch(/only fire above/);
    expect(validateAlertRule(rule({ metric: "nope" as never }))).toEqual({ metric: "Choose a metric" });
  });
});

describe("evaluateAlertRule", () => {
  const sustained = rule({ window: 10 * MIN });

  it("sustained: fires only when every reading in the window matched", () => {
    const above = perMinute([50, 72, 75, 80, 90, 85, 78, 74, 71, 76, 80, 82]);
    expect(evaluateAlertRule(sustained, above, NOW)).toEqual({ firing: true, value: 71, since: NOW - 10 * MIN });

    const dip = perMinute([72, 75, 80, 90, 85, 60, 74, 71, 76, 80, 82]);
    const r = evaluateAlertRule(sustained, dip, NOW);
    expect(r.firing).toBe(false);
    expect(r.since).toBe(NOW - 4 * MIN);
    expect(r.value).toBe(60);
  });

  it("sustained with below", () => {
    const low = rule({ metric: "memory", comparator: "below", threshold: 2, window: 5 * MIN });
    expect(evaluateAlertRule(low, perMinute([1.5, 1.2, 1.4, 1.1, 1.9, 1.0]), NOW)).toMatchObject({ firing: true, value: 1.9 });
    expect(evaluateAlertRule(low, perMinute([1.5, 1.2, 2.4, 1.1, 1.9, 1.0]), NOW).firing).toBe(false);
  });

  it("average vs peak over the same readings", () => {
    const spike = perMinute([40, 40, 40, 95, 40, 40, 40, 40, 40, 40, 40]);
    const average = rule({ aggregate: "average", window: 10 * MIN });
    const peak = rule({ aggregate: "peak", threshold: 90, window: 10 * MIN });
    expect(evaluateAlertRule(average, spike, NOW)).toEqual({ firing: false, value: 45 });
    expect(evaluateAlertRule(peak, spike, NOW)).toEqual({ firing: true, value: 95, since: NOW - 7 * MIN });

    const busy = perMinute([60, 65, 80, 85, 66, 90, 60, 75, 80, 70, 69]);
    expect(evaluateAlertRule(average, busy, NOW)).toMatchObject({ firing: true, value: 72.73 });
    // Same readings, but sustained needs every one above 70.
    expect(evaluateAlertRule(rule({ window: 10 * MIN }), busy, NOW).firing).toBe(false);
  });

  it("average needs readings that span the whole window", () => {
    const average = rule({ aggregate: "average", window: 10 * MIN });
    const startup = perMinute([90, 95, 99, 92, 91]);
    expect(evaluateAlertRule(average, startup, NOW)).toEqual({ firing: false, value: 93.4 });
  });

  it("no window: compares the latest reading", () => {
    const hot = rule({ metric: "temperature", threshold: 90 });
    expect(evaluateAlertRule(hot, perMinute([85, 91, 93, 95]), NOW)).toEqual({ firing: true, value: 95, since: NOW - 2 * MIN });
    expect(evaluateAlertRule(hot, perMinute([95, 89]), NOW)).toEqual({ firing: false, value: 89 });
  });

  it("memory growth: rise from the lowest reading in the window", () => {
    const growth = rule({ metric: "memory-growth", threshold: 1.4, window: HOUR });
    const leak = [
      { t: NOW - 90 * MIN, value: 1.0 },
      { t: NOW - 50 * MIN, value: 2.0 },
      { t: NOW - 30 * MIN, value: 2.6 },
      { t: NOW - 10 * MIN, value: 3.2 },
      { t: NOW, value: 3.6 },
    ];
    expect(evaluateAlertRule(growth, leak, NOW)).toEqual({ firing: true, value: 1.6, since: NOW });
    // The 1.0 GB reading is outside the hour; 2.0 → 2.5 is not enough.
    expect(evaluateAlertRule(growth, [leak[0]!, leak[1]!, { t: NOW, value: 2.5 }], NOW)).toEqual({ firing: false, value: 0.5 });
  });

  it("any app: checks each app, skipping muted apps", () => {
    const anyApp = rule({ aggregate: "average", window: 5 * MIN, scope: { kind: "any-app" } });
    const samples = [
      ...perMinute([90, 92, 95, 91, 93, 94], "Google Chrome"),
      ...perMinute([20, 22, 80, 18, 21, 25], "Safari"),
      ...perMinute([99, 99, 99, 99, 99, 99]),
    ];
    expect(evaluateAlertRule(anyApp, samples, NOW)).toMatchObject({ firing: true, app: "Google Chrome", value: 92.5 });
    const muted = evaluateAlertRule({ ...anyApp, mutedApps: ["Google Chrome"] }, samples, NOW);
    expect(muted).toMatchObject({ firing: false, app: "Safari", value: 31 });
    expect(evaluateAlertRule({ ...anyApp, mutedApps: ["Google Chrome", "Safari"] }, samples, NOW)).toEqual({ firing: false, value: undefined });
  });

  it("one app and the whole Mac read only their own samples", () => {
    const samples = [...perMinute([95, 95], "Xcode"), ...perMinute([10, 10])];
    expect(evaluateAlertRule(rule({ scope: { kind: "app", app: "Xcode" } }), samples, NOW)).toMatchObject({ firing: true, value: 95 });
    expect(evaluateAlertRule(rule({ scope: { kind: "app", app: "Xcode" }, mutedApps: ["Xcode"] }), samples, NOW).firing).toBe(false);
    expect(evaluateAlertRule(rule({}), samples, NOW)).toMatchObject({ firing: false, value: 10 });
  });

  it("ignores future and invalid readings, and disabled rules never fire", () => {
    const samples = [...perMinute([95]), { t: NOW + MIN, value: 10 }, { t: NOW - 1, value: Number.NaN }];
    expect(evaluateAlertRule(rule({}), samples, NOW)).toMatchObject({ firing: true, value: 95 });
    expect(evaluateAlertRule(rule({ enabled: false }), samples, NOW)).toMatchObject({ firing: false, value: 95 });
    expect(evaluateAlertRule(rule({}), [], NOW)).toEqual({ firing: false, value: undefined });
  });
});

/* ------------------------------------------------------------------------------------------------
 * MutedAppsList
 * ----------------------------------------------------------------------------------------------*/

describe("MutedAppsList", () => {
  it("unmutes apps and shows an empty state", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onUnmute = vi.fn();
    const { container } = render(<MutedAppsList defaultValue={["Xcode", "Docker"]} onValueChange={onValueChange} onUnmute={onUnmute} />);
    const list = screen.getByRole("list", { name: "Muted apps" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(await axeViolations(container)).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Unmute Xcode" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["Docker"]);
    expect(onUnmute).toHaveBeenCalledWith("Xcode");
    await user.click(screen.getByRole("button", { name: "Unmute Docker" }));
    expect(screen.getByText("No muted apps")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------------------------------------
 * AlertRuleList
 * ----------------------------------------------------------------------------------------------*/

const rules: AlertRule[] = [
  rule({ id: "cpu", aggregate: "average", window: 10 * MIN, scope: { kind: "any-app" }, mutedApps: ["Xcode", "Docker"] }),
  rule({ id: "temp", metric: "temperature", threshold: 90, enabled: false }),
  rule({ id: "safari", metric: "memory", threshold: 4, scope: { kind: "app", app: "Safari" }, label: "Safari memory" }),
];

describe("AlertRuleList", () => {
  it("shows each rule's sentence, scope and muted apps", async () => {
    const { container } = render(<AlertRuleList defaultRules={rules} firingIds={["cpu"]} />);
    const list = screen.getByRole("list", { name: "Alerts" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Any app uses more than 70% CPU on average for 10 minutes");
    expect(within(rows[0]!).getByText("Any app")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("2 muted apps")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("Firing")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Mac")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Safari memory")).toBeInTheDocument();
    expect(rows[2]).toHaveTextContent("Safari uses more than 4 GB of memory");
    expect(container.querySelector('[data-slot="alert-rule-list"]')!.getAttribute("style")).toContain("#fb2c36");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("toggles rules (uncontrolled and granular callbacks)", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onRulesChange = vi.fn();
    render(<AlertRuleList defaultRules={rules} onToggle={onToggle} onRulesChange={onRulesChange} />);
    const sw = screen.getByRole("switch", { name: "Alert on: CPU temperature above 90 °C" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    await user.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(onToggle).toHaveBeenCalledWith("temp", true);
    expect(onRulesChange.mock.lastCall![0][1]).toMatchObject({ id: "temp", enabled: true });
  });

  it("controlled rules follow the parent", async () => {
    const user = userEvent.setup();
    const onRulesChange = vi.fn();
    render(<AlertRuleList rules={rules} onRulesChange={onRulesChange} />);
    const sw = screen.getByRole("switch", { name: /Alert on: Any app/ });
    await user.click(sw);
    expect(onRulesChange.mock.lastCall![0][0].enabled).toBe(false);
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("deletes only after confirming", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<AlertRuleList defaultRules={rules} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "Delete alert: Safari memory…" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete this alert?" });
    expect(dialog).toHaveTextContent("Safari uses more than 4 GB of memory");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "Delete alert: Safari memory…" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
    expect(onDelete).toHaveBeenCalledWith("safari");
  });

  it("offers presets when empty; one click adds a rule", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const { container } = render(<AlertRuleList onCreate={onCreate} />);
    expect(screen.getByRole("heading", { name: "No alerts yet" })).toBeInTheDocument();
    const suggestions = screen.getByRole("list", { name: "Suggested alerts" });
    expect(within(suggestions).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "CPU average above 70% for 10 minutes",
      "Memory grows 1.4 GB in an hour",
      "Temperature above 90 °C",
    ]);
    expect(await axeViolations(container)).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Memory grows 1.4 GB in an hour" }));
    expect(onCreate.mock.lastCall![0]).toMatchObject({ metric: "memory-growth", threshold: 1.4, window: HOUR, enabled: true });
    expect(onCreate.mock.lastCall![0].id).toMatch(/^alert-/);
    expect(screen.getByRole("list", { name: "Alerts" })).toHaveTextContent("Any app's memory grows by more than 1.4 GB in an hour");
    expect(screen.getByRole("button", { name: "Add alert" })).toBeInTheDocument();
  });

  it("hands edit and add to the caller when asked", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onAdd = vi.fn();
    render(<AlertRuleList defaultRules={rules} onEdit={onEdit} onAdd={onAdd} />);
    await user.click(screen.getByRole("button", { name: "Edit alert: CPU temperature above 90 °C" }));
    expect(onEdit).toHaveBeenCalledWith(rules[1]);
    await user.click(screen.getByRole("button", { name: "Add alert" }));
    expect(onAdd).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("edits and adds through the built-in dialog", async () => {
    const user = userEvent.setup();
    const onRulesChange = vi.fn();
    render(<AlertRuleList defaultRules={rules} onRulesChange={onRulesChange} apps={["Safari", "Xcode"]} />);
    await user.click(screen.getByRole("button", { name: "Edit alert: CPU temperature above 90 °C" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit alert" });
    const input = within(dialog).getByRole("spinbutton", { name: /Threshold/ });
    await user.clear(input);
    await user.type(input, "95");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("list", { name: "Alerts" })).toHaveTextContent("CPU temperature above 95 °C");
    expect(onRulesChange.mock.lastCall![0][1]).toMatchObject({ id: "temp", threshold: 95 });

    await user.click(screen.getByRole("button", { name: "Add alert" }));
    const add = await screen.findByRole("dialog", { name: "New alert" });
    await user.click(within(add).getByRole("button", { name: "Add alert" }));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(4));
    expect(screen.getAllByRole("listitem")[3]).toHaveTextContent("CPU above 70% for 10 minutes");
  });
});

/* ------------------------------------------------------------------------------------------------
 * AlertRuleEditor
 * ----------------------------------------------------------------------------------------------*/

describe("AlertRuleEditor", () => {
  it("creates a rule: metric, comparator, window, scope and a live preview", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<AlertRuleEditor apps={["Safari", "Xcode", "Docker"]} onSubmit={onSubmit} />);
    const preview = container.querySelector('[data-slot="alert-rule-preview"] p')!;
    expect(preview).toHaveTextContent("CPU above 70% for 10 minutes");
    expect(await axeViolations(container)).toEqual([]);

    await user.click(screen.getByRole("combobox", { name: "Metric" }));
    await user.click(await screen.findByRole("option", { name: "Disk writes" }));
    expect(preview).toHaveTextContent("Disk writes above 200 MB/s for 5 minutes");
    expect(screen.getByRole("spinbutton", { name: "Threshold (MB/s)" })).toHaveValue("200");

    await user.click(screen.getByRole("radio", { name: "Any app" }));
    expect(preview).toHaveTextContent("Any app writes more than 200 MB/s to disk for 5 minutes");
    await user.click(screen.getByRole("radio", { name: "30 minutes" }));
    await user.click(screen.getByRole("radio", { name: "Average" }));
    expect(preview).toHaveTextContent("Any app writes more than 200 MB/s to disk on average for 30 minutes");

    const muted = screen.getByRole("group", { name: "Muted apps" });
    await user.click(within(muted).getByRole("button", { name: "Docker" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.lastCall![0]).toMatchObject({
      metric: "disk-write",
      threshold: 200,
      aggregate: "average",
      window: 30 * MIN,
      scope: { kind: "any-app" },
      mutedApps: ["Docker"],
      enabled: true,
    });
  });

  it("edits an existing rule and submits with Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onValueChange = vi.fn();
    const existing = rule({ id: "keep", aggregate: "peak", threshold: 80, window: 5 * MIN, scope: { kind: "app", app: "Xcode" } });
    render(<AlertRuleEditor defaultValue={existing} apps={["Safari", "Xcode"]} onSubmit={onSubmit} onValueChange={onValueChange} />);
    expect(screen.getByRole("combobox", { name: "App" })).toHaveTextContent("Xcode");
    expect(screen.getByRole("radio", { name: "Peak" })).toHaveAttribute("aria-checked", "true");
    const input = screen.getByRole("spinbutton", { name: "Threshold (%)" });
    await user.clear(input);
    await user.type(input, "92{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ threshold: 92 }));
    expect(onSubmit.mock.lastCall![0]).toEqual({ ...existing, threshold: 92 });
  });

  it("shows field errors on submit and moves focus to the first one", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AlertRuleEditor defaultValue={rule({ threshold: 150, window: 10 * MIN, scope: { kind: "app", app: "" } })} apps={["Safari"]} onSubmit={onSubmit} />);
    expect(screen.queryByRole("alert")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    const input = screen.getByRole("spinbutton", { name: "Threshold (%)" });
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a value from 1% to 100%");
    expect(screen.getByRole("combobox", { name: "App" })).toHaveAccessibleDescription("Choose an app");

    await user.clear(input);
    await user.type(input, "85");
    await user.tab();
    expect(screen.queryByText("Enter a value from 1% to 100%")).toBeNull();
    await user.click(screen.getByRole("combobox", { name: "App" }));
    await user.click(await screen.findByRole("option", { name: "Safari" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit.mock.lastCall![0]).toMatchObject({ threshold: 85, scope: { kind: "app", app: "Safari" } });
  });

  it("validates a threshold as soon as it's edited", async () => {
    const user = userEvent.setup();
    render(<AlertRuleEditor />);
    const input = screen.getByRole("spinbutton", { name: "Threshold (%)" });
    await user.clear(input);
    // The number commits on blur (or Enter).
    expect(screen.queryByText("Enter a threshold")).toBeNull();
    await user.tab();
    expect(screen.getByText("Enter a threshold")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("works in Fahrenheit and stores Celsius", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AlertRuleEditor defaultValue={rule({ metric: "temperature", threshold: 90 })} temperatureUnit="fahrenheit" onSubmit={onSubmit} />);
    const input = screen.getByRole("spinbutton", { name: "Threshold (°F)" });
    expect(input).toHaveValue("194");
    expect(screen.getByText("The whole Mac")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Instantly" })).toHaveAttribute("aria-checked", "true");
    await user.clear(input);
    await user.type(input, "212");
    await user.tab();
    expect(screen.getByText("CPU temperature above 212 °F")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit.mock.lastCall![0]).toMatchObject({ metric: "temperature", threshold: 100 });
  });

  it("memory growth hides the comparator and requires a window", async () => {
    const user = userEvent.setup();
    render(<AlertRuleEditor defaultValue={rule({ metric: "memory-growth", threshold: 1.4, window: HOUR, scope: { kind: "any-app" } })} />);
    expect(screen.queryByRole("radio", { name: "Below" })).toBeNull();
    expect(screen.queryByRole("radio", { name: "Instantly" })).toBeNull();
    expect(screen.queryByRole("radio", { name: "Average" })).toBeNull();
    expect(screen.getByRole("radiogroup", { name: "Within" })).toBeInTheDocument();
    expect(screen.getByText("Any app's memory grows by more than 1.4 GB in an hour")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Grows by more than (GB per hour)" })).toHaveValue("1.4");
    // Muted apps need an app list.
    expect(screen.queryByRole("group", { name: "Muted apps" })).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Mac" }));
    expect(screen.getByText("Memory grows by more than 1.4 GB in an hour")).toBeInTheDocument();
  });

  it("is keyboard operable", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AlertRuleEditor onSubmit={onSubmit} onCancel={() => {}} />);
    const above = screen.getByRole("radio", { name: "Above" });
    above.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Below" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByText("CPU below 70% for 10 minutes")).toBeInTheDocument();
    const input = screen.getByRole("spinbutton", { name: "Threshold (%)" });
    input.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(input).toHaveValue("68");
    await user.keyboard("{Enter}");
    expect(onSubmit.mock.lastCall![0]).toMatchObject({ comparator: "below", threshold: 68 });
  });

  it("supports a controlled draft", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [draft, setDraft] = React.useState<AlertRule>(rule({ window: 10 * MIN }));
      return (
        <>
          <AlertRuleEditor value={draft} onValueChange={setDraft} />
          <output data-testid="out">{describeAlertRule(draft)}</output>
        </>
      );
    }
    render(<Harness />);
    await user.click(screen.getByRole("radio", { name: "1 minute" }));
    expect(screen.getByTestId("out")).toHaveTextContent("CPU above 70% for 1 minute");
  });
});

describe("AlertRuleDialog", () => {
  it("opens from a trigger, resets the draft each time and closes on Cancel or Escape", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AlertRuleDialog trigger={<button type="button">New alert</button>} defaultMetric="gpu" onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "New alert" }));
    let dialog = await screen.findByRole("dialog", { name: "New alert" });
    expect(await axeViolations(dialog)).toEqual([]);
    const input = within(dialog).getByRole("spinbutton", { name: "Threshold (%)" });
    expect(input).toHaveValue("80");
    await user.clear(input);
    await user.type(input, "50");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(screen.getByRole("button", { name: "New alert" }));
    dialog = await screen.findByRole("dialog", { name: "New alert" });
    expect(within(dialog).getByRole("spinbutton", { name: "Threshold (%)" })).toHaveValue("80");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits an edited rule and closes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();
    const existing = rule({ id: "x", window: 10 * MIN });
    render(<AlertRuleDialog defaultOpen rule={existing} onSubmit={onSubmit} onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole("dialog", { name: "Edit alert" });
    await user.click(within(dialog).getByRole("radio", { name: "an hour" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledWith({ ...existing, window: HOUR });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
