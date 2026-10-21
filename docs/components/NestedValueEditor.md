# NestedValueEditor

> Recursive editor for one schema value: primitives, nested object sections and arrays with add/remove.

- Import: `import { NestedValueEditor } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/patterns/schema-form-editor` (patterns)
- `data-slot`: `schema-form-group`, `schema-form-field`, `schema-form-status`, `schema-form-disabled-note`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `schema` (required) | `SchemaFormSchema` |  | JSON-schema-like description of the value to edit (type, properties, enums, constraints). |
| `value` (required) | `unknown` |  | The value to edit; its shape follows `schema`. |
| `ariaLabel` | `string` |  | Accessible label when `bare`. |
| `bare` | `boolean` |  | Render without the label row (e.g. array items of primitive type). |
| `name` | `string` |  | Property name (used for the label when the schema has no title). |
| `onChange` | `(value: unknown) => void` |  | **Deprecated.** Use `onValueChange`. Legacy name of `onValueChange`. |
| `onValueChange` | `(value: unknown) => void` |  | Called with the edited value. |
| `path` | `string` | `""` | Dotted path of this value inside the form. |
| `required` | `boolean` |  | Marks the field required: shows the asterisk and blocks an empty value. |

## Notes

**When to use:** The recursive editor that SchemaForm renders for each field: one schema value as a control, a nested object section or an array with add and remove. Use it on its own to edit a single JSON-Schema-like value outside a full form.

**Use instead when:**
- `SchemaForm`: a whole form with sections, validation, navigation and Save or autosave
- `Input`: one plain text field
- `JsonViewer`: read-only structured data

### Keyboard

There are no custom keys: every control keeps its own (Tab and Shift+Tab through them, Space on a switch, arrows on a segmented control or the select list, Enter on the add and remove buttons).

### Screen readers

- A primitive has a real `<label>`; `required` adds a hidden-from-AT asterisk, and descriptions and errors are linked with `aria-describedby`.
- An object is a `fieldset` with a `legend`; an array is a `group` named by its label, and its items have "Remove" buttons named after the item. With `bare`, the label row is left out, so pass `ariaLabel` to name the control.
- A field with `x-disabled-reason` is disabled and shows the reason as text.

### Reduced motion

Only the "Saved" tick pops (`animate-pop`), which the global net stops; the controls carry their own short transitions.

### Server rendering

Server render: same markup as the client. It renders in full from `schema` and `value`; ids come from the path, so server and client agree. Nothing depends on the browser until you type.

### Gotchas

- Standalone it has no form around it: errors, save status and disabled fields come from the nearest `SchemaForm`, so outside one every field shows its own state with no errors. Hold the value yourself and pass `onValueChange`.
- `path` is the dotted position inside the form (it builds the ids and the error and status keys); leave it empty for a root value, and use `name` for the label when the schema has no `title`.
- Control type follows the schema, as in `SchemaForm`: boolean is a switch, a short `enum` a segmented control, a longer one a select. `onChange` is the deprecated name of `onValueChange`.

## Example

```tsx
import { useState } from "react";
import { NestedValueEditor } from "@sutra/ui";

export function Example() {
  const [value, setValue] = useState<unknown>({ name: "Maya", tags: ["design"] });
  return (
    <NestedValueEditor
      schema={{
        type: "object",
        properties: { name: { type: "string", title: "Name" }, tags: { type: "array", items: { type: "string" } } },
        required: ["name"],
      }}
      value={value}
      onValueChange={setValue}
    />
  );
}
```
