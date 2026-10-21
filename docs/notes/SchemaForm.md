---
component: SchemaForm
module: patterns/schema-form
use: A settings form generated from a JSON-Schema-like object: typed controls, nested sections, array fields with add and remove, validation, section navigation with search, and either an explicit Save button or debounced autosave with per-field status. `NestedValueEditor` edits one schema value on its own.
instead: Field = hand-built forms with your own controls and layout; Input = a single text field; InlineEditText = edit one value in place; JsonViewer = read-only structured data; McpServerForm = a ready-made form for one known shape
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Through the controls in document order: the search field and section buttons first (when shown), then each field, array buttons, Save |
| Enter | In a text field: submits the form when `onSubmit` is set (native form behaviour) |
| Space | Toggles a switch; the other controls keep their own keys (arrows on a segmented control, the select list keys) |

There are no custom keys, and the layout uses logical sides, so RTL changes nothing.

## Screen readers
- Each field has a real `<label>`; a required one adds a hidden-from-AT asterisk and `aria-required`. Descriptions and errors are linked with `aria-describedby`, and an invalid field has `aria-invalid`. Error text and the "Saving…", "Saved" and "Not saved" marks are plain text, not live regions.
- Objects are `fieldset`s with a `legend`, arrays are `group`s named by the label (with a count) whose items have "Remove Tag 1" buttons, and top-level sections are `section`s named by an `h3`. The navigation is a `nav` named "Sections", with `aria-current` on the chosen button and a hidden " errors" count after submit.
- After a failed submit a `role="alert"` says "Fix 2 fields to continue". A field with `x-disabled-reason` or `disabledFields` is disabled and shows the reason as text with a lock icon.

## Reduced motion
Only the "Saved" tick pops (`animate-pop`), which the global net stops, and the controls carry their own transitions (ended in 1 ms).

## Server rendering
The form renders in full from the schema and value, with ids from `useSafeId`; nothing depends on the browser until you type. Autosave timers start on the first edit.

## Slots
- `schema-form`: the `<form>` element

## Gotchas
- Control type follows the schema: boolean is a switch; an `enum` of three or fewer is a segmented control, more is a select; `number` and `integer` use a number input; `format: "password"` or `x-secret` masks; `format: "textarea"` is a textarea; `email` and `uri` set the input type. An emptied field removes its key from the value.
- Errors show for a field only after it was blurred, edited under autosave, or after the first submit (or all at once with `validateOnMount`). Empty values skip every rule except `required`, which is a list on the parent object. `uri` accepts only `http(s)` URLs, and an invalid `pattern` never fails.
- Autosave (`autosave`, `onSave(value, changedKeys)`) waits `autosaveDelay` (800 ms) after the last edit and saves only the changed top-level keys that are valid; invalid ones are skipped. Throwing from `onSave` marks them "Not saved". Status shows beside top-level fields and arrays, not on a nested object section.
- `onSubmit` runs only when the value is valid, and the button shows a spinner while its promise is pending. Without `onSubmit` (or with `autosave`) there is no Save button. Navigation and search appear above `navThreshold` (8) top-level fields or with more than two sections (`x-category`, or an object's title, else "General"). `onChange` is a deprecated alias of `onValueChange`.

## Example
```tsx
import { SchemaForm, type SchemaFormSchema } from "@cleanprompt/sutra-ui";

const schema: SchemaFormSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", title: "Server name", minLength: 3 },
    port: { type: "integer", minimum: 1, maximum: 65535, default: 8080 },
    region: { type: "string", enum: ["eu", "us", "ap"], enumLabels: ["Europe", "United States", "Asia Pacific"] },
    debug: { type: "boolean", title: "Debug logging", description: "Writes verbose logs to the console." },
  },
};

export function Example({ onSave }: { onSave: (value: Record<string, unknown>) => Promise<void> }) {
  return <SchemaForm schema={schema} onSubmit={onSave} submitLabel="Save settings" />;
}
```
