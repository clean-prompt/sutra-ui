// Assistant orb art: the palette, the level history and the frame types shared by every look (private).
import { resolveCssColor } from "../../lib/css-color";
import type { AssistantOrbState } from "../../lib/orb";
import type { InkPeak, OrbLevelAt } from "../../lib/orb-art-internal";

export const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

/** Colours of the ink looks, resolved from the theme tokens (canvas cannot read `var()`). */
export interface OrbArtPalette {
  /** The paper style: one ink everywhere, told apart by shape. */
  paper: boolean;
  /** A dark surface: dot sizes follow light, overlapping colour adds up. */
  dark: boolean;
  /** The main ink: the foreground in paper, `--primary` in colour, `--destructive` for an error, `--muted-foreground` muted. */
  main: string;
  /** A second hue (`--chart-6` in colour). */
  second: string;
  /** A third hue (`--chart-2` in colour). */
  third: string;
  /** Opacity of the thread lines: 1 in paper (flat ink), lighter in colour so the beads stand out. */
  lineAlpha: number;
}

const FALLBACK = "gray";

/**
 * Reads the palette for a state from the element's theme: paper (a `data-style="paper"` ancestor) is the foreground ink
 * alone; the stock look uses the primary and chart hues; an error is `--destructive` and muted is `--muted-foreground` in
 * every style. A token that still holds `var()` after resolving (a `color-mix`) is resolved by the browser on a probe.
 */
export function readOrbArtPalette(el: Element, state: AssistantOrbState): OrbArtPalette {
  const style = getComputedStyle(el);
  let probe: HTMLElement | null = null;
  const token = (name: string) => {
    const value = resolveCssColor(`var(${name})`, style);
    if (!value || value.startsWith("var(")) return FALLBACK;
    if (!value.includes("var(")) return value;
    if (!probe && typeof document !== "undefined") {
      probe = document.createElement("span");
      probe.setAttribute("aria-hidden", "true");
      probe.style.display = "none";
      el.appendChild(probe);
    }
    if (!probe) return FALLBACK;
    probe.style.color = `var(${name})`;
    return getComputedStyle(probe).color || FALLBACK;
  };
  const paper = el.closest("[data-style]")?.getAttribute("data-style") === "paper";
  const dark = Boolean(el.closest('.dark, [data-theme="dark"]'));
  let main: string, second: string, third: string;
  if (state === "error") main = second = third = token("--destructive");
  else if (state === "muted") main = second = third = token("--muted-foreground");
  else if (paper) main = second = third = token("--foreground");
  else {
    main = token("--primary");
    second = token("--chart-6");
    third = token("--chart-2");
  }
  (probe as HTMLElement | null)?.remove();
  return { paper, dark, main, second, third, lineAlpha: paper ? 1 : dark ? 0.6 : 0.45 };
}

/* ------------------------------------------------------------------ */
/* Level history (for delays: per bead, per ring, per wave)            */
/* ------------------------------------------------------------------ */

const HISTORY = 128;

/** The smoothed level of the last second or so, so a renderer can read the level of a moment ago. */
export class LevelHistory {
  private times = new Float64Array(HISTORY);
  private values = new Float32Array(HISTORY);
  private head = 0;
  private size = 0;
  push(t: number, value: number): void {
    this.times[this.head] = t;
    this.values[this.head] = value;
    this.head = (this.head + 1) % HISTORY;
    this.size = Math.min(HISTORY, this.size + 1);
  }
  /** The level at time `t`, linearly between samples; before the oldest sample it is the oldest, after the newest the newest. */
  at(t: number): number {
    if (!this.size) return 0;
    let newer = (this.head - 1 + HISTORY) % HISTORY;
    if (t >= this.times[newer]!) return this.values[newer]!;
    for (let k = 1; k < this.size; k++) {
      const older = (this.head - 1 - k + HISTORY * 2) % HISTORY;
      if (this.times[older]! <= t) {
        const t0 = this.times[older]!;
        const t1 = this.times[newer]!;
        const f = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
        return this.values[older]! + (this.values[newer]! - this.values[older]!) * f;
      }
      newer = older;
    }
    return this.values[newer]!;
  }
  clear(): void {
    this.size = 0;
    this.head = 0;
  }
}

/* ------------------------------------------------------------------ */
/* One frame                                                           */
/* ------------------------------------------------------------------ */

/** What a renderer draws from. */
export interface ArtFrame {
  state: AssistantOrbState;
  /** Seconds on the look's clock (a fixed time per state for a still pose). */
  t: number;
  still: boolean;
  /** The level the state shows `back` seconds ago (0 to 1, the state's gain applied). */
  level: OrbLevelAt;
  /** Recent loud moments (for the ink drop's spatter). */
  peaks: readonly InkPeak[];
  palette: OrbArtPalette;
  /** Right-to-left: travelling motion runs the other way (the bead art itself is not mirrored). */
  rtl: boolean;
}

/** Per-instance scratch: the layer the ring bead is cut on and the ink field buffer. */
export interface ArtScratch {
  dpr: number;
  layer?: HTMLCanvasElement;
  layerCtx?: CanvasRenderingContext2D | null;
  field?: Float32Array;
  fieldSize?: number;
}

