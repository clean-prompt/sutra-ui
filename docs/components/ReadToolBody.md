# ReadToolBody

> File read body: path, line range and an optional snippet.

- Import: `import { ReadToolBody } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/tool-timeline-bodies` (kit `agent`)
- `data-slot`: `read-tool-body`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `path` (required) | `string` |  | Path of the file that was read. |
| `endLine` | `number` |  | Last line that was read (1-based); completes the "Lines 10–40" label. |
| `language` | `string` |  | Code language for highlighting the `snippet`; guessed from `path` when unset. |
| `onOpenFile` | `() => void` |  | Called when the user presses the path; the path is plain text when unset. |
| `snippet` | `string` |  | Excerpt of what was read. |
| `startLine` | `number` |  | First line that was read (1-based); shown in the range label and used as the snippet's first line number. |
| `totalLines` | `number` |  | Total lines in the file; shown as "of N" after the range, or alone as "N lines" without a range. |

## Example (live: `#/components/agent-timeline/tool-bodies` in the playground)

```tsx
import * as React from "react";
import {
  ReadToolBody,
  SearchToolBody,
  ToolKeyValueBody,
  WebToolBody,
} from "@cleanprompt/sutra-ui/agent";

function BodiesDemo() {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          {/* Read */}
          <ReadToolBody path="src/hooks/use-counter.ts" startLine={3} endLine={6} totalLines={9} language="ts" snippet={counterBefore.split("\n").slice(2, 6).join("\n")} />
        </div>
        <div className="space-y-2">
          {/* Search */}
          <SearchToolBody
            pattern="useState\("
            scope="src/**/*.tsx"
            onOpenMatch={() => {}}
            matches={[
              { file: "src/app.tsx", line: 12, text: "const [open, setOpen] = useState(false);" },
              { file: "src/hooks/use-counter.ts", line: 4, text: "const [count, setCount] = React.useState(initial);" },
              { file: "src/components/menu.tsx", line: 31, text: "const [active, setActive] = useState<string>();" },
            ]}
          />
        </div>
        <div className="space-y-2">
          {/* Web */}
          <WebToolBody
            url="https://react.dev/reference/react/useCallback"
            title="useCallback – React"
            snippet="useCallback is a React Hook that lets you cache a function definition between re-renders."
          />
        </div>
        <div className="space-y-2">
          {/* Key / value */}
          <ToolKeyValueBody
            rows={[
              { label: "subagent", value: "code-reviewer" },
              { label: "prompt", value: "Review the counter hook change for edge cases around max and negative values. Check the tests cover reset after increments, and that the memoized reset updates when the initial value changes. Report only real bugs." },
              { label: "timeout", value: "120s" },
            ]}
          />
        </div>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): counterBefore.
