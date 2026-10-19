# KeyValueRowsInput

> Repeatable key/value rows with add/remove, duplicate-key detection and optional value masking.

- Import: `import { KeyValueRowsInput } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/mcp` (kit `agent-admin`)
- `data-slot`: `key-value-rows`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `addLabel` | `string` | `"Add row"` | Label of the button that appends an empty row. |
| `defaultValue` | `KeyValueRowsEntry[]` | `[]` | Initial rows when `value` is not controlled. |
| `disabled` | `boolean` |  | Disables every field and the add and remove buttons. |
| `keyPlaceholder` | `string` | `"KEY"` | Placeholder of the key field in each row. |
| `label` | `string` | `"Variables"` | Accessible name for the group, also used to label row inputs. |
| `onValueChange` | `(rows: KeyValueRowsEntry[]) => void` |  | Called with the full row list when the user edits, adds or removes a row. |
| `secret` | `boolean \| "auto"` | `"auto"` | Mask values: always, never, or `"auto"` (keys that look like secrets). Default "auto". |
| `value` | `KeyValueRowsEntry[]` |  | Controlled rows as `{ key, value }` entries. |
| `valuePlaceholder` | `string` | `"value"` | Placeholder of the value field in each row. |

## Example (live: `#/components/capabilities/key-value-rows` in the playground)

```tsx
import * as React from "react";
import { KeyValueRowsInput } from "@sutra/ui/agent-admin";

function KeyValueDemo() {
  const [rows, setRows] = React.useState<KeyValueRowsEntry[]>([
    { key: "GITHUB_PERSONAL_ACCESS_TOKEN", value: "ghp_demo_123" },
    { key: "GITHUB_HOST", value: "github.com" },
  ]);
  return (
    <div className="w-full max-w-xl space-y-2">
      <KeyValueRowsInput label="Environment variable" value={rows} onValueChange={setRows} addLabel="Add variable" />
      {/* Keys that look like secrets (TOKEN, KEY, SECRET…) are masked automatically. Duplicate keys are flagged. */}
    </div>
  );
}
```
