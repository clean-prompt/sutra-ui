# OTPVerifyCard

> Six-digit verification code card with auto-submit and a resend countdown.

- Import: `import { OTPVerifyCard } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/auth-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `autoFocus` | `boolean` | `true` | Focus the first slot on mount. Default true. |
| `autoSubmit` | `boolean` | `true` | Submit automatically when every slot is filled. Default true. |
| `backHref` | `string` | `"#sign-in"` | Link target of the "Back to sign in" link. |
| `description` | `React.ReactNode` |  | Supporting text under the heading; each card has its own default. |
| `email` | `string` | `"maya@sutra.app"` | Where the code was sent (shown in the description). |
| `error` | `React.ReactNode` |  | Error message shown under the input (e.g. a wrong code). |
| `footer` | `React.ReactNode` |  | Replace the default footer (e.g. "Don't have an account? Sign up"). Pass `null` to hide it. |
| `length` | `number` | `6` | Number of code digits. |
| `loading` | `boolean` |  | Disables the input and shows a spinner while the code is checked. |
| `logo` | `boolean \| React.ReactNode` |  | Show the Sutra mark above the title, or pass a custom logo. Default: true for `card`. |
| `onResend` | `() => unknown` |  | Called when the user asks for a new code. |
| `onVerify` | `(code: string) => unknown` |  | Called with the code once every digit is entered. A returned promise shows a spinner; throw to show the error message. |
| `renderLink` | `BlockLinkRenderer` |  | Router link renderer for the footer and inline links. |
| `resendSeconds` | `number` | `30` | Seconds before the code can be resent. Default 30. |
| `title` | `React.ReactNode` | `"Check your email"` | Card heading; each card has its own default. |
| `variant` | `"card" \| "plain"` |  | `card` renders a bordered surface; `plain` renders only the content (for full-page layouts). |
