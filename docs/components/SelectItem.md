# SelectItem

> A selectable option with a check indicator.

- Import: `import { SelectItem } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/select` (primitives)
- Part of [`Select`](Select.md)
- Also accepts the props of HTMLAttributes, SelectItemProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` |  | Secondary line under the label. Not shown in the trigger. |
| `icon` | `React.ReactNode` |  | Leading icon; also shown in the trigger when selected. |

## Notes

See the notes in [`Select`](Select.md#notes).

## Example

```tsx
import * as React from "react";
import { Field, FieldLabel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SimpleSelect } from "@sutra/ui";

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
