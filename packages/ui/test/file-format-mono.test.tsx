import { render } from "@testing-library/react";
import { FileFormatIcon } from "../src/assets/file-format";
import { readSutraCss } from "./helpers/css";

const css = readSutraCss();
const section = css.slice(css.indexOf("File format icons (assets/file-format): ink on paper"));

describe("FileFormatIcon ink on paper", () => {
  it("names its parts and variant so a style can repaint them, and keeps the format colours as attributes", () => {
    const { container } = render(<FileFormatIcon ext="pdf" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("data-slot", "file-format-icon");
    expect(svg).toHaveAttribute("data-variant", "default");
    expect(svg).not.toHaveAttribute("data-mono");
    expect(svg.querySelector("[data-part='band']")).toHaveAttribute("fill", "#E5252A");
    expect(svg.querySelector("[data-part='label']")).toBeInTheDocument();
  });

  it.each(["default", "solid", "minimal"] as const)("%s draws a label part, solid also a body and a fold", (variant) => {
    const { container } = render(<FileFormatIcon ext="zip" variant={variant} />);
    expect(container.querySelector("[data-part='label']")).toBeInTheDocument();
    expect(Boolean(container.querySelector("[data-part='body']"))).toBe(variant === "solid");
    expect(Boolean(container.querySelector("[data-part='fold']"))).toBe(variant === "solid");
    expect(Boolean(container.querySelector("[data-part='band']"))).toBe(variant === "default");
  });

  it("mono sets data-mono true, mono={false} sets false (keep the colours in paper)", () => {
    expect(render(<FileFormatIcon ext="md" mono />).container.querySelector("svg")).toHaveAttribute("data-mono", "true");
    expect(render(<FileFormatIcon ext="md" mono={false} />).container.querySelector("svg")).toHaveAttribute("data-mono", "false");
  });

  it("the stylesheet repaints band, solid body, labels and the solid fold in the ink for mono and the paper style, unless mono is false", () => {
    expect(section).toContain('[data-style="paper"] [data-slot="file-format-icon"]:not([data-mono="false"])');
    expect(section).toContain('[data-slot="file-format-icon"][data-mono="true"]');
    expect(section).toMatch(/\[data-part="band"\][\s\S]*?\{\s*fill: var\(--foreground\);/);
    expect(section).toMatch(/\[data-part="label"\]\s*\{\s*fill: var\(--background\);/);
    expect(section).toMatch(/\[data-variant="minimal"\] \[data-part="label"\]\s*\{\s*fill: var\(--foreground\);/);
    expect(section).toMatch(/\[data-variant="solid"\] \[data-part="fold"\]\s*\{\s*fill: var\(--background\);/);
  });
});
