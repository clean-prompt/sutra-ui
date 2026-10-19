# RemoteCursor

> Colored pointer/caret with a name label for another collaborator; the label fades when idle.

- Import: `import { RemoteCursor } from "@sutra/ui"` (or from `@sutra/ui/mobile`)
- Source: `packages/ui/src/kits/social/presence` (kit `social`)
- `data-slot`: `remote-cursor`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Collaborator name shown on the cursor label. |
| `x` (required) | `number \| string` |  | Position inside the nearest positioned ancestor (px number or any CSS length). |
| `y` (required) | `number \| string` |  | Vertical position inside the nearest positioned ancestor (a number is px, or any CSS length). |
| `caretHeight` | `number` | `20` | Caret height in px. Default 20. |
| `color` | `string` |  | Defaults to a color derived from `id ?? name`. |
| `id` | `string` |  | Stable collaborator id; with the name, it seeds the default colour. |
| `idleTimeout` | `number` | `3000` | Hide the name label after this many ms without movement. Default 3000; 0 keeps it. |
| `variant` | `"arrow" \| "caret"` | `"arrow"` | `arrow` for canvases, `caret` for text editors. |
