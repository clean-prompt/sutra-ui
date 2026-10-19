# SwitchField

> Switch with a label and optional description, for forms. For settings pages use `SettingsRow type="toggle"` (whole-row target, icon, `disabledReason`).

- Import: `import { SwitchField } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/switch` (primitives)
- `data-slot`: `switch-field`
- Part of [`Switch`](Switch.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes, SwitchProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` (required) | `React.ReactNode` |  | Label shown beside the switch and wired to it, so clicking it toggles the switch. |
| `checkedIcon` | `React.ReactNode` |  | Icon shown in the thumb while on. |
| `description` | `React.ReactNode` |  | Secondary text under the label, announced as the switch description. |
| `invalid` | `boolean` |  | Marks the switch invalid: error ring and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `labelClassName` | `string` |  | Classes for the `<label>` element. |
| `labelPosition` | `"left" \| "right"` | `"right"` | `left` puts the label before the switch (settings style), `right` after it. Inside a `SettingsGroup`, use `SettingsRow type="toggle"`. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Switch size: `sm`, `md` or `lg`. |
| `thumbClassName` | `string` |  | Classes for the thumb (the sliding knob). |
| `uncheckedIcon` | `React.ReactNode` |  | Icon shown in the thumb while off. |
| `wrapperClassName` | `string` |  | Classes for the wrapper around the switch, label and description. |

## Variants

- `size`: `sm`, `md`, `lg` (default "md")

## Notes

See the notes in [`Switch`](Switch.md#notes).

## Example

```tsx
import * as React from "react";
import { SwitchField } from "@sutra/ui";

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
