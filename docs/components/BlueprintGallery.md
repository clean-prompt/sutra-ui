# BlueprintGallery

> Filterable grid of automation templates (search + tag chips); one card expands at a time.

- Import: `import { BlueprintGallery } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-jobs-blueprints` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `blueprints` (required) | `Blueprint[]` |  | Templates to list, one card each. |
| `channels` | `SelectOption[]` |  | Options offered by `channel` slots. |
| `empty` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `emptyState` | `React.ReactNode` |  | Shown when no template matches. Default "No templates match". |
| `onCreate` | `(blueprint: Blueprint, values: BlueprintValues) => void \| Promise<void>` |  | Called with the blueprint and the filled slot values when the user creates a job (`create` variant). |
| `onOpen` | `(blueprint: Blueprint) => void` |  | Called with the blueprint when the user opens its app (`open` variant). |
| `searchable` | `boolean` | `true` | Shows the search box above the cards. |
| `variant` | `"create" \| "open"` | `"create"` | `create` expands each card into the slot form; `open` links to the app instead. |

## Example (live: `#/components/automation/blueprint-gallery` in the playground)

```tsx
import * as React from "react";
import { BlueprintGallery } from "@cleanprompt/sutra-ui/agent-admin";

function BlueprintDemo() {
  const [created, setCreated] = React.useState<string>("");
  return (
    <div className="flex w-full flex-col gap-3">
      <BlueprintGallery
        blueprints={BLUEPRINTS}
        channels={CHANNELS}
        onCreate={(bp, values) => setCreated(`Created “${bp.title}” with ${JSON.stringify(values)}`)}
      />
      {created ? <p className="text-xs text-muted-foreground">{created}</p> : null}
      {/* “Open in app” variant */}
      <BlueprintGallery blueprints={BLUEPRINTS.slice(0, 3).map((b) => ({ ...b, appHref: `#/automation/new?blueprint=${b.id}` }))} variant="open" searchable={false} />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): BLUEPRINTS, CHANNELS.
