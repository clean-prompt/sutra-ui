import * as React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { LogoCloud } from "../src/assets/placeholder-logos";
import { Calendar } from "../src/primitives/calendar";
import { Pagination } from "../src/primitives/pagination";
import { Snackbar } from "../src/primitives/toast";
import { AdaptiveTabs } from "../src/patterns/bottom-tab-bar";
import { ChartContainer } from "../src/patterns/chart-container";
import { Gauge } from "../src/patterns/gauge";
import { StatCard, StatGroup } from "../src/patterns/stat-card";
import { FloatingPanes, LayoutPresetPicker, type FloatingPaneState } from "../src/patterns/tiling-layout";

// jsdom cannot lay anything out: these checks pin the classes and structure that make the layouts follow the
// width a component is given (container queries, wrapping, min-w-0), not the viewport. The audit re-run in a
// real browser is the check that the layout itself holds.

describe("layout: narrow containers (primitives and assets)", () => {
  it("LogoCloud picks its columns from the container width, not the viewport", () => {
    const { container } = render(<LogoCloud columns={6} />);
    expect(container.firstElementChild).toHaveClass("@container");
    const list = container.querySelector("ul")!;
    expect(list.className).toContain("@3xl:grid-cols-6");
    expect(list.className).not.toMatch(/(^|\s)(sm|md|lg):grid-cols/);
  });

  it("Pagination lets the container decide between the page list and 'Page x of y'", () => {
    const { container } = render(<Pagination page={3} totalPages={12} />);
    const list = container.querySelector("ul")!;
    expect(list).toHaveClass("hidden", "@lg:flex");
    expect(list.className).not.toContain("sm:flex");
    expect(list.parentElement!.querySelector(".\\@lg\\:hidden")).not.toBeNull();
    // the row that holds the pager is a size container
    expect(list.parentElement!.parentElement).toHaveClass("@container");
  });

  it("Pagination with a page-size select wraps instead of overflowing", () => {
    render(<Pagination page={1} totalPages={20} pageSize={25} pageSizeOptions={[10, 25]} onPageSizeChange={() => undefined} />);
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(nav).toHaveClass("flex-wrap", "justify-center");
    expect(nav.className).not.toContain("sm:flex-row");
  });

  it("Calendar months wrap (two months stack in a narrow column) and each month has a basis", () => {
    const { container } = render(<Calendar mode="range" numberOfMonths={2} defaultMonth={new Date(2026, 9, 1)} />);
    const months = container.querySelector(".flex-wrap")!;
    expect(months).not.toBeNull();
    expect(months.className).not.toContain("sm:flex-row");
    expect(months.querySelectorAll(".flex-\\[1_1_15\\.75rem\\]")).toHaveLength(2);
  });

  it("Snackbar never asks for more width than its container", () => {
    render(<Snackbar message="Saved" />);
    expect(screen.getByRole("status").className).toContain("min-w-[min(18rem,100%)]");
  });
});

describe("layout: narrow containers (patterns)", () => {
  it("ChartContainer keeps its screen-reader table inside a clipped sr-only wrapper", () => {
    const { container } = render(
      <ChartContainer label="Requests" table={{ columns: ["Day", "Requests"], rows: [["Mon", "1"]] }}>
        <svg />
      </ChartContainer>
    );
    const table = container.querySelector("table")!;
    // a bare absolutely positioned table keeps its content width and widens the page
    expect(table).not.toHaveClass("sr-only");
    expect(table.parentElement).toHaveClass("sr-only");
    expect(table.parentElement!.tagName).toBe("DIV");
  });

  it("StatGroup cards fit as many tiles as the width allows; the divided variant keeps two columns", () => {
    const { container, rerender } = render(
      <StatGroup>
        <StatCard label="Requests" value="1" />
      </StatGroup>
    );
    expect(container.firstElementChild!.className).toContain("auto-fit");
    rerender(
      <StatGroup variant="divided">
        <StatCard label="Requests" value="1" />
      </StatGroup>
    );
    expect(container.firstElementChild).toHaveClass("grid-cols-2");
  });

  it("Gauge caps its label in px (80% of the box), not in a percentage of a content-sized column", () => {
    render(<Gauge value={50} label="GPU 0" size="md" />);
    const label = screen.getByText("GPU 0");
    expect(label.style.maxWidth).toBe("90px");
    expect(label.className).not.toContain("max-w-[80%]");
  });

  it("AdaptiveTabs can shrink in a flex parent so the inline pills scroll instead of clipping", () => {
    const { container } = render(
      <AdaptiveTabs
        mode="inline"
        value="a"
        onValueChange={() => undefined}
        label="Sections"
        items={[
          { value: "a", label: "Alpha", icon: <span /> },
          { value: "b", label: "Beta", icon: <span /> },
        ]}
      />
    );
    expect(container.firstElementChild).toHaveClass("min-w-0", "max-w-full");
    expect(container.querySelector("[data-slot=adaptive-tabs-inline]")).toHaveClass("overflow-x-auto", "max-w-full");
  });

  it("LayoutPresetPicker tiles and the save row adapt to the width", () => {
    const { container } = render(<LayoutPresetPicker onSelect={() => undefined} allowSave current={undefined} />);
    expect(container.querySelector("[role=group]")!.className).toContain("auto-fill");
    expect(container.querySelector("form")).toHaveClass("flex-wrap");
  });

  it("FloatingPanes fits a window that was opened for a wider stage", () => {
    const rect = (width: number, height: number) =>
      ({ x: 0, y: 0, left: 0, top: 0, width, height, right: width, bottom: height, toJSON: () => ({}) }) as DOMRect;
    const spy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      return this.getAttribute("data-slot") === "floating-panes" ? rect(300, 200) : rect(0, 0);
    });
    try {
      const panes: FloatingPaneState[] = [{ id: "wide", x: 500, y: 40, width: 440, height: 400 }];
      render(
        <div style={{ position: "relative", height: 200 }}>
          <FloatingPanes panes={panes} onPanesChange={() => undefined} renderPane={(id) => <p>{id}</p>} />
        </div>
      );
      const pane = screen.getByRole("dialog");
      expect(pane.style.width).toBe("300px");
      expect(pane.style.height).toBe("200px");
      expect(pane.style.left).toBe("0px");
      expect(pane.style.top).toBe("0px");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("layout: cross-group fixes from F2", () => {
  it("SegmentedControl scrolls sideways instead of running out of its container", async () => {
    const { SegmentedControl } = await import("../src/primitives/segmented-control");
    render(
      <SegmentedControl
        aria-label="Range"
        defaultValue="a"
        options={["a", "b", "c", "d", "e"].map((value) => ({ value, label: `Option ${value}` }))}
      />
    );
    expect(screen.getByLabelText("Range")).toHaveClass("max-w-full", "overflow-x-auto");
  });

  it("DiffCard keeps scrolling long lines sideways while collapsed, and its header wraps", async () => {
    const { DiffCard } = await import("../src/patterns/diff-viewer");
    const long = "x".repeat(400);
    const { container } = render(<DiffCard path="a/very/long/path/to/some/file.ts" oldValue={`${long}\nb\nc\n`} newValue={`${long}!\nb\nc\nd\ne\n`} collapsedLines={1} />);
    const body = container.querySelector("[id]")!;
    expect(body.className).toContain("overflow-x-auto");
    expect(body.className).not.toMatch(/(^|\s)overflow-hidden(\s|$)/);
    expect(container.querySelector("[data-slot=diff-card] > div")).toHaveClass("flex-wrap");
  });

  it("TimelineBar draws fewer axis ticks on a narrow bar and lets a very short span shrink to its wrapper", async () => {
    const { TimelineBar } = await import("../src/patterns/timeline-bar");
    const from = new Date(2026, 9, 19, 0, 0).getTime();
    const to = from + 24 * 3600_000;
    const rect = (width: number) =>
      ({ x: 0, y: 0, left: 0, top: 0, width, height: 40, right: width, bottom: 40, toJSON: () => ({}) }) as DOMRect;
    const props = { from, to, now: to, spans: [{ start: from + 3600_000, end: from + 3600_000 + 60_000, label: "run" }] };
    const wide = render(<TimelineBar {...props} />);
    const full = wide.container.querySelectorAll("div.relative.h-4 > span").length;
    wide.unmount();
    const spy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      return this.getAttribute("role") === "group" ? rect(180) : rect(0);
    });
    try {
      const narrow = render(<TimelineBar {...props} />);
      const fewer = narrow.container.querySelectorAll("div.relative.h-4 > span").length;
      expect(full).toBe(7);
      expect(fewer).toBeLessThan(full);
      // padding lives on the label, so a 3px wrapper is not pushed wider by the span's own padding
      expect(narrow.container.querySelector("[role=listitem] > * , [role=listitem]")!.className).not.toContain("px-1");
      expect(narrow.container.querySelector("[role=listitem] span.truncate")).toHaveClass("px-1");
    } finally {
      spy.mockRestore();
    }
  });

  it("SchemaForm decides its two-column layout from the container, not the viewport", async () => {
    const { SchemaForm } = await import("../src/patterns/schema-form");
    const { container } = render(
      <SchemaForm
        schema={{ type: "object", properties: { a: { type: "string", title: "A" }, b: { type: "string", title: "B" } } } as never}
        navThreshold={0}
      />
    );
    const form = container.querySelector("form")!;
    expect(form).toHaveClass("@container");
    expect(form.innerHTML).not.toContain("md:flex-row");
    expect(form.innerHTML).toContain("@xl:flex-row");
  });
});

describe("layout: cross-group fixes from F3", () => {
  it("Markdown lets a wide display equation scroll inside its own block", async () => {
    const { Markdown } = await import("../src/patterns/markdown");
    const { container } = render(<Markdown>{"Text"}</Markdown>);
    expect(container.firstElementChild!.className).toContain("[&_.katex-display]:overflow-x-auto");
    expect(container.firstElementChild!.className).toContain("[&_.katex-display]:overflow-y-hidden");
  });

  it("LogViewer's action group wraps instead of widening the toolbar", async () => {
    const { LogViewer } = await import("../src/patterns/log-viewer");
    Element.prototype.scrollTo ??= function () {} as typeof Element.prototype.scrollTo;
    render(<LogViewer lines={["one", "two"]} status="live" />);
    const group = screen.getByRole("status").parentElement!;
    expect(group).toHaveClass("flex-wrap", "max-w-full", "ml-auto");
  });

  it("UptimeBar buckets can shrink below 2px and the gap tightens for many buckets", async () => {
    const { UptimeBar } = await import("../src/patterns/timeline-bar");
    const many = render(<UptimeBar buckets={Array.from({ length: 90 }, () => "up" as const)} />);
    const bar = many.container.querySelector("[role=img]")!;
    expect(bar).toHaveClass("gap-px");
    expect(bar.firstElementChild).toHaveClass("min-w-0", "flex-1");
    many.unmount();
    const few = render(<UptimeBar buckets={["up", "down", "up"]} />);
    expect(few.container.querySelector("[role=img]")).toHaveClass("gap-[2px]");
  });

  it("Countdown tiles get slimmer on phones and the row never exceeds its container", async () => {
    const { Countdown } = await import("../src/patterns/countdown");
    render(<Countdown target={Date.now() + 90_000_000} aria-label="Launch" />);
    const timer = screen.getByRole("timer");
    expect(timer).toHaveClass("max-w-full");
    expect(timer.querySelector("[class*='min-w-11']")).not.toBeNull();
  });
});
