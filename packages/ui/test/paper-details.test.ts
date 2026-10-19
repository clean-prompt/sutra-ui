import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cn } from "../src/lib/cn";
import { radii, typography } from "../src/lib/tokens";
import { buttonVariants } from "../src/primitives/button";
import { dialogContentVariants, sheetContentVariants } from "../src/primitives/dialog";
import { headingVariants } from "../src/primitives/typography";

const STYLES = path.resolve(__dirname, "../src/styles");
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const sutraCss = strip(readFileSync(path.join(STYLES, "sutra.css"), "utf8"));
const paperCss = strip(readFileSync(path.join(STYLES, "paper.css"), "utf8"));

describe("action radius", () => {
  it("only large text buttons use it; icon and small buttons keep the control radius", () => {
    expect(cn(buttonVariants({ size: "xl" }))).toContain("rounded-action");
    expect(cn(buttonVariants({ size: "xl" }))).not.toContain("rounded-control");
    for (const size of ["xs", "sm", "md", "lg", "icon", "icon-xl"] as const) {
      expect(cn(buttonVariants({ size })), size).toContain("rounded-control");
      expect(cn(buttonVariants({ size })), size).not.toContain("rounded-action");
    }
  });

  it("merges with the other radius utilities", () => {
    expect(cn("rounded-control", "rounded-action")).toBe("rounded-action");
    expect(cn("rounded-action", "rounded-lg")).toBe("rounded-lg");
    expect(radii.action).toBe("var(--radius-action)");
  });

  it("falls back to the control radius in the stock theme and is a pill in paper", () => {
    expect(sutraCss).toMatch(/--radius-action:\s*var\(--sutra-radius-action,\s*var\(--sutra-radius-control\)\)/);
    expect(paperCss).toMatch(/--sutra-radius-action:\s*9999px/);
  });
});

describe("display-3xl", () => {
  it("is a theme size, a Heading size and known to cn", () => {
    expect(sutraCss).toMatch(/--text-display-3xl:\s*6\.875rem/);
    expect(typography.scale["display-3xl"].size).toBe("6.875rem");
    expect(headingVariants({ size: "display-3xl" })).toContain("lg:text-display-3xl");
    // Not mistaken for a colour, so it survives next to text-foreground and replaces other display sizes.
    expect(cn("text-foreground", "text-display-3xl")).toBe("text-foreground text-display-3xl");
    expect(cn("text-display-lg", "text-display-3xl")).toBe("text-display-3xl");
  });

  it("is tracked tighter in paper than in the stock theme", () => {
    expect(sutraCss).toMatch(/--text-display-3xl--letter-spacing:\s*-0\.04em/);
    expect(paperCss).toMatch(/--text-display-3xl--letter-spacing:\s*-0\.055em/);
  });
});

describe("dialog surface", () => {
  it("dialogs and sheets use bg-dialog, which merges like a colour", () => {
    expect(dialogContentVariants({ size: "sm" })).toContain("bg-dialog");
    expect(dialogContentVariants({ size: "sm" })).not.toContain("bg-background");
    expect(sheetContentVariants({ side: "right" })).toContain("bg-dialog");
    expect(cn("bg-dialog", "bg-card")).toBe("bg-card");
  });

  it("the stock theme declares --dialog in light AND dark (a var() chain would go stale in dark)", () => {
    const blocks = [...sutraCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1]!.split(";").pop()!.trim(), body: m[2]! }));
    const light = blocks.filter((b) => b.selector === ":root" && b.body.includes("--dialog:"));
    const dark = blocks.filter((b) => b.selector.startsWith(".dark") && b.body.includes("--dialog:"));
    expect(light).toHaveLength(1);
    expect(dark).toHaveLength(1);
    expect(sutraCss).toContain("--color-dialog: var(--dialog)");
  });

  it("paper lifts it onto the card surface", () => {
    expect(paperCss).toMatch(/--dialog:\s*#fcfbf9/);
    expect(paperCss).toMatch(/--dialog:\s*#0b0b0b/);
  });
});

describe("paper overlay motion", () => {
  it("names the side on every slide override", () => {
    const rules = [...paperCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => m[1]!.trim());
    const slides = rules.filter((r) => r.includes("slide-in-from"));
    expect(slides).toHaveLength(4);
    for (const r of slides) expect(r).toMatch(/\[data-side="(top|bottom|left|right)"\]/);
    // The side must be the opposite of the "from" edge (a popover below its trigger slides in from the top).
    expect(slides.find((r) => r.includes('"bottom"'))).toContain("slide-in-from-top-2");
    expect(slides.find((r) => r.includes('"top"'))).toContain("slide-in-from-bottom-2");
    expect(slides.find((r) => r.includes('"right"'))).toContain("slide-in-from-left-2");
    expect(slides.find((r) => r.includes('"left"'))).toContain("slide-in-from-right-2");
  });

  it("leaves elements with their own duration or ease class alone", () => {
    expect(paperCss).toMatch(/:not\(\[class\*="ease-"\]\)\s*\{\s*--tw-ease:/);
    expect(paperCss).toMatch(/:not\(\[class\*="duration-"\]\)\s*\{\s*--tw-duration:/);
  });

  it("the stock theme has entrance utilities that follow the shared ease", () => {
    for (const name of ["fade-in", "fade-up", "pop-in"]) {
      expect(sutraCss).toMatch(new RegExp(`--animate-${name}:\\s*sutra-${name} \\d+ms var\\(--ease-out-quart\\)`));
      expect(sutraCss).toContain(`@keyframes sutra-${name}`);
    }
  });
});
