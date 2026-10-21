# ConflictResolver

> Side-by-side "Yours / Theirs" dialog for resolving a sync conflict.

- Import: `import { ConflictResolver } from "@sutra/ui"` (or from `@sutra/ui/suite`)
- Source: `packages/ui/src/kits/workspace/sync-status` (kit `workspace`)
- `data-slot`: `conflict-resolver`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `theirs` (required) | `ConflictVersion` |  | The other version of the content, with its source and update time. |
| `yours` (required) | `ConflictVersion` |  | Your local version of the content, with its source and update time. |
| `className` | `string` |  | Class name for the dialog content. |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `description` | `React.ReactNode` | `"This item was edited on two devices before they synced. Choose which version to keep."` | Helper text under the heading. |
| `now` | `Date` |  | Reference time for relative update labels; set it in tests and SSR for stable output. |
| `onKeepMine` | `() => void` |  | Called when the user keeps your version. |
| `onKeepTheirs` | `() => void` |  | Called when the user keeps the other version. |
| `onMerge` | `() => void` |  | Shows a "Merge both" action. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `open` | `boolean` |  | Controlled open state of the dialog. |
| `title` | `React.ReactNode` | `"Resolve conflict"` | Dialog heading. |
