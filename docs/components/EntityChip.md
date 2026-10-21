# EntityChip

> Inline reference to an item in any Sutra app, tinted with the app's accent.

- Import: `import { EntityChip } from "@sutra/ui"` (or from `@sutra/ui/suite`)
- Source: `packages/ui/src/kits/workspace/entity-mention` (kit `workspace`)
- `data-slot`: `entity-chip`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` (required) | `string` |  | Id of the referenced item. |
| `title` (required) | `string` |  | Display name of the referenced item. |
| `type` (required) | `EntityType` |  | What the chip refers to: an app (notes, tasks and so on), `person` or `tag`; picks the icon and colour. |
| `date` | `Date \| string` |  | Date of the item (due or created), shown in the hover card. |
| `hideIcon` | `boolean` |  | Hide the app icon. |
| `href` | `string` |  | Link target; the chip renders as plain text when unset. |
| `preview` | `React.ReactNode` |  | Hover card content (e.g. a preview of the note or task). |
| `size` | `"sm" \| "md"` | `"md"` | Chip size. |
| `status` | `string` |  | Status text of the item (for example "In progress"), shown in the hover card. |

## Example (live: `#/components/suite/entity-chip` in the playground)

```tsx
import { EntityChip } from "@sutra/ui/suite";

<div className="flex flex-wrap items-center gap-2">
  <EntityChip type="notes" id="n1" title="Q4 launch plan" href="#" preview={<p className="text-sm">Goals, timeline and owners for the October launch…</p>} />
  <EntityChip type="tasks" id="t1" title="Draft launch email" status="done" />
  <EntityChip type="tasks" id="t2" title="Book venue" />
  <EntityChip type="calendar" id="e1" title="Launch sync" date={new Date(2026, 9, 15, 10)} />
  <EntityChip type="mail" id="m1" title="Re: Contract" />
  <EntityChip type="files" id="f1" title="Brand assets.zip" />
  <EntityChip type="journal" id="j1" title="Oct 12" />
  <EntityChip type="finance" id="x1" title="Rent" />
  <EntityChip type="habits" id="h1" title="Meditate" />
  <EntityChip type="person" id="p1" title="Ana Lima" />
  <EntityChip type="tag" id="g1" title="launch" size="sm" />
</div>
```
