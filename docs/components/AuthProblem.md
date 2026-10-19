# AuthProblem

> Full-panel auth error state with a plain explanation and recovery actions.

- Import: `import { AuthProblem } from "@sutra/ui"` (or from `@sutra/ui/kunji`)
- Source: `packages/ui/src/kits/identity/kunji-auth-problem` (kit `identity`)
- `data-slot`: `auth-problem`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` (required) | `AuthProblemVariant` |  | Which problem to explain: `not-owner`, `sso-down`, `cookie-conflict`, `sign-in-loop`, `expired-session` or `offline`. |
| `accountHandle` | `string` |  | Handle or email of the signed-in account, shown beside the name (`not-owner`). |
| `accountName` | `string` |  | Who is signed in (not-owner). |
| `actions` | `React.ReactNode` |  | Replace the default actions. |
| `appName` | `string` | `"this app"` | Name of the app or the suite's sign-in. |
| `children` | `React.ReactNode` |  | Extra content, e.g. a break-glass token form. |
| `description` | `React.ReactNode` |  | Replaces the default explanation of the variant. |
| `fullPage` | `boolean` |  | Center in a full-height page. |
| `onRetry` | `() => void` |  | Called when the user presses Try again; the button is hidden when unset. |
| `onSignIn` | `() => void` |  | Called when the user presses Sign in; the button is hidden when unset. |
| `providerHref` | `string` |  | Link to open the provider's sign-in. |
| `providerName` | `string` | `"the suite"` | Where the shared sign-in lives, e.g. "the suite". |
| `switchAccountHref` | `string` |  | Link to switch account at the provider. |
| `title` | `React.ReactNode` |  | Replaces the default heading of the variant. |

## Example (live: `#/components/kunji/auth-problem` in the playground)

```tsx
import { SegmentedControl } from "@sutra/ui/forms";
import { AuthProblem } from "@sutra/ui/kunji";

<SegmentedControl className="max-w-full overflow-x-auto" size="sm" value={problem} onValueChange={(v) => setProblem(v as AuthProblemVariant)} options={problemVariants.map((v) => ({ value: v, label: v }))} />
<AuthProblem
  variant={problem}
  appName="the gateway"
  accountName="Maya Patel"
  accountHandle="maya"
  onRetry={() => {}}
  onSignIn={() => {}}
  switchAccountHref="#switch-account"
  providerHref="#suite"
/>
```

Playground helpers in this snippet (not part of the library): problemVariants.
