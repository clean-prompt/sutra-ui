import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { TabDropdown } from "../src/primitives/tab-dropdown";

afterEach(cleanup);

const items = [
  { value: "a", label: "Alpha", disabled: true },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

describe("TabDropdown roving tab stop skips disabled tabs", () => {
  it("a disabled first tab (the default selection) leaves the first enabled tab as the tab stop", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Before</button>
        <TabDropdown items={items} />
      </>
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.getAttribute("tabindex"))).toEqual(["-1", "0", "-1"]);
    await user.tab();
    await user.tab();
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveFocus();
  });

  it("keeps the selected tab as the stop when it is enabled, and the first enabled one when the selection is hidden", () => {
    const { rerender } = render(<TabDropdown items={items} defaultValue="c" />);
    expect(screen.getAllByRole("tab").map((t) => t.getAttribute("tabindex"))).toEqual(["-1", "-1", "0"]);
    rerender(<TabDropdown items={items} value="zzz" />);
    expect(screen.getAllByRole("tab").map((t) => t.getAttribute("tabindex"))).toEqual(["-1", "0", "-1"]);
  });

  it("has no tab stop only when every tab is disabled", () => {
    render(<TabDropdown items={items.map((i) => ({ ...i, disabled: true }))} />);
    expect(screen.getAllByRole("tab").every((t) => t.getAttribute("tabindex") === "-1")).toBe(true);
  });
});
