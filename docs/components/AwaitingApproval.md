# AwaitingApproval

> "Waiting for an admin" screen that checks in the background and says so.

- Import: `import { AwaitingApproval } from "@sutra/ui"` (or from `@sutra/ui/kunji`)
- Source: `packages/ui/src/blocks/kunji-blocks` (blocks)
- `data-slot`: `awaiting-approval`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` |  | Text under the heading. |
| `handle` | `string` |  | The handle that is waiting. |
| `headingLevel` | `AuthHeadingLevel` | `1` | Element of the card title (`1` is an `h1`). |
| `onApproved` | `() => void` |  | Called once `onCheck` resolves `true`. |
| `onCheck` | `() => boolean \| Promise<boolean>` |  | Resolve `true` once approved. Polled every `pollInterval`. |
| `onSignOut` | `() => void` |  | Called when "Sign out" is clicked; setting it shows the button. |
| `pollInterval` | `number` | `15000` | Milliseconds between `onCheck` calls. |
| `title` | `React.ReactNode` | `"Waiting for approval"` | Heading; defaults to a waiting-for-approval message. |
| `variant` | `"card" \| "plain"` | `"card"` | `card` draws the bordered card; `plain` drops the chrome. |

## Example (live: `#/components/kunji/awaiting-approval` in the playground)

```tsx
import { AwaitingApproval } from "@sutra/ui/kunji";

<AwaitingApproval handle="maya" onCheck={() => false} onSignOut={() => {}} />
```
