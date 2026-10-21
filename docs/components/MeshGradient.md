# MeshGradient

> Decorative animated gradient background; children render above it.

- Import: `import { MeshGradient } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/mesh-gradient` (primitives)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `animated` | `boolean` | `true` | Slowly drifts the colour blobs; the motion stops under `prefers-reduced-motion`. |
| `blur` | `number` | `64` | Blur radius in px. |
| `colors` | `string[]` | `defaultColors` | Up to 5 CSS colors. Defaults to the brand palette. |
| `grain` | `boolean` | `false` | Film-grain noise overlay. |
| `grainOpacity` | `number` | `0.18` | Opacity of the grain overlay, 0 to 1 (needs `grain`). |
| `intensity` | `number` | `0.7` | Blob opacity, 0–1. |
| `layerClassName` | `string` |  | Classes for the decorative background layer. |
| `speed` | `number` | `1` | Animation speed multiplier (1 = 18s loop). |

## Notes

**When to use:** A decorative background of blurred, slowly drifting colour blobs, with optional film grain. Children render above it, so it works as a hero or panel backdrop.

**Use instead when:**
- `Card`: a plain bordered surface
- `Frame`: a tray around rows
- `Skeleton`: a loading placeholder

### Keyboard

Not focusable: no keyboard interaction. The background layer is `pointer-events-none`, so it never blocks clicks on the content above it.

### Screen readers

The blob layer and the grain are `aria-hidden` decoration; only your `children` are exposed. The gradient adds no contrast guarantee: check that the text you put on it passes against every colour in `colors`.

### Reduced motion

Under `prefers-reduced-motion` the blobs stand still (`motion-reduce:animate-none`, and the `animate-mesh` rule in `sutra.css` stops it too), leaving the static gradient. `animated={false}` does the same on demand.

### Server rendering

Server render: same markup as the client. Plain markup with inline styles and no browser API, so server and client output match. The motion is CSS only.

### Gotchas

- At most five colours are used (one per blob); fewer repeat, and an empty array falls back to the default palette (three brand shades plus the `--chart-2` cyan and `--chart-6` violet, so a style such as paper retunes it). `colors` take any CSS colour, including `var(--color-brand-500)`.
- `speed` multiplies the loop (1 is about 18 s, and each blob runs a little slower), `blur` is in px, `intensity` is blob opacity from 0 to 1 (default 0.7), and `grain` with `grainOpacity` adds the noise overlay.
- The root is `relative isolate overflow-hidden`, and the layer sits at `-z-10` inside it: give the root a size (`className="h-64"`) and your own padding, since the layer is absolute. `layerClassName` styles the layer.
- Large blurred areas cost paint time on low-end devices: a big `blur` over a full screen is the expensive combination.

## Example

```tsx
import { Badge, Heading, MeshGradient, Text } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <MeshGradient grain className="rounded-box border border-border">
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <Badge variant="dot" tone="primary">
          New in 2.0
        </Badge>
        <Heading as="h2" size="display-xs">
          Build interfaces faster
        </Heading>
        <Text size="sm">Tokens, components and docs in one package.</Text>
      </div>
    </MeshGradient>
  );
}
```
