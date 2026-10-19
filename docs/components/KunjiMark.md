# KunjiMark

> The kunji brand assets, as published in the kunji brand guide: `variant="tile"` is the logo (the app icon: an amber rounded square with the ink key set at -40 degrees) and `variant="glyph"` is the key mark on its own, drawn in `currentColor` (ink on the amber button, paper on the dark one). Do not recolour, rotate, stretch or add effects.

- Import: `import { KunjiMark } from "@sutra/ui"` (or from `@sutra/ui/kunji`)
- Source: `packages/ui/src/kits/identity/kunji-sign-in` (kit `identity`)
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `number` | `20` | Pixel size. The brand guide asks for at least 20px for the logo; 18px is what the official button uses for the key mark. |
| `title` | `string` |  | Accessible name; when unset the mark is decorative and hidden from assistive tech. |
| `variant` | `"tile" \| "glyph"` | `"glyph"` | `tile` the kunji logo (the amber app icon with the ink key), `glyph` the key mark alone in `currentColor`. |
