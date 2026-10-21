# EditToolBody

> File edit body: path (link / button) and a compact DiffCard.

- Import: `import { EditToolBody } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/tool-timeline-bodies` (kit `agent`)
- `data-slot`: `edit-tool-body`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `path` (required) | `string` |  | Path of the edited file, shown in the diff header. |
| `acceptLabel` | `string` | `"Accept"` | Text of the accept button. |
| `collapsedLines` | `number` |  | Visible lines before the preview is capped. Default 12. |
| `context` | `number` |  | Unchanged lines kept around each change. Default 3. |
| `defaultExpanded` | `boolean` |  | Initial expanded state when uncontrolled. |
| `expanded` | `boolean` |  | Controlled expanded state of the preview. Use with `onExpandedChange`. |
| `fileStatus` | `DiffCardFileStatus` |  | new-file / deleted-file presentation. Inferred from empty old/new values when omitted. |
| `headerExtra` | `React.ReactNode` |  | Extra header content (right side, before the stat). |
| `newValue` | `string` |  | Changed file content ("after"). |
| `oldValue` | `string` |  | Original file content ("before"). |
| `onAccept` | `() => void` |  | Called when the accept button is clicked; setting it shows the button. |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called when the preview is expanded or collapsed. |
| `onOpen` | `() => void` |  | When set, "Click to expand" calls this (e.g. open a full diff editor) instead of expanding inline. |
| `onPathClick` | `() => void` |  | Makes the path a button (e.g. open the file). |
| `onReject` | `() => void` |  | Called when the reject button is clicked; setting it shows the button. |
| `pathHref` | `string` |  | Makes the path a link. |
| `rejectLabel` | `string` | `"Reject"` | Text of the reject button. |
