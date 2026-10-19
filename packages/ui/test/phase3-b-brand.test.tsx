import { render, screen } from "@testing-library/react";
import { SutraLogo, SutraMark, SutraWordmark, type SutraMarkVariant } from "../src/assets/brand";
import { axeViolations } from "./a11y";

const all: SutraMarkVariant[] = ["tile", "glyph", "outline", "solid", "badge"];

const svgOf = (container: HTMLElement) => container.querySelector("svg")!;

describe("SutraMark solid", () => {
  it("is a flat tile in --primary with a --primary-foreground thread, with no gradient or shine", () => {
    const { container } = render(<SutraMark variant="solid" />);
    const svg = svgOf(container);
    expect(svg.querySelector("linearGradient")).toBeNull();
    expect(svg.querySelector("defs")).toBeNull();
    const tile = svg.querySelector("rect")!;
    expect(tile.getAttribute("fill")).toMatch(/^var\(--primary,/);
    expect(svg.querySelectorAll("rect")).toHaveLength(1);
    expect(svg.querySelector("g")!.getAttribute("stroke")).toMatch(/^var\(--primary-foreground,/);
    expect(svg.querySelector("circle")!.getAttribute("fill")).toMatch(/^var\(--primary-foreground,/);
  });

  it("does not depend on the text colour", () => {
    const { container } = render(<SutraMark variant="solid" className="text-destructive" />);
    expect(container.innerHTML).not.toContain("currentColor");
  });
});

describe("SutraMark badge", () => {
  it("is a heavy rounded-square outline in currentColor around the thread", () => {
    const { container } = render(<SutraMark variant="badge" />);
    const svg = svgOf(container);
    const frame = svg.querySelector("rect")!;
    expect(svg.querySelectorAll("rect")).toHaveLength(1);
    expect(frame.getAttribute("stroke")).toBe("currentColor");
    expect(Number(frame.getAttribute("stroke-width"))).toBeGreaterThanOrEqual(3);
    expect(frame.getAttribute("fill")).toBeNull();
    expect(svg.querySelector("g")!.getAttribute("stroke")).toBe("currentColor");
    expect(svg.querySelector("linearGradient")).toBeNull();
  });

  it("is bolder than outline, in the frame and in the thread", () => {
    const outline = svgOf(render(<SutraMark variant="outline" />).container);
    const badge = svgOf(render(<SutraMark variant="badge" />).container);
    const stroke = (svg: SVGSVGElement, selector: string) => Number(svg.querySelector(selector)!.getAttribute("stroke-width"));
    expect(stroke(badge, "rect")).toBeGreaterThan(stroke(outline, "rect"));
    expect(stroke(badge, "g")).toBeGreaterThan(stroke(outline, "g"));
  });

  it("keeps the frame inside the 32 box", () => {
    const frame = svgOf(render(<SutraMark variant="badge" />).container).querySelector("rect")!;
    const half = Number(frame.getAttribute("stroke-width")) / 2;
    expect(Number(frame.getAttribute("x")) - half).toBeGreaterThanOrEqual(0);
    expect(Number(frame.getAttribute("x")) + Number(frame.getAttribute("width")) + half).toBeLessThanOrEqual(32);
  });
});

describe("SutraMark existing variants", () => {
  it("tile keeps its gradient, shine and white thread", () => {
    const svg = svgOf(render(<SutraMark />).container);
    expect(svg.querySelectorAll("linearGradient")).toHaveLength(2);
    expect(svg.querySelectorAll("rect")).toHaveLength(3);
    const thread = svg.querySelector("g")!;
    expect(thread.getAttribute("stroke")).toBe("#ffffff");
    expect(thread.getAttribute("stroke-width")).toBe("2.2");
    expect(thread.getAttribute("transform")).toBeNull();
  });

  it("glyph keeps its scaled, heavier thread and no tile", () => {
    const svg = svgOf(render(<SutraMark variant="glyph" />).container);
    expect(svg.querySelector("rect")).toBeNull();
    const thread = svg.querySelector("g")!;
    expect(thread.getAttribute("stroke")).toBe("currentColor");
    expect(thread.getAttribute("stroke-width")).toBe("2.6");
    expect(thread.getAttribute("transform")).toBe("translate(16 16) scale(1.22) translate(-16 -16)");
    expect(svg.querySelector("circle")!.getAttribute("transform")).toBe(thread.getAttribute("transform"));
  });

  it("outline keeps its thin frame", () => {
    const svg = svgOf(render(<SutraMark variant="outline" />).container);
    const frame = svg.querySelector("rect")!;
    expect(frame.getAttribute("stroke-width")).toBe("1.75");
    expect(svg.querySelector("g")!.getAttribute("stroke-width")).toBe("2.2");
  });

  it("defaults to the tile at 32 px", () => {
    const svg = svgOf(render(<SutraMark />).container);
    expect(svg).toHaveAttribute("width", "32");
    expect(svg.querySelector("linearGradient")).not.toBeNull();
  });
});

describe("SutraMark and SutraLogo, every variant", () => {
  it.each(all)("%s is decorative by default and named with a title", (variant) => {
    const { container, rerender } = render(<SutraMark variant={variant} />);
    expect(svgOf(container)).toHaveAttribute("aria-hidden", "true");
    rerender(<SutraMark variant={variant} title={`Mark ${variant}`} size={96} />);
    expect(screen.getByRole("img", { name: `Mark ${variant}` })).toHaveAttribute("width", "96");
  });

  it.each(all)("SutraLogo passes %s to the mark and keeps one accessible name", (variant) => {
    const direct = render(<SutraMark variant={variant} />).container.innerHTML.replace(/sutra-mark-[\w-]+/g, "ID");
    const { container } = render(<SutraLogo markVariant={variant} product="files" />);
    const logo = screen.getByRole("img", { name: "Sutra files" });
    const mark = logo.querySelector("svg")!;
    expect(mark).toHaveAttribute("aria-hidden", "true");
    // Same drawing as the standalone mark (the logo scales it, so compare the shapes only).
    const strip = (html: string) => html.replace(/ (width|height|class)="[^"]*"/g, "").replace(/sutra-mark-[\w-]+/g, "ID");
    expect(strip(mark.outerHTML)).toBe(strip(direct));
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("ids stay unique when several marks render", () => {
    const { container } = render(
      <div>
        {all.map((variant) => (
          <SutraMark key={variant} variant={variant} title={variant} />
        ))}
        <SutraMark />
      </div>
    );
    const ids = Array.from(container.querySelectorAll("[id]")).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        {all.map((variant) => (
          <SutraMark key={variant} variant={variant} title={`Mark ${variant}`} />
        ))}
        <SutraLogo markVariant="solid" product="files" />
        <SutraLogo markVariant="badge" layout="stacked" />
        <SutraWordmark />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
