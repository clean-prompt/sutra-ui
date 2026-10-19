# SignUpCard

> Account creation card: name, email, password with strength meter and terms checkbox.

- Import: `import { SignUpCard } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/auth-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` | `"Start your free 14-day trial. No credit card required."` | Supporting text under the heading; each card has its own default. |
| `error` | `React.ReactNode` |  | Error message shown above the form; also marks the form invalid. |
| `footer` | `React.ReactNode` |  | Replace the default footer (e.g. "Don't have an account? Sign up"). Pass `null` to hide it. |
| `loading` | `boolean` |  | Disables the form and shows a spinner on the submit button. |
| `logo` | `boolean \| React.ReactNode` |  | Show the Sutra mark above the title, or pass a custom logo. Default: true for `card`. |
| `minScore` | `0 \| 1 \| 2 \| 3 \| 4` | `2` | Minimum strength score (1–4) required to submit. Default 2. |
| `onSocialSignIn` | `(provider: SocialProvider) => unknown` |  | Called with the provider when a social button is clicked. A returned promise shows a spinner on that button. |
| `onSubmit` | `(values: SignUpCardValues) => unknown` |  | Called with the form values (name, email, password). Return a promise to show a spinner; throw to show the error message. |
| `privacyHref` | `string` | `"#privacy"` | Link target of the privacy-policy text. |
| `providers` | `SocialProvider[]` | `["google", "apple"]` | OAuth providers shown above the form. Pass `[]` to hide. |
| `renderLink` | `BlockLinkRenderer` |  | Router link renderer for the footer and inline links. |
| `signInHref` | `string` | `"#sign-in"` | Link target of the "Sign in" prompt. |
| `socialLayout` | `"grid" \| "stack"` | `"grid"` | Social buttons as a row/grid (for two or three providers) or stacked full-width. |
| `submitLabel` | `React.ReactNode` | `"Create account"` | Text of the submit button. |
| `termsHref` | `string` | `"#terms"` | Link target of the terms-of-service text. |
| `title` | `React.ReactNode` | `"Create your account"` | Card heading; each card has its own default. |
| `variant` | `"card" \| "plain"` |  | `card` renders a bordered surface; `plain` renders only the content (for full-page layouts). |
