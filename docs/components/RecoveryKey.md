# RecoveryKey

> Recovery key panel: grouped mono grid, copy/download/share/print, auto-clear countdown and a confirm-saved step.

- Import: `import { RecoveryKey } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/security`)
- Source: `packages/ui/src/kits/identity/recovery-key` (kit `identity`)
- `data-slot`: `recovery-key`, `recovery-key-groups`
- Parts: [`RecoveryKeyInput`](RecoveryKeyInput.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` (required) | `string` |  | The raw key (separators are ignored). |
| `autoClearAfter` | `number` | `60000` | Hide the key after this many ms (0 disables). Default 60000. |
| `columns` | `2 \| 3 \| 4 \| 6` | `4` | Grid columns for the groups. Default 4. |
| `confirm` | `boolean` | `true` | Ask the user to type the last 4 characters before finishing. Default true. |
| `fileContent` | `string` |  | File body. Defaults to a short header plus the grouped key. |
| `fileName` | `string \| false` | `"recovery-key.txt"` | Download file name; `false` hides the button. |
| `groupSize` | `number` | `4` | Characters per group, separated by a gap. Default 4. |
| `onConfirmed` | `() => void` |  | Called after the confirm step succeeds (or on "I've saved it" when `confirm` is false). |
| `onCopy` | `() => void` |  | Called after the key has been copied. |
| `onDownload` | `() => void` |  | Called after the key file has been downloaded. |
| `onHide` | `() => void` |  | Fired when the key is hidden (timer or "Hide now"). |
| `onPrint` | `() => void` |  | Override printing. |
| `printable` | `boolean` | `true` | Show a Print button. Default true. |
| `share` | `boolean` | `false` | Show a Share button when the Web Share API is available. |
| `title` | `string` | `"Recovery key"` | Heading of the card. Default "Recovery key". |

## Part props

### RecoveryKeyInput

Recovery key entry with auto-grouping, uppercase normalization and validation.

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

## Example (live: `#/components/security/recovery-key` in the playground)

```tsx
import * as React from "react";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RecoveryKey } from "@cleanprompt/sutra-ui/security";

function RecoveryKeyDemo() {
  const [n, setN] = React.useState(0);
  const [log, setLog] = React.useState<string>("");
  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      <RecoveryKey
        key={n}
        title="Kunji recovery key"
        value={RECOVERY}
        fileName="kunji-recovery-key.txt"
        share
        onHide={() => setLog("Key hidden from screen")}
        onConfirmed={() => setLog("Confirmed saved")}
      />
      <div className="flex items-center justify-between">
        {/* {log || "Auto-hides after 60s. Confirm by typing “Y6BF…” → last 4: Z U 5 G"} */}
        <Button variant="ghost" size="xs" onClick={() => { setN((x) => x + 1); setLog(""); }}>
          Reset
        </Button>
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): RECOVERY.
