# ReviewFileTree

> Changed files as a directory tree with colored A / M / D / R status letters and single selection.

- Import: `import { ReviewFileTree } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/git-review` (kit `agent`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `files` (required) | `ChangedFile[]` |  | Changed files; shown as a folder tree built from their paths. |
| `defaultSelected` | `string \| null` | `null` | Initially selected path when `selected` is not controlled. |
| `onOpenFile` | `(file: ChangedFile) => void` |  | Called on click / Enter on a file. |
| `onSelectedChange` | `(path: string \| null) => void` |  | Called with the file path (or `null`) when the selection changes. |
| `selected` | `string \| null` |  | Selected file path. |
| `showStats` | `boolean` | `false` | Per-file +/− counts. Default false. |
| `size` | `"sm" \| "md"` | `"sm"` | Row size. |

## Example (live: `#/components/browser-review/review-scope` in the playground)

```tsx
import * as React from "react";
import { ReviewFileTree, ReviewScopeTabs } from "@sutra/ui/agent";
import { DiffViewer } from "@sutra/ui/editor";

function ReviewDemo() {
  const [scope, setScope] = React.useState<ReviewScope>("uncommitted");
  const [selected, setSelected] = React.useState<string | null>("packages/ui/src/components/button.tsx");
  const files = scope === "turn" ? changed.slice(0, 3) : changed;
  return (
    <div className="w-full space-y-3">
      <ReviewScopeTabs value={scope} onValueChange={setScope} baseBranch="main" counts={{ uncommitted: changed.length, branch: 12, turn: 3 }} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
        <div className="rounded-box border border-border p-1">
          <ReviewFileTree files={files} selected={selected} onSelectedChange={setSelected} showStats />
        </div>
        <DiffViewer oldValue={diffOld} newValue={diffNew} lineNumbers headerExtra={<span className="font-mono text-xs text-muted-foreground">{selected}</span>} />
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): changed, diffNew, diffOld.
