import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedNumber } from "../src/patterns/animated-number";
import { StatCard, StatValue } from "../src/patterns/stat-card";
import { numberDigitGlyphs, splitNumberParts } from "../src/lib/number-parts";
import { axeViolations } from "./a11y";

const columns = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('[data-slot="animated-number-digit"]')];
const digits = (c: HTMLElement) => columns(c).map((el) => el.getAttribute("data-digit"));
const offsets = (c: HTMLElement) => columns(c).map((el) => (el.children[1] as HTMLElement).style.transform);

describe("splitNumberParts", () => {
  it("keys integer digits from the point outward and separators by the digits to their right", () => {
    const { text, columns: cols } = splitNumberParts(1234.5, { minimumFractionDigits: 2 }, "en-US");
    expect(text).toBe("1,234.50");
    expect(cols.map((c) => c.key)).toEqual(["int-3", "group-3", "int-2", "int-1", "int-0", "decimal-0", "frac-0", "frac-1"]);
    expect(cols.filter((c) => c.kind === "digit").map((c) => c.digit)).toEqual([1, 2, 3, 4, 5, 0]);
  });

  it("keeps the ones place in the same column when a digit is added", () => {
    const a = splitNumberParts(99, undefined, "en-US").columns.map((c) => c.key);
    const b = splitNumberParts(100, undefined, "en-US").columns.map((c) => c.key);
    expect(a).toEqual(["int-1", "int-0"]);
    expect(b).toEqual(["int-2", "int-1", "int-0"]);
  });

  it("handles currency, percent, compact, negative and locale digits", () => {
    expect(splitNumberParts(-12.5, { style: "currency", currency: "USD" }, "en-US").columns.map((c) => c.key)).toEqual(
      ["minusSign-0", "currency-0", "int-1", "int-0", "decimal-0", "frac-0", "frac-1"]
    );
    expect(splitNumberParts(0.42, { style: "percent" }, "en-US").text).toBe("42%");
    expect(splitNumberParts(1200, { notation: "compact" }, "en-US").text).toBe("1.2K");
    const de = splitNumberParts(1234.5, undefined, "de-DE");
    expect(de.text).toBe("1.234,5");
    expect(de.columns.find((c) => c.key === "decimal-0")?.text).toBe(",");
    const ar = splitNumberParts(12, undefined, "ar-EG");
    expect(ar.columns.every((c) => c.kind === "digit")).toBe(true);
    expect(ar.glyphs[1]).toBe("١");
    expect(numberDigitGlyphs("en-US")).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  });

  it("never throws: bad locale or options fall back, non-finite is one static column", () => {
    expect(splitNumberParts(5, undefined, "not a locale!!").text).toBe("5");
    expect(splitNumberParts(5, { style: "currency" } as Intl.NumberFormatOptions, "en-US").text).toBe("5");
    expect(splitNumberParts(NaN, undefined, "en-US").columns).toEqual([{ key: "text-0", kind: "static", text: "NaN" }]);
    expect(splitNumberParts(Infinity, undefined, "en-US").columns).toHaveLength(1);
  });
});

describe("AnimatedNumber", () => {
  it("renders the formatted value once as text and hides the columns from assistive tech", () => {
    const { container } = render(<AnimatedNumber value={1234.5} locale="en-US" format={{ minimumFractionDigits: 2 }} />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("data-slot", "animated-number");
    expect(screen.getByText("1,234.50", { selector: ".sr-only" })).toBeInTheDocument();
    expect(root.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(digits(container)).toEqual(["1", "2", "3", "4", "5", "0"]);
    expect(root.className).toContain("tabular-nums");
    expect(root.querySelector('[aria-hidden="true"]')!.className).toContain("select-none");
  });

  it("places each digit with a translate and a stack of ten glyphs", () => {
    const { container } = render(<AnimatedNumber value={307} locale="en-US" />);
    expect(offsets(container)).toEqual(["translateY(-30%)", "translateY(0%)", "translateY(-70%)"]);
    const stack = columns(container)[0]!.children[1] as HTMLElement;
    expect([...stack.children].map((c) => c.textContent).join("")).toBe("0123456789");
    expect(stack.className).toContain("transition-transform");
    expect(stack.className).toContain("duration-(--sutra-duration-fill)");
    expect(stack.className).toContain("ease-(--sutra-ease)");
  });

  it("keeps a digit in its column on change: the same element moves instead of remounting", () => {
    const { container, rerender } = render(<AnimatedNumber value={41} locale="en-US" />);
    const before = columns(container);
    rerender(<AnimatedNumber value={42} locale="en-US" />);
    const after = columns(container);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
    expect(digits(container)).toEqual(["4", "2"]);
    expect(offsets(container)).toEqual(["translateY(-40%)", "translateY(-20%)"]);
    expect(screen.getByText("42", { selector: ".sr-only" })).toBeInTheDocument();
  });

  it("does not fade anything in on the first render, and fades only the column a change adds", () => {
    const { container, rerender } = render(<AnimatedNumber value={99} locale="en-US" />);
    expect(columns(container).every((c) => !c.className.includes("animate-fade-in"))).toBe(true);
    rerender(<AnimatedNumber value={100} locale="en-US" />);
    const cols = columns(container);
    expect(cols).toHaveLength(3);
    expect(cols[0]!.className).toContain("animate-fade-in");
    expect(cols[1]!.className).not.toContain("animate-fade-in");
    expect(cols[2]!.className).not.toContain("animate-fade-in");
  });

  it("applies a custom duration and respects reduced motion through classes", () => {
    const { container } = render(<AnimatedNumber value={5} duration={900} locale="en-US" />);
    expect((columns(container)[0]!.children[1] as HTMLElement).style.transitionDuration).toBe("900ms");
    // no JS animation: the reduced-motion net in sutra.css ends transitions, fade-in is an animate-* class it covers
    expect(container.innerHTML).not.toContain("requestAnimationFrame");
  });

  it("renders plain text with animate={false}", () => {
    const { container } = render(<AnimatedNumber value={1234} animate={false} locale="en-US" className="x" />);
    expect(container.firstElementChild).toHaveTextContent("1,234");
    expect(columns(container)).toHaveLength(0);
    expect(container.querySelector(".sr-only")).toBeNull();
    expect(container.firstElementChild).toHaveClass("x");
  });

  it("formats currency, percent and negatives and shows non-finite values as text", () => {
    const { container, rerender } = render(<AnimatedNumber value={-1250.5} locale="en-US" format={{ style: "currency", currency: "USD" }} />);
    expect(screen.getByText("-$1,250.50", { selector: ".sr-only" })).toBeInTheDocument();
    rerender(<AnimatedNumber value={0.375} locale="en-US" format={{ style: "percent", maximumFractionDigits: 1 }} />);
    expect(screen.getByText("37.5%", { selector: ".sr-only" })).toBeInTheDocument();
    rerender(<AnimatedNumber value={NaN} locale="en-US" />);
    expect(container.firstElementChild).toHaveTextContent("NaN");
    expect(columns(container)).toHaveLength(0);
  });

  it("uses the locale's digits", () => {
    const { container } = render(<AnimatedNumber value={7} locale="ar-EG" />);
    const stack = columns(container)[0]!.children[1] as HTMLElement;
    expect(stack.children[7]!.textContent).toBe("٧");
    expect(screen.getByText("٧", { selector: ".sr-only" })).toBeInTheDocument();
  });

  it("forwards ref, className, style and props, and lets a caller announce changes", () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(<AnimatedNumber ref={ref} value={3} className="big" style={{ color: "red" }} aria-live="polite" data-testid="n" />);
    expect(ref.current).toBe(screen.getByTestId("n"));
    expect(ref.current).toHaveClass("big");
    expect(ref.current).toHaveAttribute("aria-live", "polite");
    expect(ref.current!.style.color).toBe("red");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <p>
        Balance: <AnimatedNumber value={1234.56} locale="en-US" format={{ style: "currency", currency: "USD" }} />
      </p>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("StatValue and StatCard animate", () => {
  it("stay plain by default and roll only a numeric value when animate is on", () => {
    const { container, rerender } = render(<StatValue value={1234} />);
    expect(container.querySelector('[data-slot="animated-number"]')).toBeNull();
    expect(container).toHaveTextContent("1234");
    rerender(<StatValue value={1234} animate format={{ useGrouping: false }} locale="en-US" unit="ms" />);
    expect(container.querySelector('[data-slot="animated-number"]')).not.toBeNull();
    expect(screen.getByText("1234", { selector: ".sr-only" })).toBeInTheDocument();
    rerender(<StatValue value="1.2k" animate />);
    expect(container.querySelector('[data-slot="animated-number"]')).toBeNull();
    expect(container).toHaveTextContent("1.2k");
  });

  it("passes animate, valueFormat and valueLocale down from the card, and still shows a skeleton while loading", () => {
    const { container, rerender } = render(<StatCard label="Revenue" value={2500} animate valueLocale="en-US" valueFormat={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} />);
    expect(screen.getByText("$2,500", { selector: ".sr-only" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="animated-number"]')).not.toBeNull();
    rerender(<StatCard label="Revenue" value={2600} animate valueLocale="en-US" valueFormat={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} />);
    expect(screen.getByText("$2,600", { selector: ".sr-only" })).toBeInTheDocument();
    rerender(<StatCard label="Revenue" value={2600} animate loading />);
    expect(container.querySelector('[data-slot="animated-number"]')).toBeNull();
  });
});
