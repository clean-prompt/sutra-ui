# NoiseTexture

> A film-grain overlay, absolutely positioned over its container.

- Import: `import { NoiseTexture } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/backgrounds` (assets)
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `frequency` | `number` | `0.8` | Turbulence base frequency; higher is finer grain. |
| `opacity` | `number` | `0.08` | Grain opacity, 0 to 1; keep it low. |
