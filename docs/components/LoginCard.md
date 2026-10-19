# LoginCard

> Email + password sign-in card with remember me, forgot link and SSO buttons.

- Import: `import { LoginCard } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/auth-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultEmail` | `string` | `""` | Initial value of the email field. |
| `description` | `React.ReactNode` | `"Sign in to your Sutra workspace"` | Supporting text under the heading; each card has its own default. |
| `error` | `React.ReactNode` |  | Error message shown above the form (e.g. a failed sign-in); also marks the form invalid. |
| `footer` | `React.ReactNode` |  | Replace the default footer (e.g. "Don't have an account? Sign up"). Pass `null` to hide it. |
| `forgotPasswordHref` | `string` | `"#forgot-password"` | Link target of "Forgot password?". |
| `loading` | `boolean` |  | Disables the form and shows a spinner on the submit button (use it while you sign in). |
| `logo` | `boolean \| React.ReactNode` |  | Show the Sutra mark above the title, or pass a custom logo. Default: true for `card`. |
| `onSocialSignIn` | `(provider: SocialProvider) => unknown` |  | Called with the provider when a social button is clicked. A returned promise shows a spinner on that button. |
| `onSubmit` | `(values: LoginCardValues) => unknown` |  | Called with the form values. Return a promise to show a spinner; throw to show the error message. |
| `providers` | `SocialProvider[]` | `["google", "apple", "github"]` | OAuth providers shown above the form. Pass `[]` to hide. |
| `renderLink` | `BlockLinkRenderer` |  | Router link renderer for the footer and inline links. |
| `showRemember` | `boolean` | `true` | Shows the "Remember me" checkbox. |
| `signUpHref` | `string` | `"#sign-up"` | Link target of the "Sign up" prompt. |
| `socialLayout` | `"grid" \| "stack"` | `"grid"` | Social buttons as a row/grid (for two or three providers) or stacked full-width. |
| `submitLabel` | `React.ReactNode` | `"Sign in"` | Text of the submit button. |
| `title` | `React.ReactNode` | `"Welcome back"` | Card heading; each card has its own default. |
| `variant` | `"card" \| "plain"` |  | `card` renders a bordered surface; `plain` renders only the content (for full-page layouts). |
