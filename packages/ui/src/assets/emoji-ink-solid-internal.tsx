import * as React from "react";

/*
 * Solid ink emoji: the filled drawings of the built-in set (variant "solid") and their tint (variant "tint").
 *
 * One geometry per emoji, on the same 24 box as the outline drawings: a face is a disc of radius 10 at the centre, the eyes
 * and mouths come from one family (below), and every feature is a real hole cut by an SVG mask (never paper-coloured
 * paint), so the art works on any surface, in dark mode and in print. A drawing is a stack of layers:
 *   body     the ink mass of the layer (fills, or thick strokes used as capsules)
 *   cuts     holes in the mass (eyes, mouths, finger gaps, seams)
 *   restore  ink given back inside a hole (a pupil inside an eye white)
 *   inks     small solid parts drawn over the layer
 *   key      the paper gap kept around this layer where it sits in front of the layers below (the Bead's gap)
 * plus free `lines` (streamers, rays, steam) and `dots` (confetti, sparks) on top. A shape marked `soft` is secondary: it is
 * cut to paper in "solid" and takes a tint of the ink (currentColor at TINT opacity) in "tint".
 *
 * Moving parts carry a name and a move: the renderer wraps them in <g data-part="…" data-move="…">, and the whole drawing in
 * <g data-part="all">. The moves are CSS keyframes in the emoji section of styles/sutra.css; nothing here animates.
 * Nothing is traced from an emoji font or an icon set.
 */

/** Opacity of the tint parts in the "tint" variant. */
export const INK_TINT = 0.38;

/** A moving part: its name, the keyframes it plays (`sutra-emoji-<move>`), its pivot and whether the pivot is its own box. */
export interface InkPart {
  name: string;
  move?: string;
  /** transform-origin in the units of the drawing (`"12px 20px"`) or of its own box with `box`. */
  origin?: string;
  /** Pivot on the part's own bounding box (`transform-box: fill-box`) instead of the 24 box. */
  box?: boolean;
  /** Starts this many steps after the rest (a step is 0.14 of the motion unit). */
  lag?: 1 | 2;
}

/** One shape of a drawing. */
export interface InkShape {
  t: "circle" | "ellipse" | "rect" | "path" | "g";
  /** Geometry attributes (cx, cy, r, rx, ry, x, y, width, height, d, pathLength). */
  a?: Record<string, number | string>;
  /** Stroke width: a stroked line with round caps and joins instead of a fill. */
  w?: number;
  /** Rounds the corners of a fill: a stroke of this width in the same paint. */
  round?: number;
  /** SVG transform of the element (or of the group). */
  tf?: string;
  /** Children of a group. */
  kids?: InkShape[];
  /** Secondary: paper in "solid", a tint of the ink in "tint". */
  soft?: boolean;
  /** Named moving part. */
  part?: InkPart;
}

/** One layer of a drawing (see the file comment). */
export interface InkLayer {
  body: InkShape[];
  cuts?: InkShape[];
  restore?: InkShape[];
  inks?: InkShape[];
  /** Paper gap around this layer where it covers the layers below. @default 1.2 */
  key?: number;
  /** The layer moves as one part (its own cuts move with it). */
  part?: InkPart;
}

/** A solid drawing. */
export interface InkSolid {
  layers: InkLayer[];
  lines?: InkShape[];
  dots?: InkShape[];
  /** SVG transform of the whole drawing (the rocket is drawn upright and turned). */
  tf?: string;
  /** The move of the whole drawing and its pivot. */
  move?: string;
  origin?: string;
  /** A different drawing for the tint variant (when the tint changes more than the soft parts). */
  tint?: InkSolid;
}

/* ------------------------------------------------------------------ */
/* Shape helpers                                                       */
/* ------------------------------------------------------------------ */

const r2 = (n: number) => Math.round(n * 100) / 100;

/** A filled circle. */
export const C = (cx: number, cy: number, r: number): InkShape => ({ t: "circle", a: { cx, cy, r } });
/** A filled ellipse, turned by `deg` about its centre. */
export const O = (cx: number, cy: number, rx: number, ry: number, deg = 0): InkShape => ({
  t: "ellipse",
  a: { cx, cy, rx, ry },
  tf: deg ? `rotate(${deg} ${cx} ${cy})` : undefined,
});
/** A filled path; `round` rounds its corners with a same-paint stroke. */
export const P = (d: string, round = 0, tf?: string): InkShape => ({ t: "path", a: { d }, round, tf });
/** A stroked line with round caps and joins. */
export const L = (d: string, w: number, tf?: string): InkShape => ({ t: "path", a: { d }, w, tf });
/** A stroked ring. */
export const Ring = (cx: number, cy: number, rx: number, ry: number, w: number): InkShape => ({ t: "ellipse", a: { cx, cy, rx, ry }, w });
/** A filled rounded rectangle. */
export const R = (x: number, y: number, w: number, h: number, rx = 0, tf?: string): InkShape => ({ t: "rect", a: { x, y, width: w, height: h, rx }, tf });
/** A group of shapes under one transform. */
export const G = (tf: string, kids: InkShape[]): InkShape => ({ t: "g", tf, kids });

/** A copy of `s` marked secondary (paper in solid, tint in tint). */
export function soft<T extends InkShape>(s: T): T {
  return { ...s, soft: true };
}
/** A copy of `s` (or of each shape of a list) as a named moving part. */
export function pt(name: string, move: string | undefined, s: InkShape, origin?: string, box?: boolean, lag?: 1 | 2): InkShape;
export function pt(name: string, move: string | undefined, s: InkShape[], origin?: string, box?: boolean, lag?: 1 | 2): InkShape[];
export function pt(name: string, move: string | undefined, s: InkShape | InkShape[], origin?: string, box?: boolean, lag?: 1 | 2): InkShape | InkShape[] {
  if (Array.isArray(s)) return s.map((x) => pt(name, move, x, origin, box, lag));
  return { ...s, part: { name, move, origin, box, lag } };
}
/** A copy of a stroke with a normalised length of 1, so a move can draw it on with a dash. */
export const pl = (s: InkShape): InkShape => ({ ...s, a: { ...s.a, pathLength: 1 } });

/** A teardrop: round end of radius `r` centred on (cx, cy), tip at (tx, ty). */
export function drop(cx: number, cy: number, r: number, tx: number, ty: number, round = 0.5): InkShape {
  const dx = tx - cx,
    dy = ty - cy,
    d = Math.hypot(dx, dy);
  const ux = dx / d,
    uy = dy / d,
    a = Math.acos(r / d);
  const p1 = [cx + r * (ux * Math.cos(a) - uy * Math.sin(a)), cy + r * (ux * Math.sin(a) + uy * Math.cos(a))];
  const p2 = [cx + r * (ux * Math.cos(-a) - uy * Math.sin(-a)), cy + r * (ux * Math.sin(-a) + uy * Math.cos(-a))];
  return P(`M${r2(tx)} ${r2(ty)}L${r2(p1[0]!)} ${r2(p1[1]!)}A${r} ${r} 0 1 1 ${r2(p2[0]!)} ${r2(p2[1]!)}Z`, round);
}
/** A star with `points` points around (cx, cy). */
export function starD(cx: number, cy: number, outer: number, inner: number, points = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer,
      a = ((-90 + (i * 180) / points) * Math.PI) / 180;
    pts.push(`${r2(cx + r * Math.cos(a))} ${r2(cy + r * Math.sin(a))}`);
  }
  return `M${pts.join("L")}z`;
}

/* ------------------------------------------------------------------ */
/* The shared family: face, eyes, mouths, heart, flame                 */
/* ------------------------------------------------------------------ */

/** The face disc. */
export const FACE = C(12, 12, 10);
/** Two upright oval eyes. */
export function eyes(y = 9.4, rx = 1.35, ry = 1.9, dx = 3.45): InkShape[] {
  return [O(12 - dx, y, rx, ry), O(12 + dx, y, rx, ry)];
}
/** Closed happy eyes (two arches). */
export const ARCH = L("M6.6 10.4q1.95-2.8 3.9 0M13.5 10.4q1.95-2.8 3.9 0", 1.8);
/** Closed sad eyes (two cups). */
export const CUP = L("M6.5 9q2 2.2 4 0M13.5 9q2 2.2 4 0", 1.8);
/** Eyes squeezed shut with laughter. */
export const SQUINT = L("M6.5 7.6l3.3 2-3.3 2M17.5 7.6l-3.3 2 3.3 2", 1.8);
/** Open grin (a D). */
export const GRIN = P("M7.2 13.2h9.6c0 3.1-2.15 5.3-4.8 5.3s-4.8-2.2-4.8-5.3z", 0.9);
/** A smaller open smile. */
export const SMALL_GRIN = P("M8.2 14h7.6c0 2.6-1.7 4.4-3.8 4.4s-3.8-1.8-3.8-4.4z", 0.9);
/** A laughing mouth. */
export const LAUGH = P("M7.8 12.9h8.4c0 3.3-1.9 5.6-4.2 5.6s-4.2-2.3-4.2-5.6z", 0.9);
/** A closed smile. */
export const SMILE = L("M7.8 13.9q4.2 4 8.4 0", 1.9);
/** A frown. */
export const FROWN = L("M8.6 17.8q3.4-3.2 6.8 0", 1.9);
/** A flat mouth. */
export const FLAT = L("M8.6 15.6h6.8", 1.9);
/** The heart, also used small for eyes and marks. */
export const HEART = "M12 20.8C6.5 17.4 2.3 13.5 2.3 8.5a5 5 0 0 1 9.7-1.9 5 5 0 0 1 9.7 1.9c0 5-4.2 8.9-9.7 12.3z";
/** The heart scaled by `s` and centred on (cx, cy). */
export function heartAt(cx: number, cy: number, s: number, round?: number): InkShape {
  return P(HEART, round ?? 0.5 / s, `translate(${cx} ${cy}) scale(${s}) translate(-12 -12.05)`);
}
/** The flame and its core (the outline drawing's, filled). */
export const FLAME = "M12 21.2c-4 0-6.6-2.8-6.6-6.2 0-2.6 1.5-4.2 2.8-5.9.5 1.6 1.3 2.4 2.2 2.8-.3-3.5 1.3-6.5 3.9-9 .4 3 2.1 4.6 3.1 6.4.8 1.5 1.2 2.4 1.2 3.6 0 3.4-2.6 6.3-6.6 6.3z";
export const FLAME_CORE = "M12 18.4c-1.1 0-1.9-.7-1.9-1.8 0-1.2 1.1-1.8 1.9-3.2.8 1.4 1.9 2 1.9 3.2 0 1.1-.8 1.8-1.9 1.8z";

/** A face: the disc, its features cut out, the whole face playing `move` (a hop and a blink by default). */
export function face(cuts: InkShape[], opts: { move?: string; origin?: string; restore?: InkShape[]; inks?: InkShape[] } = {}): InkSolid {
  return { layers: [{ body: [FACE], cuts, restore: opts.restore, inks: opts.inks }], move: opts.move === undefined ? "hop" : opts.move || undefined, origin: opts.origin ?? "12px 22px" };
}
/** Eyes that blink (each on its own centre). */
export const blinkEyes = (y?: number, rx?: number, ry?: number, dx?: number) => pt("eye", "blink", eyes(y, rx, ry, dx), undefined, true);
/** A mouth part (pivot on its own top edge). */
export const mouth = (s: InkShape, move?: string) => pt("mouth", move, s, "50% 0%", true);

/* ------------------------------------------------------------------ */
/* Renderer                                                            */
/* ------------------------------------------------------------------ */

type Paint = "currentColor" | "white" | "black";

const LAG: Record<number, string> = { 1: "1", 2: "2" };

function partProps(p: InkPart): Record<string, unknown> {
  const style: React.CSSProperties = {};
  if (p.origin) style.transformOrigin = p.origin;
  return {
    "data-part": p.name,
    "data-move": p.move,
    "data-box": p.box ? "fill" : undefined,
    "data-lag": p.lag ? LAG[p.lag] : undefined,
    style: p.origin ? style : undefined,
  };
}

function shapeElement(s: InkShape, paint: Paint, grow: number, key: React.Key): React.ReactElement {
  if (s.t === "g") {
    return (
      <g key={key} transform={s.tf}>
        {(s.kids ?? []).map((k, i) => shapeNode(k, paint, grow, i))}
      </g>
    );
  }
  const base: Record<string, unknown> = { key, ...s.a, transform: s.tf };
  if (s.w) {
    return React.createElement(s.t, { ...base, fill: "none", stroke: paint, strokeWidth: r2(s.w + grow), strokeLinecap: "round", strokeLinejoin: "round" });
  }
  const sw = (s.round ?? 0) + grow;
  return React.createElement(
    s.t,
    sw > 0 ? { ...base, fill: paint, stroke: paint, strokeWidth: r2(sw), strokeLinejoin: "round", strokeLinecap: "round" } : { ...base, fill: paint }
  );
}

function shapeNode(s: InkShape, paint: Paint, grow: number, key: React.Key): React.ReactElement {
  if (!s.part) return shapeElement(s, paint, grow, key);
  return (
    <g key={key} {...partProps(s.part)}>
      {shapeElement(s, paint, grow, 0)}
    </g>
  );
}

const nodes = (list: InkShape[] | undefined, paint: Paint, grow = 0, prefix = "n") => (list ?? []).map((s, i) => shapeNode(s, paint, grow, `${prefix}${i}`));
const keyOf = (layer: InkLayer) => layer.key ?? 1.2;

function maskEl(id: string, children: React.ReactNode[], ground: "white" | "black" = "white") {
  return (
    <mask key={id} id={id} maskUnits="userSpaceOnUse" x="-12" y="-12" width="48" height="48">
      <rect x="-12" y="-12" width="48" height="48" fill={ground} />
      {children}
    </mask>
  );
}

/**
 * The svg children of a solid drawing: masks (ids from `id`, unique per instance) and the art. `tint` paints the soft parts
 * with a tint of the ink instead of cutting them to paper.
 */
export function renderSolid(geo: InkSolid, id: string, tint: boolean): React.ReactNode {
  const g = tint && geo.tint ? geo.tint : geo;
  const defs: React.ReactNode[] = [];
  const art: React.ReactNode[] = [];
  const layers = g.layers;
  layers.forEach((layer, i) => {
    const front = layers.slice(i + 1);
    /* the front layers, grown by their key, cut out of this one; a moving front layer moves its gap with it */
    const occluders = front.map((f, j) => {
      const grown = nodes(f.body, "black", 2 * keyOf(f), "k");
      return f.part ? (
        <g key={`o${j}`} {...partProps(f.part)}>
          {grown}
        </g>
      ) : (
        <g key={`o${j}`}>{grown}</g>
      );
    });
    const body = tint ? layer.body.filter((s) => !s.soft) : layer.body;
    const inks = tint ? (layer.inks ?? []).filter((s) => !s.soft) : layer.inks ?? [];
    const cutNodes = [...nodes(layer.cuts, "black", 0, "c"), ...nodes(layer.restore, "white", 0, "r")];
    const content = [...nodes(body, "currentColor", 0, "b"), ...nodes(inks, "currentColor", 0, "i")];
    const maskId = `${id}-${i}`;
    const hasMask = cutNodes.length > 0 || occluders.length > 0;
    if (hasMask) defs.push(maskEl(maskId, [...cutNodes, ...occluders]));
    const masked = hasMask ? { mask: `url(#${maskId})` } : {};
    if (layer.part && !occluders.length) {
      art.push(
        <g key={`l${i}`} {...partProps(layer.part)} {...masked}>
          {content}
        </g>
      );
    } else if (layer.part) {
      art.push(
        <g key={`l${i}`} {...masked}>
          <g {...partProps(layer.part)}>{content}</g>
        </g>
      );
    } else {
      art.push(
        <g key={`l${i}`} {...masked}>
          {content}
        </g>
      );
    }
    if (!tint) return;
    /* tint: soft holes take a tint inside the mass they are cut from; soft parts sit under the parts in front */
    const softCuts = (layer.cuts ?? []).filter((s) => s.soft);
    if (softCuts.length) {
      const inside = `${id}-t${i}`;
      defs.push(maskEl(inside, [...nodes(body, "white", 0, "b"), ...occluders.map((o, j) => <g key={`ot${j}`}>{o}</g>)], "black"));
      art.push(
        <g key={`t${i}`} mask={`url(#${inside})`} opacity={INK_TINT}>
          {nodes(softCuts, "currentColor")}
        </g>
      );
    }
    const softParts = [...layer.body.filter((s) => s.soft), ...(layer.inks ?? []).filter((s) => s.soft)];
    /* (keys: one list, so indexes are unique) */
    if (softParts.length) {
      const under = `${id}-s${i}`;
      if (occluders.length) defs.push(maskEl(under, occluders));
      const inner = <g opacity={INK_TINT}>{nodes(softParts, "currentColor")}</g>;
      art.push(
        <g key={`s${i}`} mask={occluders.length ? `url(#${under})` : undefined}>
          {layer.part ? <g {...partProps(layer.part)}>{inner}</g> : inner}
        </g>
      );
    }
  });
  art.push(...nodes(g.lines, "currentColor").map((n, i) => <React.Fragment key={`ln${i}`}>{n}</React.Fragment>));
  art.push(...nodes(g.dots, "currentColor").map((n, i) => <React.Fragment key={`dt${i}`}>{n}</React.Fragment>));
  let drawing = (
    <g data-part="all" data-move={g.move} style={g.origin ? { transformOrigin: g.origin } : undefined}>
      {art}
    </g>
  );
  if (g.tf) drawing = <g transform={g.tf}>{drawing}</g>;
  return (
    <>
      {defs.length ? <defs>{defs}</defs> : null}
      {drawing}
    </>
  );
}

/** Every move a drawing can name (each is `@keyframes sutra-emoji-<move>` in sutra.css). */
export function movesOf(geo: InkSolid): string[] {
  const out = new Set<string>();
  const walk = (list?: InkShape[]) =>
    (list ?? []).forEach((s) => {
      if (s.part?.move) out.add(s.part.move);
      walk(s.kids);
    });
  for (const g of [geo, geo.tint].filter((x): x is InkSolid => Boolean(x))) {
    if (g.move) out.add(g.move);
    g.layers.forEach((l) => {
      if (l.part?.move) out.add(l.part.move);
      [l.body, l.cuts, l.restore, l.inks].forEach(walk);
    });
    walk(g.lines);
    walk(g.dots);
  }
  return [...out];
}
