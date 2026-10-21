# SignedInPanel

> Signed-in summary: `AccountPanel` plus kunji linking, sign out and sign out everywhere.

- Import: `import { SignedInPanel } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/kunji`)
- Source: `packages/ui/src/blocks/kunji-blocks-signed-in` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Account holder's name, shown as the heading and used for the avatar fallback. |
| `apps` | `AccountPanelApp[]` |  | Apps signed in on this account, listed in the panel. |
| `avatarSrc` | `string` |  | Avatar image URL; initials are shown when unset. |
| `client` | `KunjiClient` |  | Enables "Link kunji" when given. |
| `defaultKunjiLinked` | `boolean` |  | Initial linked state when uncontrolled. |
| `handle` | `string` |  | Handle or email under the name. |
| `kunjiLinked` | `boolean` |  | Controlled linked state of the kunji identity. Use with `onLinkKunji` and `onUnlinkKunji`. |
| `kunjiSub` | `string` |  | The linked kunji subject id, shown once linked. |
| `onLinkKunji` | `(result: KunjiPollResult) => unknown` |  | Called with the poll result when the user links their kunji identity. |
| `onSignOut` | `() => void \| Promise<void>` |  | Called when the user signs out of this session; the button is hidden when unset. |
| `onSignOutEverywhere` | `() => void \| Promise<void>` |  | Ends every session (with a confirm dialog). |
| `onUnlinkKunji` | `() => unknown` |  | Called when the user unlinks their kunji identity. |
| `role` | `React.ReactNode` |  | Role badge, e.g. "Admin". |

## Example (live: `#/components/kunji/signed-in-panel` in the playground)

```tsx
import { SignedInPanel } from "@cleanprompt/sutra-ui/kunji";

<SignedInPanel
  name="Maya Patel"
  handle="@maya"
  role="Admin"
  client={client}
  onLinkKunji={() => new Promise((r) => setTimeout(r, 600))}
  onSignOut={() => new Promise((r) => setTimeout(r, 600))}
  onSignOutEverywhere={() => {}}
/>
```
