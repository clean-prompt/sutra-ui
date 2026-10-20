import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "../src/primitives/button";
import { Pagination } from "../src/primitives/pagination";
import { TableCheckbox } from "../src/primitives/table";
import { TimePicker } from "../src/primitives/time-picker";
import { DatePicker } from "../src/primitives/date-picker";
import { ToolToggleRow } from "../src/kits/agent-admin/tool-toggles";
import { kunjiButtonVariants } from "../src/kits/identity/kunji-buttons";

afterEach(cleanup);

/** Remaining small tap targets (wave 8): a control that is visually under 24px keeps its look and gains the invisible hit area. */
const HIT = ["after:absolute", "after:h-[max(100%,1.5rem)]", "after:w-[max(100%,1.5rem)]", "after:content-['']"];
const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/);
const hasHit = (el: Element | null | undefined) => {
  expect(el, "element not found").toBeTruthy();
  expect(classes(el!)).toEqual(expect.arrayContaining(HIT));
};

describe("hit areas on the remaining small controls", () => {
  it("Button variant=link (h-auto, text height) carries one; other variants do not need it", () => {
    render(
      <>
        <Button variant="link">Sign out</Button>
        <Button variant="ghost">Cancel</Button>
      </>
    );
    hasHit(screen.getByRole("button", { name: "Sign out" }));
    expect(classes(screen.getByRole("button", { name: "Cancel" }))).not.toContain("after:absolute");
  });

  it("Pagination dots", () => {
    render(<Pagination variant="dots" totalPages={4} defaultPage={2} />);
    for (const n of [1, 2, 3, 4]) hasHit(screen.getByRole("button", { name: `Page ${n}` }));
    expect(classes(screen.getByRole("button", { name: "Page 2" }))).toContain("w-6");
    expect(classes(screen.getByRole("button", { name: "Page 1" }))).toContain("w-2");
  });

  it("TableCheckbox input (appearance-none, so the pseudo-element renders)", () => {
    render(<TableCheckbox aria-label="Select all rows" />);
    const box = screen.getByRole("checkbox", { name: "Select all rows" });
    hasHit(box);
    expect(classes(box)).toEqual(expect.arrayContaining(["size-4", "appearance-none"]));
  });

  it("TimePicker: segments are at least 24px wide, the clear button has a hit area", () => {
    render(<TimePicker aria-label="Start" clearable defaultValue="09:30" />);
    for (const seg of screen.getAllByRole("spinbutton")) expect(classes(seg)).toContain("min-w-6");
    hasHit(screen.getByRole("button", { name: /clear/i }));
  });

  it("DatePicker clear button", () => {
    render(<DatePicker aria-label="Due" clearable defaultValue={new Date(2024, 0, 15)} />);
    hasHit(screen.getByRole("button", { name: "Clear date" }));
  });

  it("ToolToggleRow expand button (the row stays 44px tall)", () => {
    render(<ToolToggleRow tool={{ id: "t", name: "read_file", enabled: true, description: "Reads a file" }} />);
    hasHit(screen.getByText("read_file").closest("button"));
  });

  it("KunjiButton sm keeps its 32px look and gets a 44px touch hit area; md and up stay 40px", () => {
    const sm = kunjiButtonVariants({ size: "sm" }).split(/\s+/);
    expect(sm).toEqual(expect.arrayContaining(["h-8", "pointer-coarse:after:h-[max(100%,2.75rem)]", "pointer-coarse:after:w-[max(100%,2.75rem)]"]));
    expect(kunjiButtonVariants({ size: "md" })).toContain("h-10");
    expect(kunjiButtonVariants({ size: "md" })).not.toContain("after:");
    expect(kunjiButtonVariants({ size: "lg" })).toContain("h-12");
  });
});
