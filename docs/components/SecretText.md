# SecretText

> Masked secret with reveal (optionally timed), copy with clipboard auto-clear, and canvas rendering.

- Import: `import { SecretText } from "@sutra/ui"` (or from `@sutra/ui/security`)
- Source: `packages/ui/src/kits/identity/secret` (kit `identity`)
- `data-slot`: `secret-text`, `secret-value`, `secret-mask`, `secret-strength`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` (required) | `string` |  | The secret to mask, reveal and copy. |
| `clipboardClearAfter` | `number` | `30000` | Clear the clipboard this many ms after copying (0 disables). Default 30000. |
| `copyable` | `boolean` | `true` | Show a copy button. Default true. |
| `defaultRevealed` | `boolean` | `false` | Initial reveal state when `revealed` is not controlled. Hidden by default. |
| `label` | `string` | `"Secret"` | Accessible name used for the canvas and buttons, e.g. "Password". |
| `maskChar` | `string` | `"•"` | Character repeated for the mask. Default "•". |
| `maskLength` | `number` | `8` | Fixed mask length so the secret's length isn't leaked. Default 8. |
| `mono` | `boolean` | `true` | Sets the secret in a monospace font. Default true. |
| `onCopy` | `() => void` |  | Called after the secret has been copied. |
| `onRevealedChange` | `(revealed: boolean) => void` |  | Called with the new state when the user shows or hides the secret. |
| `renderAs` | `"text" \| "canvas"` | `"text"` | `canvas` draws the revealed value into a <canvas> so it never lands in the DOM as text. |
| `revealable` | `boolean` | `true` | Show a reveal toggle. Default true. |
| `revealed` | `boolean` |  | Controlled reveal state. |
| `revealFor` | `number` |  | Auto-hide this many ms after revealing. |
| `strength` | `0 \| 1 \| 2 \| 3 \| 4 \| "auto"` |  | Strength badge: a 0–4 score, or `"auto"` to score the value. |
| `variant` | `"inline" \| "field"` | `"inline"` | `field` renders a bordered input-like box. |
