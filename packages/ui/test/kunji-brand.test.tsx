import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KunjiButton, kunjiButtonVariants } from "../src/kits/identity/kunji-buttons";
import { KunjiMark, kunjiBrand } from "../src/kits/identity/kunji-sign-in";

afterEach(cleanup);

/** The geometry published in the kunji brand guide (kunji.cc/brand: icon.svg and the key mark of the official button). */
const KEY_PATHS = ["M240 172 V398", "M240 334 L300 314", "M240 334 L300 358"];

describe("kunjiBrand", () => {
  it("is the official palette", () => {
    expect(kunjiBrand).toEqual({ amber: "#f59e0b", amberHover: "#d97706", ink: "#1a1a18", keyInk: "#1c1606", paper: "#faf9f6" });
  });
});

describe("KunjiMark is the official logo and key mark", () => {
  it("tile: the amber app icon with the ink key at -40 degrees", () => {
    const { container } = render(<KunjiMark variant="tile" size={64} title="kunji" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 512 512");
    expect(svg.getAttribute("width")).toBe("64");
    const rect = svg.querySelector("rect")!;
    expect(rect.getAttribute("fill")).toBe("#f59e0b");
    expect(rect.getAttribute("rx")).toBe("116");
    const g = svg.querySelector("g")!;
    expect(g.getAttribute("transform")).toBe("rotate(-40 256 256)");
    expect(g.getAttribute("stroke")).toBe("#1c1606");
    expect(g.getAttribute("stroke-width")).toBe("58");
    const circle = g.querySelector("circle")!;
    expect([circle.getAttribute("cx"), circle.getAttribute("cy"), circle.getAttribute("r")]).toEqual(["240", "172", "56"]);
    expect(circle.getAttribute("fill")).toBe("#1c1606");
    expect([...g.querySelectorAll("path")].map((p) => p.getAttribute("d"))).toEqual(KEY_PATHS);
  });

  it("glyph: the same key alone, in currentColor", () => {
    const { container } = render(<KunjiMark />);
    const svg = container.querySelector("svg")!;
    expect(svg.querySelector("rect")).toBeNull();
    const g = svg.querySelector("g")!;
    expect(g.getAttribute("stroke")).toBe("currentColor");
    expect(g.querySelector("circle")!.getAttribute("fill")).toBe("currentColor");
    expect([...g.querySelectorAll("path")].map((p) => p.getAttribute("d"))).toEqual(KEY_PATHS);
    expect(svg.getAttribute("width")).toBe("20"); // the guide's minimum size for the mark
  });

  it("is decorative without a title and labelled with one", () => {
    const decorative = render(<KunjiMark />);
    expect(decorative.container.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
    decorative.unmount();
    render(<KunjiMark title="kunji" />);
    expect(screen.getByRole("img", { name: "kunji" })).toBeInTheDocument();
  });
});

describe("KunjiButton follows the brand guide", () => {
  it("is a pill on amber or dark ink with the guide's colours", () => {
    const amber = kunjiButtonVariants({ theme: "amber" });
    const dark = kunjiButtonVariants({ theme: "dark" });
    for (const classes of [amber, dark, kunjiButtonVariants({ theme: "light" })]) {
      expect(classes).toContain("rounded-full");
      expect(classes).toContain("font-semibold");
    }
    expect(amber).toContain("bg-[#f59e0b]");
    expect(amber).toContain("text-[#1a1a18]");
    expect(amber).toContain("hover:bg-[#d97706]");
    expect(dark).toContain("bg-[#1a1a18]");
    expect(dark).toContain("text-[#faf9f6]");
    expect(kunjiButtonVariants({ size: "md" })).toContain("h-10"); // the guide's 40px minimum
  });

  it("shows the key mark glyph (never a tile) before the label, for every theme", () => {
    for (const theme of ["amber", "dark", "light"] as const) {
      const { container, unmount } = render(<KunjiButton client={{ appName: "App" } as never} theme={theme} />);
      const button = container.querySelector('[data-slot="kunji-button"]')!;
      expect(button.textContent).toBe("Sign in with kunji");
      const svg = button.querySelector("svg")!;
      expect(svg.querySelector("rect")).toBeNull();
      expect(svg.querySelector("g")!.getAttribute("stroke")).toBe("currentColor");
      unmount();
    }
  });
});
