# MentionText

> Renders stored mention text with inline EntityChips.

- Import: `import { MentionText } from "@sutra/ui"` (or from `@sutra/ui/suite`)
- Source: `packages/ui/src/kits/workspace/entity-mention` (kit `workspace`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` (required) | `string` |  | Stored text with mention tokens. |
| `chipSize` | `EntityChipProps["size"]` | `"sm"` | Size of the chips that replace mention tokens. |
| `getHref` | `(mention: MentionToken) => string` |  | Link builder for chips. |
| `renderMention` | `(mention: MentionToken, index: number) => React.ReactNode` |  | Custom renderer for each mention. |
