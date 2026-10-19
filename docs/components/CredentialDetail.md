# CredentialDetail

> Credential metadata plus its claims, with optional per-claim disclosure checkboxes.

- Import: `import { CredentialDetail } from "@sutra/ui"` (or from `@sutra/ui/security`)
- Source: `packages/ui/src/kits/identity/credential-card` (kit `identity`)
- `data-slot`: `credential-detail`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `credential` (required) | `Credential` |  | The credential to show (type, issuer, holder, claims, validity). |
| `defaultValue` | `string[]` |  | Default: required claims only. |
| `now` | `number` |  | Reference time for the validity status; set it in tests and SSR for stable output. |
| `onValueChange` | `(keys: string[]) => void` |  | Called with the disclosed claim keys when the user ticks or clears a claim (`selectable`). |
| `selectable` | `boolean` |  | Selective disclosure: show a checkbox per claim. |
| `showMeta` | `boolean` | `true` | Show the metadata block (issuer, dates, status). Default true. |
| `value` | `string[]` |  | Disclosed claim keys (controlled). |

## Example (live: `#/components/security/credential-detail` in the playground)

```tsx
import * as React from "react";
import { CredentialDetail } from "@sutra/ui/security";

function CredentialDetailDemo() {
  const [selected, setSelected] = React.useState<string[]>(["name"]);
  return (
    <div className="grid w-full max-w-md grid-cols-1 gap-3">
      <CredentialDetail credential={credentials[1]} selectable value={selected} onValueChange={setSelected} />
      {/* Sharing: {selected.join(", ")} */}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): credentials.
