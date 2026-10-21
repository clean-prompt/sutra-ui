# PanSurface

> An inertial canvas for boards and big images: drag it and it keeps gliding with time-based friction (`usePan`), stops at its edges with a springy bounce, and moves with the wheel and the arrow keys (Shift for bigger steps, Page Up and Down, Home to recenter). With `zoom` the existing `useZoomPan` handles the scale (wheel with Ctrl or Command, buttons, `+`, `-`, `0`); the offset stays in `usePan`'s CSS variables, so a drag never re-renders. A recenter button appears once the canvas has moved. It is a labelled, focusable group whose content stays in the DOM order for screen readers. A drag on a button inside the canvas still pans and the click after a drag is swallowed; put `data-pan-ignore` on parts that need their own pointer handling. The surface takes touch from the page (`touch-action: none` on its axis), so leave room to scroll around it.

- Import: `import { PanSurface } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/mobile`)
- Source: `packages/ui/src/patterns/pan-surface` (patterns)
- `data-slot`: `pan-surface`, `pan-surface-content`, `pan-surface-controls`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` (required) | `React.ReactNode` |  | The canvas: a board, a big image, a diagram. It is centred and keeps its own size. |
| `apiRef` | `React.Ref<PanSurfaceApi>` |  | Imperative handle (`recenter`, `panTo`, `panBy`, `get`). |
| `axis` | `DragAxis` | `"both"` | Axis that follows the finger; the other is left to native scrolling. Default "both". |
| `bounds` | `"content" \| "none"` | `"content"` | `"content"` stops the canvas where its edge meets the viewport (a canvas that fits cannot move); `"none"` lets it go anywhere. Default "content". |
| `contentClassName` | `string` |  | Classes of the layer that moves (padding around the canvas goes here). |
| `contentSize` | `{ width: number; height: number }` |  | Natural size of the canvas when it is known (otherwise measured). |
| `controls` | `boolean \| "auto"` | `"auto"` | The control buttons: `"auto"` shows them once the canvas has moved or zoomed, `true` always, `false` never. Default "auto". |
| `defaultScale` | `number` | `1` | The zoom at rest and after Recenter. Default 1. |
| `disabled` | `boolean` | `false` | Ignore drags, the wheel and keys (and drop the tab stop). |
| `friction` | `number` | `INERTIA_FRICTION` | Friction per second of the glide after a flick. Default 6. |
| `home` | `"center" \| "start"` | `"center"` | Where the canvas rests and where Recenter and Home bring it: `"center"`, or `"start"` to line its inline-start and top edges up with the viewport's (a board begins at its first column; right-to-left text starts at the right). Default "center". |
| `label` | `string` | `"Pannable canvas"` | Accessible name of the surface. Default "Pannable canvas". |
| `maxScale` | `number` |  | Largest zoom. Default 4. |
| `minScale` | `number` |  | Smallest zoom. Default 0.5. |
| `onPan` | `(x: number, y: number) => void` |  | Runs whenever the offset changes (every frame of a drag or glide). |
| `recenterLabel` | `string` | `"Recenter"` | Accessible name of the recenter button. Default "Recenter". |
| `spring` | `SpringConfig \| SpringName` | `"gentle"` | Spring of the bounce and of the recenter glide. Default "gentle". |
| `step` | `number` | `48` | Px of one arrow key press (four times that with Shift). Default 48. |
| `wheel` | `"pan" \| "none"` | `"pan"` | `"pan"`: the wheel moves the canvas (and is left to the page at the edge); `"none"`. Default "pan". |
| `zoom` | `boolean` | `false` | Add zoom, composed from `useZoomPan`: Ctrl or Command with the wheel (a trackpad pinch), the buttons and the `+`, `-`, `0` keys. Default false. |

## Example (live: `#/components/showpieces/pan-surface-zoom` in the playground)

```tsx
import { PanSurface } from "@cleanprompt/sutra-ui/mobile";

function Diagram() {
  const nodes = [
    { x: 120, y: 120, label: "Edge" },
    { x: 420, y: 80, label: "Auth" },
    { x: 700, y: 160, label: "API" },
    { x: 980, y: 120, label: "Queue" },
    { x: 260, y: 420, label: "Cache" },
    { x: 600, y: 480, label: "Database" },
    { x: 940, y: 460, label: "Workers" },
  ];
  const links = [[0, 1], [1, 2], [2, 3], [2, 5], [4, 5], [1, 4], [3, 6], [5, 6]] as const;
  return (
    <PanSurface zoom label="Service map" className="h-96" minScale={0.5} maxScale={3} contentSize={{ width: 1200, height: 640 }}>
      <svg width={1200} height={640} viewBox="0 0 1200 640" role="img" aria-label="Seven services and how they connect" className="text-foreground">
        <defs>
          <pattern id="pan-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" className="stroke-border" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1200" height="640" fill="url(#pan-grid)" />
        {links.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={nodes[a]!.x} y1={nodes[a]!.y} x2={nodes[b]!.x} y2={nodes[b]!.y} className="stroke-border-strong" strokeWidth="2" />
        ))}
        {nodes.map((n) => (
          <g key={n.label}>
            <rect x={n.x - 56} y={n.y - 24} width="112" height="48" rx="12" className="fill-card stroke-border-strong" strokeWidth="1.5" />
            <text x={n.x} y={n.y + 5} textAnchor="middle" className="fill-foreground text-sm font-medium">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </PanSurface>
  );
}
```
