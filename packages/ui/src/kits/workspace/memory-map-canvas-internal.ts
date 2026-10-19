/* Private canvas renderer for MemoryMap: time rings, links, glyph nodes and labels. */
import type { MemoryLegendItem, MemoryMapZoom, MemoryNode, MemoryPoint } from "./memory-map-model";
import { glyphPath } from "./memory-map-internal";

export interface MemoryMapDrawInput {
  width: number;
  height: number;
  zoom: MemoryMapZoom;
  baseScale: number;
  ringInfo: readonly { label: string; radius: number }[];
  positions: Map<string, MemoryPoint>;
  radii: Map<string, number>;
  visible: readonly MemoryNode[];
  visibleIds: Set<string>;
  neighbours: Map<string, Set<string>>;
  legendByKind: Map<string, MemoryLegendItem>;
  selectedId: string | null;
  hover: { id: string } | null;
}

/** Draws one frame of the memory map onto `canvas` (no-op without a 2D context). */
export function drawMemoryMap(
  canvas: HTMLCanvasElement | null,
  { width, height, zoom, baseScale, ringInfo, positions, radii, visible, visibleIds, neighbours, legendByKind, selectedId, hover }: MemoryMapDrawInput
) {
  if (!canvas) return;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext("2d");
  } catch {
    ctx = null;
  }
  if (!ctx) return;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  const css = getComputedStyle(canvas);
  const v = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb;
  const fg = v("--foreground", "#18181b");
  const muted = v("--muted-foreground", "#71717a");
  const border = v("--border", "#e4e4e7");
  const bg = v("--background", "#ffffff");
  const primary = v("--primary", "#615fff");
  const z = zoom;
  const s = baseScale * z.k;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.translate(width / 2 + z.x, height / 2 + z.y);
  ctx.scale(s, s);
  const px = 1 / s;

  if (ringInfo.length) {
    ctx.lineWidth = px;
    ctx.strokeStyle = border;
    ctx.fillStyle = muted;
    ctx.font = `${10 * px}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (const ring of ringInfo) {
      ctx.beginPath();
      ctx.setLineDash([3 * px, 4 * px]);
      ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(ring.label, 0, -ring.radius - 2 * px);
    }
  }

  const pos = positions;
  const sel = selectedId && visibleIds.has(selectedId) ? selectedId : null;
  const focusSet = sel ? neighbours.get(sel) : hover ? neighbours.get(hover.id) : undefined;
  const focusId = sel ?? hover?.id ?? null;

  ctx.lineWidth = px;
  for (const n of visible) {
    const a = pos.get(n.id);
    if (!a) continue;
    for (const l of neighbours.get(n.id) ?? []) {
      if (l < n.id || !visibleIds.has(l)) continue;
      const b = pos.get(l);
      if (!b) continue;
      const hot = focusId != null && (n.id === focusId || l === focusId);
      ctx.globalAlpha = hot ? 0.9 : focusId ? 0.12 : 0.35;
      ctx.strokeStyle = hot ? primary : muted;
      ctx.lineWidth = (hot ? 1.5 : 1) * px;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  for (const n of visible) {
    const p = pos.get(n.id);
    if (!p) continue;
    const item = legendByKind.get(n.kind);
    const r = radii.get(n.id) ?? 6;
    const dim = focusId != null && n.id !== focusId && !focusSet?.has(n.id);
    ctx.globalAlpha = dim ? 0.3 : 1;
    ctx.beginPath();
    glyphPath(ctx, item?.glyph ?? "circle", p.x, p.y, r);
    ctx.fillStyle = item?.color ?? muted;
    ctx.fill();
    ctx.lineWidth = 1.5 * px;
    ctx.strokeStyle = bg;
    ctx.stroke();
    if (n.id === sel || n.id === hover?.id) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 4 * px, 0, Math.PI * 2);
      ctx.lineWidth = 2 * px;
      ctx.strokeStyle = n.id === sel ? primary : muted;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  ctx.font = `${11 * px}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const n of visible) {
    const show = n.id === focusId || focusSet?.has(n.id) || (z.k >= 2 && (radii.get(n.id) ?? 0) >= 8);
    if (!show) continue;
    const p = pos.get(n.id);
    if (!p) continue;
    const r = radii.get(n.id) ?? 6;
    ctx.lineWidth = 3 * px;
    ctx.strokeStyle = bg;
    ctx.strokeText(n.label, p.x, p.y + r + 3 * px);
    ctx.fillStyle = fg;
    ctx.fillText(n.label, p.x, p.y + r + 3 * px);
  }
}
