# MentionInput

> Text field where "@", "#" and "/" open a suggestion menu and insert mention tokens.

- Import: `import { MentionInput } from "@sutra/ui"` (or from `@sutra/ui/suite`)
- Source: `packages/ui/src/kits/workspace/entity-mention` (kit `workspace`)
- `data-slot`: `mention-input`
- Also accepts the props of HTMLAttributes, TextareaHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string` | `""` | Initial stored text when `value` is not controlled. |
| `invalid` | `boolean` |  | Marks the field as invalid (red border, `aria-invalid`). |
| `maxSuggestions` | `number` | `8` | Max suggestions shown. Default 8. |
| `onCommand` | `(command: MentionSuggestion) => void` |  | Called when a "/" command is picked. |
| `onSearch` | `MentionSearchHandler` |  | Async search; takes precedence over `suggestions`. |
| `onValueChange` | `(value: string) => void` |  | Receives the stored text, with tokens like `@[Title](tasks:123)`. |
| `singleLine` | `boolean` | `false` | Render a single-line input instead of a textarea. |
| `suggestions` | `Partial<Record<MentionTrigger, MentionSuggestion[]>>` |  | Static suggestions per trigger, filtered by the typed query. |
| `triggers` | `MentionTrigger[]` | `["@", "#", "/"]` | Triggers that open the menu. Default all three. |
| `value` | `string` |  | Controlled stored text, with mention tokens like `@[Title](tasks:123)`. |
| `wrapperClassName` | `string` |  | Extra classes for the wrapper around the field and its menu; `className` goes to the field. |

## Example (live: `#/components/suite/mention-input` in the playground)

```tsx
import * as React from "react";
import { Card } from "@sutra/ui/core";
import { Label } from "@sutra/ui/forms";
import { MentionInput, MentionText } from "@sutra/ui/suite";

function MentionDemo() {
  const [value, setValue] = React.useState("Sync with @[Ana Lima](person:ana) about #[Q4 launch plan](notes:n1) ");
  const onSearch = React.useCallback(async (trigger: string, query: string) => {
    await new Promise((r) => setTimeout(r, 150));
    const q = query.toLowerCase();
    const pool = trigger === "@" ? people : trigger === "#" ? library : commands;
    return pool.filter((s) => s.title.toLowerCase().includes(q));
  }, []);
  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 gap-6 @2xl:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mention-demo">Comment</Label>
          <MentionInput id="mention-demo" value={value} onValueChange={setValue} onSearch={onSearch} rows={4} />
          <p className="text-xs text-muted-foreground">@ people · # notes, tasks and events · / commands (async search)</p>
        </div>
        <div className="space-y-2">
          {/* Rendered with MentionText */}
          <Card className="p-4 text-sm leading-7">
            <MentionText value={value} getHref={(m) => `#${m.type}/${m.id}`} />
          </Card>
          {/* Stored value */}
          <pre className="whitespace-pre-wrap break-all rounded-box bg-muted p-3 font-mono text-xs">{value}</pre>
        </div>
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): commands, library, people.
