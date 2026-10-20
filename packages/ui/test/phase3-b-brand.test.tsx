import { render, screen } from "@testing-library/react";
import {
  SutraAppIcon,
  SutraLogo,
  SutraMark,
  SutraWordmark,
  sutraAppMeta,
  sutraApps,
  type SutraMarkVariant,
} from "../src/assets/brand";
import { axeViolations } from "./a11y";

const all: SutraMarkVariant[] = ["glyph", "tile", "reversed", "solid", "outline", "badge"];

const svgOf = (container: HTMLElement) => container.querySelector("svg")!;
const beadOf = (svg: SVGSVGElement) => svg.querySelector("g")!;
const shapesOf = (svg: SVGSVGElement) => Array.from(beadOf(svg).querySelectorAll("path")).map((p) => p.getAttribute("d"));

/* The crescent mark (design/brand/crescent.mjs, review option L10, 2026-10-21) replaced the Bead, which had replaced the
   thread-S: these tests pin the drawing and keep the intents of the old ones (flat theme-following tile, heavy frame inside the
   box, one accessible name, unique ids, axe). */

/** Every number in the mark's path data (coordinates and radii). */
const numbersOf = (svg: SVGSVGElement) =>
  shapesOf(svg)
    .join(" ")
    .match(/-?\d+(\.\d+)?/g)!
    .map(Number);

describe("SutraMark glyph (default, ink on paper)", () => {
  it("is the crescent bead and its thread alone in currentColor: no tile, no gradient, no defs", () => {
    const svg = svgOf(render(<SutraMark />).container);
    expect(svg).toHaveAttribute("viewBox", "0 0 64 64");
    expect(svg).toHaveAttribute("width", "32");
    expect(svg.querySelector("rect")).toBeNull();
    expect(svg.querySelector("defs")).toBeNull();
    expect(svg.querySelector("linearGradient")).toBeNull();
    expect(beadOf(svg).getAttribute("fill")).toBe("currentColor");
    expect(shapesOf(svg)).toHaveLength(3);
  });

  it("fills the height of its box with no transform, and stays inside it", () => {
    const svg = svgOf(render(<SutraMark />).container);
    expect(beadOf(svg).getAttribute("transform")).toBeNull();
    for (const v of numbersOf(svg)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(64);
    }
  });

  it("is upright: the crescent and two pieces of one vertical thread, the thread centred on the box", () => {
    const [bead, above, below] = shapesOf(svgOf(render(<SutraMark />).container));
    // The two thread pieces share the same left edge (x 29.8) and width (4.4), centred on x 32.
    expect(above).toMatch(/^M29\.8 /);
    expect(below).toMatch(/^M29\.8 /);
    expect(above).toContain("34.2");
    expect(below).toContain("34.2");
    // The crescent is a disc arc and an oval (two radii) arc: the bite that makes the horns.
    expect(bead).toMatch(/A17 17 0 1 0 .*A8\.5 13 0 1 1 /);
  });

  it("the drawn glyph is taller than the tile drawing", () => {
    const span = (variant: SutraMarkVariant) => {
      const [, above, below] = shapesOf(svgOf(render(<SutraMark variant={variant} />).container));
      const top = Number(above!.match(/^M[\d.]+ ([\d.]+)/)![1]);
      const bottom = Number(below!.match(/V([\d.]+)A/)![1]);
      return bottom - top;
    };
    expect(span("glyph")).toBeGreaterThan(span("tile"));
  });

  it("follows the text colour", () => {
    const { container } = render(<SutraMark className="text-destructive" />);
    expect(container.innerHTML).toContain("currentColor");
  });
});

describe("SutraMark tiles", () => {
  it("tile is ink on a paper tile with a hairline edge, in literal colours", () => {
    const { container } = render(<SutraMark variant="tile" />);
    const svg = svgOf(container);
    const rects = svg.querySelectorAll("rect");
    expect(rects).toHaveLength(2);
    expect(rects[0].getAttribute("fill")).toBe("#f7f5f0");
    expect(rects[1].getAttribute("stroke")).toBe("#1c1915");
    expect(beadOf(svg).getAttribute("fill")).toBe("#1c1915");
    expect(beadOf(svg).getAttribute("transform")).toBeNull();
    expect(container.innerHTML).not.toContain("currentColor");
  });

  it("reversed is a paper bead on an ink tile", () => {
    const { container } = render(<SutraMark variant="reversed" />);
    const svg = svgOf(container);
    expect(svg.querySelectorAll("rect")).toHaveLength(1);
    expect(svg.querySelector("rect")!.getAttribute("fill")).toBe("#1c1915");
    expect(beadOf(svg).getAttribute("fill")).toBe("#f7f5f0");
  });

  it("solid is a flat tile in --primary with a --primary-foreground bead, with no gradient or shine", () => {
    const { container } = render(<SutraMark variant="solid" />);
    const svg = svgOf(container);
    expect(svg.querySelector("linearGradient")).toBeNull();
    expect(svg.querySelector("defs")).toBeNull();
    expect(svg.querySelectorAll("rect")).toHaveLength(1);
    expect(svg.querySelector("rect")!.getAttribute("fill")).toMatch(/^var\(--primary,/);
    expect(beadOf(svg).getAttribute("fill")).toMatch(/^var\(--primary-foreground,/);
  });

  it("solid does not depend on the text colour", () => {
    const { container } = render(<SutraMark variant="solid" className="text-destructive" />);
    expect(container.innerHTML).not.toContain("currentColor");
  });

  it("the tile variants share one bold drawing, the glyph and outline one fine drawing", () => {
    const shapes = (variant: SutraMarkVariant) => shapesOf(svgOf(render(<SutraMark variant={variant} />).container));
    expect(shapes("tile")).toEqual(shapes("reversed"));
    expect(shapes("tile")).toEqual(shapes("solid"));
    expect(shapes("tile")).toEqual(shapes("badge"));
    expect(shapes("glyph")).toEqual(shapes("outline"));
    expect(shapes("glyph")).not.toEqual(shapes("tile"));
  });
});

describe("SutraMark frames", () => {
  it("outline is a thin rounded-square frame in currentColor around the bead", () => {
    const svg = svgOf(render(<SutraMark variant="outline" />).container);
    const frame = svg.querySelector("rect")!;
    expect(svg.querySelectorAll("rect")).toHaveLength(1);
    expect(frame.getAttribute("stroke")).toBe("currentColor");
    expect(frame.getAttribute("stroke-width")).toBe("3.5");
    expect(frame.getAttribute("fill")).toBeNull();
    expect(beadOf(svg).getAttribute("fill")).toBe("currentColor");
  });

  it("badge is a heavy rounded-square outline in currentColor around a bold bead", () => {
    const svg = svgOf(render(<SutraMark variant="badge" />).container);
    const frame = svg.querySelector("rect")!;
    expect(svg.querySelectorAll("rect")).toHaveLength(1);
    expect(frame.getAttribute("stroke")).toBe("currentColor");
    expect(Number(frame.getAttribute("stroke-width"))).toBeGreaterThanOrEqual(5);
    expect(frame.getAttribute("fill")).toBeNull();
    expect(beadOf(svg).getAttribute("fill")).toBe("currentColor");
    expect(svg.querySelector("linearGradient")).toBeNull();
  });

  it("badge is bolder than outline in the frame", () => {
    const outline = svgOf(render(<SutraMark variant="outline" />).container);
    const badge = svgOf(render(<SutraMark variant="badge" />).container);
    const width = (svg: SVGSVGElement) => Number(svg.querySelector("rect")!.getAttribute("stroke-width"));
    expect(width(badge)).toBeGreaterThan(width(outline));
  });

  it.each(["outline", "badge"] as const)("%s keeps its frame inside the 64 box", (variant) => {
    const frame = svgOf(render(<SutraMark variant={variant} />).container).querySelector("rect")!;
    const half = Number(frame.getAttribute("stroke-width")) / 2;
    expect(Number(frame.getAttribute("x")) - half).toBeGreaterThanOrEqual(0);
    expect(Number(frame.getAttribute("x")) + Number(frame.getAttribute("width")) + half).toBeLessThanOrEqual(64);
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
    // One mark; the only other graphic is the drawn wordmark.
    expect(container.querySelectorAll("svg:not([data-slot='sutra-wordmark'])")).toHaveLength(1);
  });

  it("the logo leads with the glyph by default", () => {
    render(<SutraLogo />);
    const mark = screen.getByRole("img", { name: "Sutra" }).querySelector("svg")!;
    expect(mark.querySelector("rect")).toBeNull();
    expect(beadOf(mark).getAttribute("fill")).toBe("currentColor");
  });

  it("ids stay unique when several marks render", () => {
    const { container } = render(
      <div>
        {all.map((variant) => (
          <SutraMark key={variant} variant={variant} title={variant} />
        ))}
        <SutraMark />
        <SutraWordmark gradient />
        <SutraWordmark gradient />
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
        <SutraAppIcon app="notes" title="Notes" />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("intro", () => {
  it("is off by default: no data-intro on the mark or the logo", () => {
    const { container } = render(<SutraLogo />);
    expect(container.querySelector("[data-intro]")).toBeNull();
    expect(svgOf(render(<SutraMark />).container)).toHaveAttribute("data-slot", "sutra-mark");
  });

  it("marks the mark and names its three moving parts", () => {
    const svg = svgOf(render(<SutraMark intro />).container);
    expect(svg).toHaveAttribute("data-intro", "");
    expect(Array.from(svg.querySelectorAll("[data-part]")).map((p) => p.getAttribute("data-part"))).toEqual([
      "bead",
      "thread-above",
      "thread-below",
    ]);
  });

  it("SutraLogo passes it to the mark and lets the drawn wordmark write itself (pathLength 1)", () => {
    const { container } = render(<SutraLogo intro />);
    const logo = screen.getByRole("img", { name: "Sutra" });
    expect(logo).toHaveAttribute("data-slot", "sutra-logo");
    expect(logo).toHaveAttribute("data-intro", "");
    expect(container.querySelector('[data-slot="sutra-mark"]')).toHaveAttribute("data-intro", "");
    expect(container.querySelector('[data-slot="sutra-wordmark"] path')).toHaveAttribute("pathLength", "1");
  });
});

describe("SutraWordmark", () => {
  it("is the drawn word by default: a monoline path in currentColor with real text for screen readers", () => {
    const { container } = render(<SutraWordmark />);
    const svg = container.querySelector("svg[data-slot='sutra-wordmark']")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg.querySelector("path")!.getAttribute("stroke")).toBe("currentColor");
    expect(screen.getByText("sutra")).toHaveClass("sr-only");
  });

  it("sets custom text in the brand sans when given children", () => {
    const { container } = render(<SutraWordmark>sutra notes</SutraWordmark>);
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByText("sutra notes")).toBeInTheDocument();
  });

  it("paints the stroke with a brand gradient when asked", () => {
    const { container } = render(<SutraWordmark gradient />);
    const gradient = container.querySelector("linearGradient")!;
    expect(container.querySelector("path")!.getAttribute("stroke")).toBe(`url(#${gradient.id})`);
  });

  it("scales with the size class through em units", () => {
    const { container } = render(<SutraWordmark size="xl" />);
    expect(container.firstElementChild).toHaveClass("text-display-xs");
    expect(container.querySelector("svg")!.style.height).toBe("0.7em");
  });
});

describe("SutraAppIcon tones", () => {
  it("is mono by default: ink bead and thread on a paper tile, a paper pictogram", () => {
    const { container } = render(<SutraAppIcon app="mail" />);
    const svg = svgOf(container);
    expect(svg).toHaveAttribute("viewBox", "0 0 64 64");
    expect(svg.querySelector("rect")!.getAttribute("fill")).toBe("#f7f5f0");
    expect(svg.querySelector("circle")!.getAttribute("fill")).toBe("#1c1915");
    expect(svg.querySelectorAll("rect")[2].getAttribute("fill")).toBe("#1c1915");
    expect(svg.querySelector("g")!.getAttribute("stroke")).toBe("#f7f5f0");
    expect(container.innerHTML).not.toContain("linearGradient");
  });

  it("reversed is paper on an ink tile", () => {
    const svg = svgOf(render(<SutraAppIcon app="mail" tone="reversed" />).container);
    expect(svg.querySelector("rect")!.getAttribute("fill")).toBe("#1c1915");
    expect(svg.querySelector("circle")!.getAttribute("fill")).toBe("#f7f5f0");
    expect(svg.querySelector("g")!.getAttribute("stroke")).toBe("#1c1915");
    expect(svg.querySelectorAll("rect")).toHaveLength(2);
  });

  it("dyed keeps the paper tile and ink thread but dyes the bead in the app's own colour", () => {
    for (const app of sutraApps) {
      const svg = svgOf(render(<SutraAppIcon app={app} tone="dyed" />).container);
      expect(svg.querySelector("circle")!.getAttribute("fill")).toBe(sutraAppMeta[app].dye);
      expect(svg.querySelector("rect")!.getAttribute("fill")).toBe("#f7f5f0");
    }
  });

  it("gives every app a hex dye, and the dyes are all different", () => {
    const dyes = sutraApps.map((app) => sutraAppMeta[app].dye);
    for (const dye of dyes) expect(dye).toMatch(/^#[0-9a-f]{6}$/);
    expect(new Set(dyes).size).toBe(sutraApps.length);
  });

  it("draws a different pictogram for every app", () => {
    const drawings = sutraApps.map((app) => svgOf(render(<SutraAppIcon app={app} />).container).querySelector("g")!.innerHTML);
    expect(new Set(drawings).size).toBe(sutraApps.length);
  });

  it("the thread runs the full width of the tile so a row of icons reads as one string", () => {
    const svg = svgOf(render(<SutraAppIcon app="files" />).container);
    const thread = svg.querySelectorAll("rect")[2];
    expect(thread.getAttribute("width")).toBe("64");
  });

  it.each(["rounded", "squircle", "circle"] as const)("%s shape rounds the tile and its hairline together", (shape) => {
    const svg = svgOf(render(<SutraAppIcon app="tasks" shape={shape} />).container);
    const [tile, edge] = Array.from(svg.querySelectorAll("rect"));
    expect(Number(edge.getAttribute("rx"))).toBeCloseTo(Number(tile.getAttribute("rx")) - 0.5);
    expect(Number(tile.getAttribute("rx"))).toBe({ rounded: 14.3, squircle: 19, circle: 32 }[shape]);
  });

  it("keeps the older gradient pair that the data-app accents follow", () => {
    expect(sutraAppMeta.tasks).toMatchObject({ name: "Tasks", from: "#7c86ff", to: "#4f39f6" });
  });

  it("has no axe violations in any tone", async () => {
    const { container } = render(
      <div>
        {sutraApps.map((app) => (
          <SutraAppIcon key={app} app={app} title={sutraAppMeta[app].name} />
        ))}
        <SutraAppIcon app="notes" tone="dyed" title="Notes dyed" />
        <SutraAppIcon app="notes" tone="reversed" title="Notes reversed" />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
