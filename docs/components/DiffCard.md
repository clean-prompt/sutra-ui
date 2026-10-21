# DiffCard

> Compact diff preview card: file header with stats, capped unified diff, expand and optional accept / reject.

- Import: `import { DiffCard } from "@sutra/ui"` (or from `@sutra/ui/editor`)
- Source: `packages/ui/src/patterns/diff-viewer-card` (patterns)
- `data-slot`: `diff-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `path` (required) | `string` |  | File path shown in the header. |
| `acceptLabel` | `string` | `"Accept"` | Text of the accept button. |
| `collapsedLines` | `number` | `12` | Visible lines before the preview is capped. Default 12. |
| `context` | `number` | `3` | Unchanged lines kept around each change. Default 3. |
| `defaultExpanded` | `boolean` | `false` | Initial expanded state when uncontrolled. |
| `expanded` | `boolean` |  | Controlled expanded state of the preview. Use with `onExpandedChange`. |
| `fileStatus` | `DiffCardFileStatus` |  | new-file / deleted-file presentation. Inferred from empty old/new values when omitted. |
| `headerExtra` | `React.ReactNode` |  | Extra header content (right side, before the stat). |
| `newValue` | `string` | `""` | Changed file content ("after"). |
| `oldValue` | `string` | `""` | Original file content ("before"). |
| `onAccept` | `() => void` |  | Called when the accept button is clicked; setting it shows the button. |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called when the preview is expanded or collapsed. |
| `onOpen` | `() => void` |  | When set, "Click to expand" calls this (e.g. open a full diff editor) instead of expanding inline. |
| `onPathClick` | `() => void` |  | Makes the path a button (e.g. open the file). |
| `onReject` | `() => void` |  | Called when the reject button is clicked; setting it shows the button. |
| `pathHref` | `string` |  | Makes the path a link. |
| `rejectLabel` | `string` | `"Reject"` | Text of the reject button. |

## Example (live: `#/components/agent-timeline/diff-card` in the playground)

```tsx
import * as React from "react";
import { EditToolBody } from "@sutra/ui/agent";
import { DiffCard } from "@sutra/ui/editor";

function DiffCardDemo() {
  const [decision, setDecision] = React.useState<string | null>(null);
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          {/* Edit with accept / reject{decision ? ` · ${decision}` : ""} */}
          <EditToolBody
            path="src/hooks/use-counter.ts"
            oldValue={counterBefore}
            newValue={counterAfter}
            onAccept={() => setDecision("accepted")}
            onReject={() => setDecision("rejected")}
          />
        </div>
        <div className="space-y-2">
          {/* Long file (expands inline) */}
          <DiffCard path="src/tokens/generated.ts" oldValue={longBefore} newValue={longAfter} collapsedLines={8} context={2} />
        </div>
        <div className="space-y-2">
          {/* New file */}
          <DiffCard path="src/lib/clamp.ts" newValue={"export const clamp = (n: number, min: number, max: number) =>\n  Math.min(max, Math.max(min, n));\n"} />
        </div>
        <div className="space-y-2">
          {/* Deleted file */}
          <DiffCard path="src/legacy/counter.js" oldValue={"module.exports = function counter() {\n  return 0;\n};\n"} />
        </div>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): counterAfter, counterBefore, longAfter, longBefore.
