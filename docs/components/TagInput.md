# TagInput

> Text input that turns entries into removable tag chips, with optional suggestions.

- Import: `import { TagInput } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/tag-input` (primitives)
- `data-slot`: `tag-input`, `tag-input-tag`, `tag-input-field`, `tag-input-count`, `tag-input-announcer`
- Also accepts the props of HTMLAttributes, InputHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `addOnBlur` | `boolean` | `false` | Commit the pending text when the input loses focus. |
| `allowDuplicates` | `boolean` | `false` | Allow the same tag more than once (case-insensitive comparison otherwise). |
| `confirmBackspace` | `boolean` | `false` | Backspace on an empty field first marks the last tag (announced politely: "Press Backspace again to remove …") and a second press removes it. Typing, blur or any other key clears the mark, and a held key never confirms. Default false: Backspace removes the last tag at once. |
| `defaultValue` | `string[]` | `[]` | Initial tags when uncontrolled. |
| `emptyState` | `React.ReactNode` |  | Empty state inside the suggestions dropdown. |
| `emptyText` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Legacy name of `emptyState`. |
| `invalid` | `boolean` |  | Marks the field invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `max` | `number` |  | Maximum number of tags. |
| `normalize` | `(text: string) => string` | `defaultNormalize` | Transform text before it becomes a tag. Default trims whitespace. |
| `onReject` | `(tag: string, reason: TagRejectReason) => void` |  | Called when a tag is rejected. |
| `onValueChange` | `(value: string[]) => void` |  | Called with the full tag list after a tag is added or removed. |
| `renderTag` | `(tag: string, state: TagRenderState) => React.ReactNode` |  | Custom content for a tag, in place of its text. The chip frame, remove button and pending mark stay. |
| `restrictToSuggestions` | `boolean` | `false` | Only accept tags from `suggestions`. |
| `separators` | `string[]` | `[","]` | Extra characters (or strings) that commit a tag. Enter and Tab always do; key names like "Enter" are treated as keys, not characters. Default `[","]`. |
| `showCount` | `boolean` | `false` | Show the number of tags (and the limit, with `max`) after the tags. |
| `size` | `Size` | `"md"` | Field height and text size. |
| `suggestions` | `string[]` |  | Options shown in a dropdown, filtered as you type. |
| `tagClassName` | `string` |  | Classes for each tag chip. |
| `validate` | `(tag: string, tags: string[]) => boolean` |  | Return `false` to reject a tag. |
| `value` | `string[]` |  | Controlled list of tags. Use with `onValueChange`. |
| `variant` | `"outline" \| "filled"` |  | `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. |
| `wrapperClassName` | `string` |  | Class for the outer container. |

## Notes

**When to use:** A text field that turns what you type into removable tag chips. It takes a `string[]`, with duplicate, `max` and `validate` checks, optional `suggestions` in a dropdown, and paste that splits on separators.

**Use instead when:**
- `Combobox`: the choices come from a fixed list and need labels (`multiple` mode)
- `Input`: a single text value
- `Chip`: a standalone label, not an editor
- `Badge`: a categorical label

### Keyboard

| Key | Action |
|---|---|
| Enter, or a `separators` character (default `,`) | Commit the typed text as a tag. With empty text Enter is left to the browser (a form submits) |
| Tab | With text, commits it and keeps focus; if the tag is rejected, or the text is empty, focus moves on |
| Backspace | In an empty field, remove the last tag. With `confirmBackspace` the first press marks it and the second removes it |
| ArrowDown | With `suggestions`: open the list and highlight the first match; then ArrowUp and ArrowDown move through it, Home and End jump (while an option is highlighted) |
| Enter, Tab | With a highlighted suggestion: add it |
| Escape | Close the suggestions |

The chips are not focusable and their remove buttons are not tab stops (`tabIndex` -1), so the keyboard way to remove a tag is Backspace. Left and Right are not handled, so RTL changes only the layout. While the user is composing text with an IME, none of these keys fire.

### Screen readers

- A native text input named by a `<label>`, `aria-label` or a surrounding `FieldLabel`; `invalid`, `required`, `disabled` and `aria-describedby` come from a surrounding `Field` unless you pass them. Chips are plain text; each remove button is named "Remove" plus the tag.
- With `suggestions` the input becomes a `combobox` with `aria-expanded`, `aria-controls`, `aria-autocomplete="list"` and `aria-activedescendant`; the popover holds a `listbox` named "Suggestions" whose options mark the highlighted row with `aria-selected`. Focus stays in the input.
- `showCount` renders "3" or "3 / 5" with a screen reader suffix ("tags") and ties it to the input through `aria-describedby`. `confirmBackspace` adds a polite live region that says "Press Backspace again to remove ...".

### Reduced motion

Each chip fades and zooms in with `animate-in zoom-in-95`, and the dropdown does the same; the reduced-motion net removes the movement and ends the rest in 1 ms. Existing chips animate on mount too.

### Server rendering

Server render: same markup as the client. The chips, the input and the count render on the server from `value` or `defaultValue`, so server and client match. The suggestions popover is portalled and opens only after focus, so it is never in the server HTML.

### Slots

- `tag-input`: the outer box; `tag-input-tag`: a chip (`data-pending-remove` while marked)
- `tag-input-field`: the text input; `tag-input-count`: the count
- `tag-input-announcer`: the live region, only with `confirmBackspace`

### Gotchas

- Duplicates are rejected case-insensitively unless `allowDuplicates`. At `max` the input turns read-only and shrinks away. `onReject(tag, reason)` reports `"duplicate"`, `"invalid"` (from `validate` or `restrictToSuggestions`) and `"max"`.
- Pasting text that contains a separator or a line break splits it into tags (up to `max`); plain text with no separator lands in the field. Typing a separator splits the same way.
- `separators` lists extra characters; Enter and Tab always commit, and the key names `"Enter"` and `"Tab"` in the list are not treated as characters.
- `name` posts one hidden input per tag under the same name. `addOnBlur` commits the pending text on blur, and `normalize` (default trim) runs before every check. `emptyText` is a deprecated alias of `emptyState`.

## Example

```tsx
import * as React from "react";
import { Field, FieldLabel, TagInput } from "@cleanprompt/sutra-ui";

export function Example() {
  const [tags, setTags] = React.useState(["design", "launch"]);
  return (
    <Field>
      <FieldLabel>Topics</FieldLabel>
      <TagInput
        value={tags}
        onValueChange={setTags}
        placeholder="Add a topic and press Enter"
        suggestions={["design", "engineering", "launch", "research"]}
        max={5}
        showCount
      />
    </Field>
  );
}
```
