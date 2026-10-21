import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  CronScheduleField,
  cronToSchedule,
  describeCron,
  describeSchedule,
  formatCountdownClock,
  formatInterval,
  formatScheduleRelative,
  nextCronRuns,
  nextScheduleRuns,
  parseCron,
  parseInterval,
  scheduleToCron,
  toScheduleString,
  type CronSchedule,
  type CronScheduleValue,
} from "../src/patterns/cron";
import {
  AgentJobForm,
  BlueprintCard,
  BlueprintGallery,
  DeliveryTargetPicker,
  JobDetail,
  JobList,
  JobRow,
  JobStatePill,
  NameCheckboxPicker,
  RunHistory,
  deliveryTargetIssue,
  fillBlueprintTemplate,
  validateAgentJob,
  type AgentJob,
  type AgentJobDraft,
  type AgentJobRun,
  type Blueprint,
} from "../src/kits/agent-admin/agent-jobs";
import { GoalStatusRow, HeartbeatStatusRow, LoopStatusRow, StatusStack, StatusStackRow } from "../src/kits/agent-admin/status-stack";
import { WebhookRouteEditor, WebhookRouteList, type WebhookRoute } from "../src/kits/agent-admin/webhooks";
import { axeViolations } from "./helpers/a11y";

const T0 = Date.UTC(2026, 0, 1, 8, 0); // Thu 1 Jan 2026 08:00 UTC
const MIN = 60_000;
const flush = () => act(async () => {});

let writeText: ReturnType<typeof vi.fn>;
beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});
afterEach(() => vi.useRealTimers());

const iso = (d: Date) => d.toISOString();

/* ------------------------------------------------------------------ */
/* parseCron                                                           */
/* ------------------------------------------------------------------ */

describe("parseCron", () => {
  const ok = (expr: string) => {
    const r = parseCron(expr);
    if (!r.ok) throw new Error(r.error);
    return r.value;
  };

  it("expands steps, ranges and lists", () => {
    expect(ok("*/15 * * * *").fields.minute).toEqual([0, 15, 30, 45]);
    expect(ok("5-20/5 * * * *").fields.minute).toEqual([5, 10, 15, 20]);
    expect(ok("10/20 * * * *").fields.minute).toEqual([10, 30, 50]);
    expect(ok("0 9,12,18 * * *").fields.hour).toEqual([9, 12, 18]);
    expect(ok("0 0 1-3,15 * *").fields.dayOfMonth).toEqual([1, 2, 3, 15]);
    expect(ok("* * * * *").fields.minute).toHaveLength(60);
  });

  it("accepts month and weekday names, case-insensitively, and 7 as Sunday", () => {
    const p = ok("0 0 * jan-MAR mon,Wed,FRI");
    expect(p.fields.month).toEqual([1, 2, 3]);
    expect(p.fields.dayOfWeek).toEqual([1, 3, 5]);
    expect(ok("0 0 * * 7").fields.dayOfWeek).toEqual([0]);
    expect(ok("0 0 * * SUN").fields.dayOfWeek).toEqual([0]);
    expect(ok("0 9 * * MON-FRI").fields.dayOfWeek).toEqual([1, 2, 3, 4, 5]);
  });

  it("tracks day-field restriction and normalises whitespace and macros", () => {
    const p = ok("  0   9 * *   1-5 ");
    expect(p.expression).toBe("0 9 * * 1-5");
    expect(p.domRestricted).toBe(false);
    expect(p.dowRestricted).toBe(true);
    expect(ok("*/2 0 */3 * *").domRestricted).toBe(false);
    expect(ok("@daily").expression).toBe("0 0 * * *");
    expect(ok("@hourly").expression).toBe("0 * * * *");
  });

  it.each([
    ["", /Enter a cron/],
    ["* * *", /Expected 5 fields.*got 3/],
    ["* * * * * *", /got 6/],
    ["60 * * * *", /between 0 and 59/],
    ["0 24 * * *", /between 0 and 23/],
    ["0 0 0 * *", /between 1 and 31/],
    ["0 0 * 13 *", /between 1 and 12/],
    ["*/0 * * * *", /step/],
    ["*/x * * * *", /step/],
    ["5-1 * * * *", /range/],
    ["1,,2 * * * *", /Empty item/],
    ["0 0 * * FOO", /Invalid day of week value "FOO"/],
    ["0 0 * BAR *", /Invalid month value/],
    ["@sometimes", /Unknown macro/],
  ])("rejects %j", (expr, error) => {
    const r = parseCron(expr);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(error);
  });
});

/* ------------------------------------------------------------------ */
/* describeCron                                                        */
/* ------------------------------------------------------------------ */

describe("describeCron", () => {
  it.each([
    ["0 9 * * 1-5", "Every weekday at 9:00 AM"],
    ["0 9 * * MON-FRI", "Every weekday at 9:00 AM"],
    ["*/15 * * * *", "Every 15 minutes"],
    ["* * * * *", "Every minute"],
    ["30 8 1 * *", "At 8:30 AM on day 1 of the month"],
    ["0 0 1,15 * *", "At 12:00 AM on days 1 and 15 of the month"],
    ["0 * * * *", "Every hour"],
    ["5 * * * *", "Every hour at :05"],
    ["0 */2 * * *", "Every 2 hours"],
    ["30 */6 * * *", "Every 6 hours at :30"],
    ["0 7 * * *", "Every day at 7:00 AM"],
    ["0 18 * * 1,3,5", "Every Monday, Wednesday and Friday at 6:00 PM"],
    ["0 10 * * 0,6", "Every Saturday and Sunday at 10:00 AM"],
    ["0 0 1 1 *", "At 12:00 AM on January 1"],
    ["0 9,17 * * *", "Every day at 9:00 AM and 5:00 PM"],
    ["*/10 9-17 * * 1-5", "Every 10 minutes from 9:00 AM to 5:59 PM on weekdays"],
    ["0 9-17 * * *", "Every hour from 9:00 AM to 5:00 PM"],
    ["*/30 * * * 0,6", "Every 30 minutes on weekends"],
    ["0 12 13 * 5", "At 12:00 PM on day 13 of the month or every Friday"],
    ["@weekly", "Every Sunday at 12:00 AM"],
  ])("%s → %s", (expr, text) => {
    expect(describeCron(expr)).toBe(text);
  });

  it("supports 24-hour output", () => {
    expect(describeCron("30 8 1 * *", { hour12: false })).toBe("At 08:30 on day 1 of the month");
  });

  it("reports invalid expressions", () => {
    expect(describeCron("99 * * * *")).toMatch(/^Invalid schedule: /);
  });
});

/* ------------------------------------------------------------------ */
/* nextCronRuns                                                        */
/* ------------------------------------------------------------------ */

describe("nextCronRuns", () => {
  const utc = { timeZone: "UTC" };

  it("steps to weekday mornings, strictly after `from`", () => {
    expect(nextCronRuns("0 9 * * 1-5", T0, 3, utc).map(iso)).toEqual([
      "2026-01-01T09:00:00.000Z",
      "2026-01-02T09:00:00.000Z",
      "2026-01-05T09:00:00.000Z",
    ]);
    expect(nextCronRuns("0 9 * * *", Date.UTC(2026, 0, 1, 9, 0), 1, utc).map(iso)).toEqual(["2026-01-02T09:00:00.000Z"]);
  });

  it("handles minute steps", () => {
    expect(nextCronRuns("*/15 * * * *", Date.UTC(2026, 0, 1, 8, 7), 3, utc).map(iso)).toEqual([
      "2026-01-01T08:15:00.000Z",
      "2026-01-01T08:30:00.000Z",
      "2026-01-01T08:45:00.000Z",
    ]);
  });

  it("ORs day-of-month and day-of-week when both are restricted", () => {
    expect(nextCronRuns("0 12 13 * 5", T0, 3, utc).map(iso)).toEqual([
      "2026-01-02T12:00:00.000Z",
      "2026-01-09T12:00:00.000Z",
      "2026-01-13T12:00:00.000Z",
    ]);
  });

  it("finds leap days and gives up on impossible dates", () => {
    expect(nextCronRuns("0 0 29 2 *", T0, 1, utc).map(iso)).toEqual(["2028-02-29T00:00:00.000Z"]);
    expect(nextCronRuns("0 0 30 2 *", T0, 1, utc)).toEqual([]);
    expect(nextCronRuns("not cron", T0, 3, utc)).toEqual([]);
  });

  it("evaluates in a named time zone, across a DST change", () => {
    expect(nextCronRuns("0 9 * * *", Date.UTC(2026, 2, 7, 0, 0), 2, { timeZone: "America/New_York" }).map(iso)).toEqual([
      "2026-03-07T14:00:00.000Z",
      "2026-03-08T13:00:00.000Z",
    ]);
  });

  it("defaults to the local zone", () => {
    const runs = nextCronRuns("30 10 * * *", new Date(2026, 5, 1, 0, 0), 2);
    expect(runs.map((d) => d.getTime())).toEqual([new Date(2026, 5, 1, 10, 30).getTime(), new Date(2026, 5, 2, 10, 30).getTime()]);
  });
});

/* ------------------------------------------------------------------ */
/* Schedules & intervals                                               */
/* ------------------------------------------------------------------ */

describe("scheduleToCron / cronToSchedule", () => {
  const cases: [CronSchedule, string][] = [
    [{ mode: "interval", every: 15, unit: "m" }, "*/15 * * * *"],
    [{ mode: "interval", every: 45, unit: "m" }, "every 45m"],
    [{ mode: "interval", every: 2, unit: "h" }, "0 */2 * * *"],
    [{ mode: "interval", every: 5, unit: "h" }, "every 5h"],
    [{ mode: "interval", every: 3, unit: "d" }, "every 3d"],
    [{ mode: "hourly", minute: 5 }, "5 * * * *"],
    [{ mode: "daily", time: "07:30" }, "30 7 * * *"],
    [{ mode: "weekdays", time: "09:00" }, "0 9 * * 1-5"],
    [{ mode: "weekly", days: [1, 3, 5], time: "18:00" }, "0 18 * * 1,3,5"],
    [{ mode: "monthly", day: 15, time: "08:00" }, "0 8 15 * *"],
    [{ mode: "custom", expr: "*/5 9-17 * * 1-5" }, "*/5 9-17 * * 1-5"],
    [{ mode: "custom", expr: "0 0 1 1 *" }, "0 0 1 1 *"],
  ];

  it.each(cases)("round-trips %j", (schedule, text) => {
    expect(scheduleToCron(schedule)).toBe(text);
    expect(cronToSchedule(text)).toEqual(schedule);
  });

  it("round-trips one-shot schedules as local timestamps", () => {
    const at = new Date(2026, 11, 1, 9, 30);
    const text = scheduleToCron({ mode: "once", at });
    expect(text).toBe("2026-12-01T09:30");
    const back = cronToSchedule(text);
    expect(back.mode).toBe("once");
    expect(back.mode === "once" && back.at.getTime()).toBe(at.getTime());
  });

  it("recognises equivalent spellings and falls back to custom", () => {
    expect(cronToSchedule("0 9 * * MON-FRI")).toEqual({ mode: "weekdays", time: "09:00" });
    expect(cronToSchedule("every 2 hours")).toEqual({ mode: "interval", every: 2, unit: "h" });
    expect(cronToSchedule("@daily")).toEqual({ mode: "custom", expr: "@daily" });
    expect(cronToSchedule("garbage")).toEqual({ mode: "custom", expr: "garbage" });
  });

  it("formats values and summaries", () => {
    const values: [CronScheduleValue, string][] = [
      [{ kind: "interval", every: 30, unit: "m" }, "every 30m"],
      [{ kind: "cron", expr: " 0 9 * * 1-5 " }, "0 9 * * 1-5"],
      [{ kind: "once", at: new Date(2026, 0, 2, 7, 5) }, "2026-01-02T07:05"],
    ];
    for (const [v, s] of values) expect(toScheduleString(v)).toBe(s);
    expect(describeSchedule("every 30m")).toBe("Every 30 minutes");
    expect(describeSchedule({ kind: "once", at: new Date(2026, 0, 2, 7, 5) })).toBe("Once on Jan 2, 2026 at 7:05 AM");
    expect(nextScheduleRuns("every 2h", T0, 2).map(iso)).toEqual(["2026-01-01T10:00:00.000Z", "2026-01-01T12:00:00.000Z"]);
  });
});

describe("parseInterval / formatInterval", () => {
  it.each([
    ["every 30m", { every: 30, unit: "m" }],
    ["30m", { every: 30, unit: "m" }],
    ["every 2 hours", { every: 2, unit: "h" }],
    ["Every 1d", { every: 1, unit: "d" }],
    ["every 90 minutes", { every: 90, unit: "m" }],
    ["every 4 hrs", { every: 4, unit: "h" }],
  ])("parses %j", (text, value) => {
    expect(parseInterval(text)).toEqual(value);
  });

  it.each(["every 0m", "soon", "every m", "30s", ""])("rejects %j", (text) => {
    expect(parseInterval(text)).toBeNull();
  });

  it("formats short and long", () => {
    expect(formatInterval({ every: 30, unit: "m" })).toBe("every 30m");
    expect(formatInterval({ every: 30, unit: "m" }, { style: "long" })).toBe("Every 30 minutes");
    expect(formatInterval({ every: 1, unit: "h" }, { style: "long" })).toBe("Every hour");
    expect(parseInterval(formatInterval({ every: 12, unit: "h" }))).toEqual({ every: 12, unit: "h" });
  });

  it("formats countdowns and relative times", () => {
    expect(formatCountdownClock(44 * MIN + 12_000)).toBe("44:12");
    expect(formatCountdownClock(3_723_000)).toBe("1:02:03");
    expect(formatScheduleRelative(T0 + 5 * MIN, T0)).toBe("in 5m");
    expect(formatScheduleRelative(T0 - 3 * 3_600_000, T0)).toBe("3h ago");
    expect(formatScheduleRelative(T0 + 10_000, T0)).toBe("now");
  });
});

/* ------------------------------------------------------------------ */
/* CronScheduleField                                                   */
/* ------------------------------------------------------------------ */

describe("CronScheduleField", () => {
  const summary = (c: HTMLElement) => c.querySelector('[data-slot="cron-summary"]')!.textContent;

  it("preserves per-mode state when switching modes", () => {
    const onChange = vi.fn();
    const { container } = render(<CronScheduleField defaultValue="every 30m" now={T0} timeZone="UTC" onValueChange={onChange} />);
    expect(summary(container)).toBe("Every 30 minutes");

    const interval = screen.getByRole("spinbutton", { name: "Interval" });
    fireEvent.change(interval, { target: { value: "45" } });
    fireEvent.blur(interval);
    expect(summary(container)).toBe("Every 45 minutes");
    expect(onChange).toHaveBeenLastCalledWith({ kind: "interval", every: 45, unit: "m" }, expect.objectContaining({ scheduleString: "every 45m" }));

    fireEvent.click(screen.getByRole("radio", { name: "Weekly" }));
    fireEvent.click(screen.getByRole("button", { name: "Wednesday" }));
    expect(screen.getByRole("button", { name: "Wednesday" })).toHaveAttribute("aria-pressed", "true");
    expect(summary(container)).toBe("Every Monday and Wednesday at 9:00 AM");
    expect(onChange).toHaveBeenLastCalledWith({ kind: "cron", expr: "0 9 * * 1,3" }, expect.anything());

    fireEvent.click(screen.getByRole("radio", { name: "Interval" }));
    expect(screen.getByRole("spinbutton", { name: "Interval" })).toHaveValue("45");
    fireEvent.click(screen.getByRole("radio", { name: "Weekly" }));
    expect(screen.getByRole("button", { name: "Wednesday" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Monday" })).toHaveAttribute("aria-pressed", "true");
  });

  it("validates a custom cron expression live", () => {
    const onChange = vi.fn();
    const { container } = render(<CronScheduleField defaultValue="every 30m" now={T0} timeZone="UTC" onValueChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Cron" }));
    const input = screen.getByRole("textbox", { name: /Cron expression/ });
    fireEvent.change(input, { target: { value: "61 * * * *" } });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(summary(container)).toMatch(/between 0 and 59/);
    expect(onChange).toHaveBeenLastCalledWith(null, expect.objectContaining({ error: expect.stringMatching(/between 0 and 59/) }));
    expect(screen.queryByRole("list", { name: "Next runs" })).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "0 9 * * 1-5" } });
    expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(summary(container)).toBe("Every weekday at 9:00 AM");
    expect(within(screen.getByRole("list", { name: "Next runs" })).getAllByRole("listitem")).toHaveLength(3);
  });

  it("previews the next runs with a timezone label", () => {
    render(<CronScheduleField defaultValue={{ kind: "cron", expr: "0 9 * * 1-5" }} now={T0} timeZone="UTC" />);
    expect(screen.getByRole("radio", { name: "Weekdays" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("UTC")).toBeInTheDocument();
    const items = within(screen.getByRole("list", { name: "Next runs" })).getAllByRole("listitem");
    expect(items.map((li) => li.querySelector("time")!.getAttribute("datetime"))).toEqual([
      "2026-01-01T09:00:00.000Z",
      "2026-01-02T09:00:00.000Z",
      "2026-01-05T09:00:00.000Z",
    ]);
    expect(items[0]).toHaveTextContent("in 1h");
  });

  it("follows a controlled value", () => {
    const { container, rerender } = render(<CronScheduleField value="0 8 15 * *" now={T0} timeZone="UTC" />);
    expect(screen.getByRole("radio", { name: "Monthly" })).toHaveAttribute("aria-checked", "true");
    rerender(<CronScheduleField value="every 2h" now={T0} timeZone="UTC" />);
    expect(summary(container)).toBe("Every 2 hours");
  });

  it("has no axe violations", async () => {
    const { container } = render(<CronScheduleField defaultValue="0 9 * * 1,3" now={T0} timeZone="UTC" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* DeliveryTargetPicker                                                */
/* ------------------------------------------------------------------ */

describe("DeliveryTargetPicker", () => {
  it("warns when a platform has no home channel until a destination is entered", () => {
    const onConfigure = vi.fn();
    const onChange = vi.fn();
    render(<DeliveryTargetPicker status={{ slack: { configured: true }, telegram: { homeChannel: "@me" } }} onConfigureChannels={onConfigure} onValueChange={onChange} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Slack" }));
    expect(screen.getByRole("status")).toHaveTextContent("Needs a home channel — set one in Channels");
    fireEvent.click(screen.getByRole("button", { name: "Channels" }));
    expect(onConfigure).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole("textbox", { name: /Channel/ }), { target: { value: "#ops" } });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({ platform: "slack", destination: "#ops" });

    fireEvent.click(screen.getByRole("radio", { name: "Telegram" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Chat ID/ })).toHaveAttribute("placeholder", "Home channel: @me");
  });

  it("disables unconnected platforms with a reason", () => {
    render(<DeliveryTargetPicker status={{ discord: { configured: false }, whatsapp: { disabledReason: "Business account required" } }} />);
    expect(screen.getByRole("radio", { name: /^Discord/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /^Discord/ })).toHaveAccessibleDescription("Not connected");
    expect(screen.getByRole("radio", { name: /^WhatsApp/ })).toHaveAccessibleDescription("Business account required");
    expect(screen.getByRole("radio", { name: "Inbox" })).toBeChecked();
  });

  it("reports target issues", () => {
    expect(deliveryTargetIssue({ platform: "local" })).toBeNull();
    expect(deliveryTargetIssue({ platform: "webhook" })).toBe("Enter a url");
    expect(deliveryTargetIssue({ platform: "email" }, { email: { homeChannel: "me@x.io" } })).toBeNull();
    expect(deliveryTargetIssue({ platform: "github", destination: "a/b#1" })).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = render(<DeliveryTargetPicker defaultValue={{ platform: "slack" }} status={{ discord: { configured: false } }} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("NameCheckboxPicker", () => {
  it("filters, selects all shown and counts", () => {
    const onChange = vi.fn();
    render(<NameCheckboxPicker label="Skills" options={["web", "email", "calendar", "github", "notes", "files", "weather"]} onValueChange={onChange} />);
    expect(screen.getByText("0 of 7 selected")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search Skills" }), { target: { value: "e" } });
    expect(screen.queryByRole("checkbox", { name: "github" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /Select all shown/ }));
    expect(onChange).toHaveBeenLastCalledWith(["web", "email", "calendar", "notes", "files", "weather"]);
    expect(screen.getByText("6 of 7 selected")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* AgentJobForm                                                        */
/* ------------------------------------------------------------------ */

describe("AgentJobForm", () => {
  const renderForm = (onSubmit = vi.fn()) => {
    const utils = render(
      <AgentJobForm models={["claude-sonnet", "local-llama"]} profiles={["default"]} skills={["web", "email"]} toolsets={["browser", "shell"]} now={T0} timeZone="UTC" onSubmit={onSubmit} />
    );
    return { ...utils, onSubmit };
  };

  it("validates required fields", async () => {
    const { onSubmit } = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await flush();
    expect(screen.getByText("Give the job a name")).toBeInTheDocument();
    expect(screen.getByText("Write a prompt for the agent")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits an agent job payload", async () => {
    const { onSubmit } = renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "  Morning briefing " } });
    fireEvent.change(screen.getByRole("textbox", { name: "Prompt" }), { target: { value: "Summarise my inbox" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "web" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "shell" }));
    fireEvent.click(screen.getByRole("radio", { name: "Weekdays" }));
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await flush();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toEqual<AgentJobDraft>({
      name: "Morning briefing",
      prompt: "Summarise my inbox",
      script: "",
      schedule: { kind: "cron", expr: "0 9 * * 1-5" },
      model: "claude-sonnet",
      profile: "default",
      skills: ["web"],
      toolsets: ["shell"],
      mode: "agent",
      repeat: null,
      delivery: { platform: "local" },
      enabled: true,
    });
  });

  it("switches to script mode (no agent) and requires a script", async () => {
    const { onSubmit } = renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Backup" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "web" }));
    fireEvent.click(screen.getByRole("radio", { name: "Script" }));
    expect(screen.getByText(/no agent — deliver stdout as-is/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Prompt" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "web" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await flush();
    expect(screen.getByText("Enter a script or command")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Script" }), { target: { value: "~/bin/backup.sh" } });
    const repeat = screen.getByRole("spinbutton", { name: "Repeat limit" });
    fireEvent.change(repeat, { target: { value: "3" } });
    fireEvent.blur(repeat);
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await flush();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ mode: "script", script: "~/bin/backup.sh", skills: [], toolsets: [], repeat: 3 }));
  });

  it("validateAgentJob flags schedule, repeat and delivery", () => {
    const base: AgentJobDraft = {
      name: "x",
      prompt: "y",
      schedule: { kind: "cron", expr: "nope" },
      skills: [],
      toolsets: [],
      mode: "agent",
      repeat: 0,
      delivery: { platform: "slack" },
      enabled: true,
    };
    expect(Object.keys(validateAgentJob(base)).sort()).toEqual(["delivery", "repeat", "schedule"]);
  });

  it("has no axe violations", async () => {
    const { container } = renderForm();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* JobRow / JobList                                                    */
/* ------------------------------------------------------------------ */

const job = (over: Partial<AgentJob> = {}): AgentJob => ({
  id: "j1",
  name: "Inbox triage",
  prompt: "Triage my inbox",
  schedule: { kind: "interval", every: 30, unit: "m" },
  model: "claude-sonnet",
  skills: [],
  toolsets: [],
  mode: "agent",
  repeat: null,
  delivery: { platform: "local" },
  enabled: true,
  state: "scheduled",
  ...over,
});

describe("JobRow", () => {
  it("shows a live countdown when the next run is under an hour away", () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    render(
      <ul>
        <JobRow job={job({ nextRunAt: T0 + 10 * MIN, lastRunAt: T0 - 20 * MIN, lastStatus: "error" })} />
      </ul>
    );
    const next = document.querySelector('[data-slot="job-next-run"]')!;
    expect(next).toHaveTextContent("in 10:00");
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(next).toHaveTextContent("in 09:55");
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText(/Last 20m ago/)).toBeInTheDocument();
    expect(screen.getByText("Every 30 minutes")).toBeInTheDocument();
  });

  it("shows a relative time beyond an hour", () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    render(
      <ul>
        <JobRow job={job({ nextRunAt: T0 + 3 * 3_600_000 })} />
      </ul>
    );
    expect(document.querySelector('[data-slot="job-next-run"]')).toHaveTextContent("in 3h");
  });

  it("fires row actions and selection", () => {
    const handlers = { onPause: vi.fn(), onResume: vi.fn(), onRunNow: vi.fn(), onEdit: vi.fn(), onSelect: vi.fn() };
    const j = job();
    const { rerender } = render(
      <ul>
        <JobRow job={j} {...handlers} />
      </ul>
    );
    fireEvent.click(screen.getByRole("button", { name: "Pause Inbox triage" }));
    fireEvent.click(screen.getByRole("button", { name: "Run Inbox triage now" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Inbox triage" }));
    fireEvent.click(screen.getByRole("button", { name: /^Inbox triage/ }));
    expect(handlers.onPause).toHaveBeenCalledWith(j);
    expect(handlers.onRunNow).toHaveBeenCalledWith(j);
    expect(handlers.onEdit).toHaveBeenCalledWith(j);
    expect(handlers.onSelect).toHaveBeenCalledWith(j);

    const paused = job({ state: "paused" });
    rerender(
      <ul>
        <JobRow job={paused} {...handlers} selected />
      </ul>
    );
    expect(screen.queryByRole("button", { name: "Pause Inbox triage" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume Inbox triage" }));
    expect(handlers.onResume).toHaveBeenCalledWith(paused);
    expect(screen.getByRole("button", { name: /^Inbox triage/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("confirms before deleting", async () => {
    const onDelete = vi.fn();
    render(
      <ul>
        <JobRow job={job()} onDelete={onDelete} />
      </ul>
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete Inbox triage" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete job" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("renders state pills", () => {
    render(
      <div>
        <JobStatePill state="running" />
        <JobStatePill state="error" />
      </div>
    );
    expect(screen.getByText("Running").closest("[data-state]")).toHaveAttribute("data-state", "running");
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("JobList has no axe violations", async () => {
    const { container } = render(
      <JobList
        jobs={[job({ nextRunAt: Date.now() + 5 * MIN }), job({ id: "j2", name: "Backup", mode: "script", script: "backup.sh", state: "paused" })]}
        selectedId="j1"
        onSelect={() => {}}
        onPause={() => {}}
        onResume={() => {}}
        onRunNow={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* JobDetail / RunHistory                                              */
/* ------------------------------------------------------------------ */

const makeRuns = (n: number): AgentJobRun[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `r${i}`,
    startedAt: T0 - i * 3_600_000,
    durationMs: 42_000,
    status: i === 1 ? "error" : "success",
    trigger: i === 2 ? "manual" : "schedule",
    costUsd: 0.04,
    tokens: 12_300,
    error: i === 1 ? "Tool `browser` timed out after 30s" : undefined,
  }));

describe("JobDetail", () => {
  it("pages run history and opens transcripts", () => {
    const onOpen = vi.fn();
    const onLoadMore = vi.fn();
    const runs = makeRuns(12);
    render(<JobDetail job={job()} runs={runs} now={T0} timeZone="UTC" hasMoreRuns onLoadMoreRuns={onLoadMore} onOpenTranscript={onOpen} />);
    const list = () => within(screen.getByRole("list", { name: "Run history" })).getAllByRole("listitem");
    expect(list()).toHaveLength(5);
    expect(screen.getByText("Tool `browser` timed out after 30s")).toBeInTheDocument();
    expect(screen.getAllByText("$0.04 · 12K tokens")).toHaveLength(5);
    expect(screen.getByText("Manual")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(list()).toHaveLength(10);
    expect(onLoadMore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(list()).toHaveLength(12);
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: /Open transcript/ })[1]!);
    expect(onOpen).toHaveBeenCalledWith(runs[1]);
  });

  it("shows schedule, next runs and configuration", () => {
    render(<JobDetail job={job({ schedule: { kind: "cron", expr: "0 9 * * 1-5" }, skills: ["web"] })} now={T0} timeZone="UTC" showTimeline runs={makeRuns(3)} />);
    expect(screen.getByRole("heading", { name: "Inbox triage" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Next runs" })).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByText("Every weekday at 9:00 AM").length).toBeGreaterThan(0);
    expect(screen.getByText("Forever")).toBeInTheDocument();
    expect(screen.getByText("web")).toBeInTheDocument();
  });

  it("hides Load more when everything is shown", () => {
    render(<RunHistory runs={makeRuns(3)} />);
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<JobDetail job={job()} runs={makeRuns(6)} now={T0} timeZone="UTC" showTimeline onPause={() => {}} onRunNow={() => {}} onEdit={() => {}} onDelete={() => {}} onOpenTranscript={() => {}} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Blueprints                                                          */
/* ------------------------------------------------------------------ */

const briefing: Blueprint = {
  id: "briefing",
  title: "Daily briefing",
  description: "Weather, calendar and headlines every morning.",
  schedule: "0 7 * * *",
  tags: ["daily", "personal"],
  cliCommand: 'sutra cron add "{schedule}" --blueprint briefing --city "{city}"',
  slots: [
    { id: "city", label: "City", type: "text", required: true, placeholder: "Lisbon" },
    { id: "time", label: "Time", type: "time", defaultValue: "07:00" },
    { id: "units", label: "Units", type: "select", options: ["metric", "imperial"] },
    { id: "news", label: "Include news", type: "boolean" },
    { id: "max", label: "Max headlines", type: "number", min: 1, max: 20 },
  ],
};

describe("BlueprintCard", () => {
  it("expands into a slot form and creates a job", async () => {
    const onCreate = vi.fn();
    render(<BlueprintCard blueprint={briefing} onCreate={onCreate} />);
    expect(screen.getByText("Every day at 7:00 AM")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use template" }));
    const form = screen.getByRole("form", { name: "Set up Daily briefing" });

    fireEvent.click(within(form).getByRole("button", { name: "Create job" }));
    await flush();
    expect(screen.getByText("City is required")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();

    fireEvent.change(within(form).getByRole("textbox", { name: /City/ }), { target: { value: "Lisbon" } });
    fireEvent.click(within(form).getByRole("switch", { name: /Include news/ }));
    const max = within(form).getByRole("spinbutton", { name: "Max headlines" });
    fireEvent.change(max, { target: { value: "5" } });
    fireEvent.blur(max);
    expect(form.querySelector('[data-slot="blueprint-cli"]')).toHaveTextContent('sutra cron add "0 7 * * *" --blueprint briefing --city "Lisbon"');

    fireEvent.click(within(form).getByRole("button", { name: "Copy command" }));
    await flush();
    expect(writeText).toHaveBeenCalledWith('sutra cron add "0 7 * * *" --blueprint briefing --city "Lisbon"');

    fireEvent.click(within(form).getByRole("button", { name: "Create job" }));
    await flush();
    expect(onCreate).toHaveBeenCalledWith(briefing, { city: "Lisbon", time: "07:00", units: "metric", news: true, max: 5 });
  });

  it("offers an Open in app variant", () => {
    const onOpen = vi.fn();
    render(<BlueprintCard blueprint={{ ...briefing, appHref: "#/automation/new?bp=briefing" }} variant="open" onOpen={onOpen} />);
    expect(screen.queryByRole("button", { name: "Use template" })).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Open in app" });
    expect(link).toHaveAttribute("href", "#/automation/new?bp=briefing");
    fireEvent.click(link);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "briefing" }));
  });

  it("fills templates", () => {
    expect(fillBlueprintTemplate("hi {name} {missing}", { name: "Ada" })).toBe("hi Ada {missing}");
  });
});

describe("BlueprintGallery", () => {
  const blueprints: Blueprint[] = [
    briefing,
    { id: "repo", title: "Repo health check", description: "Open PRs and failing CI.", schedule: "0 9 * * 1", tags: ["dev", "weekly"] },
    { id: "backup", title: "Backup", description: "Nightly backup script.", schedule: "0 2 * * *", tags: ["daily", "ops"] },
  ];

  it("filters by tag and search", () => {
    render(<BlueprintGallery blueprints={blueprints} />);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "daily" }));
    expect(screen.getAllByRole("article").map((a) => a.getAttribute("aria-labelledby") && within(a).getByRole("heading").textContent)).toEqual(["Daily briefing", "Backup"]);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search templates" }), { target: { value: "backup" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search templates" }), { target: { value: "zzz" } });
    expect(screen.getByText("No templates match")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<BlueprintGallery blueprints={blueprints} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Use template" })[0]!);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* StatusStack                                                         */
/* ------------------------------------------------------------------ */

describe("StatusStack", () => {
  it("collapses to the top row with +N more and expands", () => {
    render(
      <StatusStack>
        <GoalStatusRow key="goal" title="Ship the release" turns={3} maxTurns={20} />
        <LoopStatusRow key="loop" every="45m" runs={2} nextDueAt={Date.now() + 44 * MIN} />
        <HeartbeatStatusRow key="hb" lastBeatAt={Date.now()} intervalMs={60_000} priority={10} />
      </StatusStack>
    );
    const toggle = screen.getByRole("button", { name: /\+2 more/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Heartbeat")).toBeInTheDocument();
    expect(screen.queryByText("Goal")).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: /Show less/ })).toHaveAttribute("aria-expanded", "true");
    const rows = document.querySelectorAll('[data-slot="status-stack-row"]');
    expect([...rows].map((r) => r.textContent!.split("·")[0]!.replace(/[⊙↻]/, ""))).toEqual(["Heartbeat", "Goal", "Loop"]);
  });

  it("renders goal progress and actions", () => {
    const onPause = vi.fn();
    const onClear = vi.fn();
    render(<GoalStatusRow title="Ship the release" turns={3} maxTurns={20} onPause={onPause} onClear={onClear} />);
    expect(screen.getByText("3/20 turns")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Turn budget" })).toHaveAttribute("aria-valuenow", "3");
    fireEvent.click(screen.getByRole("button", { name: "Pause goal" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onPause).toHaveBeenCalled();
    expect(onClear).toHaveBeenCalled();
  });

  it("counts down to the loop's next run", () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    const onRunNow = vi.fn();
    const onStop = vi.fn();
    render(<LoopStatusRow every="45m" runs={2} nextDueAt={T0 + 44 * MIN + 12_000} onRunNow={onRunNow} onStop={onStop} />);
    const next = document.querySelector('[data-slot="loop-next"]')!;
    expect(screen.getByText("every 45m")).toBeInTheDocument();
    expect(screen.getByText("2 runs")).toBeInTheDocument();
    expect(next).toHaveTextContent("next in 44:12");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(next).toHaveTextContent("next in 44:11");
    act(() => {
      vi.advanceTimersByTime(45 * MIN);
    });
    expect(next).toHaveTextContent("due now");
    fireEvent.click(screen.getByRole("button", { name: "Run loop now" }));
    fireEvent.click(screen.getByRole("button", { name: "Stop loop" }));
    expect(onRunNow).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("shows heartbeat age and goes stale after missed beats", () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    const { container } = render(<HeartbeatStatusRow lastBeatAt={T0 - 12_000} intervalMs={10_000} />);
    expect(container.querySelector('[data-slot="heartbeat-last"]')).toHaveTextContent("last beat 12s ago");
    expect(container.firstElementChild).not.toHaveAttribute("data-stale");
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(container.querySelector('[data-slot="heartbeat-last"]')).toHaveTextContent("last beat 22s ago");
    expect(container.firstElementChild).toHaveAttribute("data-stale", "true");
  });

  it("dismisses rows from the stack", () => {
    const onDismiss = vi.fn();
    render(
      <StatusStack defaultCollapsed={false}>
        <StatusStackRow key="a" label="Build" meta={["running"]} onDismiss={onDismiss} />
        <StatusStackRow key="b" label="Sync" />
      </StatusStack>
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Build" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Build")).not.toBeInTheDocument();
    expect(screen.getByText("Sync")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /more|Show less/ })).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <StatusStack defaultCollapsed={false}>
        <GoalStatusRow key="goal" title="Ship" turns={3} maxTurns={20} onPause={() => {}} onClear={() => {}} />
        <LoopStatusRow key="loop" every="45m" runs={2} nextDueAt={Date.now() + 10 * MIN} onRunNow={() => {}} onStop={() => {}} />
        <HeartbeatStatusRow key="hb" lastBeatAt={Date.now()} intervalMs={60_000} onDismiss={() => {}} />
      </StatusStack>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Webhooks                                                            */
/* ------------------------------------------------------------------ */

const route: WebhookRoute = {
  id: "w1",
  name: "GitHub pushes",
  url: "https://hooks.example.com/w/abc123",
  events: ["push"],
  delivery: { platform: "local" },
  enabled: true,
  secretHint: "9f2c",
  deliveries: [
    { id: "d1", event: "push", statusCode: 200, at: Date.now() - 5 * MIN, durationMs: 182 },
    { id: "d2", event: "issues", statusCode: 500, at: Date.now() - 60 * MIN, durationMs: 1400, error: "Upstream error" },
  ],
};

describe("WebhookRouteEditor", () => {
  it("shows the secret once, then masks it", () => {
    render(<WebhookRouteEditor route={route} events={["push", "issues"]} newSecret="whsec_live_abc123" />);
    expect(screen.getByText("whsec_live_abc123")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /stored this secret/ }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByText("whsec_live_abc123")).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="webhook-secret-masked"]')).toHaveTextContent("whsec_••••••••9f2c");
  });

  it("confirms before regenerating the secret", async () => {
    const onRegenerate = vi.fn().mockResolvedValue("whsec_new_999");
    render(<WebhookRouteEditor route={route} events={["push"]} onRegenerateSecret={onRegenerate} />);
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(onRegenerate).not.toHaveBeenCalled();
    expect(dialog).toHaveTextContent("stops working immediately");
    fireEvent.click(within(dialog).getByRole("button", { name: "Regenerate" }));
    expect(await screen.findByText("whsec_new_999")).toBeInTheDocument();
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it("sends a test and shows the result; redelivers", async () => {
    const onTest = vi.fn().mockResolvedValue({ ok: true, statusCode: 200, durationMs: 182 });
    const onRedeliver = vi.fn();
    render(<WebhookRouteEditor route={route} events={["push"]} onTestSend={onTest} onRedeliver={onRedeliver} />);
    fireEvent.click(screen.getByRole("button", { name: "Send test" }));
    await waitFor(() => expect(screen.getByText("Test delivered · 200 · 182ms")).toBeInTheDocument());
    const deliveries = within(screen.getByRole("list", { name: "Recent deliveries" })).getAllByRole("listitem");
    expect(deliveries).toHaveLength(2);
    expect(deliveries[1]).toHaveTextContent("Upstream error");
    fireEvent.click(within(deliveries[1]!).getByRole("button", { name: /Redeliver issues/ }));
    expect(onRedeliver).toHaveBeenCalledWith(route.deliveries![1]);
  });

  it("reports failing tests", async () => {
    render(<WebhookRouteEditor route={route} events={["push"]} onTestSend={() => Promise.reject(new Error("Connection refused"))} />);
    fireEvent.click(screen.getByRole("button", { name: "Send test" }));
    await waitFor(() => expect(screen.getByText("Test failed · Connection refused")).toBeInTheDocument());
  });

  it("validates and saves a new route", async () => {
    const onSave = vi.fn();
    render(<WebhookRouteEditor events={["push", "issues"]} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Create route" }));
    await flush();
    expect(screen.getByText("Give the route a name")).toBeInTheDocument();
    expect(screen.getByText("Subscribe to at least one event")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Issues" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "issues" }));
    fireEvent.click(screen.getByRole("button", { name: "Create route" }));
    await flush();
    expect(onSave).toHaveBeenCalledWith({ id: undefined, name: "Issues", events: ["issues"], delivery: { platform: "local" }, enabled: true });
  });

  it("has no axe violations", async () => {
    const { container } = render(<WebhookRouteEditor route={route} events={["push", "issues"]} newSecret="whsec_x" onTestSend={() => ({ ok: true })} onRedeliver={() => {}} onRegenerateSecret={() => "s"} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("WebhookRouteList", () => {
  it("lists routes with copyable URLs and toggles", async () => {
    const onToggle = vi.fn();
    const onSelect = vi.fn();
    render(<WebhookRouteList routes={[route]} onToggleEnabled={onToggle} onSelect={onSelect} onCreate={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy URL for GitHub pushes" }));
    await flush();
    expect(writeText).toHaveBeenCalledWith(route.url);
    fireEvent.click(screen.getByRole("switch", { name: "Enable GitHub pushes" }));
    expect(onToggle).toHaveBeenCalledWith(route, false);
    fireEvent.click(screen.getByRole("button", { name: "GitHub pushes" }));
    expect(onSelect).toHaveBeenCalledWith(route);
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<WebhookRouteList routes={[route]} selectedId="w1" onSelect={() => {}} onToggleEnabled={() => {}} onCreate={() => {}} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
