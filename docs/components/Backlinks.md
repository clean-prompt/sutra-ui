# Backlinks

> "Linked from N items" panel: backlinks grouped by app with highlighted context snippets.

- Import: `import { Backlinks } from "@sutra/ui"` (or from `@sutra/ui/suite`)
- Source: `packages/ui/src/kits/workspace/backlinks` (kit `workspace`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `BacklinkItem[]` |  | Items that link here, each with a title, app, snippet and optional date. |
| `defaultOpen` | `boolean` | `true` | Initial expanded state when `open` is not controlled. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no backlinks. |
| `groupByApp` | `boolean` | `true` | Group rows under app headings. Default true. |
| `highlight` | `string \| string[]` |  | Term(s) highlighted in every snippet, usually the current item's title. |
| `onOpenChange` | `(open: boolean) => void` |  | Called with the new state when the user expands or collapses the list. |
| `onSelect` | `(item: BacklinkItem) => void` |  | Called with the item when the user opens a backlink. |
| `open` | `boolean` |  | Controlled expanded state of the list. |
| `title` | `React.ReactNode` |  | Heading. Default "Linked from N items". |

## Example (live: `#/components/suite/backlinks` in the playground)

```tsx
import { Backlinks } from "@sutra/ui/suite";

<div className="@container w-full">
  <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
    <Backlinks items={backlinks} highlight="Q4 launch plan" />
    <Backlinks items={[]} />
  </div>
</div>
```

Playground helpers in this snippet (not part of the library): backlinks.
