# ZoomPan

> Zoom & pan viewport for images, diagrams or SVG, with a controls overlay.

- Import: `import { ZoomPan } from "@sutra/ui"` (or from `@sutra/ui/mobile`)
- Source: `packages/ui/src/patterns/zoom-pan` (patterns)
- `data-slot`: `zoom-pan-content`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `contentClassName` | `string` |  | Classes for the zoomable content wrapper. |
| `controls` | `boolean` | `true` | Show the zoom controls overlay. Default true. |
| `controlsPosition` | `"top-right" \| "bottom-right" \| "bottom-left" \| "top-left"` | `"bottom-right"` | Corner the zoom controls sit in. |
| `defaultScale` | `number` | `1` | Initial zoom factor. |
| `label` | `string` | `"Zoomable content"` | Accessible name of the zoomable region. Default "Zoomable content". |
| `maxScale` | `number` | `4` | Largest zoom factor. |
| `minScale` | `number` | `0.5` | Smallest zoom factor. |
| `onChange` | `(state: ZoomPanState) => void` |  | **Deprecated.** Use `onValueChange`. Legacy name of `onValueChange`. |
| `onValueChange` | `(state: ZoomPanState) => void` |  | Called with the new scale and offset after every zoom or pan. |
| `panStep` | `number` |  | Pixels per arrow-key pan. Default 40. |
| `step` | `number` |  | Multiplier per zoom step (buttons / keys). Default 1.25. |
| `wheelRequiresModifier` | `boolean` |  | Require Ctrl/⌘ for wheel zoom (so the page can still scroll). Default false. |

## Example (live: `#/components/chat-extras/zoom-pan` in the playground)

```tsx
import { ZoomPan } from "@sutra/ui/mobile";

function ZoomPanDemo() {
  return (
    <>
      <ZoomPan label="Architecture diagram" className="h-72 w-full">
        <svg viewBox="0 0 360 200" className="h-56 w-auto" role="img" aria-label="Client, gateway and model boxes connected by arrows">
          <defs>
            <marker id="zp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
            </marker>
          </defs>
          {[
            { x: 10, label: "Client" },
            { x: 135, label: "Gateway" },
            { x: 260, label: "Model" },
          ].map((b) => (
            <g key={b.label}>
              <rect x={b.x} y={70} width={90} height={60} rx={10} className="fill-card stroke-border" strokeWidth={2} />
              <text x={b.x + 45} y={105} textAnchor="middle" className="fill-foreground text-[13px] font-medium">
                {b.label}
              </text>
            </g>
          ))}
          <g className="text-muted-foreground" stroke="currentColor" strokeWidth={2}>
            <line x1={100} y1={100} x2={133} y2={100} markerEnd="url(#zp-arrow)" />
            <line x1={225} y1={100} x2={258} y2={100} markerEnd="url(#zp-arrow)" />
          </g>
        </svg>
      </ZoomPan>
    </>
  );
}
```
