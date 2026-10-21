# DiffViewer

> Text comparison: inline (track-changes style, word-level inside changed lines) or split side-by-side with line numbers. Collapses unchanged regions, colors changes by author and navigates changes with n / p (or j / k, ] / [).

- Import: `import { DiffViewer } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/editor`)
- Source: `packages/ui/src/patterns/diff-viewer` (patterns)
- `data-slot`: `diff-viewer`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `activeChange` | `number` |  | Current change (controlled). |
| `authors` | `Record<string, DiffAuthor>` |  | Author id → name/color, for attribution coloring. |
| `changeAuthors` | `ReadonlyArray<string \| undefined>` |  | Author id per change index (when not given on `segments`). |
| `collapseUnchanged` | `boolean` | `true` | Collapse long unchanged regions. Default true. |
| `context` | `number` | `3` | Unchanged lines kept around each change. Default 3. |
| `defaultActiveChange` | `number` | `-1` | Initially active change index when uncontrolled. |
| `defaultMode` | `DiffMode` |  | Initial layout when uncontrolled; also shows the Inline / Split toggle. |
| `font` | `"mono" \| "sans"` | `"mono"` | Monospace (code) or sans (prose). Default "mono". |
| `granularity` | `DiffGranularity` | `"word"` | Detail inside changed lines. Default "word". |
| `headerExtra` | `React.ReactNode` |  | Extra header content (right side). |
| `lineNumbers` | `boolean` | `false` | Line numbers in inline mode. Default false (split always shows them). |
| `maxHeight` | `number \| string` |  | Max height of the scrolling body (CSS length). |
| `mode` | `DiffMode` |  | Layout (controlled). Default "inline". |
| `newLabel` | `React.ReactNode` | `"After"` | Label of the "after" split column. |
| `newValue` | `string` | `""` | Changed text (the "after" side). |
| `oldLabel` | `React.ReactNode` | `"Before"` | Labels for the split columns. |
| `oldValue` | `string` | `""` | Original text (the "before" side). |
| `onActiveChange` | `(index: number) => void` |  | Called with the change index when the user steps through changes. |
| `onModeChange` | `(mode: DiffMode) => void` |  | Shows an Inline / Split toggle in the header. |
| `segments` | `DiffSegment[]` |  | Precomputed (e.g. server-side, author-attributed) comparison; overrides old/new values. |
| `showHeader` | `boolean` | `true` | Header with counts and next/previous. Default true. |

## Example (live: `#/components/agent-permissions/edit-permission` in the playground)

```tsx
import { PermissionPrompt } from "@cleanprompt/sutra-ui/agent";
import { DiffViewer } from "@cleanprompt/sutra-ui/editor";

function EditPermissionDemo() {
  const d = useDecision();
  return (
    <>
      <PermissionPrompt
        key={d.key}
        tool="edit"
        target="src/app.tsx"
        onDecision={d.onDecision}
        onCancel={() => d.onDecision({ choice: "cancel" })}
        preview={<DiffViewer oldValue={oldApp} newValue={newApp} showHeader={false} lineNumbers maxHeight={220} />}
        className="max-w-2xl"
      />
      <DecisionLog decision={d.decision} onReset={d.reset} />
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): DecisionLog, newApp, oldApp, useDecision.
