# TwoFactorSetupCard

> Authenticator app setup: scan a QR code or copy the secret, then confirm with a 6-digit code.

- Import: `import { TwoFactorSetupCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/auth-blocks-verify` (blocks)
- `data-slot`: `auth-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `account` | `string` | `""` | Account label shown under the QR code (an email address, say). Left out of the label and the provisioning URI when empty. |
| `description` | `React.ReactNode` | `"Protect your account with an authenticator app like 1Password, Authy or Google Authenticator."` | Supporting text under the heading; each card has its own default. |
| `error` | `React.ReactNode` |  | Error message shown under the code input (e.g. a wrong code). |
| `footer` | `React.ReactNode` |  | Replace the default footer (e.g. "Don't have an account? Sign up"). Pass `null` to hide it. |
| `headingLevel` | `AuthHeadingLevel` | `1` | Element of the card title (`1` is an `h1`). Use `2` or lower when the card sits inside a page that has its own `h1`. |
| `issuer` | `string` | `"Sutra"` | Issuer (service name) shown in the authenticator app. Defaults to "Sutra". |
| `loading` | `boolean` |  | Disables the form and shows a spinner while the code is checked. |
| `logo` | `boolean \| React.ReactNode` |  | Show the Sutra mark above the title, or pass a custom logo. Default: true for `card`. |
| `onCancel` | `() => void` |  | Called when the user cancels the setup. |
| `onDone` | `() => void` |  | Called when the user finishes the setup (after the recovery codes are shown). |
| `onVerify` | `(code: string) => unknown` |  | Called with the code when the user submits it. A returned promise shows a spinner; throw to show the error message. |
| `otpauthUri` | `string` |  | Full `otpauth://` provisioning URI encoded in the QR code. Defaults to one built from `issuer`, `account` and `secret` (TOTP). Pass your server's URI to include digits/period/algorithm. |
| `recoveryCodes` | `string[]` | `defaultRecoveryCodes` | Recovery codes revealed after a successful verification. |
| `renderLink` | `BlockLinkRenderer` |  | Router link renderer for the footer and inline links. |
| `secret` | `string` | `"JBSW Y3DP EHPK 3PXP K4ZQ"` | Base32 secret shown for manual entry (spaces are ignored when copying). |
| `title` | `React.ReactNode` | `"Set up two-factor authentication"` | Card heading; each card has its own default. |
| `variant` | `"card" \| "plain"` |  | `card` renders a bordered surface; `plain` renders only the content (for full-page layouts). |
