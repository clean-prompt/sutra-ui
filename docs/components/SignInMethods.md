# SignInMethods

> Sign-in method tabs (kunji QR, username + password, access token) that remember the last one used.

- Import: `import { SignInMethods } from "@sutra/ui"` (or from `@sutra/ui/kunji`)
- Source: `packages/ui/src/blocks/kunji-blocks-sign-in` (blocks)
- `data-slot`: `sign-in-methods`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `client` (required) | `KunjiClient` |  | The kunji client that issues and polls sign-in challenges (and supplies the app name). |
| `defaultMethod` | `SignInMethodId` |  | Method shown first when nothing is remembered; defaults to the first of `methods`. |
| `description` | `React.ReactNode` |  | Text under the heading. |
| `headingLevel` | `AuthHeadingLevel` | `1` | Element of the card title (`1` is an `h1`). |
| `kunjiProps` | `Partial<Omit<KunjiSignInProps, "client">>` |  | Props passed through to the kunji widget (everything except `client`). |
| `labels` | `Partial<Record<SignInMethodId, React.ReactNode>>` |  | Overrides for the method tab labels, keyed by method id (`kunji`, `password`, `token`). |
| `methods` | `SignInMethodId[]` | `["kunji", "password", "token"]` | Methods to offer, in order. Default all three. |
| `onKunjiSuccess` | `(result: KunjiPollResult) => void` |  | Called with the poll result when a kunji sign-in is approved. |
| `onPasswordSubmit` | `(values: SignInPasswordValues) => unknown` |  | Called with the username and password when the password form is submitted. A returned promise shows a spinner; throw to show the error message. |
| `onTokenSubmit` | `(token: string) => unknown` |  | Called with the token when the token form is submitted. A returned promise shows a spinner; throw to show the error message. |
| `rememberKey` | `string \| null` | `"sutra.sign-in-method"` | localStorage key for the last used method. `null` disables remembering. |
| `title` | `React.ReactNode` | `"Sign in"` | Heading of the card. |
| `usernameLabel` | `React.ReactNode` | `"Username"` | Label of the username field, e.g. "Lab username". |
| `variant` | `"card" \| "plain"` | `"card"` | `card` draws the bordered card; `plain` drops the chrome so you can place it in your own surface. |

## Example (live: `#/components/kunji/sign-in-methods` in the playground)

```tsx
import { SignInMethods } from "@sutra/ui/kunji";

<SignInMethods client={client} usernameLabel="Lab username" onPasswordSubmit={() => new Promise((r) => setTimeout(r, 800))} />
```
