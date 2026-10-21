# SearchToolBody

> Search body: the pattern and a list of file:line matches.

- Import: `import { SearchToolBody } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/tool-timeline-bodies` (kit `agent`)
- `data-slot`: `search-tool-body`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `pattern` (required) | `string` |  | The search pattern or query that ran, shown in mono. |
| `matches` | `SearchToolMatch[]` | `[]` | Matches found, each with a path, line and excerpt. |
| `maxMatches` | `number` | `20` | Matches listed before "+N more". Default 20. |
| `onOpenMatch` | `(match: SearchToolMatch) => void` |  | Called with the match when the user opens one; rows are not interactive when unset. |
| `scope` | `string` |  | Directory / glob the search ran in. |

## Example (live: `#/components/agent-timeline/tool-bodies` in the playground)

```tsx
import * as React from "react";
import { ReadToolBody, SearchToolBody, ToolKeyValueBody, WebToolBody } from "@sutra/ui/agent";

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
