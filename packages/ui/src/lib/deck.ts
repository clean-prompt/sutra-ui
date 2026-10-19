/* Pure logic for `SwipeDeck`: the stack's scale and rise, tilt, which side a physical swipe means, keys and the undo rule. No DOM, no React. */
import { clamp } from "./math";
import { COMMIT_DISTANCE, dragProgress, releaseDecision, signOf } from "./gesture";
import { inlineSign, type Direction } from "./direction";

/** A swipe goes towards the inline start or end (left and right in left-to-right text), never a fixed physical side. */
export type DeckSide = "start" | "end";

/** Degrees of tilt per px of drag. */
export const DECK_TILT = 0.05;
/** Scale lost per card of depth. */
export const DECK_STACK_STEP = 0.04;
/** Px each card behind sits lower than the one in front. */
export const DECK_STACK_RISE = 10;
/** A flown-out card travels this many card widths. */
export const DECK_FLY_WIDTHS = 1.2;

/** Tilt in degrees for a drag offset in px. */
export const deckTilt = (offset: number): number => Math.round(offset * DECK_TILT * 100) / 100;

/**
 * Scale and rise (px) of the card at `depth` (0 = the top card). `progress` (0 to 1) is how far the top card has been dragged
 * towards leaving: the cards behind move up the stack by that fraction of a step, so the next card grows as the top one goes.
 */
export function deckStackStyle(depth: number, progress = 0): { scale: number; rise: number } {
  const d = Math.max(0, depth - clamp(progress, 0, 1));
  return { scale: Math.round((1 - d * DECK_STACK_STEP) * 1e4) / 1e4, rise: Math.round(d * DECK_STACK_RISE * 100) / 100 };
}

/** The side a swipe means from its physical x direction (`-1` left, `1` right): rightwards is the end in left-to-right text, the start in right-to-left. */
export function deckSide(physicalSign: number, dir: Direction): DeckSide {
  return signOf(physicalSign) * inlineSign(dir) >= 0 ? "end" : "start";
}

/** The physical x direction (`-1` or `1`) of a swipe to `side`. */
export function deckSign(side: DeckSide, dir: Direction): -1 | 1 {
  return ((side === "end" ? 1 : -1) * inlineSign(dir)) as -1 | 1;
}

/** How far a card flies when it is dismissed, signed, in px (`width` is the card's width; 0 when unmeasured falls back to 400). */
export function deckFlyDistance(side: DeckSide, dir: Direction, width: number): number {
  return deckSign(side, dir) * (width > 0 ? width : 400) * DECK_FLY_WIDTHS;
}

/** Whether a release at `offset` px (physical) with `velocity` px/s commits, and to which side. */
export function deckRelease(
  offset: number,
  velocity: number,
  dir: Direction,
  { distance = COMMIT_DISTANCE, speed }: { distance?: number; speed?: number } = {}
): DeckSide | null {
  const decided = releaseDecision({ offset, velocity, distance, speed });
  return decided ? deckSide(decided, dir) : null;
}

/** Opacity (0 to 1) of the "end" and "start" stamps for a drag offset: nothing for the first 15% of the commit distance, full at 75%. */
export function deckStamps(offset: number, dir: Direction, distance = COMMIT_DISTANCE): { start: number; end: number } {
  const logical = offset * inlineSign(dir);
  const ramp = (p: number) => clamp((p - 0.15) / 0.6, 0, 1);
  const p = dragProgress(offset, distance);
  return { end: logical > 0 ? ramp(p) : 0, start: logical < 0 ? ramp(p) : 0 };
}

export type DeckKeyAction = { type: "swipe"; side: DeckSide } | { type: "undo" };

/**
 * What a key does on the deck. Arrow keys are physical (the card flies the way the arrow points), Enter takes the end side
 * (the primary action), Ctrl or Command with Z undoes. Anything else is `null`.
 */
export function deckKeyAction(key: string, dir: Direction, { ctrl = false, meta = false, shift = false }: { ctrl?: boolean; meta?: boolean; shift?: boolean } = {}): DeckKeyAction | null {
  if (key === "ArrowRight") return { type: "swipe", side: deckSide(1, dir) };
  if (key === "ArrowLeft") return { type: "swipe", side: deckSide(-1, dir) };
  if (key === "Enter") return { type: "swipe", side: "end" };
  if ((key === "z" || key === "Z") && (ctrl || meta) && !shift) return { type: "undo" };
  return null;
}

/** Keeps a deck index inside `0..count` (`count` itself means "no cards left"). */
export function clampDeckIndex(index: number, count: number): number {
  return clamp(Number.isFinite(index) ? Math.round(index) : 0, 0, Math.max(0, count));
}

export interface DeckHistoryEntry {
  index: number;
  key: string | number;
  side: DeckSide;
}

/** The swipe `undo` would take back: the last one, if it is the card directly before the current index and still the same card. */
export function undoTarget(history: readonly DeckHistoryEntry[], index: number, keyOf: (i: number) => string | number | undefined): DeckHistoryEntry | null {
  const last = history[history.length - 1];
  return last && last.index === index - 1 && keyOf(last.index) === last.key ? last : null;
}
