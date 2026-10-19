/* SVG line-path builders and the colour-token lookup shared by the charts (Chart, Sparkline, Gauge, Heatmap). Pure. */

/** An `[x, y]` point in SVG user units. */
export type PathPoint = readonly [number, number];

/** Formats each coordinate before it is written (e.g. round to 2 decimals). Default: as is. */
export type PathRound = (n: number) => number;

const asIs: PathRound = (n) => n;

/** Straight segments through every point: `M0,0L10,5L20,3` (`""` for no points). */
export function linearPath(points: readonly PathPoint[], round: PathRound = asIs): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${round(x)},${round(y)}`).join("");
}

/**
 * Smooth path through every point with monotone cubic interpolation (Fritsch–Carlson, same shape as
 * d3.curveMonotoneX): no overshoot between points. One point → a bare `M`, two points → a straight line.
 */
export function monotonePath(points: readonly PathPoint[], round: PathRound = asIs): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${round(points[0]![0])},${round(points[0]![1])}`;
  if (n === 2) return linearPath(points, round);
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = points[i + 1]![0] - points[i]![0];
    dx.push(h);
    m.push(h === 0 ? 0 : (points[i + 1]![1] - points[i]![1]) / h);
  }
  const t: number[] = new Array(n);
  t[0] = m[0]!;
  t[n - 1] = m[n - 2]!;
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1]! * m[i]! <= 0 ? 0 : (m[i - 1]! + m[i]!) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i]! / m[i]!;
    const b = t[i + 1]! / m[i]!;
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      t[i] = tau * a * m[i]!;
      t[i + 1] = tau * b * m[i]!;
    }
  }
  let d = `M${round(points[0]![0])},${round(points[0]![1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    const h = dx[i]! / 3;
    d += `C${round(x0 + h)},${round(y0 + t[i]! * h)},${round(x1 - h)},${round(y1 - t[i + 1]! * h)},${round(x1)},${round(y1)}`;
  }
  return d;
}
