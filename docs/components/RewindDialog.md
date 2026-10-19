# RewindDialog

> Rewind to a message/checkpoint: preview, "What to restore" choice, file summary and fork notice.

- Import: `import { RewindDialog } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/rewind` (kit `agent`)
- `data-slot`: `rewind-dialog`, `rewind-target`, `rewind-files`, `rewind-fork-notice`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `message` (required) | `React.ReactNode` |  | Preview of the target message. |
| `className` | `string` |  | Extra classes for the dialog content. |
| `confirmLabel` | `React.ReactNode` | `"Rewind"` | Label of the confirm button. Default "Rewind". |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `defaultScope` | `string` |  | Initially selected scope when `scope` is not controlled; defaults to the first enabled one. |
| `files` | `RewindFileChange[]` | `[]` | Files that would be restored. |
| `fork` | `boolean` | `true` | Show the fork notice when the conversation is rewound. Default true. |
| `forkNotice` | `React.ReactNode` | `"A new forked conversation will be created; the current one stays in your history."` | Text of the fork notice; shown when `fork` is true. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `onRewind` | `(request: RewindRequest) => void \| Promise<void>` |  | Called with the chosen scope when the user confirms; may return a promise, and the dialog waits for it. |
| `onScopeChange` | `(scope: string) => void` |  | Called with the scope value when the user picks another one. |
| `open` | `boolean` |  | Controlled open state of the dialog. |
| `scope` | `string` |  | Controlled value of the selected scope. |
| `scopes` | `RewindScopeOption[]` | `defaultRewindScopes` | What can be rewound (conversation, files or both); defaults to the built-in options. Disabled options cannot be chosen. |
| `timestamp` | `TimeInput` |  | When the target message was sent. |
| `title` | `React.ReactNode` | `"Rewind"` | Dialog heading. |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog (rendered with `asChild`). |
