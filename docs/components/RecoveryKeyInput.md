# RecoveryKeyInput

> Recovery key entry with auto-grouping, uppercase normalization and validation.

- Import: `import { RecoveryKeyInput } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/security`)
- Source: `packages/ui/src/kits/identity/recovery-key` (kit `identity`)
- `data-slot`: `recovery-key-input`
- Part of [`RecoveryKey`](RecoveryKey.md)
- Also accepts the props of HTMLAttributes, InputHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `alphabet` | `RegExp` | `/[A-Z0-9]/` | Allowed characters (tested per uppercased char). |
| `className` | `string` |  | Classes for the element that renders. Without addons that is the `<input>` itself (the root). With addons (`leadingIcon`, `trailingIcon`, `prefix`, `suffix`, `clearable`) it lands on the **inner** `<input>`, not the outer wrapper, so layout classes (`w-48`, `flex-1`, margins) have no visible effect there; use `wrapperClassName` for those. |
| `clearable` | `boolean` |  | Shows a clear button while the field has a value. |
| `clearLabel` | `string` | `"Clear"` | Accessible name of the clear button. |
| `defaultValue` | `string` | `""` | Initial key when `value` is not controlled. |
| `groupSize` | `number` | `4` | Characters per group shown between separators. Default 4. |
| `invalid` | `boolean` |  | Marks the field invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `leadingIcon` | `React.ReactNode` |  | Icon rendered inside the field before the text. |
| `length` | `number` | `24` | Expected number of characters. Default 24. |
| `onClear` | `() => void` |  | Called after the clear button empties the field. |
| `onComplete` | `(value: string) => void` |  | Called once the key reaches `length` and passes `validate`. |
| `onValueChange` | `(value: string) => void` |  | Called with the normalized key (no separators) on every edit. |
| `prefix` | `React.ReactNode` |  | Text addon before the field, e.g. "https://". |
| `separator` | `string` | `"-"` | Text between groups in the field. Default "-". |
| `showStatus` | `boolean` | `true` | Show the "n / length" counter and validity hint. Default true. |
| `size` | `"sm" \| "md" \| "lg" \| null` | `"md"` | Field height and text size. |
| `suffix` | `React.ReactNode` |  | Text addon after the field, e.g. ".com". |
| `trailingIcon` | `React.ReactNode` |  | Icon or small action rendered inside the field after the text. |
| `validate` | `(value: string) => boolean \| string` |  | Return true or an error message. |
| `value` | `string` |  | Normalized key (no separators). |
| `variant` | `"outline" \| "filled" \| null` |  | `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. |
| `wrapperClassName` | `string` |  | Classes for the outer wrapper `<div>`, which is only rendered when addons are present. Put layout/sizing classes here when the input has addons. |

## Example (live: `#/components/security/recovery-key-input` in the playground)

```tsx
import * as React from "react";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RecoveryKeyInput } from "@cleanprompt/sutra-ui/security";

function RecoveryKeyInputDemo() {
  const [value, setValue] = React.useState("");
  const [ok, setOk] = React.useState(false);
  const expected = RECOVERY.replace(/-/g, "");
  return (
    <div className="grid w-full max-w-md grid-cols-1 gap-2">
      <label htmlFor="rk-input" className="text-sm font-medium">
        Enter your recovery key
      </label>
      <RecoveryKeyInput
        id="rk-input"
        length={32}
        value={value}
        onValueChange={(v) => {
          setValue(v);
          setOk(false);
        }}
        validate={(v) => (v === expected ? true : "That key doesn't match this account.")}
        onComplete={() => setOk(true)}
      />
      <div className="flex items-center gap-2">
        <Button size="xs" variant="ghost" onClick={() => setValue(expected.toLowerCase())}>
          Paste demo key
        </Button>
        {ok && {/* Account unlocked. */}}
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): RECOVERY.
