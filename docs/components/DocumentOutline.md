# DocumentOutline

> Heading tree of a document: indented by level, active highlight, click to jump, optional filter.

- Import: `import { DocumentOutline } from "@sutra/ui"` (or from `@sutra/ui/editor`)
- Source: `packages/ui/src/kits/editor/document-outline` (kit `editor`)
- `data-slot`: `document-outline`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `headings` (required) | `OutlineHeading[]` |  | Headings in document order, each with a level, text and id. |
| `activeId` | `string` |  | `id` (or `line-<n>`) of the current heading. |
| `emptyHint` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no headings. |
| `filterable` | `boolean` |  | Show a filter box. Default: when there are more than 8 headings. |
| `maxLevel` | `number` | `6` | Deepest level listed. Default 6. |
| `onNavigate` | `(heading: OutlineHeading) => void` |  | Called with the heading when the user presses an entry. |
| `title` | `React.ReactNode` | `"Outline"` | Heading shown above the list. Default "Outline"; `null` hides it. |
