import { act, render, renderHook, screen } from "@testing-library/react";
import { useTheme } from "../src/hooks/use-theme";
import { cn } from "../src/lib/cn";
import { brands, breakpoints, chartColors, colors, neutrals, radii, radiusModes, spacing, typography } from "../src/lib/tokens";
import { Heading, Text } from "../src/primitives/typography";

describe("tokens", () => {
  it("exports the theme axes as non-empty unique string tuples", () => {
    for (const list of [brands, neutrals, radiusModes]) {
      expect(list.length).toBeGreaterThan(0);
      expect(new Set(list).size).toBe(list.length);
      list.forEach((item) => expect(typeof item).toBe("string"));
    }
    expect(brands).toContain("indigo");
    expect(neutrals).toEqual(expect.arrayContaining(["zinc", "slate", "gray", "stone"]));
    expect([...radiusModes]).toEqual(["rounded", "pill", "square"]);
  });

  it("colors reference CSS variables so they follow theme switches", () => {
    expect(colors.background).toBe("var(--background)");
    expect(colors.mutedForeground).toBe("var(--muted-foreground)");
    const flat = [
      ...Object.values(colors).filter((v): v is string => typeof v === "string"),
      ...Object.values(colors.brand),
      ...Object.values(colors.neutral),
    ];
    flat.forEach((value) => expect(value).toMatch(/^var\(--[a-z0-9-]+\)$/));
    expect(Object.keys(colors.brand)).toEqual(expect.arrayContaining(["50", "500", "950"]));
    expect(Object.keys(colors.neutral)).toEqual(expect.arrayContaining(["0", "500", "950"]));
  });

  it("exports chart colors as hex values and sane scales", () => {
    chartColors.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
    expect(spacing[4]).toBe("16px");
    expect(radii.full).toBe("9999px");
    expect(typography.weights.semibold).toBe(600);
    const bps = Object.values(breakpoints);
    expect([...bps].sort((a, b) => a - b)).toEqual(bps);
  });
});

describe("cn", () => {
  it("joins conditional class names", () => {
    expect(cn("a", false && "b", undefined, null, ["c", { d: true, e: false }])).toBe("a c d");
  });

  it("resolves conflicting Tailwind utilities with the last one winning", () => {
    expect(cn("px-2 py-1 text-sm", "px-4")).toBe("py-1 text-sm px-4");
    expect(cn("bg-primary hover:bg-primary-hover", "bg-destructive")).toBe("hover:bg-primary-hover bg-destructive");
  });

  it("lets consumer className override component defaults", () => {
    render(<Text className="text-lg">Hello</Text>);
    expect(screen.getByText("Hello").className).toContain("text-lg");
  });
});

describe("useTheme", () => {
  afterEach(() => {
    const root = document.documentElement;
    root.className = "";
    delete root.dataset.brand;
    delete root.dataset.neutral;
    delete root.dataset.radius;
  });

  it("applies defaults to <html>", () => {
    const { result } = renderHook(() => useTheme());
    const root = document.documentElement;
    expect(result.current.theme).toEqual({ mode: "light", brand: "indigo", neutral: "zinc", radius: "rounded" });
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.dataset.brand).toBe("indigo");
    expect(root.dataset.neutral).toBe("zinc");
    expect(root.dataset.radius).toBe("rounded");
  });

  it("accepts an initial theme and patches it with setTheme", () => {
    const { result } = renderHook(() => useTheme({ mode: "dark", brand: "rose" }));
    const root = document.documentElement;
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.dataset.brand).toBe("rose");

    act(() => result.current.setTheme({ mode: "light", radius: "pill" }));
    expect(result.current.theme).toEqual({ mode: "light", brand: "rose", neutral: "zinc", radius: "pill" });
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.dataset.radius).toBe("pill");
  });
});

describe("typography", () => {
  it("Heading renders the requested heading level", () => {
    render(<Heading as="h3">Title</Heading>);
    expect(screen.getByRole("heading", { level: 3, name: "Title" })).toBeInTheDocument();
  });
});

describe("cn with Sutra theme tokens", () => {
  it("keeps custom font sizes next to text colours", () => {
    expect(cn("text-display-sm text-foreground")).toBe("text-display-sm text-foreground");
    expect(cn("text-2xs text-muted-foreground")).toBe("text-2xs text-muted-foreground");
  });

  it("treats custom font sizes as font sizes when merging", () => {
    expect(cn("text-sm", "text-2xs")).toBe("text-2xs");
    expect(cn("text-display-xs", "text-lg")).toBe("text-lg");
  });

  it("lets consumers override the control/box radius", () => {
    expect(cn("rounded-control", "rounded-full")).toBe("rounded-full");
    expect(cn("rounded-box", "rounded-none")).toBe("rounded-none");
  });
});
