import * as React from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useControllableState } from "../src/hooks/use-controllable-state";
import { QuickCapture, parseCapture } from "../src/kits/workspace/quick-capture";
import { cronToSchedule, describeCron, nextCronRuns, scheduleToCron } from "../src/lib/cron";
import { TagInput } from "../src/primitives/tag-input";
import { InviteMembersDialog } from "../src/blocks/modal-dialog-blocks";

/** Wednesday, 14 October 2026, 10:00 local time. */
const NOW = new Date(2026, 9, 14, 10, 0);
const iso = (d: Date) => d.toISOString();

/* ------------------------------------------------------------------ */
/* useControllableState                                                */
/* ------------------------------------------------------------------ */

describe("useControllableState", () => {
  it("composes functional updates in one tick (uncontrolled)", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: 0, onChange }));
    act(() => {
      result.current[1]((v) => v + 1);
      result.current[1]((v) => v + 1);
    });
    expect(result.current[0]).toBe(2);
    expect(onChange.mock.calls).toEqual([[1], [2]]);
  });

  it("composes functional updates when a parent applies onChange (controlled)", () => {
    const seen: number[] = [];
    let setter!: (next: number | ((prev: number) => number)) => void;
    function Child({ value, onChange }: { value: number; onChange: (v: number) => void }) {
      const [v, set] = useControllableState({ value, defaultValue: 0, onChange });
      setter = set;
      return <span data-testid="v">{v}</span>;
    }
    function Parent() {
      const [value, setValue] = React.useState(5);
      return (
        <Child
          value={value}
          onChange={(v) => {
            seen.push(v);
            setValue(v);
          }}
        />
      );
    }
    render(<Parent />);
    act(() => {
      setter((v) => v + 1);
      setter((v) => v * 10);
    });
    expect(seen).toEqual([6, 60]);
    expect(screen.getByTestId("v")).toHaveTextContent("60");
  });

  it("re-syncs to the prop when a controlled parent ignores the change", async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ value: false, defaultValue: false, onChange }));
    act(() => result.current[1](true));
    await act(async () => {});
    act(() => result.current[1](true));
    expect(onChange.mock.calls).toEqual([[true], [true]]);
    expect(result.current[0]).toBe(false);
  });

  it("keeps the setter identity stable across renders", () => {
    const { result, rerender } = renderHook(({ v }) => useControllableState({ value: v, defaultValue: 0 }), {
      initialProps: { v: 1 as number | undefined },
    });
    const first = result.current[1];
    rerender({ v: 2 });
    rerender({ v: undefined });
    act(() => result.current[1](3));
    expect(result.current[1]).toBe(first);
  });

  it("does not call onChange when setting the same value", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: "a", onChange }));
    act(() => result.current[1]("a"));
    act(() => result.current[1]((v) => v));
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      result.current[1]("b");
      result.current[1]("b");
    });
    expect(onChange.mock.calls).toEqual([["b"]]);
  });

  it("reports each repeated request in controlled mode while the parent keeps its value", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ value: true, defaultValue: false, onChange }));
    act(() => {
      result.current[1](false);
      result.current[1](false);
    });
    expect(onChange.mock.calls).toEqual([[false], [false]]);
    // Setting the value the parent already renders is still a no-op.
    act(() => result.current[1](true));
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

/* ------------------------------------------------------------------ */
/* Cron                                                                */
/* ------------------------------------------------------------------ */

describe("cron day-field stepping (Vixie AND/OR)", () => {
  const utc = { timeZone: "UTC" };
  const from = Date.UTC(2026, 0, 1, 1, 0); // Thursday 1 Jan 2026

  it("filters by a day-of-month step", () => {
    expect(nextCronRuns("0 0 */2 * *", from, 3, utc).map(iso)).toEqual([
      "2026-01-03T00:00:00.000Z",
      "2026-01-05T00:00:00.000Z",
      "2026-01-07T00:00:00.000Z",
    ]);
  });

  it("filters by a day-of-week step", () => {
    // */2 on day-of-week = Sun, Tue, Thu, Sat
    expect(nextCronRuns("0 0 * * */2", from, 4, utc).map(iso)).toEqual([
      "2026-01-03T00:00:00.000Z",
      "2026-01-04T00:00:00.000Z",
      "2026-01-06T00:00:00.000Z",
      "2026-01-08T00:00:00.000Z",
    ]);
  });

  it("ANDs the day fields when one is star-prefixed", () => {
    // odd days of the month that are Mondays
    expect(nextCronRuns("0 0 */2 * 1", from, 3, utc).map(iso)).toEqual([
      "2026-01-05T00:00:00.000Z",
      "2026-01-19T00:00:00.000Z",
      "2026-02-09T00:00:00.000Z",
    ]);
  });

  it("describes stepped day fields instead of 'Every day'", () => {
    expect(describeCron("0 0 */2 * *")).toBe("At 12:00 AM on every 2nd day of the month");
    expect(describeCron("0 0 * * */2")).toBe("Every Sunday, Tuesday, Thursday and Saturday at 12:00 AM");
    expect(describeCron("0 0 */2 * 1")).toBe("At 12:00 AM on every 2nd day of the month if it's a Monday");
    expect(describeCron("0 7 * * *")).toBe("Every day at 7:00 AM");
    expect(describeCron("0 12 13 * 5")).toBe("At 12:00 PM on day 13 of the month or every Friday");
  });
});

describe("nextCronRuns across DST spring-forward", () => {
  const strictlyIncreasing = (runs: Date[]) => runs.every((r, i) => i === 0 || r.getTime() > runs[i - 1]!.getTime());

  it("is strictly increasing in a named zone and shifts skipped times later", () => {
    const runs = nextCronRuns("*/30 * * * *", Date.UTC(2026, 2, 8, 5, 0), 6, { timeZone: "America/New_York" });
    expect(runs.map(iso)).toEqual([
      "2026-03-08T05:30:00.000Z", // 00:30 EST
      "2026-03-08T06:00:00.000Z", // 01:00 EST
      "2026-03-08T06:30:00.000Z", // 01:30 EST
      "2026-03-08T07:00:00.000Z", // 02:00 (skipped) → 03:00 EDT
      "2026-03-08T07:30:00.000Z", // 02:30 (skipped) → 03:30 EDT
      "2026-03-08T08:00:00.000Z", // 04:00 EDT
    ]);
    expect(strictlyIncreasing(runs)).toBe(true);
  });

  it("fires a daily job at a skipped time once, at the shifted instant", () => {
    const runs = nextCronRuns("30 2 * * *", Date.UTC(2026, 2, 7, 0, 0), 3, { timeZone: "America/New_York" });
    expect(runs.map(iso)).toEqual(["2026-03-07T07:30:00.000Z", "2026-03-08T07:30:00.000Z", "2026-03-09T06:30:00.000Z"]);
  });

  it("is strictly increasing in the local zone", () => {
    const runs = nextCronRuns("*/30 * * * *", new Date(2026, 2, 8, 0, 0), 12);
    expect(new Set(runs.map((r) => r.getTime())).size).toBe(runs.length);
    expect(strictlyIncreasing(runs)).toBe(true);
  });
});

describe("cronToSchedule step intervals", () => {
  it("keeps steps that don't divide the cycle as custom cron", () => {
    expect(cronToSchedule("*/45 * * * *")).toEqual({ mode: "custom", expr: "*/45 * * * *" });
    expect(cronToSchedule("0 */5 * * *")).toEqual({ mode: "custom", expr: "0 */5 * * *" });
    expect(cronToSchedule("*/7 * * * *")).toEqual({ mode: "custom", expr: "*/7 * * * *" });
  });

  it("round-trips real intervals", () => {
    for (const [every, unit] of [[15, "m"], [20, "m"], [2, "h"], [6, "h"]] as const) {
      const text = scheduleToCron({ mode: "interval", every, unit });
      expect(cronToSchedule(text)).toEqual({ mode: "interval", every, unit });
    }
    expect(cronToSchedule(scheduleToCron({ mode: "interval", every: 45, unit: "m" }))).toEqual({ mode: "interval", every: 45, unit: "m" });
  });
});

/* ------------------------------------------------------------------ */
/* TagInput separators                                                 */
/* ------------------------------------------------------------------ */

describe("TagInput separators", () => {
  it("treats key names as keys, not split characters", () => {
    const onValueChange = vi.fn();
    render(<TagInput aria-label="Emails" separators={[",", " ", "Enter"]} onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Emails");
    fireEvent.change(input, { target: { value: "peter@acme.com," } });
    expect(onValueChange).toHaveBeenLastCalledWith(["peter@acme.com"]);
    expect(input).toHaveValue("");
  });

  it("supports multi-character separators", () => {
    const onValueChange = vi.fn();
    render(<TagInput aria-label="Tags" separators={[" | "]} onValueChange={onValueChange} />);
    fireEvent.change(screen.getByLabelText("Tags"), { target: { value: "a b | c" } });
    expect(onValueChange).toHaveBeenLastCalledWith(["a b"]);
  });

  it("InviteMembersDialog keeps typed emails whole", () => {
    render(<InviteMembersDialog defaultOpen />);
    const input = screen.getByRole("dialog").querySelector<HTMLInputElement>("[data-slot=tag-input] input")!;
    fireEvent.change(input, { target: { value: "peter@acme.com," } });
    const tags = [...document.querySelectorAll("[data-slot=tag-input-tag]")].map((t) => t.textContent);
    expect(tags).toEqual(["peter@acme.com"]);
  });
});

/* ------------------------------------------------------------------ */
/* parseCapture                                                        */
/* ------------------------------------------------------------------ */

describe("parseCapture false positives", () => {
  const p = (text: string) => parseCapture(text, NOW);

  it("does not read the article 'a' as am", () => {
    expect(p("Read chapter 3 a bit")).toMatchObject({ app: "tasks", title: "Read chapter 3 a bit" });
    expect(p("Read chapter 3 a bit").time).toBeUndefined();
    expect(p("Order 2 a week").time).toBeUndefined();
  });

  it.each([
    ["Call 3p", "15:00"],
    ["Call 3 pm", "15:00"],
    ["Call 3 p.m.", "15:00"],
    ["Call 9 a.m.", "09:00"],
    ["Call 9a", "09:00"],
  ])("still reads %s as a time", (text, time) => {
    expect(p(text)).toMatchObject({ time, title: "Call" });
  });

  it("ignores weekday-like words without a cue", () => {
    expect(p("Buy sun cream")).toMatchObject({ title: "Buy sun cream" });
    expect(p("Buy sun cream").date).toBeUndefined();
    expect(p("I sat there").date).toBeUndefined();
  });

  it("reads cued weekdays", () => {
    expect(p("Report due fri")).toMatchObject({ title: "Report", date: "2026-10-16" });
    expect(p("Send invoice by mon")).toMatchObject({ title: "Send invoice", date: "2026-10-19" });
    expect(p("Lunch this sat with Ana")).toMatchObject({ title: "Lunch with Ana", date: "2026-10-17" });
    expect(p("Dentist Friday 3pm")).toMatchObject({ title: "Dentist", date: "2026-10-16", time: "15:00" });
  });

  it("parses amounts with thousands separators", () => {
    expect(p("spent $1,200 on rent")).toMatchObject({ app: "finance", amount: 1200, title: "spent on rent" });
    expect(p("Laptop $2,499.99")).toMatchObject({ amount: 2499.99, title: "Laptop" });
  });

  it("leaves invalid times in the title", () => {
    const r = p("Meeting 13:00pm");
    expect(r.time).toBeUndefined();
    expect(r.title).toBe("Meeting 13:00pm");
    expect(p("Taxes feb 31").date).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/* QuickCapture keyboard                                               */
/* ------------------------------------------------------------------ */

describe("QuickCapture keyboard", () => {
  it("never traps Tab and cycles apps with Alt+Up/Down", () => {
    render(<QuickCapture variant="inline" now={NOW} />);
    const input = screen.getByLabelText("Quick capture");
    fireEvent.change(input, { target: { value: "Buy milk" } });
    const tab = fireEvent.keyDown(input, { key: "Tab" });
    expect(tab).toBe(true); // not prevented
    expect(screen.getByRole("button", { name: "Tasks" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(input, { key: "ArrowDown", altKey: true });
    expect(screen.getByRole("button", { name: "Notes" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(input, { key: "ArrowUp", altKey: true });
    expect(screen.getByRole("button", { name: "Tasks" })).toHaveAttribute("aria-pressed", "true");
    // plain Alt+←/→ stays word navigation
    expect(fireEvent.keyDown(input, { key: "ArrowLeft", altKey: true })).toBe(true);
  });

  it("stays focusable while saving (readOnly + aria-busy, not disabled)", async () => {
    let resolve!: () => void;
    const onCapture = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<QuickCapture variant="inline" now={NOW} onCapture={onCapture} />);
    const input = screen.getByLabelText("Quick capture");
    input.focus();
    fireEvent.change(input, { target: { value: "Buy milk" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(input).not.toBeDisabled();
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAttribute("aria-busy", "true");
    expect(input).toHaveFocus();
    await act(async () => resolve());
    expect(input).not.toHaveAttribute("readonly");
    expect(input).toHaveFocus();
    expect(input).toHaveValue("");
  });
});
