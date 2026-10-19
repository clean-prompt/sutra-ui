import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axeViolations } from "./a11y";
import { ScrollArea } from "../src/primitives/scroll-area";
import { Markdown } from "../src/patterns/markdown";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** jsdom has no layout: make every element report content taller and wider than its box. */
function overflowing() {
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(500);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(200);
}

describe("ScrollArea viewport is a keyboard-reachable scroller", () => {
  it("is a tab stop only while it overflows, and takes aria-label as a named region", async () => {
    const viewportRef = React.createRef<HTMLDivElement>();
    const first = render(
      <ScrollArea className="h-20" viewportRef={viewportRef} aria-label="Log">
        <p>Line one</p>
      </ScrollArea>
    );
    expect(viewportRef.current).not.toHaveAttribute("tabindex");
    first.unmount();
    overflowing();
    const { container } = render(
      <ScrollArea className="h-20" viewportRef={viewportRef} aria-label="Log">
        <p>Line one</p>
      </ScrollArea>
    );
    expect(viewportRef.current).toHaveAttribute("tabindex", "0");
    const region = screen.getByRole("region", { name: "Log" });
    expect(region).toBe(viewportRef.current);
    expect(container.firstElementChild).not.toHaveAttribute("aria-label");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("takes aria-labelledby, and without a name has no role", () => {
    const viewportRef = React.createRef<HTMLDivElement>();
    const { rerender } = render(
      <>
        <h2 id="t">Activity</h2>
        <ScrollArea viewportRef={viewportRef} aria-labelledby="t">
          <p>x</p>
        </ScrollArea>
      </>
    );
    expect(screen.getByRole("region", { name: "Activity" })).toBe(viewportRef.current);
    rerender(
      <ScrollArea viewportRef={viewportRef}>
        <p>x</p>
      </ScrollArea>
    );
    expect(viewportRef.current).not.toHaveAttribute("role");
  });

  it("renders the same on the server (not focusable before it is measured)", () => {
    overflowing();
    const html = renderToString(
      <ScrollArea>
        <p>x</p>
      </ScrollArea>
    );
    expect(html).not.toContain("tabindex");
  });
});

describe("Markdown scrollers are focusable while they overflow", () => {
  const md = "| A | B |\n| - | - |\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```\n\n```\nplain\n```";

  it("names code blocks and the table wrapper, with no tab stop while everything fits", () => {
    render(<Markdown>{md}</Markdown>);
    const ts = screen.getByRole("group", { name: "ts code" });
    expect(ts.tagName).toBe("PRE");
    expect(screen.getByRole("group", { name: "Code" }).tagName).toBe("PRE");
    const table = screen.getByRole("group", { name: "Table" });
    expect(table).toContainElement(screen.getByRole("table"));
    for (const el of [ts, table]) expect(el).not.toHaveAttribute("tabindex");
  });

  it("gives them a tab stop once they overflow", async () => {
    overflowing();
    const { container } = render(<Markdown>{md}</Markdown>);
    expect(screen.getByRole("group", { name: "ts code" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("group", { name: "Code" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("group", { name: "Table" })).toHaveAttribute("tabindex", "0");
    expect(await axeViolations(container)).toEqual([]);
  });
});
