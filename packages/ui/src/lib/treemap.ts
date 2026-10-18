/* Treemap layout: squarified rectangles (Bruls, Huizing & van Wijk, 2000), nested layout with padding and group
 * headers, drill-path resolution and spatial keyboard navigation. Pure. */

export interface TreemapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A node of hierarchical treemap data. `value` defaults to the sum of the children. */
export interface TreemapDatum {
  id: string;
  name: string;
  value?: number;
  children?: readonly TreemapDatum[];
}

const positive = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
const finite = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Worst aspect ratio of a row of areas laid along a side of length `side`. */
function worstRatio(sum: number, min: number, max: number, side: number): number {
  const s2 = sum * sum;
  const w2 = side * side;
  return Math.max((w2 * max) / s2, s2 / (w2 * min));
}

/**
 * Squarified treemap layout. Returns one rect per item, in input order. Items with a zero, negative or non-finite
 * value get a zero-area rect at the origin of `rect`. Larger values are placed first (top-left); ties keep input order.
 */
export function squarify(items: readonly { value: number }[], rect: TreemapRect): TreemapRect[] {
  const ox = finite(rect.x);
  const oy = finite(rect.y);
  const out: TreemapRect[] = items.map(() => ({ x: ox, y: oy, width: 0, height: 0 }));
  const W = positive(rect.width);
  const H = positive(rect.height);
  const total = items.reduce((s, it) => s + positive(it?.value), 0);
  if (W === 0 || H === 0 || total === 0) return out;

  const scale = (W * H) / total;
  const entries = items
    .map((it, i) => ({ i, area: positive(it?.value) * scale }))
    .filter((e) => e.area > 0)
    .sort((a, b) => b.area - a.area || a.i - b.i);

  let x = ox;
  let y = oy;
  let w = W;
  let h = H;

  const place = (row: typeof entries, last: boolean) => {
    const sum = row.reduce((s, e) => s + e.area, 0);
    if (w >= h) {
      // Column on the left edge.
      const colW = last ? w : Math.min(w, sum / h);
      let cy = y;
      row.forEach((e, k) => {
        const eh = k === row.length - 1 ? y + h - cy : e.area / colW;
        out[e.i] = { x, y: cy, width: colW, height: Math.max(0, eh) };
        cy += eh;
      });
      x += colW;
      w = Math.max(0, w - colW);
    } else {
      // Row along the top edge.
      const rowH = last ? h : Math.min(h, sum / w);
      let cx = x;
      row.forEach((e, k) => {
        const ew = k === row.length - 1 ? x + w - cx : e.area / rowH;
        out[e.i] = { x: cx, y, width: Math.max(0, ew), height: rowH };
        cx += ew;
      });
      y += rowH;
      h = Math.max(0, h - rowH);
    }
  };

  let row: typeof entries = [];
  let sum = 0;
  let min = Infinity;
  let max = 0;
  for (let k = 0; k < entries.length; ) {
    const e = entries[k]!;
    const side = Math.min(w, h);
    if (row.length === 0) {
      row = [e];
      sum = e.area;
      min = max = e.area;
      k++;
      continue;
    }
    const nextSum = sum + e.area;
    const nextMin = Math.min(min, e.area);
    const nextMax = Math.max(max, e.area);
    if (worstRatio(nextSum, nextMin, nextMax, side) <= worstRatio(sum, min, max, side)) {
      row.push(e);
      sum = nextSum;
      min = nextMin;
      max = nextMax;
      k++;
    } else {
      place(row, false);
      row = [];
    }
  }
  if (row.length) place(row, true);
  return out;
}

/** A node's size: its own positive `value`, or else the sum of its children's sizes (0 for bad input). */
export function treemapValue(node: TreemapDatum | null | undefined): number {
  if (!node) return 0;
  if (typeof node.value === "number") return positive(node.value);
  return (node.children ?? []).reduce((s, c) => s + treemapValue(c), 0);
}

export interface TreemapLayoutNode<T extends TreemapDatum = TreemapDatum> {
  node: T;
  /** 1 for the root's children, 2 for theirs, … */
  depth: number;
  /** Ids from the layout root's child down to this node. */
  path: string[];
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** True when this node's children were laid out too (it is drawn as a frame with a header). */
  expanded: boolean;
  /** Index among its siblings (larger values first). */
  rank: number;
}

export interface LayoutTreeOptions {
  /** Inset between a parent frame and its children, in px. Default 0. */
  padding?: number;
  /** Space reserved at the top of an expanded frame for its label, in px. Default 0. */
  headerHeight?: number;
  /** How many levels below the root to lay out. Default 1. */
  depth?: number;
}

/**
 * Lays out `node`'s descendants inside `rect`, `depth` levels deep, and returns them flat in paint order (parents
 * before their children, siblings largest first). Nodes with no size are left out. An expanded frame keeps
 * `padding` on every side and `headerHeight` on top; when it is too small for that, its children are not laid out.
 */
export function layoutTree<T extends TreemapDatum>(node: T, rect: TreemapRect, options: LayoutTreeOptions = {}): TreemapLayoutNode<T>[] {
  const padding = Math.max(0, finite(options.padding));
  const header = Math.max(0, finite(options.headerHeight));
  const maxDepth = Math.max(1, Math.trunc(finite(options.depth) || 1));
  const out: TreemapLayoutNode<T>[] = [];

  const visit = (parent: T, area: TreemapRect, depth: number, path: string[]) => {
    const children = (parent.children ?? []) as readonly T[];
    const values = children.map((c) => treemapValue(c));
    const rects = squarify(values.map((value) => ({ value })), area);
    const order = values.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v || a.i - b.i);
    order.forEach(({ i }, rank) => {
      const child = children[i]!;
      const r = rects[i]!;
      if (values[i]! <= 0 || r.width <= 0 || r.height <= 0) return;
      const childPath = [...path, child.id];
      const inner: TreemapRect = {
        x: r.x + padding,
        y: r.y + padding + header,
        width: r.width - padding * 2,
        height: r.height - padding * 2 - header,
      };
      const expandable = depth < maxDepth && (child.children?.length ?? 0) > 0 && inner.width > 0 && inner.height > 0;
      out.push({ node: child, depth, path: childPath, value: values[i]!, ...r, expanded: expandable, rank });
      if (expandable) visit(child, inner, depth + 1, childPath);
    });
  };

  visit(node, rect, 1, []);
  return out;
}

/** Resolves a drill path (child ids from the root) to the nodes along it, stopping at the first unknown id. */
export function resolveTreemapPath<T extends TreemapDatum>(root: T, path: readonly string[] | null | undefined): T[] {
  const nodes: T[] = [];
  let current: T = root;
  for (const id of path ?? []) {
    const next = (current.children ?? []).find((c) => c.id === id) as T | undefined;
    if (!next) break;
    nodes.push(next);
    current = next;
  }
  return nodes;
}

export type TreemapDirection = "left" | "right" | "up" | "down";

/**
 * Index of the rect nearest to `rects[from]` in `direction` (for arrow-key navigation), or `from` when there is none.
 * Rects that overlap the current one across the direction of travel win over ones that don't.
 */
export function treemapNeighbor(rects: readonly TreemapRect[], from: number, direction: TreemapDirection): number {
  const cur = rects[from];
  if (!cur) return from;
  const eps = 0.5;
  const horizontal = direction === "left" || direction === "right";
  const cx = cur.x + cur.width / 2;
  const cy = cur.y + cur.height / 2;
  let best = from;
  let bestScore = Infinity;
  rects.forEach((r, i) => {
    if (i === from || r.width <= 0 || r.height <= 0) return;
    let ahead: boolean;
    switch (direction) {
      case "right":
        ahead = r.x >= cur.x + cur.width - eps;
        break;
      case "left":
        ahead = r.x + r.width <= cur.x + eps;
        break;
      case "down":
        ahead = r.y >= cur.y + cur.height - eps;
        break;
      default:
        ahead = r.y + r.height <= cur.y + eps;
    }
    if (!ahead) return;
    const rx = r.x + r.width / 2;
    const ry = r.y + r.height / 2;
    const gap = horizontal
      ? direction === "right" ? r.x - (cur.x + cur.width) : cur.x - (r.x + r.width)
      : direction === "down" ? r.y - (cur.y + cur.height) : cur.y - (r.y + r.height);
    const overlap = horizontal
      ? Math.min(cur.y + cur.height, r.y + r.height) - Math.max(cur.y, r.y)
      : Math.min(cur.x + cur.width, r.x + r.width) - Math.max(cur.x, r.x);
    const perp = horizontal ? Math.abs(ry - cy) : Math.abs(rx - cx);
    const score = (overlap > eps ? 0 : 1e9) + Math.max(0, gap) * 4 + perp;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}
