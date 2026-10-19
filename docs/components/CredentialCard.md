# CredentialCard

> Verifiable credential as a gradient wallet card or a compact row.

- Import: `import { CredentialCard } from "@sutra/ui"` (or from `@sutra/ui/security`)
- Source: `packages/ui/src/kits/identity/credential-card` (kit `identity`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `credential` (required) | `Credential` |  | The credential to show (type, issuer, holder, claims, validity). |
| `background` | `string` |  | Override the gradient (CSS background). |
| `now` | `number` |  | Reference time for the validity status; set it in tests and SSR for stable output. |
| `onClick` | `(credential: Credential) => void` |  | Makes the card/row a button. |
| `variant` | `"card" \| "row"` | `"card"` | `card` is the wallet visual, `row` a compact list row. |

## Example (live: `#/components/security/credential-card` in the playground)

```tsx
import { CredentialCard } from "@sutra/ui/security";

<div className="grid grid-cols-1 w-full gap-4 sm:grid-cols-2">
  {credentials.slice(0, 2).map((c) => (
    <CredentialCard key={c.id} credential={c} onClick={() => undefined} />
  ))}
</div>
<div className="w-full max-w-md divide-y divide-border rounded-box border border-border">
  {credentials.map((c) => (
    <CredentialCard key={c.id} credential={c} variant="row" onClick={() => undefined} className="rounded-none" />
  ))}
</div>
```

Playground helpers in this snippet (not part of the library): credentials.
