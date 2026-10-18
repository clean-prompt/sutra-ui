import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Markdown } from "../src/patterns/markdown";
import { JsonViewer, safeJsonStringify } from "../src/patterns/json-viewer";
import { TreeView, type TreeNode } from "../src/patterns/tree-view";
import { LogViewer } from "../src/patterns/log-viewer";
import { KeybindEditor } from "../src/patterns/keybind-editor";
import { getFilePreviewKind } from "../src/patterns/file-viewer";
import { DiffViewer } from "../src/patterns/diff-viewer";
import { CalendarHeatmap } from "../src/patterns/heatmap";
import { DonutChart, LineChart, niceTicks } from "../src/patterns/chart";
import { useCommandMenuShortcut } from "../src/patterns/command-menu";
import { FilterBarSearch } from "../src/patterns/filter-bar";
import { TextButton } from "../src/patterns/identity-mark";
import { LockScreen } from "../src/patterns/loading-screen";
import { RecurrencePicker } from "../src/patterns/recurrence-picker";
import type { RecurrenceRule } from "../src/lib/rrule";
import { CronScheduleField, type CronScheduleValue } from "../src/patterns/cron";
import { Countdown } from "../src/patterns/countdown";
import { TallyCounter } from "../src/patterns/tally-counter";
import { HeaderNavMobile } from "../src/patterns/header-navigation";
import { TimelineBar } from "../src/patterns/timeline-bar";
import { getPasswordScore } from "../src/patterns/password-strength";
import { formatBytes } from "../src/patterns/file-upload";
import { BlogPostHeader } from "../src/patterns/blog-content";
import { SchemaForm } from "../src/patterns/schema-form";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/* Markdown: constructs that span a blank line                         */
/* ------------------------------------------------------------------ */

describe("Markdown block splitting", () => {
  it("resolves reference links defined in a later block", () => {
    const { container } = render(<Markdown>{"See [the docs][d].\n\n[d]: https://example.com/docs"}</Markdown>);
    expect(container.querySelector('a[href="https://example.com/docs"]')).toHaveTextContent("the docs");
    expect(container).not.toHaveTextContent("[the docs][d]");
  });

  it("keeps a list item's indented continuation inside the item", () => {
    const { container } = render(<Markdown>{"- item\n\n  continuation\n\n      indented code"}</Markdown>);
    const li = container.querySelector("li")!;
    expect(li.querySelector("p:nth-of-type(2)")).toHaveTextContent("continuation");
    // Four spaces past the item's content column is an indented code block, still inside the item.
    expect(container.querySelectorAll("pre")).toHaveLength(1);
    expect(li.querySelector("pre")).toHaveTextContent("indented code");
  });

  it("keeps fenced code inside a list item", () => {
    const { container } = render(<Markdown>{"1. step\n\n   ```js\n   run()\n   ```\n\n2. next"}</Markdown>);
    const items = container.querySelectorAll("ol > li");
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toContain("run()");
  });

  it("renders GFM footnotes defined in a later block", () => {
    const { container } = render(<Markdown>{"A claim[^1].\n\nMore text.\n\n[^1]: The source."}</Markdown>);
    expect(container).not.toHaveTextContent("[^1]");
    expect(container.querySelector("section[data-footnotes]")).toHaveTextContent("The source.");
  });
});

/* ------------------------------------------------------------------ */
/* JsonViewer                                                          */
/* ------------------------------------------------------------------ */

describe("JsonViewer edge values", () => {
  it("renders an invalid Date instead of crashing", () => {
    render(<JsonViewer data={{ when: new Date("nope") }} />);
    expect(screen.getByText(/Invalid Date/)).toBeInTheDocument();
  });

  it("stringifies a self-referencing Map", () => {
    const m = new Map<string, unknown>();
    m.set("self", m);
    expect(safeJsonStringify(m)).toContain("[Circular]");
  });
});

/* ------------------------------------------------------------------ */
/* TreeView                                                            */
/* ------------------------------------------------------------------ */

describe("TreeView checkboxes with a disabled leaf", () => {
  const nodes: TreeNode[] = [
    {
      id: "src",
      label: "src",
      children: [
        { id: "a", label: "a.ts" },
        { id: "locked", label: "locked.ts", disabled: true },
      ],
    },
  ];

  it("unchecks a parent whose only unchecked descendant is disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<TreeView aria-label="Files" nodes={nodes} defaultExpanded={["src"]} checkable defaultChecked={["a"]} onCheckedChange={onCheckedChange} />);
    const src = screen.getByRole("treeitem", { name: /^src/ });
    expect(src).toHaveAttribute("aria-checked", "mixed");
    await user.tab();
    await user.keyboard(" ");
    expect(onCheckedChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByRole("treeitem", { name: /^a\.ts/ })).toHaveAttribute("aria-checked", "false");
  });
});

/* ------------------------------------------------------------------ */
/* LogViewer                                                           */
/* ------------------------------------------------------------------ */

describe("LogViewer sliding window", () => {
  beforeEach(() => {
    Element.prototype.scrollTo ??= function () {} as typeof Element.prototype.scrollTo;
  });
  it("keeps repeated lines appended after a front trim", () => {
    const { container, rerender } = render(<LogViewer lines={["start", "b", "tick"]} />);
    rerender(<LogViewer lines={["b", "tick", "a", "tick"]} />);
    const text = container.textContent ?? "";
    expect(text).toContain("a");
    expect(text.match(/tick/g)).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------ */
/* KeybindEditor                                                       */
/* ------------------------------------------------------------------ */

describe("KeybindEditor focus", () => {
  it("returns focus to the edit button after recording", async () => {
    const user = userEvent.setup();
    render(<KeybindEditor platform="other" shortcuts={[{ id: "save", label: "Save", keys: "mod+s" }]} />);
    const edit = screen.getByRole("button", { name: "Edit shortcut for Save" });
    await user.click(edit);
    const recorder = screen.getByRole("button", { name: /Recording shortcut for Save/ });
    expect(recorder).toHaveFocus();
    fireEvent.keyDown(recorder, { key: "k", code: "KeyK", ctrlKey: true });
    expect(screen.queryByRole("button", { name: /Recording shortcut/ })).toBeNull();
    expect(edit).toHaveFocus();

    await user.click(edit);
    await user.keyboard("{Escape}");
    expect(edit).toHaveFocus();
  });
});

/* ------------------------------------------------------------------ */
/* FileViewer                                                          */
/* ------------------------------------------------------------------ */

describe("getFilePreviewKind", () => {
  it("lets the MIME type win over the extension and ignores MIME parameters", () => {
    expect(getFilePreviewKind({ name: "data", mimeType: "application/json; charset=utf-8" })).toBe("json");
    expect(getFilePreviewKind({ name: "notes.md", mimeType: "application/json" })).toBe("json");
    expect(getFilePreviewKind({ name: "scan.pdf", mimeType: "image/png" })).toBe("image");
    expect(getFilePreviewKind({ name: "readme", mimeType: "text/markdown; charset=utf-8" })).toBe("markdown");
    // Generic MIME types still defer to the extension.
    expect(getFilePreviewKind({ name: "doc.pdf", mimeType: "application/octet-stream" })).toBe("pdf");
    expect(getFilePreviewKind({ name: "main.ts" })).toBe("code");
  });
});

/* ------------------------------------------------------------------ */
/* DiffViewer                                                          */
/* ------------------------------------------------------------------ */

describe("DiffViewer line numbers", () => {
  it("numbers inline lines by their position in the new file", () => {
    const { container } = render(<DiffViewer oldValue={"a\nx\nb\n"} newValue={"a\nb\nc\n"} granularity="line" lineNumbers />);
    const rows = [...container.querySelectorAll("[data-line]")].map((row) => [
      row.querySelector("span[aria-hidden]")?.textContent ?? "",
      row.textContent?.replace(/^\d+/, "") ?? "",
    ]);
    expect(rows).toEqual([
      ["1", "a"],
      ["", "x"],
      ["2", "b"],
      ["3", "c"],
    ]);
  });

  it("keeps split rows in order for a trailing-newline-only change", () => {
    const { container } = render(<DiffViewer oldValue={"a\nb"} newValue={"a\nb\n"} mode="split" />);
    const rows = [...container.querySelectorAll("tr[data-row]")].map((r) => [...r.querySelectorAll("td")].map((td) => td.textContent));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(["1", "a", "1", "a"]);
    expect(rows[1]![0]).toBe("2");
    expect(rows[1]![2]).toBe("2");
    expect(container.querySelector('tr[data-row][data-changed]')).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Heatmap                                                             */
/* ------------------------------------------------------------------ */

describe("CalendarHeatmap bucketing", () => {
  it("buckets ISO datetime strings by local date, like Date objects", () => {
    const offset = new Date(2026, 9, 15).getTimezoneOffset();
    // A local time whose UTC date falls on a different day (trivial in UTC).
    const local = offset <= 0 ? new Date(2026, 9, 15, 0, 30) : new Date(2026, 9, 15, 23, 30);
    const { container } = render(
      <CalendarHeatmap mode="month" defaultMonth={new Date(2026, 9, 1)} data={[{ date: local.toISOString(), value: 5 }]} />
    );
    expect(container.querySelector('[data-date="2026-10-15"]')).toHaveAttribute("data-value", "5");
  });

  it("Space on a cell without onCellClick doesn't scroll the page", () => {
    const { container } = render(<CalendarHeatmap mode="month" defaultMonth={new Date(2026, 9, 1)} data={[]} />);
    const cell = container.querySelector('[role="gridcell"][tabindex="0"]')!;
    const ev = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    cell.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

describe("Chart axis ticks", () => {
  it("niceTicks doesn't throw on a tiny range", () => {
    expect(() => niceTicks(0, 1e-100)).not.toThrow();
  });

  const tickLabels = (container: HTMLElement) =>
    [...container.querySelectorAll("text.tabular-nums")].map((t) => t.textContent ?? "").filter(Boolean);

  it("default y tick labels are distinct for small steps", () => {
    const data = [
      { d: "a", v: 0.02 },
      { d: "b", v: 0.19 },
    ];
    const { container } = render(<LineChart data={data} index="d" series={[{ key: "v", label: "V" }]} />);
    const labels = tickLabels(container).filter((l) => /\d/.test(l));
    expect(labels.length).toBeGreaterThan(2);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toContain("0.05");
  });

  it("default y tick labels are distinct for a narrow range of large values", () => {
    const data = [
      { d: "a", v: 1000 },
      { d: "b", v: 1010 },
    ];
    const { container } = render(<LineChart data={data} index="d" series={[{ key: "v", label: "V" }]} yAxis={{ min: "auto" }} />);
    const labels = tickLabels(container).filter((l) => /\d/.test(l));
    expect(labels.length).toBeGreaterThan(2);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("keeps compact labels when they are already distinct", () => {
    const data = [
      { d: "a", v: 0 },
      { d: "b", v: 4000 },
    ];
    const { container } = render(<LineChart data={data} index="d" series={[{ key: "v", label: "V" }]} />);
    expect(tickLabels(container)).toContain("4K");
  });
});

describe("DonutChart duplicate labels", () => {
  it("gives duplicate labels distinct keys so they toggle separately", async () => {
    const user = userEvent.setup();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <DonutChart
        index="name"
        data={[
          { name: "Other", value: 3 },
          { name: "Other", value: 5 },
          { name: "Main", value: 2 },
        ]}
      />
    );
    expect(errors.mock.calls.some((c) => String(c[0]).includes("same key"))).toBe(false);
    const segments = () => container.querySelectorAll('[data-slot="chart-segment"]').length;
    expect(segments()).toBe(3);
    const toggles = screen.getAllByRole("button", { name: "Other" });
    expect(toggles).toHaveLength(2);
    await user.click(toggles[0]!);
    expect(segments()).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/* Command menu / filter bar                                           */
/* ------------------------------------------------------------------ */

function ShortcutHost() {
  const [open, setOpen] = React.useState(false);
  useCommandMenuShortcut(setOpen);
  return <div data-open={open} />;
}

describe("useCommandMenuShortcut", () => {
  it("ignores keydown events without a key (autofill)", () => {
    const { container } = render(<ShortcutHost />);
    // jsdom reports exceptions thrown by listeners as window "error" events.
    const onError = vi.fn((e: Event) => e.preventDefault());
    window.addEventListener("error", onError);
    document.dispatchEvent(new Event("keydown", { bubbles: true, cancelable: true }));
    window.removeEventListener("error", onError);
    expect(onError).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(container.firstElementChild).toHaveAttribute("data-open", "true");
  });
});

describe("FilterBarSearch", () => {
  it("doesn't clear on Escape during IME composition", () => {
    const onValueChange = vi.fn();
    render(<FilterBarSearch aria-label="Search" defaultValue="한" onValueChange={onValueChange} />);
    const input = screen.getByRole("searchbox", { name: "Search" });
    fireEvent.keyDown(input, { key: "Escape", isComposing: true });
    fireEvent.keyDown(input, { key: "Escape", keyCode: 229 });
    expect(input).toHaveValue("한");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("");
  });
});

/* ------------------------------------------------------------------ */
/* TextButton                                                          */
/* ------------------------------------------------------------------ */

describe("TextButton disabled link", () => {
  it("drops the href and marks the link disabled", () => {
    const onClick = vi.fn();
    render(
      <TextButton href="/delete" disabled onClick={onClick}>
        Delete
      </TextButton>
    );
    const el = screen.getByText("Delete").closest("a")!;
    expect(el).not.toHaveAttribute("href");
    expect(el).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(el);
    expect(onClick).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* LockScreen                                                          */
/* ------------------------------------------------------------------ */

describe("LockScreen lockout announcement", () => {
  it("keeps the ticking countdown out of the live region", async () => {
    const onUnlock = vi.fn(async () => false);
    render(<LockScreen mode="password" fullscreen={false} maxAttempts={1} lockoutSeconds={30} onUnlock={onUnlock} />);
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    const alert = await screen.findByRole("alert");
    await screen.findByText(/Too many attempts\. Try again in/);
    // Everything the live region exposes stays static while the clock ticks.
    const exposed = () =>
      [...alert.querySelectorAll("*")]
        .filter((el) => !el.closest("[aria-hidden='true']"))
        .flatMap((el) => [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent))
        .join("");
    const before = exposed();
    expect(before).toContain("0:30");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1100));
    });
    expect(exposed()).toBe(before);
  });
});

/* ------------------------------------------------------------------ */
/* RecurrencePicker                                                    */
/* ------------------------------------------------------------------ */

describe("RecurrencePicker", () => {
  it("shows the custom interval for a controlled rule that arrives after mount", () => {
    const { rerender } = render(<RecurrencePicker value={{ freq: "weekly", byWeekday: ["MO"] }} onValueChange={() => {}} />);
    rerender(<RecurrencePicker value={{ freq: "weekly", byWeekday: ["MO"], interval: 2 }} onValueChange={() => {}} />);
    expect(screen.getByLabelText("Every")).toHaveValue(2);
  });

  it("lets the user clear a number field and type a new value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    function Host() {
      const [rule, setRule] = React.useState<RecurrenceRule>({ freq: "daily", interval: 2 });
      return (
        <RecurrencePicker
          value={rule}
          onValueChange={(r) => {
            onValueChange(r);
            setRule(r);
          }}
        />
      );
    }
    render(<Host />);
    const every = screen.getByLabelText("Every");
    await user.clear(every);
    await user.type(every, "3");
    expect(every).toHaveValue(3);
    expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ interval: 3 }));
  });
});

/* ------------------------------------------------------------------ */
/* CronScheduleField                                                   */
/* ------------------------------------------------------------------ */

describe("CronScheduleField once mode", () => {
  it("reads the date and time in the timeZone prop", () => {
    const zone = "America/New_York";
    const at = new Date(Date.UTC(2026, 11, 1, 14, 30)); // 09:30 in New York
    const onValueChange = vi.fn();
    render(
      <CronScheduleField
        defaultValue={{ kind: "once", at }}
        modes={["once"]}
        timeZone={zone}
        now={Date.UTC(2026, 10, 1)}
        onValueChange={onValueChange}
      />
    );
    const time = screen.getByLabelText("at") as HTMLInputElement;
    expect(time.value).toBe("09:30");
    expect(screen.getByText(/Once on Dec 1, 2026 at 9:30 AM/)).toBeInTheDocument();
    fireEvent.change(time, { target: { value: "10:00" } });
    const value = onValueChange.mock.calls.at(-1)![0] as CronScheduleValue;
    expect(value.kind === "once" && value.at.toISOString()).toBe("2026-12-01T15:00:00.000Z");
  });
});

/* ------------------------------------------------------------------ */
/* Countdown, TallyCounter                                             */
/* ------------------------------------------------------------------ */

describe("Countdown invalid target", () => {
  it("doesn't render NaN", () => {
    const { container } = render(<Countdown target={new Date("nope")} />);
    expect(container.textContent).not.toMatch(/NaN/);
    render(<Countdown target={Number.NaN} format="compact" />);
    expect(document.body.textContent).not.toMatch(/NaN/);
  });
});

describe("TallyCounter hold-to-repeat", () => {
  it("stops repeating once the button disables at max", () => {
    vi.useFakeTimers();
    render(<TallyCounter max={3} />);
    const plus = screen.getByRole("button", { name: "Increase by 1" });
    const value = () => document.querySelector("[data-tally-value]")!.textContent;
    fireEvent.pointerDown(plus, { button: 0 });
    act(() => vi.advanceTimersByTime(450 + 90 * 6));
    expect(value()).toBe("3");
    expect(plus).toBeDisabled();
    // The disabled button never gets pointerup; undo lowers the value.
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(value()).toBe("0");
    act(() => vi.advanceTimersByTime(1000));
    expect(value()).toBe("0");
  });
});

/* ------------------------------------------------------------------ */
/* HeaderNavMobile                                                     */
/* ------------------------------------------------------------------ */

describe("HeaderNavMobile breakpoint", () => {
  it("closes when the viewport grows past md", async () => {
    const listeners = new Set<() => void>();
    let desktop = false;
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      get matches() {
        return /min-width/.test(query) ? desktop : false;
      },
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      const onOpenChange = vi.fn();
      render(<HeaderNavMobile items={[{ label: "Home", href: "/" }]} defaultOpen onOpenChange={onOpenChange} />);
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      act(() => {
        desktop = true;
        listeners.forEach((cb) => cb());
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
    } finally {
      window.matchMedia = original;
    }
  });
});

/* ------------------------------------------------------------------ */
/* TimelineBar                                                         */
/* ------------------------------------------------------------------ */

describe("TimelineBar live spans", () => {
  it("grows a live span without a parent re-render", () => {
    vi.useFakeTimers();
    const t0 = new Date(2026, 9, 19, 12, 0).getTime();
    vi.setSystemTime(t0);
    const { container } = render(
      <TimelineBar from={t0 - 30 * 60_000} to={t0 + 30 * 60_000} spans={[{ id: "job", start: t0 - 10 * 60_000, live: true }]} />
    );
    const span = () => container.querySelector<HTMLElement>("[style*='width']")!;
    const before = parseFloat(span().style.width);
    act(() => vi.advanceTimersByTime(5 * 60_000));
    expect(parseFloat(span().style.width)).toBeGreaterThan(before);
  });
});

/* ------------------------------------------------------------------ */
/* Password strength                                                   */
/* ------------------------------------------------------------------ */

describe("getPasswordScore", () => {
  it("matches common passwords as whole words, not prefixes", () => {
    expect(getPasswordScore("Dragonfruit smoothie at 7am!")).toBeGreaterThanOrEqual(3);
    expect(getPasswordScore("administrator-Zebra-91!x")).toBeGreaterThanOrEqual(3);
    expect(getPasswordScore("Password123!")).toBe(1);
    expect(getPasswordScore("passw0rd")).toBe(1);
    expect(getPasswordScore("dragon")).toBe(1);
  });

  it("rates a long multi-word passphrase above Weak", () => {
    expect(getPasswordScore("correct horse battery staple")).toBeGreaterThanOrEqual(3);
    expect(getPasswordScore("abcdefghijklmnopqrst")).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* Already fixed (regression guards)                                   */
/* ------------------------------------------------------------------ */

describe("regression guards for findings already fixed", () => {
  it("formatBytes handles fractions and unit boundaries", () => {
    expect(formatBytes(0.5)).not.toMatch(/undefined/);
    expect(formatBytes(1048575)).not.toBe("1024 KB");
  });

  it("BlogPostHeader shows a date-only string on its local day and survives an invalid date", () => {
    render(<BlogPostHeader title="Post" date="2024-03-15" />);
    expect(screen.getByText(/Mar 15, 2024/)).toBeInTheDocument();
    expect(() => render(<BlogPostHeader title="Post" date={new Date("nope")} />)).not.toThrow();
  });

  it("SchemaForm doesn't throw on an invalid pattern", async () => {
    const onSubmit = vi.fn();
    render(
      <SchemaForm
        schema={{ type: "object", properties: { code: { type: "string", title: "Code", pattern: "([" } } }}
        defaultValue={{ code: "x" }}
        onSubmit={onSubmit}
      />
    );
    const form = document.querySelector("form")!;
    expect(() => fireEvent.submit(form)).not.toThrow();
  });
});

void within;
