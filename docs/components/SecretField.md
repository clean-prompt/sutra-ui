# SecretField

> Labeled, input-styled `SecretText`.

- Import: `import { SecretField } from "@sutra/ui"` (or from `@sutra/ui/security`)
- Source: `packages/ui/src/kits/identity/secret` (kit `identity`)
- `data-slot`: `secret-field`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` (required) | `string` |  | Visible field label (also used as the accessible name). |
| `value` (required) | `string` |  | The secret to mask, reveal and copy. |
| `clipboardClearAfter` | `number` |  | Clear the clipboard this many ms after copying (0 disables). Default 30000. |
| `copyable` | `boolean` |  | Show a copy button. Default true. |
| `defaultRevealed` | `boolean` |  | Initial reveal state when `revealed` is not controlled. Hidden by default. |
| `description` | `React.ReactNode` |  | Helper text under the field. |
| `maskChar` | `string` |  | Character repeated for the mask. Default "•". |
| `maskLength` | `number` |  | Fixed mask length so the secret's length isn't leaked. Default 8. |
| `mono` | `boolean` |  | Sets the secret in a monospace font. Default true. |
| `onCopy` | `() => void` |  | Called after the secret has been copied. |
| `onRevealedChange` | `(revealed: boolean) => void` |  | Called with the new state when the user shows or hides the secret. |
| `renderAs` | `"text" \| "canvas"` |  | `canvas` draws the revealed value into a <canvas> so it never lands in the DOM as text. |
| `revealable` | `boolean` |  | Show a reveal toggle. Default true. |
| `revealed` | `boolean` |  | Controlled reveal state. |
| `revealFor` | `number` |  | Auto-hide this many ms after revealing. |
| `strength` | `0 \| 1 \| 2 \| 3 \| 4 \| "auto"` |  | Strength badge: a 0–4 score, or `"auto"` to score the value. |

## Example (live: `#/components/security/secret-field` in the playground)

```tsx
import { SecretField, SecretText } from "@sutra/ui/security";

<div className="grid w-full max-w-md grid-cols-1 gap-4">
  <SecretField label="Wi-Fi password" value="correct-horse-battery" strength="auto" revealFor={5000} description="Reveals for 5 seconds." />
  <SecretField label="Database URL" value="postgres://app:Sx9!t2@db.internal:5432/main" renderAs="canvas" description="Revealed value is drawn on a canvas, out of reach of DOM scrapers." />
  <div className="flex items-center gap-2 text-sm">
    <span className="text-muted-foreground">Inline:</span>
    <SecretText value="4f9a-22c1" label="PIN" />
  </div>
</div>
```
