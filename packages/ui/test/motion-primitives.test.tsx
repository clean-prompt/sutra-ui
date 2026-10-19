import * as React from "react";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAddedKeys } from "../src/hooks/use-added-keys";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../src/primitives/accordion";
import { AlertBanner } from "../src/primitives/alert-banner";
import { Avatar, AvatarImage } from "../src/primitives/avatar";
import { Combobox, type ComboboxOption } from "../src/primitives/combobox";
import { EmptyState } from "../src/primitives/empty-state";
import { ProgressCircle, Skeleton } from "../src/primitives/progress";
import { Rating } from "../src/primitives/rating";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../src/primitives/select";
import { StatusBadge, StatusDot } from "../src/primitives/status-badge";
import { DataTable, type DataTableColumn } from "../src/primitives/table";

const SRC = path.resolve(__dirname, "../src");
const primitives = readdirSync(path.join(SRC, "primitives"))
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => ({ file: f, text: readFileSync(path.join(SRC, "primitives", f), "utf8") }));

const classTokens = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

/* ------------------------------------------------------------------ */
/* useAddedKeys                                                        */
/* ------------------------------------------------------------------ */

describe("useAddedKeys", () => {
  const added = (keys: string[]) => keys;

  it("is empty on mount and names only what a change added", () => {
    const { result, rerender } = renderHook(({ keys }) => useAddedKeys(keys), { initialProps: { keys: added(["a", "b"]) } });
    expect([...result.current]).toEqual([]);
    rerender({ keys: ["a", "b", "c"] });
    expect([...result.current]).toEqual(["c"]);
    // The same list (even as a new array) keeps the answer and the very same set.
    const set = result.current;
    rerender({ keys: ["a", "b", "c"] });
    expect(result.current).toBe(set);
  });

  it("is empty after a change that only removed or reordered", () => {
    const { result, rerender } = renderHook(({ keys }) => useAddedKeys(keys), { initialProps: { keys: ["a", "b"] } });
    rerender({ keys: ["b", "a"] });
    expect([...result.current]).toEqual([]);
    rerender({ keys: ["a"] });
    expect([...result.current]).toEqual([]);
    rerender({ keys: ["a", "z"] });
    expect([...result.current]).toEqual(["z"]);
  });

  it("is StrictMode safe", () => {
    const { result, rerender } = renderHook(({ keys }) => useAddedKeys(keys), {
      initialProps: { keys: ["a"] },
      wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode>,
    });
    expect([...result.current]).toEqual([]);
    act(() => rerender({ keys: ["a", "b"] }));
    expect([...result.current]).toEqual(["b"]);
  });
});

/* ------------------------------------------------------------------ */
/* Chevrons                                                            */
/* ------------------------------------------------------------------ */

describe("disclosure chevrons use chevron-turn", () => {
  it("the accordion chevron and plus/minus rotate with chevron-turn and carry no local timing", () => {
    const { container } = render(
      <>
        <Accordion type="single" collapsible>
          <AccordionItem value="a">
            <AccordionTrigger>Chevron</AccordionTrigger>
            <AccordionContent>Body</AccordionContent>
          </AccordionItem>
        </Accordion>
        <Accordion type="single" collapsible>
          <AccordionItem value="b">
            <AccordionTrigger icon="plus">Plus</AccordionTrigger>
            <AccordionContent>Body</AccordionContent>
          </AccordionItem>
        </Accordion>
      </>
    );
    const chevron = container.querySelector("button svg")!;
    expect(classTokens(chevron)).toContain("chevron-turn");
    expect(chevron.getAttribute("class")).toMatch(/group-data-\[state=open\]:rotate-180/);
    const bar = [...container.querySelectorAll("button span span")].find((s) => classTokens(s).includes("chevron-turn"));
    expect(bar).toBeTruthy();
    for (const el of [chevron, bar!]) {
      expect(el.getAttribute("class")).not.toMatch(/transition-transform|duration-|ease-/);
    }
  });

  it("the select trigger icon turns with chevron-turn", () => {
    const { container } = render(
      <Select>
        <SelectTrigger aria-label="Pick">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    const icon = container.querySelector("button svg")!;
    expect(classTokens(icon)).toContain("chevron-turn");
    expect(icon.getAttribute("class")).not.toMatch(/transition-transform|duration-/);
  });

  it("every state-driven rotation in primitives goes through chevron-turn (fab's dial spring is the one exception)", () => {
    const offenders: string[] = [];
    for (const { file, text } of primitives) {
      for (const literal of text.match(/"[^"\n]*"/g) ?? []) {
        if (/group-data-\[state=open\][^\s"]*:rotate-(90|180)/.test(literal) && !/\bchevron-turn\b/.test(literal)) offenders.push(`${file}: ${literal}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Avatar image                                                        */
/* ------------------------------------------------------------------ */

describe("AvatarImage", () => {
  const RealImage = window.Image;
  afterEach(() => {
    window.Image = RealImage;
  });

  it("fades in once it has loaded", async () => {
    // jsdom never loads images: make every one load right away so Radix mounts the <img>.
    class LoadingImage extends EventTarget {
      complete = false;
      naturalWidth = 0;
      set src(_: string) {
        queueMicrotask(() => {
          this.complete = true;
          this.naturalWidth = 64;
          this.dispatchEvent(new Event("load"));
        });
      }
    }
    window.Image = LoadingImage as unknown as typeof Image;
    render(
      <Avatar name="Ada Lovelace">
        <AvatarImage src="/ada.png" alt="Ada" />
      </Avatar>
    );
    const img = await screen.findByAltText("Ada");
    expect(classTokens(img)).toContain("animate-fade-in");
  });
});

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/* ------------------------------------------------------------------ */

describe("StatusBadge and StatusDot", () => {
  it("fade their colour when the tone changes", () => {
    const { container, rerender } = render(<StatusBadge status="success" />);
    const root = container.firstElementChild!;
    expect(classTokens(root)).toContain("transition-colors");
    // pill > StatusDot > dot
    expect(classTokens(root.querySelector("span span span"))).toContain("transition-colors");
    rerender(<StatusBadge status="error" />);
    expect(classTokens(container.firstElementChild)).toContain("transition-colors");

    const dot = render(<StatusDot status="success" label="ok" />).container.firstElementChild!;
    expect(classTokens(dot.firstElementChild)).toContain("transition-colors");
    const glyph = render(<StatusDot status="success" label="ok" icon={<svg />} />).container.firstElementChild!;
    expect(classTokens(glyph)).toContain("transition-colors");
  });

  it("pops a custom icon when the status changes, never on the first render", () => {
    const { container, rerender } = render(<StatusBadge status="pending" icon={<svg data-testid="icon" />} />);
    const wrap = () => screen.getByTestId("icon").parentElement!;
    expect(classTokens(wrap())).not.toContain("animate-pop");
    const first = wrap();

    rerender(<StatusBadge status="pending" icon={<svg data-testid="icon" />} label="Still pending" />);
    expect(classTokens(wrap())).not.toContain("animate-pop");
    expect(wrap()).toBe(first);

    rerender(<StatusBadge status="success" icon={<svg data-testid="icon" />} />);
    expect(classTokens(wrap())).toContain("animate-pop");
    // A new key: the wrapper is a new element, so the animation plays from the start.
    expect(wrap()).not.toBe(first);
    expect(container.querySelectorAll(".animate-pop")).toHaveLength(1);

    // A second change replaces it again.
    const second = wrap();
    rerender(<StatusBadge status="error" icon={<svg data-testid="icon" />} />);
    expect(wrap()).not.toBe(second);
    expect(classTokens(wrap())).toContain("animate-pop");
  });

  it("does not pop the default dot or a plain badge when nothing but the status changes", () => {
    const { container, rerender } = render(<StatusBadge status="pending" />);
    rerender(<StatusBadge status="success" />);
    expect(container.querySelector(".animate-pop")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Combobox chips                                                      */
/* ------------------------------------------------------------------ */

describe("Combobox chips", () => {
  const options: ComboboxOption[] = [
    { value: "a", label: "Apple" },
    { value: "b", label: "Banana" },
    { value: "c", label: "Cherry" },
  ];
  const chip = (label: string) => screen.getByText(label).closest("span.inline-flex")!;
  const animates = (el: Element) => classTokens(el).includes("motion-safe:animate-in");

  it("only a chip that was just added eases in; chips present on mount do not", () => {
    const { rerender } = render(<Combobox multiple aria-label="Fruits" options={options} value={["a", "b"]} onValueChange={() => {}} />);
    expect(animates(chip("Apple"))).toBe(false);
    expect(animates(chip("Banana"))).toBe(false);

    rerender(<Combobox multiple aria-label="Fruits" options={options} value={["a", "b", "c"]} onValueChange={() => {}} />);
    expect(animates(chip("Cherry"))).toBe(true);
    expect(classTokens(chip("Cherry"))).toEqual(expect.arrayContaining(["motion-safe:fade-in-0", "motion-safe:zoom-in-95", "motion-safe:duration-150"]));
    expect(animates(chip("Apple"))).toBe(false);

    // Removing a chip animates nothing, and the new chip keeps its class across unrelated renders (no replay).
    rerender(<Combobox multiple aria-label="Fruits" options={options} value={["a", "c"]} onValueChange={() => {}} />);
    expect(screen.queryByText("Banana")).toBeNull();
    expect(animates(chip("Apple"))).toBe(false);
    expect(animates(chip("Cherry"))).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Empty state, skeletons, progress, rating                            */
/* ------------------------------------------------------------------ */

describe("EmptyState", () => {
  it("rises in when it appears", () => {
    const { container } = render(<EmptyState title="Nothing here" />);
    expect(classTokens(container.querySelector("section"))).toContain("animate-fade-up");
  });
});

describe("Table loading rows", () => {
  const columns: DataTableColumn<{ id: string; name: string }>[] = [
    { key: "id", header: "ID" },
    { key: "name", header: "Name" },
  ];

  it("use the shared shimmer Skeleton, not a raw pulse", () => {
    const { container } = render(<DataTable columns={columns} data={[]} loading loadingRows={3} />);
    expect(container.querySelectorAll(".animate-shimmer")).toHaveLength(3 * columns.length);
    expect(container.querySelector(".animate-pulse")).toBeNull();
    for (const el of container.querySelectorAll(".animate-shimmer")) {
      expect(classTokens(el)).toContain("motion-reduce:animate-none");
      expect(el.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("selectable tables get a skeleton checkbox cell too", () => {
    const { container } = render(<DataTable columns={columns} data={[]} loading loadingRows={2} selectable />);
    expect(container.querySelectorAll(".animate-shimmer")).toHaveLength(2 * (columns.length + 1));
  });
});

describe("Skeleton", () => {
  it("guards its shimmer in the same class string and keeps the class tests select", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild!;
    expect(classTokens(el)).toEqual(expect.arrayContaining(["animate-shimmer", "motion-reduce:animate-none"]));
  });
});

describe("value fills", () => {
  it("the ring fills on the 500 ms scale (no 700) and stops its transition under reduced motion", () => {
    const { container } = render(<ProgressCircle value={40} />);
    const fill = container.querySelectorAll("circle")[1]!;
    expect(classTokens(fill)).toEqual(expect.arrayContaining(["duration-500", "motion-reduce:transition-none"]));
    expect(classTokens(fill)).not.toContain("duration-700");
  });

  it("the rating star fill follows the 150 ms speed", () => {
    const { container } = render(<Rating value={3.5} />);
    const fills = [...container.querySelectorAll("span")].filter((s) => classTokens(s).includes("transition-[width]"));
    expect(fills.length).toBeGreaterThan(0);
    for (const el of fills) expect(classTokens(el)).toContain("duration-150");
  });

  it("no primitive uses a duration off the scale", () => {
    const offenders = primitives.flatMap(({ file, text }) => [...text.matchAll(/(?<![\w-])duration-(\d+)(?![\w-])/g)].filter((m) => ![75, 150, 200, 300, 500, 1000].includes(Number(m[1]))).map((m) => `${file}: ${m[0]}`));
    expect(offenders).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* AlertBanner keeps unmounting on animationend                        */
/* ------------------------------------------------------------------ */

describe("AlertBanner", () => {
  it("leaves through animate-out and unmounts on animationend (never animation: none)", () => {
    const onDismiss = vi.fn();
    render(<AlertBanner dismissible onDismiss={onDismiss} message="Heads up" />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss|close/i }));
    const banner = screen.getByRole("region");
    expect(banner).toHaveAttribute("data-state", "closed");
    expect(banner.getAttribute("class")).toContain("animate-out");
    expect(banner.getAttribute("class")).not.toMatch(/animate-none|animation:\s*none/);
    fireEvent.animationEnd(banner);
    expect(screen.queryByText("Heads up")).toBeNull();
  });
});
