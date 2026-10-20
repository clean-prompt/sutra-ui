/**
 * Pure maths for the assistant orb (`kits/voice/assistant-orb`): the state vocabulary, per-state targets, level
 * smoothing and the sine layers of the waveform. No DOM, no React: the renderers read these numbers.
 */
import { clamp } from "./math";

/** What the assistant is doing: `idle`, `listening`, `thinking`, `speaking`, plus the `error` and `muted` looks. */
export const assistantOrbStates = ["idle", "listening", "thinking", "speaking", "error", "muted"] as const;

/** One of `assistantOrbStates`. */
export type AssistantOrbState = (typeof assistantOrbStates)[number];

/** Default accessible name per state. */
export const assistantOrbLabels: Record<AssistantOrbState, string> = {
  idle: "Assistant is idle",
  listening: "Assistant is listening",
  thinking: "Assistant is thinking",
  speaking: "Assistant is speaking",
  error: "Assistant ran into a problem",
  muted: "Assistant microphone is muted",
};

/** Anything that is not a known state reads as `idle`. */
export function normalizeOrbState(state: unknown): AssistantOrbState {
  return (assistantOrbStates as readonly unknown[]).includes(state) ? (state as AssistantOrbState) : "idle";
}

/** The flags `resolveOrbState` folds into one state. */
export interface AssistantOrbFlags {
  /** The microphone is open and the assistant is hearing the user. */
  listening?: boolean;
  /** The assistant is working out an answer. */
  thinking?: boolean;
  /** The assistant is talking. */
  speaking?: boolean;
  /** Something went wrong; wins over everything else. */
  error?: boolean;
  /** The microphone is muted; shown only when nothing else is going on. */
  muted?: boolean;
}

/** Priority: error, speaking, thinking, listening, muted, idle. The assistant's own activity outranks what the user is doing. */
export function resolveOrbState({ listening, thinking, speaking, error, muted }: AssistantOrbFlags): AssistantOrbState {
  if (error) return "error";
  if (speaking) return "speaking";
  if (thinking) return "thinking";
  if (listening) return "listening";
  if (muted) return "muted";
  return "idle";
}

/** Targets the orb renderer eases toward in a state. */
export interface OrbParams {
  /** Resting scale of the orb body (1 fills its slot). */
  scale: number;
  /** Extra scale at a level of 1 (the swell). */
  swell: number;
  /** Colour saturation, 0 (grey) to about 1.2. */
  saturation: number;
  /** Ambient swirl speed, 1 = the base pace. */
  speed: number;
  /** Seconds between expanding rings, 0 for none. */
  ringRate: number;
  /** Opacity of the outer glow, 0 to 1. */
  glow: number;
  /** How much of the live level counts, 0 (ignored) to 1 (all of it). */
  levelGain: number;
}

const PARAMS: Record<AssistantOrbState, OrbParams> = {
  idle: { scale: 0.92, swell: 0.02, saturation: 0.55, speed: 0.7, ringRate: 0, glow: 0.22, levelGain: 0 },
  listening: { scale: 1, swell: 0.2, saturation: 0.95, speed: 1.3, ringRate: 0, glow: 0.5, levelGain: 1 },
  thinking: { scale: 0.96, swell: 0.04, saturation: 1.1, speed: 3.4, ringRate: 0, glow: 0.45, levelGain: 0.2 },
  speaking: { scale: 1.02, swell: 0.16, saturation: 1.15, speed: 2, ringRate: 1.5, glow: 0.7, levelGain: 1 },
  error: { scale: 0.9, swell: 0, saturation: 0.9, speed: 0.5, ringRate: 0, glow: 0.3, levelGain: 0 },
  muted: { scale: 0.86, swell: 0, saturation: 0, speed: 0.35, ringRate: 0, glow: 0, levelGain: 0 },
};

/** Per-state targets for scale, swell, saturation, swirl speed, ring rate, glow and how much the level counts. */
export function orbParams(state: AssistantOrbState): OrbParams {
  return { ...PARAMS[normalizeOrbState(state)] };
}

/** The level a state shows: `level` clamped to 0..1 (NaN is 0) and scaled by the state's `levelGain`. */
export function effectiveLevel(state: AssistantOrbState, level: number | undefined): number {
  const raw = typeof level === "number" && Number.isFinite(level) ? clamp(level, 0, 1) : 0;
  return raw * PARAMS[normalizeOrbState(state)].levelGain;
}

/** The level a still frame uses per state (reduced motion, `paused`, first paint): a distinct pose for each state. */
export function orbStillLevel(state: AssistantOrbState): number {
  switch (normalizeOrbState(state)) {
    case "listening":
      return 0.55;
    case "thinking":
      return 0.3;
    case "speaking":
      return 0.8;
    default:
      return 0;
  }
}

/** Default attack time constant (seconds): the level rises fast. */
export const LEVEL_ATTACK = 0.05;
/** Default release time constant (seconds): the level falls slowly. */
export const LEVEL_RELEASE = 0.32;

/**
 * One step of the level smoother: an exponential approach with a fast attack and a slow release, so a spike shows at once and
 * fades gently. `dt` is in seconds, `attack` and `release` are time constants in seconds (0 jumps). Frame-rate independent;
 * never leaves 0..1 and never returns NaN.
 */
export function smoothLevel(prev: number, next: number, dt: number, attack = LEVEL_ATTACK, release = LEVEL_RELEASE): number {
  const from = clamp(Number.isFinite(prev) ? prev : 0, 0, 1);
  const to = clamp(Number.isFinite(next) ? next : 0, 0, 1);
  if (!(dt > 0)) return from;
  const tau = to > from ? attack : release;
  if (!(tau > 0)) return to;
  return from + (to - from) * (1 - Math.exp(-dt / tau));
}

/** Whether a loud moment should send a ripple: the level crossed `threshold` and the last ripple is at least `gap` ms old. */
export function shouldRipple(level: number, sinceLastMs: number, threshold = 0.5, gap = 420): boolean {
  return Number.isFinite(level) && level >= threshold && sinceLastMs >= gap;
}

/* ------------------------------------------------------------------ */
/* Waveform                                                            */
/* ------------------------------------------------------------------ */

/** One sine layer of the waveform. */
export interface WaveLayer {
  /** Whole cycles across the width. */
  frequency: number;
  /** Cycles per second (negative runs the other way). */
  speed: number;
  /** Starting phase in radians. */
  phase: number;
  /** Share of the full amplitude, 0 to 1. */
  amplitude: number;
  /** Stroke width in css px. */
  width: number;
  /** Stroke opacity, 0 to 1. */
  opacity: number;
}

/** A bump that travels across the wave (thinking): where it sits (0..1 of the width) and how wide it is. */
export interface WavePulse {
  /** Centre of the bump as a share of the width. */
  center: number;
  /** Standard deviation of the bump as a share of the width. */
  width: number;
}

/** `count` (1 to 8, default 5) sine layers with different frequency, speed and phase. The first is the tallest and the boldest. */
export function waveLayers(count = 5): WaveLayer[] {
  const n = clamp(Math.round(Number.isFinite(count) ? count : 5), 1, 8);
  return Array.from({ length: n }, (_, i) => ({
    frequency: 1.15 + i * 0.62 + (i % 2) * 0.13,
    speed: (i % 2 === 0 ? 1 : -1) * (0.16 + i * 0.09),
    phase: i * 1.83,
    amplitude: 1 - i * (0.62 / Math.max(1, n - 1)),
    width: Math.max(1, 2.4 - i * 0.28),
    opacity: Math.max(0.28, 0.95 - i * 0.14),
  }));
}

/** How fast the waves travel in a state, as a multiple of the layers' own `speed`. */
export function waveSpeed(state: AssistantOrbState): number {
  const speeds: Record<AssistantOrbState, number> = { idle: 0.5, listening: 1, thinking: 2.2, speaking: 1.6, error: 0.2, muted: 0 };
  return speeds[normalizeOrbState(state)];
}

const TAU = Math.PI * 2;

/**
 * The shape of the wave in a state at time `t` (seconds): the overall `amplitude` (0..1) and, while thinking, the travelling
 * `pulse`. Idle is a nearly flat line that breathes, listening follows `level`, thinking is a shimmering pulse crossing the
 * width, speaking is tall and moves with `level`. `level` is the raw level; the state's `levelGain` is applied here.
 */
export function waveFrame(state: AssistantOrbState, level: number, t: number): { amplitude: number; pulse: WavePulse | null } {
  const s = normalizeOrbState(state);
  const l = effectiveLevel(s, level);
  const time = Number.isFinite(t) ? t : 0;
  switch (s) {
    case "listening":
      return { amplitude: 0.07 + 0.8 * l, pulse: null };
    case "thinking": {
      const sweep = (time / 1.9) % 1;
      const at = sweep < 0 ? sweep + 1 : sweep;
      return { amplitude: 0.64 * (0.88 + 0.12 * Math.sin(time * TAU * 1.6)), pulse: { center: -0.1 + 1.2 * at, width: 0.15 } };
    }
    case "speaking":
      return { amplitude: clamp(0.3 + 0.6 * l + 0.07 * Math.sin(time * TAU * 2.7), 0, 1), pulse: null };
    case "error":
      return { amplitude: 0.025, pulse: null };
    case "muted":
      return { amplitude: 0.012, pulse: null };
    default:
      return { amplitude: 0.035 + 0.018 * (0.5 + 0.5 * Math.sin((time * TAU) / 4.5)), pulse: null };
  }
}

/**
 * Height of one layer at `x` (0..1 across the width) and time `t`, from -1 to 1 (a share of the half height). The ends pinch to
 * zero, `amplitude` (0..1) scales it, and a `pulse` concentrates it around its centre.
 */
export function waveY(x: number, t: number, layer: WaveLayer, amplitude: number, pulse?: WavePulse | null): number {
  const u = clamp(Number.isFinite(x) ? x : 0, 0, 1);
  const time = Number.isFinite(t) ? t : 0;
  const envelope = Math.sin(Math.PI * u) ** 2;
  const focus = pulse ? 0.1 + 0.9 * Math.exp(-((u - pulse.center) ** 2) / (2 * Math.max(0.01, pulse.width) ** 2)) : 1;
  const angle = TAU * (layer.frequency * u - layer.speed * time) + layer.phase;
  const wave = 0.82 * Math.sin(angle) + 0.18 * Math.sin(angle * 0.5 + layer.phase * 1.3 + time * 0.3);
  return clamp(amplitude, 0, 1) * layer.amplitude * envelope * focus * wave;
}

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */

/**
 * The looks of the orb, in picker order. `orb` is the glass orb (CSS) and `waveform` the layered sine waves; the rest are
 * ink looks drawn on a canvas: `mala` (beads on a closed thread with the Sutra bead at the top), `string` (the Sutra bead
 * on a vibrating thread: a 3:1 bar, a square at small sizes), `ink` (a drop of ink), `rings` (thick thread loops), `graph`
 * (dots on a turning sphere joined by a sparse graph around a hub) and `halftone` (a sphere of whole dots around a centre dot).
 */
export const assistantOrbVariants = ["orb", "waveform", "mala", "string", "ink", "rings", "graph", "halftone"] as const;

/** One of `assistantOrbVariants`. */
export type AssistantOrbVariant = (typeof assistantOrbVariants)[number];

/** The variants drawn on a canvas by the ink renderer (everything but `orb` and `waveform`). */
export type OrbArtVariant = Exclude<AssistantOrbVariant, "orb" | "waveform">;

/** Names for a style picker, one per variant. */
export const assistantOrbVariantLabels: Record<AssistantOrbVariant, string> = {
  orb: "Glass orb",
  waveform: "Waveform",
  mala: "Mala ring",
  string: "Sutra string",
  ink: "Ink drop",
  rings: "Thread rings",
  graph: "Dot graph",
  halftone: "Halftone",
};

/** Anything that is not a known variant reads as `orb`. */
export function normalizeOrbVariant(variant: unknown): AssistantOrbVariant {
  return (assistantOrbVariants as readonly unknown[]).includes(variant) ? (variant as AssistantOrbVariant) : "orb";
}

/** Whether a variant is drawn on a canvas by the ink renderer. */
export function isOrbArtVariant(variant: AssistantOrbVariant): variant is OrbArtVariant {
  return variant !== "orb" && variant !== "waveform";
}

/** Default `size` of a variant in px: the box of the round looks (128), the height of the bars (`waveform`, `string`: 64). */
export function defaultOrbSize(variant: AssistantOrbVariant): number {
  return variant === "waveform" || variant === "string" ? 64 : 128;
}

/** A numeric `size` below this many px gives the `string` variant a square box, drawn as the compact form (the logo). */
export const ORB_STRING_SQUARE_BELOW = 48;

/** The form the `string` variant draws in a box: a bar when the box is at least 1.8 times as wide as it is tall, else the square. */
export function orbStringForm(width: number, height: number): "bar" | "square" {
  return height > 0 && width / height >= 1.8 ? "bar" : "square";
}
