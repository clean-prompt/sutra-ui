# QRCodePlaceholder

> A decorative QR-code-like graphic for mockups and placeholders.

**Deprecated:** **Not scannable**: the modules are random noise, so a phone camera reads nothing (and it is still announced as "QR code"). For anything a user might scan, use `QRCode` (or `QRCodeCard`) from `components/qr-code`, which encodes a real value. Kept only for static mockups.

- Import: `import { QRCodePlaceholder } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/qr-placeholder` (assets)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `framed` | `boolean` | `true` | Draw a white quiet-zone card behind the code. |
| `logo` | `React.ReactNode` |  | Optional center logo. |
| `modules` | `number` | `25` | Modules per side. |
| `size` | `number` | `160` | Rendered size in pixels. |
| `value` | `string` | `"sutra"` | Seed for the (decorative, non-scannable) module pattern. |
