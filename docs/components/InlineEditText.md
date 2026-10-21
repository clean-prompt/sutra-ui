# InlineEditText

> Single-line inline editor for renaming things in place: Enter or blur commits, Escape cancels, and key presses never reach the surrounding row's shortcuts.

- Import: `import { InlineEditText } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/primitives/inline-edit-text` (primitives)
- Also accepts the props of HTMLAttributes, InputHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `autoFocus` | `boolean` | `true` | Focus the field and select its text when it mounts. Default true. |
| `defaultValue` | `string` |  | Initial draft text (uncontrolled). Also the value a commit is compared against. |
| `label` | `string` | `"Edit text"` | Accessible name. Default "Edit text". `aria-label` wins when both are set. |
| `onCancel` | `() => void` |  | Called on Escape, and on Enter / blur when there is nothing to commit (empty or unchanged). |
| `onCommit` | `(value: string) => void` |  | Called with the trimmed text on Enter or blur, when it is non-empty and differs from the starting value. |
| `onValueChange` | `(value: string) => void` |  | Called on every keystroke with the raw draft. |
| `value` | `string` |  | Draft text (controlled). |

## Notes

**When to use:** A single-line field that appears in place of a title or name so the user can rename it: it focuses and selects on mount, Enter or blur commits the trimmed text, Escape cancels. Mount it when editing starts and unmount it on `onCommit` or `onCancel`.

**Use instead when:**
- `Input`: a field that is always visible in a form
- `Textarea`: several lines
- `SearchInput`: a query field

### Keyboard

| Key | Action |
|---|---|
| Enter | Commit: `onCommit` gets the trimmed text when it is non-empty and differs from the starting value; otherwise `onCancel` runs |
| Escape | Cancel: restore the starting text (uncontrolled) and call `onCancel` |
| Tab or a click elsewhere | Blur commits, the same as Enter |
| Any other key | Typed into the field as usual |

Every key press and click on the field stops propagating, so the surrounding row's shortcuts (a list's arrow keys, a hotkey, a row click) do not fire while editing. Enter and Escape are ignored during IME composition. No arrow-key handling of its own, so RTL changes nothing.

### Screen readers

- A native `<input type="text">` named by `aria-label`, else `label` (default "Edit text"). Pass a specific name such as "Rename Quarterly report" when several rows can be edited.
- It takes focus and selects its text on mount, so the screen reader moves to the field when editing starts. After `onCommit` or `onCancel` you are responsible for returning focus to the row or button that opened it.
- There is no announcement of the commit or the cancel; show your own status if the change needs one.

### Reduced motion

Static: no animation or transition beyond the focus ring.

### Server rendering

Server render: same markup as the client. Renders a plain input from `value` or `defaultValue`. The focus and select happen in an effect after mount, so the server HTML is the same as the client's and nothing is focused until hydration.

### Gotchas

- Blur commits, it does not cancel. Clicking away, or moving focus to a button, saves the text; use Escape to discard. An empty or unchanged draft counts as a cancel, so `onCancel` also runs on those.
- The starting value is read once, on mount: later edits are compared with it, and a committed draft is not treated as the new starting text. Unmount the field after `onCommit` instead of keeping it open.
- `onValueChange` receives the raw draft on every keystroke; `onCommit` receives the trimmed text. The native `onChange` is removed from the type. With controlled `value` the field does not reset itself on Escape: restore your state in `onCancel`.
- `autoFocus` defaults to true and is handled by the component (focus and select on mount); pass `autoFocus={false}` to skip it. A commit or cancel runs once even though Enter is followed by a blur.

## Example

```tsx
import * as React from "react";
import { Button, InlineEditText } from "@cleanprompt/sutra-ui";
import { RiPencilLine } from "@cleanprompt/sutra-ui/icons";

export function Example() {
  const [name, setName] = React.useState("Quarterly report");
  const [editing, setEditing] = React.useState(false);
  if (editing) {
    return (
      <InlineEditText
        label="Document name"
        defaultValue={name}
        onCommit={(value) => {
          setName(value);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-lg font-semibold">{name}</h2>
      <Button size="icon" variant="ghost" aria-label="Rename document" onClick={() => setEditing(true)}>
        <RiPencilLine aria-hidden />
      </Button>
    </div>
  );
}
```
