# PermissionPrompt

> Inline permission request for a tool action with a numbered, keyboard-driven option list.

- Import: `import { PermissionPrompt } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/ai/permission-prompt` (kit `ai`)
- `data-slot`: `permission-fold`, `permission-prompt`, `permission-options`, `permission-option`, `permission-feedback`, `permission-hints`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` |  | Capture number / arrow keys even when focus is elsewhere (e.g. the newest prompt). Default: only while focused. |
| `decision` | `PermissionDecision \| null` |  | A recorded decision: renders the prompt locked with its outcome. |
| `defaultDecision` | `PermissionDecision \| null` | `null` | Initial decision when uncontrolled (e.g. restoring a transcript). |
| `defaultFolded` | `boolean` | `false` | Initial folded state when `folded` is not controlled. |
| `defaultScope` | `string` |  | Initially selected scope when `scope` is not controlled; defaults to the first scope. |
| `feedbackPlaceholder` | `string` | `"Tell the agent what to do instead…"` | Placeholder of the feedback field shown with "No". Default "Tell the agent what to do instead…". |
| `folded` | `boolean` |  | Controlled folded state: folded shows only the header and turns off key capture. |
| `icon` | `React.ReactNode` |  | Replaces the icon chosen from `tool`. |
| `onCancel` | `() => void` |  | Escape. Hints "Esc to cancel" when set. |
| `onDecision` | `(decision: PermissionDecision) => void` |  | Called with the user's choice. |
| `onFoldedChange` | `(folded: boolean) => void` |  | Called with the new state when the user folds or unfolds the prompt. |
| `onScopeChange` | `(scope: string) => void` |  | Called with the scope value when the user picks another scope. |
| `options` | `PermissionOption[]` |  | Replaces the default Yes / Always / No options. |
| `preview` | `React.ReactNode` |  | Preview slot (diff, command, URL). `children` is used when omitted. |
| `ruleLabel` | `React.ReactNode` |  | What "don't ask again for …" refers to, e.g. <code>npm test</code>. |
| `scope` | `string` |  | Controlled value of the selected rule scope. |
| `scopes` | `PermissionScopeOption[]` | `defaultPermissionScopes` | Scopes offered for the "always allow" rule; defaults to the built-in set. |
| `showHints` | `boolean` | `true` | Show the keyboard hints footer. Default true. |
| `target` | `React.ReactNode` |  | File path, command or URL the tool acts on. |
| `title` | `React.ReactNode` |  | Header question; defaults from `tool` and `target`. |
| `tool` | `PermissionToolKind` | `"other"` | Tool kind; picks the icon, default question and default options. Default "other". |

## Example (live: `#/components/agent-permissions/folded-permission` in the playground)

```tsx
import { PermissionPrompt } from "@cleanprompt/sutra-ui/agent";

function FoldedPermissionDemo() {
  return (
    <>
      <PermissionPrompt
        tool="bash"
        target="git push --force-with-lease origin feature/theme"
        defaultFolded
        onDecision={() => {}}
        className="max-w-2xl"
      />
    </>
  );
}
```
