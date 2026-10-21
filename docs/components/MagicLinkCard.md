# MagicLinkCard

> Passwordless sign-in: email only, then a "check your inbox" confirmation.

- Import: `import { MagicLinkCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/auth-blocks-magic-link` (blocks)
- `data-slot`: `auth-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultEmail` | `string` | `""` | Initial value of the email field. |
| `description` | `React.ReactNode` | `"We'll email you a magic link for a password-free sign in."` | Supporting text under the heading; each card has its own default. |
| `error` | `React.ReactNode` |  | Error message shown above the form; also marks the form invalid. |
| `footer` | `React.ReactNode` |  | Replace the default footer (e.g. "Don't have an account? Sign up"). Pass `null` to hide it. |
| `headingLevel` | `AuthHeadingLevel` | `1` | Element of the card title (`1` is an `h1`). Use `2` or lower when the card sits inside a page that has its own `h1`. |
| `loading` | `boolean` |  | Disables the form and shows a spinner on the submit button. |
| `logo` | `boolean \| React.ReactNode` |  | Show the Sutra mark above the title, or pass a custom logo. Default: true for `card`. |
| `mailAppHref` | `string` | `"mailto:"` | Link for the "Open mail app" button in the success state. |
| `onResend` | `(email: string) => unknown` |  | Called with the email when the user asks to resend the link. |
| `onSentChange` | `(sent: boolean) => void` |  | Called when the card switches between the form and the "check your inbox" state. |
| `onSubmit` | `(email: string) => unknown` |  | Called with the email when the user asks for a link. A returned promise shows a spinner; throw to show the error message. |
| `passwordSignInHref` | `string` | `"#sign-in"` | Link target of the "Sign in with password" alternative. |
| `renderLink` | `BlockLinkRenderer` |  | Router link renderer for the footer and inline links. |
| `sent` | `boolean` |  | Control the "check your inbox" state. |
| `title` | `React.ReactNode` | `"Sign in with email"` | Card heading; each card has its own default. |
| `variant` | `"card" \| "plain"` |  | `card` renders a bordered surface; `plain` renders only the content (for full-page layouts). |
