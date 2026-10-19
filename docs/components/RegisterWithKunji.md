# RegisterWithKunji

> First-time kunji registration: handle with live rules, name, invite code, then awaiting approval if needed.

- Import: `import { RegisterWithKunji } from "@sutra/ui"` (or from `@sutra/ui/kunji`)
- Source: `packages/ui/src/blocks/kunji-blocks` (blocks)
- `data-slot`: `register-with-kunji`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `awaitingProps` | `Partial<AwaitingApprovalProps>` |  | Props passed through to the `AwaitingApproval` screen shown when the account is pending. |
| `firstAdmin` | `boolean` | `false` | First person on the server becomes its admin. |
| `joinPolicy` | `"open" \| "invite" \| "approval"` | `"open"` | How new people join. |
| `onSubmit` | `(values: RegisterWithKunjiValues) => unknown` |  | Create the account. Return `{ pending: true }` (or use `joinPolicy="approval"`) to show `AwaitingApproval`. |
| `reservedHandles` | `string[]` | `["admin", "root", "system", "support", "kunji"]` | Handles that cannot be taken (checked case-insensitively). |
| `sub` | `string` |  | kunji identity being registered. |
| `suggestedName` | `string` | `""` | Name the field starts with. |
| `title` | `React.ReactNode` | `"Choose your handle"` | Heading of the form. |
| `variant` | `"card" \| "plain"` | `"card"` | `card` draws the bordered card; `plain` drops the chrome. |

## Example (live: `#/components/kunji/register-with-kunji` in the playground)

```tsx
import { RegisterWithKunji } from "@sutra/ui/kunji";

<RegisterWithKunji joinPolicy="invite" suggestedName="Maya Patel" sub="9f2c41d07be35a18c6e04f9d2b7a13c58e6f0d4a" onSubmit={() => new Promise((r) => setTimeout(() => r({ pending: true }), 700))} />
<RegisterWithKunji firstAdmin />
```
