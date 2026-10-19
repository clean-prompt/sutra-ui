/**
 * Foundation tokens as JS values — for docs, charts, canvas or anywhere CSS
 * classes aren't available. Values reference the CSS variables in styles.css
 * so they follow theme switches automatically.
 */

export const brands = ["indigo", "blue", "sky", "cyan", "violet", "rose", "lime", "green", "yellow", "orange", "red"] as const;
/** Brand palette names that can drive the primary colour. */
export type Brand = (typeof brands)[number];

/** Neutral palette names for backgrounds, borders and text. */
export const neutrals = ["zinc", "slate", "gray", "stone"] as const;
/** One of the neutral palette names. */
export type Neutral = (typeof neutrals)[number];

/** Corner radius presets, from rounded corners to pills and square corners. */
export const radiusModes = ["rounded", "pill", "square"] as const;
/** One of the radius preset names. */
export type RadiusMode = (typeof radiusModes)[number];

/** Visual styles. `default` is the stock look; `paper` (`@sutra/ui/paper.css`) is calm, monochrome and flat. */
export const themeStyles = ["default", "paper"] as const;
/** One of the visual style names. */
export type ThemeStyle = (typeof themeStyles)[number];

const v = (name: string) => `var(--${name})`;

/** Semantic colour tokens as CSS `var()` references, for inline styles and charts. */
export const colors = {
  background: v("background"),
  foreground: v("foreground"),
  card: v("card"),
  subtle: v("subtle"),
  muted: v("muted"),
  mutedForeground: v("muted-foreground"),
  border: v("border"),
  borderStrong: v("border-strong"),
  ring: v("ring"),
  primary: v("primary"),
  primaryHover: v("primary-hover"),
  primaryForeground: v("primary-foreground"),
  primarySoft: v("primary-soft"),
  success: v("success"),
  warning: v("warning"),
  destructive: v("destructive"),
  info: v("info"),
  brand: {
    50: v("b-50"), 100: v("b-100"), 200: v("b-200"), 400: v("b-400"), 500: v("b-500"),
    600: v("b-600"), 700: v("b-700"), 900: v("b-900"), 950: v("b-950"),
  },
  neutral: {
    0: v("n-0"), 50: v("n-50"), 100: v("n-100"), 200: v("n-200"), 300: v("n-300"), 400: v("n-400"),
    500: v("n-500"), 600: v("n-600"), 700: v("n-700"), 800: v("n-800"), 900: v("n-900"), 950: v("n-950"),
  },
} as const;

/** Categorical palette for charts, avatars and tags. */
export const chartColors = ["#615fff", "#00b8db", "#f0b100", "#ff2056", "#00c950", "#8e51ff", "#ff6900", "#62748e"] as const;

/**
 * The same palette as CSS variables (`--chart-1` … `--chart-8`, the hex as fallback). Charts, meters and the memory
 * map use these so a style (paper) can retune them; `chartColors` stays the plain hex list for code that needs a
 * concrete colour (canvas, seeds, avatars).
 */
export const chartColorVars: readonly string[] = chartColors.map((c, i) => `var(--chart-${i + 1}, ${c})`);

/** Font family tokens as CSS `var()` references. */
export const typography = {
  fontSans: "var(--font-sans)",
  fontMono: "var(--font-mono)",
  scale: {
    "display-3xl": { size: "6.875rem", lineHeight: 0.95, tracking: "-0.04em" },
    "display-2xl": { size: "4.5rem", lineHeight: 1.05, tracking: "-0.035em" },
    "display-xl": { size: "3.75rem", lineHeight: 1.08, tracking: "-0.03em" },
    "display-lg": { size: "3rem", lineHeight: 1.1, tracking: "-0.025em" },
    "display-md": { size: "2.25rem", lineHeight: 1.15, tracking: "-0.02em" },
    "display-sm": { size: "1.875rem", lineHeight: 1.2, tracking: "-0.015em" },
    "display-xs": { size: "1.5rem", lineHeight: 1.25, tracking: "-0.01em" },
    xl: { size: "1.25rem", lineHeight: 1.4, tracking: "0" },
    lg: { size: "1.125rem", lineHeight: 1.55, tracking: "0" },
    md: { size: "1rem", lineHeight: 1.5, tracking: "0" },
    sm: { size: "0.875rem", lineHeight: 1.43, tracking: "0" },
    xs: { size: "0.75rem", lineHeight: 1.33, tracking: "0" },
  },
  weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
} as const;

/** 4px base spacing grid. Keys match Tailwind's spacing scale. */
export const spacing = {
  0: "0px", 0.5: "2px", 1: "4px", 1.5: "6px", 2: "8px", 3: "12px", 4: "16px", 5: "20px", 6: "24px",
  8: "32px", 10: "40px", 12: "48px", 16: "64px", 20: "80px", 24: "96px", 32: "128px",
} as const;

/** Radius tokens as CSS `var()` references (`full` is a fixed pill radius). */
export const radii = {
  xs: "var(--radius-xs)", sm: "var(--radius-sm)", md: "var(--radius-md)", lg: "var(--radius-lg)",
  xl: "var(--radius-xl)", "2xl": "var(--radius-2xl)", control: "var(--radius-control)", action: "var(--radius-action)", box: "var(--radius-box)",
  full: "9999px",
} as const;

/** Shadow tokens as CSS `var()` references. */
export const shadows = {
  xs: "var(--shadow-xs)", sm: "var(--shadow-sm)", md: "var(--shadow-md)", lg: "var(--shadow-lg)",
  xl: "var(--shadow-xl)", "2xl": "var(--shadow-2xl)", "3xl": "var(--shadow-3xl)",
} as const;

/** Breakpoint widths in px, matching the Tailwind screens. */
export const breakpoints = { xs: 480, sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 } as const;

/** Layout grid by breakpoint: column count, gutter and margin in px. */
export const grid = {
  mobile: { columns: 4, gutter: 16, margin: 16 },
  tablet: { columns: 8, gutter: 24, margin: 24 },
  desktop: { columns: 12, gutter: 24, margin: 32, maxWidth: 1280 },
} as const;
