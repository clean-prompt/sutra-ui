# SwitchGroup

> Fieldset of switch rows separated by dividers. Use `options` + `value` record, or children.

- Import: `import { SwitchGroup } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/switch` (primitives)
- `data-slot`: `switch-group`
- Part of [`Switch`](Switch.md)
- Also accepts the props of HTMLAttributes, FieldsetHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `Record<string, boolean>` | `{}` | Initial state when uncontrolled. |
| `description` | `React.ReactNode` |  | Help text under the legend. |
| `labelPosition` | `"left" \| "right"` | `"left"` | Label placement for generated rows. Defaults to `left` (settings style). |
| `legend` | `React.ReactNode` |  | Group title, rendered as the fieldset legend. |
| `onValueChange` | `(value: Record<string, boolean>) => void` |  | Called with the full value map after any switch is toggled. |
| `options` | `SwitchGroupOption[]` |  | Switches to render, in order; each has a `value`, a `label` and optional description and disabled flag. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Switch size for every row. |
| `value` | `Record<string, boolean>` |  | Controlled state as a map of option value to on/off. Use with `onValueChange`. |
| `variant` | `"plain" \| "card"` | `"plain"` | `card` wraps the rows in a bordered panel. |

## Variants

- `size`: `sm`, `md`, `lg` (default "md")

## Notes

See the notes in [`Switch`](Switch.md#notes).

## Example

```tsx
import * as React from "react";
import { SwitchField } from "@cleanprompt/sutra-ui";

export function Example() {
  const [digest, setDigest] = React.useState(true);
  return (
    <SwitchField
      label="Weekly digest"
      description="A summary of activity, every Monday."
      checked={digest}
      onCheckedChange={setDigest}
    />
  );
}
```
