/** Pure maths for `useFlip` (First-Last-Invert-Play): which elements moved, by how much, and the keyframes that play it back. */

/** A box relative to the list's parent, so scrolling the page or the list between two commits does not look like a move. */
export interface FlipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** How an element moved (dx, dy) and scaled (sx, sy) between two layouts, keyed by its id. */
export interface FlipMove {
  key: string;
  /** Distance from where the element is now back to where it was (px). */
  dx: number;
  dy: number;
  /** Size ratio first / last (1 unless `scale` is on). */
  sx: number;
  sy: number;
}

/** At most this many elements animate in one update: a batch of hundreds would be jank, not motion. */
export const FLIP_MAX = 40;

/** Movement under this many px is not worth a frame (sub-pixel layout noise). */
const EPSILON = 0.5;

/** Whether two ordered key lists are the same list. */
export function sameKeys(a: readonly string[] | null, b: readonly string[]): boolean {
  return !!a && a.length === b.length && a.every((key, i) => key === b[i]);
}

/** Options for `flipMoves`. */
export interface FlipMoveOptions {
  /** Cap on the number of moves, taken in `order`. Default 40. */
  max?: number;
  /** Also compare sizes (a card that grew or shrank as it moved). */
  scale?: boolean;
  /** Return false for an element that is off screen before and after: it is skipped. */
  visible?: (first: FlipRect, last: FlipRect, key: string) => boolean;
}

/**
 * The elements that moved between two measurements, in `order`. A key missing from either side (a new or a removed
 * element) is not a move. With nothing moved the result is empty, which is also what StrictMode's second effect run sees.
 */
export function flipMoves(first: ReadonlyMap<string, FlipRect>, last: ReadonlyMap<string, FlipRect>, order: readonly string[], options: FlipMoveOptions = {}): FlipMove[] {
  const { max = FLIP_MAX, scale = false, visible } = options;
  const moves: FlipMove[] = [];
  for (const key of order) {
    const a = first.get(key);
    const b = last.get(key);
    if (!a || !b) continue;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const sx = scale && b.width > 0 ? a.width / b.width : 1;
    const sy = scale && b.height > 0 ? a.height / b.height : 1;
    if (Math.abs(dx) < EPSILON && Math.abs(dy) < EPSILON && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) continue;
    if (visible && !visible(a, b, key)) continue;
    moves.push({ key, dx, dy, sx, sy });
    if (moves.length >= max) break;
  }
  return moves;
}

/** The two keyframes of a move: offset (and size) of the first position, then the natural layout. Uses the individual `translate` and `scale` properties. */
export function flipKeyframes({ dx, dy, sx, sy }: FlipMove, scale = false): Keyframe[] {
  const from: Keyframe = { translate: `${dx}px ${dy}px` };
  const to: Keyframe = { translate: "0px 0px" };
  if (scale) {
    from.scale = `${sx} ${sy}`;
    to.scale = "1 1";
    from.transformOrigin = to.transformOrigin = "0 0";
  }
  return [from, to];
}

/** The counter-scale of a child that must not stretch with its parent (`data-flip-inverse`). */
export function flipInverseKeyframes({ sx, sy }: FlipMove): Keyframe[] {
  return [{ scale: `${1 / (sx || 1)} ${1 / (sy || 1)}`, transformOrigin: "0 0" }, { scale: "1 1", transformOrigin: "0 0" }];
}

/** `"337ms"` or `"0.3s"` to milliseconds (`undefined` for anything else), for reading the motion tokens from computed style. */
export function parseCssTime(value: string): number | undefined {
  const m = /^\s*(-?[\d.]+)(ms|s)\s*$/.exec(value);
  return m ? Number(m[1]) * (m[2] === "s" ? 1000 : 1) : undefined;
}
