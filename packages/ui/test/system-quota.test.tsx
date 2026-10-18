import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RiRobot2Line } from "@remixicon/react";
import { describeUsagePace, formatResetsIn, usagePace } from "../src/lib/usage-pace";
import {
  QuotaBars,
  QuotaRing,
  QuotaStrip,
  describeUsageQuota,
  usageQuotaAccent,
  usageQuotaPercent,
  type UsageQuota,
} from "../src/kits/ai/usage-quota";
import type { UsageLimitWindow } from "../src/kits/ai/agent-usage";
import { StatCard } from "../src/patterns/stat-card";
import { RingMeter } from "../src/patterns/gauge";
import { Meter } from "../src/primitives/meter";
import { axeViolations } from "./a11y";

const H = 3_600_000;
const D = 24 * H;
const START = Date.UTC(2026, 9, 12);
const WEEK_END = START + 7 * D;
const MID = START + 3.5 * D;

describe("usagePace", () => {
  it("is on pace within the tolerance, with spare at reset", () => {
    const p = usagePace({ used: 47, startsAt: START, resetsAt: WEEK_END, now: MID })!;
    expect(p.status).toBe("on-pace");
    expect(p.elapsed).toBe(0.5);
    expect(p.expectedNow).toBe(50);
    expect(p.projectedAtReset).toBeCloseTo(0.94);
    expect(p.spare).toBeCloseTo(0.06);
    expect(p.runsOutAt).toBeUndefined();
    expect(p.limitReached).toBe(false);
    expect(p.resetsAt).toBe(WEEK_END);
    expect(describeUsagePace(p, { now: MID })).toEqual({ text: "On pace · 6% to spare", tone: "neutral" });
  });

  it("matches the screenshot: 28% used about a third into the week is on pace with 10% to spare", () => {
    const now = START + (28 / 90) * 7 * D;
    const p = usagePace({ used: 28, startsAt: new Date(START), resetsAt: new Date(WEEK_END).toISOString(), now })!;
    expect(p.status).toBe("on-pace");
    expect(describeUsagePace(p, { now }).text).toBe("On pace · 10% to spare");
  });

  it("is ahead of pace when usage is well below an even burn", () => {
    const p = usagePace({ used: 30, startsAt: START, resetsAt: WEEK_END, now: MID })!;
    expect(p.status).toBe("under");
    expect(p.spare).toBeCloseTo(0.4);
    expect(describeUsagePace(p, { now: MID })).toEqual({ text: "Ahead of pace · 40% to spare", tone: "neutral" });
  });

  it("is over pace with a run-out time before the reset", () => {
    const end = START + 30 * D;
    const now = START + 10 * D;
    const p = usagePace({ used: 210, limit: 300, startsAt: START, resetsAt: end, now })!;
    expect(p.status).toBe("over");
    expect(p.projectedAtReset).toBeCloseTo(2.1);
    expect(p.spare).toBeCloseTo(-1.1);
    // 21/day, 90 left → 4.29 days.
    expect(p.runsOutAt).toBeCloseTo(now + (90 / 21) * D, -1);
    expect(p.runsOutAt!).toBeLessThan(end);
    expect(describeUsagePace(p, { now })).toEqual({ text: "Runs out in 4d at this rate", tone: "destructive" });
    expect(describeUsagePace(p, { now, units: 2 }).text).toBe("Runs out in 4d 6h at this rate");
  });

  it("warns when on pace but the projection runs out shortly before the reset", () => {
    const p = usagePace({ used: 53, startsAt: START, resetsAt: WEEK_END, now: MID })!;
    expect(p.status).toBe("on-pace");
    expect(p.spare).toBeLessThan(0);
    expect(p.runsOutAt).toBeDefined();
    expect(describeUsagePace(p, { now: MID })).toEqual({ text: "On pace · runs out in 3d", tone: "warning" });
  });

  it("reports a reached limit", () => {
    const p = usagePace({ used: 100, startsAt: START, resetsAt: WEEK_END, now: MID })!;
    expect(p.limitReached).toBe(true);
    expect(p.status).toBe("over");
    expect(p.runsOutAt).toBeUndefined();
    expect(describeUsagePace(p, { now: MID })).toEqual({ text: "Limit reached", tone: "destructive" });
    expect(usagePace({ used: 120, startsAt: START, resetsAt: WEEK_END, now: MID })!.limitReached).toBe(true);
  });

  it("honours the tolerance option", () => {
    expect(usagePace({ used: 47, startsAt: START, resetsAt: WEEK_END, now: MID, tolerance: 2 })!.status).toBe("under");
    expect(usagePace({ used: 53, startsAt: START, resetsAt: WEEK_END, now: MID, tolerance: 2 })!.status).toBe("over");
  });

  it("returns undefined when there is no meaningful pace", () => {
    const base = { used: 40, resetsAt: WEEK_END, now: MID };
    expect(usagePace(base)).toBeUndefined();
    expect(usagePace({ ...base, startsAt: "not a date" })).toBeUndefined();
    expect(usagePace({ ...base, startsAt: START, resetsAt: "nope" })).toBeUndefined();
    expect(usagePace({ ...base, startsAt: START, resetsAt: undefined })).toBeUndefined();
    // Window already reset, or exactly at the reset.
    expect(usagePace({ ...base, startsAt: START, now: WEEK_END + 1 })).toBeUndefined();
    expect(usagePace({ ...base, startsAt: START, now: WEEK_END })).toBeUndefined();
    // Not started yet, and exactly at the start.
    expect(usagePace({ ...base, startsAt: START, now: START - 1 })).toBeUndefined();
    expect(usagePace({ ...base, startsAt: START, now: START })).toBeUndefined();
    // Zero-length and inverted windows.
    expect(usagePace({ ...base, startsAt: START, resetsAt: START })).toBeUndefined();
    expect(usagePace({ ...base, startsAt: WEEK_END, resetsAt: START })).toBeUndefined();
    // Bad numbers.
    expect(usagePace({ ...base, startsAt: START, used: -1 })).toBeUndefined();
    expect(usagePace({ ...base, startsAt: START, used: Number.NaN })).toBeUndefined();
    expect(usagePace({ ...base, startsAt: START, limit: 0 })).toBeUndefined();
    expect(usagePace({ ...base, startsAt: START, now: Number.NaN })).toBeUndefined();
  });

  it("treats zero usage as ahead of pace with everything to spare", () => {
    const p = usagePace({ used: 0, startsAt: START, resetsAt: WEEK_END, now: MID })!;
    expect(p.status).toBe("under");
    expect(describeUsagePace(p, { now: MID }).text).toBe("Ahead of pace · 100% to spare");
  });
});

describe("formatResetsIn", () => {
  const now = Date.UTC(2026, 9, 19, 12);
  it("formats compact durations rounded up to the minute", () => {
    expect(formatResetsIn(now + 3 * H + 12 * 60_000, { now })).toBe("3h 12m");
    expect(formatResetsIn(now + 3 * H + 11.5 * 60_000, { now })).toBe("3h 12m");
    expect(formatResetsIn(now + 12 * D + 5 * H, { now })).toBe("12d 5h");
    expect(formatResetsIn(now + 4 * D, { now })).toBe("4d");
    expect(formatResetsIn(now + 4 * D + 2 * H + 30 * 60_000, { now })).toBe("4d 2h");
    expect(formatResetsIn(now + 4 * D + 2 * H, { now, units: 1 })).toBe("4d");
  });
  it("handles past and invalid input", () => {
    expect(formatResetsIn(now - H, { now })).toBe("0m");
    expect(formatResetsIn("garbage", { now })).toBeUndefined();
    expect(formatResetsIn(undefined, { now })).toBeUndefined();
  });
});

describe("usage quota helpers", () => {
  it("picks per-provider accents", () => {
    expect(usageQuotaAccent("Claude")).toBe("#d97757");
    expect(usageQuotaAccent("Codex")).toBe("emerald");
    expect(usageQuotaAccent("GitHub Copilot")).toBe("violet");
    expect(usageQuotaAccent("Cursor")).toBe("var(--foreground)");
    expect(usageQuotaAccent("Acme")).toBeUndefined();
  });

  it("reads used/limit or the UsageLimitWindow percent", () => {
    expect(usageQuotaPercent({ used: 150, limit: 300 })).toBe(50);
    expect(usageQuotaPercent({ percent: 42 })).toBe(42);
    expect(usageQuotaPercent({ used: 10, percent: 99 })).toBe(10);
    expect(usageQuotaPercent({ used: 500, limit: 300 })).toBe(100);
    expect(usageQuotaPercent({ used: 5, limit: 0 })).toBe(0);
    expect(usageQuotaPercent({})).toBe(0);
  });

  it("accepts a UsageLimitWindow plus a provider", () => {
    const w: UsageLimitWindow = { id: "weekly", label: "Weekly", percent: 30, resetsAt: MID + 2 * H, view: "weekly" };
    const q: UsageQuota = { ...w, provider: "Claude" };
    expect(describeUsageQuota(q, { now: MID })).toEqual({ text: "Resets in 2h", tone: "neutral", source: "reset" });
  });

  it("describes limit reached, a passed reset and no data", () => {
    expect(describeUsageQuota({ percent: 100, resetsAt: MID + H }, { now: MID })).toMatchObject({
      text: "Limit reached · Resets in 1h",
      tone: "destructive",
      source: "limit",
    });
    expect(describeUsageQuota({ used: 100, startsAt: START, resetsAt: WEEK_END }, { now: MID }).text).toBe("Limit reached · Resets in 3d 12h");
    expect(describeUsageQuota({ percent: 20, resetsAt: MID - H }, { now: MID }).text).toBe("Resets now");
    expect(describeUsageQuota({ percent: 20 }, { now: MID })).toEqual({ text: "", tone: "neutral", source: "none" });
    expect(describeUsageQuota({ used: 70, startsAt: START, resetsAt: WEEK_END, pace: false }, { now: MID }).source).toBe("reset");
  });
});

const now = START + (28 / 90) * 7 * D;
const quotas: UsageQuota[] = [
  { id: "claude", provider: "Claude", icon: <svg data-testid="claude-icon" />, label: "This week", used: 28, startsAt: START, resetsAt: WEEK_END },
  { id: "codex", provider: "Codex", label: "5-hour session", percent: 11, resetsAt: now + 3 * H + 12 * 60_000 },
  { id: "copilot", provider: "GitHub Copilot", label: "Premium requests", used: 210, limit: 300, startsAt: now - 10 * D, resetsAt: now + 20 * D },
  { id: "cursor", provider: "Cursor", label: "This billing cycle", used: 52, resetsAt: now + 12 * D + 5 * H },
];

describe("QuotaRing", () => {
  it("shows the share left inside the ring, the provider, window and pace line", () => {
    const { container } = render(<QuotaRing {...quotas[0]!} now={now} />);
    const root = container.querySelector('[data-slot="quota-ring"]') as HTMLElement;
    expect(root.style.getPropertyValue("--sutra-accent")).toBe("#d97757");
    expect(root).toHaveAttribute("data-pace", "on-pace");
    const meter = screen.getByRole("meter", { name: "Claude, This week" });
    expect(meter).toHaveAttribute("aria-valuenow", "72");
    expect(meter).toHaveAttribute("aria-valuetext", "72% left");
    expect(meter.style.getPropertyValue("--sutra-accent")).toBe("#d97757");
    expect(meter.querySelector('[data-slot="ring-fill"]')).toHaveAttribute("stroke", "var(--sutra-accent, var(--primary))");
    const value = container.querySelector('[data-slot="quota-ring-value"]')!;
    expect(value).toHaveTextContent("72%");
    expect(value).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Claude")).toBeInTheDocument();
    expect(screen.getByText("This week")).toBeInTheDocument();
    const status = screen.getByText("On pace · 10% to spare");
    expect(status).toHaveAttribute("data-tone", "neutral");
    expect(status.className).toMatch(/text-muted-foreground/);
    expect(screen.getByTestId("claude-icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("shows the reset time when there is no pace, and the share used in used mode", () => {
    render(<QuotaRing {...quotas[1]!} mode="used" now={now} />);
    const meter = screen.getByRole("meter", { name: "Codex, 5-hour session" });
    expect(meter).toHaveAttribute("aria-valuetext", "11% used");
    expect(screen.getByText("11%")).toBeInTheDocument();
    expect(screen.getByText("Resets in 3h 12m")).toHaveAttribute("data-tone", "neutral");
  });

  it("colours a run-out warning destructive", () => {
    render(<QuotaRing {...quotas[2]!} now={now} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "30% left");
    const status = screen.getByText("Runs out in 4d at this rate");
    expect(status).toHaveAttribute("data-tone", "destructive");
    expect(status.className).toMatch(/text-destructive/);
  });

  it("uses resetLabel in place of the reset caption, and an explicit accent", () => {
    const { container } = render(
      <QuotaRing provider="Acme" label="Daily" percent={40} resetsAt={now + H} resetLabel="Resets at midnight" accent="pink" now={now} />
    );
    expect(screen.getByText("Resets at midnight")).toBeInTheDocument();
    expect((container.firstChild as HTMLElement).style.getPropertyValue("--sutra-accent")).toBe("#f6339a");
  });

  it("passes axe", async () => {
    const { container } = render(<QuotaRing {...quotas[2]!} now={now} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("QuotaStrip", () => {
  it("lays the rings out in a responsive list", async () => {
    const { container } = render(<QuotaStrip quotas={quotas} now={now} aria-label="Agent quotas" />);
    const list = screen.getByRole("list");
    expect(list.className).toMatch(/grid-cols-1/);
    expect(list.className).toMatch(/sm:grid-cols-2/);
    expect(list.className).toMatch(/lg:grid-cols-4/);
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("data-quota"))).toEqual(["claude", "codex", "copilot", "cursor"]);
    expect(screen.getAllByRole("meter").map((m) => m.getAttribute("aria-valuetext"))).toEqual(["72% left", "89% left", "30% left", "48% left"]);
    expect(screen.getByText("Resets in 12d 5h")).toBeInTheDocument();
    // The quota id is a key, not a DOM id.
    expect(container.querySelector("#claude")).toBeNull();
    expect((container.firstChild as HTMLElement).className).toMatch(/rounded-box/);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("renders the empty state and the plain variant", () => {
    const { container } = render(<QuotaStrip quotas={[]} variant="plain" />);
    expect(screen.getByText("No quotas")).toBeInTheDocument();
    expect((container.firstChild as HTMLElement).className).not.toMatch(/rounded-box/);
  });
});

describe("QuotaBars", () => {
  it("names each bar after its provider with the share left", async () => {
    const { container } = render(<QuotaBars quotas={quotas} />);
    const meters = screen.getAllByRole("meter");
    expect(meters.map((m) => m.getAttribute("aria-valuetext"))).toEqual(["72% left", "89% left", "30% left", "48% left"]);
    expect(screen.getByRole("meter", { name: "Claude" })).toHaveAttribute("aria-valuenow", "72");
    expect(screen.getByRole("meter", { name: "GitHub Copilot" })).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    const accentOf = (li: HTMLElement) => (li.querySelector('[data-level]') as HTMLElement).style.getPropertyValue("--sutra-accent");
    expect(accentOf(items[0]!)).toBe("#d97757");
    expect(accentOf(items[1]!)).toBe("#00bc7d");
    // No icon → a decorative monogram.
    const mono = items[1]!.querySelector('[aria-hidden="true"]')!;
    expect(mono).toHaveTextContent("CO");
    expect(meters[0]!.querySelector('[data-slot="meter-fill"]')!.className).toMatch(/bg-\[var\(--sutra-accent,var\(--primary\)\)\]/);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows the share used in used mode", () => {
    render(<QuotaBars quotas={quotas.slice(0, 1)} mode="used" />);
    expect(screen.getByRole("meter", { name: "Claude" })).toHaveAttribute("aria-valuetext", "28% used");
  });

  it("composes into the Agents StatCard tile", async () => {
    const { container } = render(
      <StatCard
        label="Agents"
        icon={<RiRobot2Line />}
        accent="violet"
        href="/agents"
        caption="Claude · Max 20x · This week"
        value="72%"
        unit="left"
        stats={[
          { label: "Resets", value: formatResetsIn(now + 4 * D + 2 * H, { now }) },
          { label: "Sessions", value: "2" },
          { label: "Tokens today", value: "1.78M" },
        ]}
      >
        <QuotaBars quotas={quotas} className="relative z-10" />
      </StatCard>
    );
    expect(screen.getByRole("link", { name: "Agents" })).toHaveAccessibleDescription(/Claude · Max 20x · This week\s*72%\s*left/);
    expect(screen.getByText("4d 2h")).toBeInTheDocument();
    expect(screen.getAllByRole("meter")).toHaveLength(4);
    expect(await axeViolations(container)).toEqual([]);
  });
});


describe("accent on RingMeter and Meter", () => {
  const ringFill = (el: Element) => el.querySelector('[data-slot="ring-fill"]')!;
  const meterFill = (el: Element) => el.querySelector('[data-slot="meter-fill"]')!;

  it("RingMeter: unchanged without accent", () => {
    const { container } = render(<RingMeter value={40} label="Plain" />);
    const root = screen.getByRole("meter", { name: "Plain" });
    expect(root.getAttribute("style")).toBeNull();
    expect(ringFill(container)).toHaveAttribute("stroke", "var(--primary)");
  });

  it("RingMeter: accent colours the ring below thresholds; tone and threshold colours still win", () => {
    const { container, rerender } = render(<RingMeter value={40} accent="pink" label="Ring" style={{ marginTop: 2 }} />);
    const root = screen.getByRole("meter", { name: "Ring" });
    expect(root.style.getPropertyValue("--sutra-accent")).toBe("#f6339a");
    expect(root.style.marginTop).toBe("2px");
    expect(ringFill(container)).toHaveAttribute("stroke", "var(--sutra-accent, var(--primary))");
    rerender(<RingMeter value={40} accent="pink" tone="success" label="Ring" />);
    expect(ringFill(container)).toHaveAttribute("stroke", "var(--success)");
    rerender(<RingMeter value={95} accent="pink" label="Ring" />);
    expect(ringFill(container)).toHaveAttribute("stroke", "var(--destructive)");
  });

  it("Meter: unchanged without accent", () => {
    const { container } = render(<Meter label="Plain" value={40} style={{ width: 100 }} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.getPropertyValue("--sutra-accent")).toBe("");
    expect(root.style.width).toBe("100px");
    expect(meterFill(container).className).toMatch(/\bbg-primary\b/);
  });

  it("Meter: accent colours the fill and segments below thresholds; tone and threshold colours still win", () => {
    const { container, rerender } = render(<Meter label="Bar" value={40} accent="teal" />);
    expect((container.firstChild as HTMLElement).style.getPropertyValue("--sutra-accent")).toBe("#00bba7");
    expect(meterFill(container).className).toContain("bg-[var(--sutra-accent,var(--primary))]");
    expect(meterFill(container).className).not.toMatch(/\bbg-primary\b/);
    rerender(<Meter label="Bar" value={40} accent="teal" tone="info" />);
    expect(meterFill(container).className).toMatch(/\bbg-info\b/);
    rerender(<Meter label="Bar" value={80} accent="teal" />);
    expect(meterFill(container).className).toMatch(/\bbg-warning\b/);
    rerender(<Meter label="Bar" value={50} accent="teal" segments={4} />);
    const on = container.querySelectorAll('[data-slot="meter-segment"][data-state="on"]');
    expect(on).toHaveLength(2);
    expect(on[0]!.className).toContain("bg-[var(--sutra-accent,var(--primary))]");
  });
});
