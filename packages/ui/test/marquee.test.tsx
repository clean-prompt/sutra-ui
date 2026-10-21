import * as React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Marquee } from "../src/assets/marquee";
import { AcmeLogo, LogoCloud, placeholderLogos } from "../src/assets/placeholder-logos";
import { axeViolations } from "./helpers/a11y";

const track = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-slot="marquee-track"]')!;
const lists = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('[data-slot="marquee-list"]')];

/** Pretend the marquee root is `root` px wide and one copy of the items is `copy` px wide. */
function mockWidths(root: number, copy: number) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const slot = this.getAttribute("data-slot");
    const width = slot === "marquee" ? root : slot === "marquee-list" ? copy : 0;
    return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  });
}

afterEach(() => vi.restoreAllMocks());

describe("Marquee", () => {
  it("repeats the items once and hides the repeat from assistive tech", () => {
    const { container } = render(
      <Marquee label="Formats">
        <span>PDF</span>
        <span>PNG</span>
        <span>ZIP</span>
      </Marquee>
    );
    const [first, second, ...rest] = lists(container);
    expect(rest).toHaveLength(0);
    expect(first).not.toHaveAttribute("aria-hidden");
    expect(second).toHaveAttribute("aria-hidden", "true");
    expect(second).toHaveAttribute("inert");
    expect(screen.getByRole("list", { name: "Formats" })).toBe(first);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByRole("listitem", { hidden: true })).toHaveLength(6);
  });

  it("wraps each child in a list item with itemClassName and ignores empty children", () => {
    const { container } = render(
      <Marquee itemClassName="chip">
        {false}
        <span>A</span>
        {null}
        {["B", "C"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </Marquee>
    );
    const items = [...lists(container)[0]!.children];
    expect(items.map((li) => li.textContent)).toEqual(["A", "B", "C"]);
    expect(items.every((li) => li.tagName === "LI" && li.classList.contains("chip"))).toBe(true);
  });

  it("sets the loop duration, direction and gap on the track", () => {
    const { container, rerender } = render(<Marquee duration={12}>x</Marquee>);
    expect(track(container).style.animationDuration).toBe("12s");
    expect(track(container).style.animationDirection).toBe("normal");
    expect(track(container).className).toContain("animate-marquee");
    expect(container.firstElementChild).toHaveStyle({ "--sutra-marquee-gap": "3rem" });
    rerender(
      <Marquee duration={50} reverse gap={20}>
        x
      </Marquee>
    );
    expect(track(container).style.animationDuration).toBe("50s");
    expect(track(container).style.animationDirection).toBe("reverse");
    expect(container.firstElementChild).toHaveStyle({ "--sutra-marquee-gap": "20px" });
    rerender(<Marquee gap="1.5rem">x</Marquee>);
    expect(container.firstElementChild).toHaveStyle({ "--sutra-marquee-gap": "1.5rem" });
  });

  it("falls back to 30 seconds for a bad duration", () => {
    const { container } = render(<Marquee duration={0}>x</Marquee>);
    expect(track(container).style.animationDuration).toBe("30s");
  });

  it("pauses on hover and focus by default, and can opt out", () => {
    const { container, rerender } = render(<Marquee>x</Marquee>);
    expect(container.firstElementChild).toHaveAttribute("data-pause-on-hover", "true");
    expect(track(container).className).toContain("group-hover/marquee:[animation-play-state:paused]");
    expect(track(container).className).toContain("group-focus-within/marquee:[animation-play-state:paused]");
    rerender(<Marquee pauseOnHover={false}>x</Marquee>);
    expect(container.firstElementChild).toHaveAttribute("data-pause-on-hover", "false");
    expect(track(container).className).not.toContain("animation-play-state");
  });

  it("fades the edges unless told not to", () => {
    const { container, rerender } = render(<Marquee>x</Marquee>);
    expect(container.firstElementChild!.className).toContain("mask-image");
    rerender(<Marquee fade={false}>x</Marquee>);
    expect(container.firstElementChild!.className).not.toContain("mask-image");
  });

  it("stands still, wrapped, without the repeat under reduced motion (classes)", () => {
    const { container } = render(
      <Marquee>
        <span>A</span>
      </Marquee>
    );
    const [first, second] = lists(container);
    expect(track(container).className).toContain("motion-reduce:animate-none");
    expect(track(container).className).toContain("motion-reduce:w-full");
    expect(first!.className).toContain("motion-reduce:flex-wrap");
    expect(first!.className).toContain("motion-reduce:shrink");
    expect(second!.className).toContain("motion-reduce:hidden");
    expect(first!.className).not.toContain("motion-reduce:hidden");
    expect(container.firstElementChild!.className).toContain("motion-reduce:[mask-image:none]");
  });

  it("repeats the items as often as the width needs", () => {
    mockWidths(900, 300);
    const { container } = render(
      <Marquee>
        <span>A</span>
        <span>B</span>
      </Marquee>
    );
    // 900 / 300 = 3 copies in view, plus one that scrolls in.
    expect(lists(container)).toHaveLength(4);
    expect(container.firstElementChild).toHaveStyle({ "--sutra-marquee-copies": "4" });
    expect(lists(container).slice(1).every((l) => l.getAttribute("aria-hidden") === "true")).toBe(true);
  });

  it("keeps at least two copies, and stops at ten", () => {
    mockWidths(100, 400);
    const small = render(<Marquee>x</Marquee>);
    expect(lists(small.container)).toHaveLength(2);
    small.unmount();
    mockWidths(5000, 50);
    const wide = render(<Marquee>x</Marquee>);
    expect(lists(wide.container)).toHaveLength(10);
  });

  it("forwards the ref, className and props to the root", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Marquee ref={ref} className="extra" data-testid="m">
        x
      </Marquee>
    );
    expect(ref.current).toBe(screen.getByTestId("m"));
    expect(ref.current).toHaveClass("extra", "overflow-hidden");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Marquee label="Formats">
        <span>PDF</span>
        <span>PNG</span>
      </Marquee>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("LogoCloud marquee mode builds on Marquee", () => {
  it("renders the logos twice, the repeat hidden, as before", () => {
    const { container } = render(<LogoCloud marquee limit={3} title="Trusted by" />);
    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.getAllByRole("img", { hidden: true })).toHaveLength(6);
    expect(lists(container)).toHaveLength(2);
    expect(lists(container)[1]).toHaveAttribute("aria-hidden", "true");
  });

  it("passes duration, reverse and pauseOnHover through", () => {
    const { container } = render(<LogoCloud marquee limit={3} duration={45} reverse pauseOnHover={false} />);
    expect(track(container).style.animationDuration).toBe("45s");
    expect(track(container).style.animationDirection).toBe("reverse");
    expect(container.querySelector('[data-slot="marquee"]')).toHaveAttribute("data-pause-on-hover", "false");
  });

  it("keeps the logo spacing (3rem) and the muted item style", () => {
    const { container } = render(<LogoCloud marquee limit={2} />);
    expect(container.querySelector('[data-slot="marquee"]')).toHaveStyle({ "--sutra-marquee-gap": "3rem" });
    const item = container.querySelector('[data-slot="marquee-item"]')!;
    expect(item.className).toContain("grayscale");
    expect(item.className).toContain("text-muted-foreground");
  });

  it("repeats all supplied logos, not just the first few", () => {
    const logos = placeholderLogos.slice(0, 5);
    render(<LogoCloud marquee logos={logos} />);
    for (const { name } of logos) expect(screen.getAllByRole("img", { name, hidden: true })).toHaveLength(2);
  });

  it("still renders the grid when not a marquee", () => {
    const { container } = render(<LogoCloud limit={4} />);
    expect(container.querySelector('[data-slot="marquee"]')).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("works with any logo component as a Marquee child", () => {
    render(
      <Marquee>
        <AcmeLogo />
      </Marquee>
    );
    expect(screen.getByRole("img", { name: "Acme" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<LogoCloud marquee limit={4} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
