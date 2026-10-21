# BacklinkSnippet

> Snippet with case-insensitive matches wrapped in <mark>.

- Import: `import { BacklinkSnippet } from "@sutra/ui"` (or from `@sutra/ui/suite`)
- Source: `packages/ui/src/kits/workspace/backlinks` (kit `workspace`)
- `data-slot`: `backlink-snippet`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `text` (required) | `string` |  | Excerpt of the linking item. |
| `highlight` | `string \| string[]` |  | Term or terms marked inside the excerpt. |
