# KunjiSignInPage

> Full-page kunji sign-in: brand, the kunji QR as the hero, "Other ways to sign in" and a footer.

- Import: `import { KunjiSignInPage } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/kunji`)
- Source: `packages/ui/src/blocks/kunji-blocks-sign-in` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `client` (required) | `KunjiClient` |  | The kunji client that issues and polls sign-in challenges (and supplies the app name). |
| `children` | `React.ReactNode` |  | The form. Defaults to a `LoginCard`. |
| `copyright` | `React.ReactNode` |  | Copyright line. |
| `footerLinks` | `AuthPageLink[]` |  | Links in the page footer (terms, privacy, help); each has a `label` and an `href`. |
| `heading` | `React.ReactNode` |  | Heading above the widget; defaults to "Sign in to" plus the app name. |
| `homeHref` | `string` |  | Where the logo links to. |
| `kunjiProps` | `Partial<Omit<KunjiSignInProps, "client">>` |  | Props passed through to the kunji widget (everything except `client`). |
| `logo` | `React.ReactNode` |  | Logo shown at the top. Defaults to the Sutra lockup. |
| `onKunjiSuccess` | `(result: KunjiPollResult) => void` |  | Called with the poll result when a kunji sign-in is approved. |
| `onPasswordSubmit` | `(values: SignInPasswordValues) => unknown` |  | Called with the username and password when the password form is submitted. A returned promise shows a spinner; throw to show the error message. |
| `onTokenSubmit` | `(token: string) => unknown` |  | Called with the token when the token form is submitted. A returned promise shows a spinner; throw to show the error message. |
| `otherMethods` | `Exclude<SignInMethodId, "kunji">[]` | `["password", "token"]` | Other ways offered under the widget. Pass `[]` to hide. |
| `renderLink` | `BlockLinkRenderer` |  | Renders the logo and footer links in place of the default `<a>`, e.g. to use your router's Link. |
| `usernameLabel` | `React.ReactNode` | `"Username"` | Label of the username field in the password form. |

## Example (live: `#/components/kunji/kunji-sign-in-page` in the playground)

```tsx
import { KunjiSignInPage } from "@cleanprompt/sutra-ui/kunji";

<div className="h-[860px] w-full overflow-auto">
  <KunjiSignInPage client={client} className="min-h-full" onPasswordSubmit={() => new Promise((r) => setTimeout(r, 800))} />
</div>
```
