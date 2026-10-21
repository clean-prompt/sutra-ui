# ForgotPasswordCard

> Request a password reset link; shows a confirmation once sent.

- Import: `import { ForgotPasswordCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/auth-blocks-password-reset` (blocks)
- `data-slot`: `auth-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `backHref` | `string` | `"#sign-in"` | Link target of the "Back to sign in" link. |
| `defaultEmail` | `string` | `""` | Initial value of the email field. |
| `description` | `React.ReactNode` | `"No worries. Enter your email and we'll send you reset instructions."` | Supporting text under the heading; each card has its own default. |
| `error` | `React.ReactNode` |  | Error message shown above the form; also marks the form invalid. |
| `footer` | `React.ReactNode` |  | Replace the default footer (e.g. "Don't have an account? Sign up"). Pass `null` to hide it. |
| `headingLevel` | `AuthHeadingLevel` | `1` | Element of the card title (`1` is an `h1`). Use `2` or lower when the card sits inside a page that has its own `h1`. |
| `loading` | `boolean` |  | Disables the form and shows a spinner on the submit button. |
| `logo` | `boolean \| React.ReactNode` |  | Show the Sutra mark above the title, or pass a custom logo. Default: true for `card`. |
| `onSentChange` | `(sent: boolean) => void` |  | Called when the card switches between the form and the success state. |
| `onSubmit` | `(email: string) => unknown` |  | Called with the email when the form is submitted. A returned promise shows a spinner; throw to show the error message. |
| `renderLink` | `BlockLinkRenderer` |  | Router link renderer for the footer and inline links. |
| `sent` | `boolean` |  | Controls the success state ("check your inbox"). Use with `onSentChange`. |
| `title` | `React.ReactNode` | `"Forgot your password?"` | Card heading; each card has its own default. |
| `variant` | `"card" \| "plain"` |  | `card` renders a bordered surface; `plain` renders only the content (for full-page layouts). |
