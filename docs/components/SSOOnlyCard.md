# SSOOnlyCard

> Stack of OAuth buttons (plus optional SAML SSO) for SSO-only sign in.

- Import: `import { SSOOnlyCard } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/auth-blocks-magic-link` (blocks)
- `data-slot`: `auth-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` | `"Use your work account to continue."` | Supporting text under the heading; each card has its own default. |
| `error` | `React.ReactNode` |  | Error message shown above the buttons (e.g. a failed sign-in). |
| `footer` | `React.ReactNode` |  | Replace the default footer (e.g. "Don't have an account? Sign up"). Pass `null` to hide it. |
| `headingLevel` | `AuthHeadingLevel` | `1` | Element of the card title (`1` is an `h1`). Use `2` or lower when the card sits inside a page that has its own `h1`. |
| `logo` | `boolean \| React.ReactNode` |  | Show the Sutra mark above the title, or pass a custom logo. Default: true for `card`. |
| `onSAML` | `() => unknown` |  | Show a "Continue with SAML SSO" button. |
| `onSocialSignIn` | `(provider: SocialProvider) => unknown` |  | Called with the provider when a social button is clicked. A returned promise shows a spinner on that button. |
| `privacyHref` | `string` | `"#privacy"` | Link target of the privacy-policy text. |
| `providers` | `SocialProvider[]` | `["google", "microsoft", "apple", "github", "slack"]` | OAuth providers to list; defaults to Google, Microsoft, Apple, GitHub and Slack. |
| `renderLink` | `BlockLinkRenderer` |  | Router link renderer for the footer and inline links. |
| `showSAML` | `boolean` | `true` | Shows the "Continue with SAML SSO" button (needs `onSAML`). |
| `termsHref` | `string` | `"#terms"` | Link target of the terms-of-service text. |
| `title` | `React.ReactNode` | `"Sign in to Sutra"` | Card heading; each card has its own default. |
| `variant` | `"card" \| "plain"` |  | `card` renders a bordered surface; `plain` renders only the content (for full-page layouts). |
