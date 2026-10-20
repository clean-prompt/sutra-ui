import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Textarea } from "../src/primitives/textarea";
import { TagInput } from "../src/primitives/tag-input";
import { Pagination, PaginationStatus } from "../src/primitives/pagination";
import { Progress, ProgressCircle } from "../src/primitives/progress";
import { Meter } from "../src/primitives/meter";
import { BatteryLevel } from "../src/primitives/battery-level";
import { StatCard, StatValue } from "../src/patterns/stat-card";
import { isolateNumeric } from "../src/primitives/numeric-internal";

afterEach(cleanup);

/** The nearest element that sets a direction around a node: a numeric run is isolated when that is `dir="ltr"` inside the component. */
function isolation(el: Element, root: Element) {
  const own = el.closest("[dir]");
  return own && root.contains(own) ? own : null;
}
const rtl = (ui: React.ReactElement) => {
  const view = render(<div dir="rtl" data-testid="root">{ui}</div>);
  return { ...view, root: screen.getByTestId("root").firstElementChild as HTMLElement };
};
const expectLtrIsland = (el: Element, root: Element) => {
  const island = isolation(el, root);
  expect(island, `${el.outerHTML.slice(0, 80)} is not inside a dir="ltr" island`).not.toBeNull();
  expect(island!.getAttribute("dir")).toBe("ltr");
};

describe("numeric strings are isolated from the surrounding right-to-left text", () => {
  it("isolateNumeric wraps numbers and number-like strings, not words or nodes", () => {
    const { container } = render(
      <div>
        {isolateNumeric(5)}
        {isolateNumeric("-3.2")}
        {isolateNumeric("+12%")}
        {isolateNumeric("Healthy")}
        {isolateNumeric(<em>node</em>)}
      </div>
    );
    expect([...container.querySelectorAll("bdi")].map((b) => b.textContent)).toEqual(["5", "-3.2", "+12%"]);
    expect(container.querySelector("bdi")!.getAttribute("dir")).toBe("ltr");
  });

  it("Textarea counter (with and without a limit)", () => {
    const { root, rerender } = rtl(<Textarea showCount maxLength={500} defaultValue="abc" aria-label="Bio" />);
    expectLtrIsland(root.querySelector(".tabular-nums")!.firstElementChild ?? root.querySelector(".tabular-nums")!, root);
    expect(root.querySelector("bdi[dir=ltr]")!.textContent).toBe("3/500");
    rerender(
      <div dir="rtl" data-testid="root">
        <Textarea showCount defaultValue="abc" aria-label="Bio" />
      </div>
    );
    expect(screen.getByTestId("root").querySelector("bdi[dir=ltr]")!.textContent).toBe("3");
  });

  it("TagInput count", () => {
    const { root } = rtl(<TagInput showCount max={5} defaultValue={["a", "b"]} aria-label="Tags" />);
    const count = root.querySelector("[data-slot=tag-input-count]")!;
    const bdi = count.querySelector("bdi[dir=ltr]")!;
    expect(bdi.textContent).toBe("2 / 5");
    expectLtrIsland(bdi, root);
  });

  it("PaginationStatus window and the simple / load-more pagers", () => {
    const status = rtl(<PaginationStatus page={1} pageSize={10} total={245} />);
    expect(screen.getByText("1–10 of 245").tagName).toBe("BDI");
    expectLtrIsland(screen.getByText("1–10 of 245"), status.root);
    cleanup();
    const simple = rtl(<Pagination totalPages={12} defaultPage={3} variant="simple" />);
    const label = simple.root.querySelector("[aria-live=polite]")!;
    expect(label.querySelector("bdi[dir=ltr]")!.textContent).toBe("Page 3 of 12");
    cleanup();
    rtl(<Pagination totalPages={12} defaultPage={3} variant="load-more" />);
    expect(screen.getByText(/3 of 12 pages loaded/).tagName).toBe("BDI");
  });

  it("Progress, ProgressCircle, Meter, BatteryLevel readouts", () => {
    const bar = rtl(<Progress value={45} showValue="right" aria-label="Upload" />);
    expect(screen.getByText("45%").tagName).toBe("BDI");
    expectLtrIsland(screen.getByText("45%"), bar.root);
    cleanup();
    rtl(<ProgressCircle value={30} aria-label="Sync" />);
    expect(screen.getByText("30%").tagName).toBe("BDI");
    cleanup();
    const meter = rtl(<Meter label="VRAM" value={62.1} max={80} unit="GB" />);
    expectLtrIsland(screen.getByText("62.1 / 80 GB"), meter.root);
    cleanup();
    const battery = rtl(<BatteryLevel value={42} variant="text" />);
    expect(screen.getByText("42%").getAttribute("dir")).toBe("ltr");
    expect(battery.root.contains(screen.getByText("42%"))).toBe(true);
  });

  it("a Meter with a custom valueText keeps the caller's text (no forced direction)", () => {
    rtl(<Meter label="CPU" value={40} valueText="٤٠ بالمئة" />);
    expect(screen.getByText("٤٠ بالمئة").closest("bdi")).toBeNull();
  });

  it("StatValue and StatCard delta isolate signed numbers", () => {
    const value = rtl(<StatValue value="-3.2" unit="ms" />);
    expectLtrIsland(screen.getByText("-3.2"), value.root);
    cleanup();
    const numeric = rtl(<StatValue value={-12} />);
    expect(screen.getByText("-12").tagName).toBe("BDI");
    cleanup();
    const card = rtl(<StatCard label="Requests" value="12,480" delta={-4.5} />);
    const delta = card.root.querySelector("[data-slot=stat-delta] bdi[dir=ltr]")!;
    expect(delta.textContent).toBe("-4.5%");
    cleanup();
    rtl(<StatCard label="Requests" value="12,480" delta={12.4} />);
    expect(screen.getByText("+12.4%").tagName).toBe("BDI");
    expect(numeric.root).toBeTruthy();
  });
});
