# ChangedFilesCard

> Transcript card summarizing changed files ("N files changed +X −Y") with a Review action.

- Import: `import { ChangedFilesCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/git-review-changes` (kit `agent`)
- `data-slot`: `changed-files-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `files` (required) | `ChangedFile[]` |  | Changed files with their path, change kind and +/- counts. |
| `collapsedCount` | `number` | `4` | Files visible while collapsed. Default 4. |
| `defaultExpanded` | `boolean` | `false` | Initial expanded state when `expanded` is not controlled. |
| `expanded` | `boolean` |  | Controlled expanded state of the file list. |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called with the new state when the user expands or collapses the list. |
| `onOpenFile` | `(file: ChangedFile) => void` |  | Called with the file when the user opens a row. |
| `onReview` | `() => void` |  | Called when the user presses the review button; the button is hidden when unset. |
| `reviewLabel` | `string` | `"Review"` | Label of the review button. Default "Review". |
| `title` | `React.ReactNode` |  | Override the "N files changed" heading. |

## Example (live: `#/components/browser-review/changed-files` in the playground)

```tsx
import { ChangedFilesCard } from "@cleanprompt/sutra-ui/agent";

<ChangedFilesCard files={changed} onReview={() => {}} onOpenFile={() => {}} className="w-full max-w-xl" />
```

Playground helpers in this snippet (not part of the library): changed.
