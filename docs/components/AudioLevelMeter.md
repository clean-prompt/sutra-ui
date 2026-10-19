# AudioLevelMeter

> Bars that light up with an audio level (0..1). Horizontal bars stand up like an equalizer.

- Import: `import { AudioLevelMeter } from "@sutra/ui"` (or from `@sutra/ui/voice`)
- Source: `packages/ui/src/kits/voice/voice` (kit `voice`)
- `data-slot`: `level-bar`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `level` (required) | `number` |  | 0..1 |
| `bars` | `number` | `5` | Number of bars in the meter. Default 5. |
| `label` | `string` | `"Input level"` | Accessible name. Default "Input level". |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Direction the bars run: `horizontal` (a row, left to right) or `vertical` (a column, filling upward). Default "horizontal". |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Meter size: `sm`, `md` or `lg`. Default "md". |
| `tone` | `ToneInput` |  | Bar colour. Canonical `Tone`; legacy `"muted"` maps to `neutral`. Default `primary`. |
