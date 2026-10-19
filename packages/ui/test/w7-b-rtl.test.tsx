/** Wave 7 group B, RTL: indents and connectors use logical properties, and the sparkline is a left-to-right island. */
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Steps } from "../src/primitives/step-indicator";
import { TreeView } from "../src/patterns/tree-view";
import { Sparkline, SparkBar } from "../src/patterns/sparkline";

const style = (el: Element | null) => el?.getAttribute("style") ?? "";

describe("RTL: logical indents", () => {
  it("Steps: the vertical connector and the content indent are inline-start, the horizontal connector spans start to end", () => {
    const steps = [
      { title: "One", content: <p>Body one</p> },
      { title: "Two", content: <p>Body two</p> },
    ];
    const { container, rerender } = render(
      <div dir="rtl">
        <Steps steps={steps} current={0} orientation="vertical" />
      </div>
    );
    const line = container.querySelector("li > span[aria-hidden].absolute");
    expect(style(line)).toContain("inset-inline-start");
    expect(style(line)).not.toMatch(/(^|;|\s)left:/);
    const body = screen.getByText("Body one").parentElement;
    expect(style(body)).toContain("padding-inline-start");
    expect(style(body)).not.toContain("padding-left");

    rerender(
      <div dir="rtl">
        <Steps steps={steps} current={0} />
      </div>
    );
    const bar = container.querySelector("li > span[aria-hidden].absolute");
    expect(style(bar)).toContain("inset-inline-start");
    expect(style(bar)).toContain("inset-inline-end");
    expect(style(bar)).not.toMatch(/(^|;|\s)(left|right):/);
  });

  it("TreeView: row indent is padding-inline-start per level", () => {
    const nodes = [{ id: "a", label: "Folder", children: [{ id: "a1", label: "File" }] }];
    const { container } = render(
      <div dir="rtl">
        <TreeView nodes={nodes} aria-label="Files" defaultExpanded={["a"]} />
      </div>
    );
    const rows = container.querySelectorAll("[data-tree-row]");
    expect(rows.length).toBe(2);
    const pads = [...rows].map((r) => style(r));
    for (const p of pads) {
      expect(p).toContain("padding-inline-start");
      expect(p).not.toContain("padding-left");
    }
    const px = (s: string) => Number(/padding-inline-start:\s*(\d+)px/.exec(s)?.[1]);
    expect(px(pads[1]!)).toBeGreaterThan(px(pads[0]!));
  });

});

describe("RTL: Sparkline", () => {
  it("is a left-to-right island and the last-point dot is centred by one transform in both directions", () => {
    const { container } = render(
      <div dir="rtl">
        <Sparkline data={[1, 3, 2, 5]} highlightLast />
        <SparkBar data={[1, 3, 2, 5]} />
      </div>
    );
    const wrappers = container.querySelectorAll("div[dir=rtl] > span");
    expect(wrappers.length).toBe(2);
    for (const w of wrappers) expect(w).toHaveAttribute("dir", "ltr");
    const dot = container.querySelector("span[aria-hidden]")!;
    expect(dot.className).not.toContain("translate-x");
    expect(style(dot)).toContain("translate(-50%, -50%)");
    expect(style(dot)).toMatch(/left: 9\d/);
  });
});
