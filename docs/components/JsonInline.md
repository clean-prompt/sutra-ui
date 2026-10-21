# JsonInline

> One-line syntax-colored JSON preview: `{ id: 1, name: "x", tags: Array(3) }`.

- Import: `import { JsonInline } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ops`)
- Source: `packages/ui/src/patterns/json-viewer` (patterns)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` (required) | `unknown` |  | The value to render on one line (objects and arrays are summarised). |
| `maxLength` | `number` | `80` | Max characters before truncating with "…". Default 80. |
