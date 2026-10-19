import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { formatDuration } from "../src/lib/duration";
import { resolveColorToken } from "../src/lib/tone";
import { useActiveIndicator } from "../src/hooks/use-active-indicator";
import { BreakdownList } from "../src/primitives/meter";

afterEach(cleanup);

describe("formatDuration unitLabels", () => {
  it("replaces compact and decimal unit labels, and leaves the long style alone", () => {
    const labels = { d: "d", h: "hr", m: "min", s: "sec", ms: "msec" };
    expect(formatDuration(3_900_000, { space: true, unitLabels: labels })).toBe("1 hr 5 min");
    expect(formatDuration(65_000, { unitLabels: { m: "min" } })).toBe("1min 5s");
    expect(formatDuration(850, { ms: true, space: true, unitLabels: labels })).toBe("850 msec");
    expect(formatDuration(90_000, { style: "decimal", space: true, unitLabels: labels })).toBe("1.5 min");
    expect(formatDuration(3_900_000, { style: "long", unitLabels: labels })).toBe("1 hour 5 minutes");
  });
});

describe("resolveColorToken (lib/tone)", () => {
  it("maps neutral to the muted foreground and ignores prototype keys", () => {
    expect(resolveColorToken("neutral")).toBe("var(--muted-foreground)");
    expect(resolveColorToken("toString")).toBe("toString");
  });

  it("is what BreakdownList uses for token colours", () => {
    const { container } = render(
      <BreakdownList items={[{ label: "A", color: "neutral", value: 1 }, { label: "B", color: "toString", value: 1 }]} />
    );
    const styles = [...container.querySelectorAll<HTMLElement>("[style]")].map((el) => el.getAttribute("style") ?? "");
    expect(styles.some((s) => s.includes("var(--muted-foreground)"))).toBe(true);
    // A prototype key is passed through as a (bogus) colour, never resolved to a function body.
    expect(styles.some((s) => s.includes("function"))).toBe(false);
  });
});

describe("useActiveIndicator", () => {
  it("watches items added after mount once deps change", () => {
    const observed = new Set<Element>();
    const original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      observe(el: Element) {
        observed.add(el);
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    function Strip({ items }: { items: string[] }) {
      const ref = React.useRef<HTMLDivElement>(null);
      useActiveIndicator(ref, "[data-active]", [items], { itemSelector: "[data-item]" });
      return (
        <div ref={ref}>
          {items.map((it, i) => (
            <span key={it} data-item="" data-active={i === 0 ? "" : undefined}>
              {it}
            </span>
          ))}
        </div>
      );
    }
    try {
      const { rerender, getByText } = render(<Strip items={["a", "b"]} />);
      rerender(<Strip items={["a", "b", "c"]} />);
      expect(observed.has(getByText("c"))).toBe(true);
    } finally {
      globalThis.ResizeObserver = original;
    }
  });
});
