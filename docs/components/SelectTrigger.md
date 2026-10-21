# SelectTrigger

> Input-like button that opens the select.

- Import: `import { SelectTrigger } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/select` (primitives)
- Part of [`Select`](Select.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `invalid` | `boolean` |  | Marks the trigger invalid (same as `aria-invalid`). |
| `leadingIcon` | `React.ReactNode` |  | Icon rendered before the value. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Trigger height and text size: `sm`, `md` or `lg`. |
| `variant` | `"outline" \| "filled"` | `"outline"` | `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. |

## Variants

- `size`: `sm`, `md`, `lg` (default "md")
- `variant`: `outline`, `filled` (default "outline")

## Notes

See the notes in [`Select`](Select.md#notes).

## Example

```tsx
import * as React from "react";
import { Field, FieldLabel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SimpleSelect } from "@cleanprompt/sutra-ui";

const roles = [
  { value: "viewer", label: "Viewer", description: "Can read" },
  { value: "editor", label: "Editor", description: "Can edit" },
  { value: "admin", label: "Admin", description: "Can manage members" },
];

export function Example() {
  const [role, setRole] = React.useState("viewer");
  return (
    <div className="grid max-w-xs gap-4">
      <Field>
        <FieldLabel>Role</FieldLabel>
        <SimpleSelect options={roles} value={role} onValueChange={setRole} />
      </Field>
      <Select defaultValue="eu-west">
        <SelectTrigger aria-label="Region">
          <SelectValue placeholder="Choose a region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="eu-west">Ireland</SelectItem>
          <SelectItem value="eu-central">Frankfurt</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```
