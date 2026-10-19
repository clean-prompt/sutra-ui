# KunjiButton

> Brand "Sign in with kunji" button that opens `KunjiSignIn` in a dialog.

- Import: `import { KunjiButton } from "@sutra/ui"` (or from `@sutra/ui/kunji`)
- Source: `packages/ui/src/kits/identity/kunji-buttons` (kit `identity`)
- `data-slot`: `kunji-button`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `client` (required) | `KunjiClient` |  | Kunji client that creates the session and polls for approval (see `createKunjiClient`). |
| `defaultOpen` | `boolean` | `false` | Initial dialog open state when uncontrolled. Default false. |
| `fullWidth` | `boolean` |  | Stretches the button to the width of its container. |
| `onError` | `(error: unknown) => void` |  | Called with the error when sign-in fails or is denied. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the sign-in dialog opens or closes. |
| `onSuccess` | `(result: KunjiPollResult) => void` |  | Called with the poll result once the user has approved sign-in in kunji. |
| `open` | `boolean` |  | Controlled dialog open state. |
| `signInProps` | `Partial<Omit<KunjiSignInProps, "client" \| "onSuccess" \| "onError">>` |  | Props for the `KunjiSignIn` inside the dialog. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Button height and text size: `sm`, `md` or `lg`. |
| `theme` | `"dark" \| "light" \| "amber"` | `"dark"` | Button colours: `dark`, `light` (bordered) or `amber`. |

## Variants

- `theme`: `dark`, `light`, `amber` (default "dark")
- `size`: `sm`, `md`, `lg` (default "md")
- `fullWidth`: `true`

## Example (live: `#/components/kunji/kunji-button` in the playground)

```tsx
import { KunjiButton, KunjiMark } from "@sutra/ui/kunji";

<KunjiButton client={client} onSuccess={() => setLog("KunjiButton: signed in")} />
<KunjiButton client={client} theme="light" />
<KunjiButton client={client} theme="amber" size="lg" />
<KunjiButton client={client} size="sm">
  kunji
</KunjiButton>
<div className="flex items-center gap-2">
  <KunjiMark variant="tile" size={32} title="kunji" />
  <KunjiMark size={24} />
</div>
```
