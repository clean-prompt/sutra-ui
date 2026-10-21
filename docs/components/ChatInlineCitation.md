# ChatInlineCitation

> Superscript [n] citation pill; shows a preview card on hover when `href` is set.

- Import: `import { ChatInlineCitation } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/patterns/inline-citation` (patterns)
- `data-slot`: `inline-citation`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `index` (required) | `number` |  | Citation number shown in the badge (1-based). |
| `favicon` | `string` |  | Icon URL for this source. Without it (and without a FaviconProvider) a local monogram is shown. |
| `href` | `string` |  | URL of the source; unsafe URLs are not linked. |
| `snippet` | `string` |  | Excerpt shown in the preview card. |
| `title` | `string` |  | Source title, shown in the preview card and used in the accessible name. |
