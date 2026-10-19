// The sizing table: what each `size` step of a component sets, read from the class text of its cva `size` variant (or its
// `const sizes = {...}` map) that extract-api.mjs stores as `sizes` in api.json. Shared by the playground's Sizing page,
// the llms generator and the tests, so the numbers cannot disagree.
//
// Tailwind spacing is 4px per step (`h-9` = 36px); text steps are the theme's (`text-sm` = 14px, `text-2xs` = 11px).
// WCAG 2.5.8 asks for a 24 x 24 css px target: controls under 24px are flagged unless the module extends the hit area
// (`hitArea` / `hitAreaTouch` in lib/cn, an invisible ::after box).

export const TARGET_PX = 24;
const MAX_W = { xs: 320, sm: 384, md: 448, lg: 512, xl: 576, "2xl": 672, "3xl": 768, "4xl": 896, "5xl": 1024, "6xl": 1152, "7xl": 1280 };
const TEXT_PX = { "2xs": 11, xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30, "4xl": 36 };

/** `4` -> 16, `2.5` -> 10, `px` -> 1, `[18px]` -> 18, `[1.5rem]` -> 24; null when it is not a plain length. */
export function lengthPx(token) {
  if (token === "px") return 1;
  if (/^\d+(\.\d+)?$/.test(token)) return Number(token) * 4;
  const m = /^\[(\d+(?:\.\d+)?)(px|rem)\]$/.exec(token);
  if (m) return Number(m[1]) * (m[2] === "rem" ? 16 : 1);
  return null;
}

const fmt = (px) => (Number.isInteger(px) ? `${px}px` : `${Math.round(px * 100) / 100}px`);

/** Splits a size's class text into the columns of the table. Tokens with a variant prefix (`sm:`, `data-[x]:`) are ignored, except the icon rule. */
export function parseSizeClasses(text) {
  const out = { height: null, width: null, maxWidth: null, padX: null, padY: null, text: null, icon: null, hit: false, parts: [] };
  const tokens = String(text ?? "").split(/\s+/).filter(Boolean);
  let part = null;
  for (const t of tokens) {
    if (t.endsWith(":") && !t.includes("[")) {
      part = t.slice(0, -1);
      out.parts.push(part);
      continue;
    }
    if (t.startsWith("@hitArea")) {
      out.hit = true;
      continue;
    }
    if (part) continue; // nested parts (slider track and thumb) are shown raw, not as columns
    const svg = /^\[&_svg\]:size-(.+)$/.exec(t);
    if (svg) {
      out.icon = lengthPx(svg[1]);
      continue;
    }
    // Dialog-style widths carry a breakpoint prefix (`sm:max-w-lg`): read the max width before the prefixed tokens are skipped.
    const mw = /^(?:(?:sm|md|lg):)?max-w-(.+)$/.exec(t);
    if (mw && !t.includes("[&")) {
      out.maxWidth ??= MAX_W[mw[1]] ?? lengthPx(mw[1]);
      continue;
    }
    if (t.includes(":")) continue;
    let m;
    if ((m = /^(?:h|min-h)-(.+)$/.exec(t))) out.height ??= lengthPx(m[1]);
    else if ((m = /^size-(.+)$/.exec(t))) {
      out.height ??= lengthPx(m[1]);
      out.width ??= lengthPx(m[1]);
    } else if ((m = /^w-(.+)$/.exec(t))) out.width ??= lengthPx(m[1]);
    else if ((m = /^(?:px|ps|pe)-(.+)$/.exec(t))) out.padX ??= lengthPx(m[1]);
    else if ((m = /^py-(.+)$/.exec(t))) out.padY ??= lengthPx(m[1]);
    else if ((m = /^p-(.+)$/.exec(t))) {
      out.padX ??= lengthPx(m[1]);
      out.padY ??= lengthPx(m[1]);
    } else if ((m = /^text-(2xs|xs|sm|base|lg|xl|2xl|3xl|4xl)$/.exec(t))) out.text = { name: m[1], px: TEXT_PX[m[1]] };
    else if ((m = /^text-\[(\d+(?:\.\d+)?)px\]$/.exec(t))) out.text = { name: `${m[1]}px`, px: Number(m[1]) };
  }
  return out;
}

/** One row per component and size, primitives first. */
export function buildSizingRows(api) {
  const layers = ["primitives", "patterns", "kits", "blocks", "assets"];
  const rows = [];
  for (const [component, entry] of Object.entries(api.components)) {
    if (!entry.sizes) continue;
    const def = entry.props.find((p) => p.name === "size")?.default?.replace(/^["']|["']$/g, "");
    const moduleHit = Boolean(entry.hitArea);
    for (const [size, raw] of Object.entries(entry.sizes)) {
      const p = parseSizeClasses(raw);
      const smallest = p.height ?? p.width;
      const hit = p.hit || moduleHit;
      rows.push({
        component,
        layer: entry.layer,
        entry: entry.entry,
        size,
        isDefault: def === size,
        raw,
        height: p.height,
        width: p.width,
        maxWidth: p.maxWidth,
        padX: p.padX,
        padY: p.padY,
        text: p.text,
        icon: p.icon,
        nested: p.parts.length > 0,
        hit,
        under: smallest !== null && smallest < TARGET_PX,
      });
    }
  }
  return rows
    .filter((r) => r.nested || [r.height, r.width, r.maxWidth, r.padX, r.padY, r.text, r.icon].some((v) => v !== null))
    .sort(
    (a, b) => layers.indexOf(a.layer) - layers.indexOf(b.layer) || a.component.localeCompare(b.component) || order(a, b)
  );
}

/** Keeps a component's sizes in the order they are declared (api.json keeps source order): rows already come that way. */
const order = () => 0;

/** The cells of a row as text (the page and the markdown use the same wording). */
export function describeRow(r) {
  const max = r.maxWidth !== null && r.height === null && r.width === null ? `max w ${fmt(r.maxWidth)}` : "";
  const own = r.height !== null && r.width !== null && r.height === r.width ? `${fmt(r.height)} square` : r.height !== null ? `h ${fmt(r.height)}${r.width !== null ? `, w ${fmt(r.width)}` : ""}` : r.width !== null ? `w ${fmt(r.width)}` : "";
  const box = max || own;
  const pad = r.padX !== null || r.padY !== null ? [r.padX !== null ? `x ${fmt(r.padX)}` : "", r.padY !== null ? `y ${fmt(r.padY)}` : ""].filter(Boolean).join(", ") : "";
  return {
    size: r.size,
    box,
    padding: pad,
    text: r.text ? `${r.text.name}${TEXT_PX[r.text.name] ? ` (${r.text.px}px)` : ""}` : "",
    icon: r.icon !== null ? fmt(r.icon) : "",
    target: r.under ? (r.hit ? "under 24px, hit area extended" : "under 24px") : "",
  };
}

/** The markdown table the skill ships (skills/sutra-ui/references/sizing.md). */
export function sizingMarkdown(rows) {
  const lines = [
    "<!-- Generated by packages/ui/scripts/gen-llms.mjs (pnpm docs:llms). Do not edit. -->",
    "# Sizing",
    "",
    "What each size step of a component sets, read from its cva `size` variant or size map. Tailwind spacing is 4px per step. Controls under 24px are flagged (WCAG 2.5.8); `hit area extended` means the module adds an invisible 24px (44px on touch for primary icon buttons) target with `hitArea`. Stock control heights: sm 32px, md 36px, lg 40px.",
    "",
    "| Component | Size | Box | Padding | Text | Icon | Target |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const r of rows) {
    const d = describeRow(r);
    lines.push(`| ${r.component} | ${d.size}${r.isDefault ? " (default)" : ""} | ${d.box || (r.nested ? "see source" : "")} | ${d.padding} | ${d.text} | ${d.icon} | ${d.target} |`);
  }
  return `${lines.join("\n")}\n`;
}
