# ToolTimeline

> Vertical rail of agent steps. Children are ToolTimelineItem, ToolGroup or ToolTimelineText (other nodes are wrapped as text).

- Import: `import { ToolTimeline } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/tool-timeline-steps` (kit `agent`)
- `data-slot`: `tool-timeline`
- Parts: [`ToolTimelineDot`](ToolTimelineDot.md), [`ToolTimelineItem`](ToolTimelineItem.md), [`ToolTimelineText`](ToolTimelineText.md)
- Also accepts the props of HTMLAttributes, OlHTMLAttributes

## Props

No props of its own.

## Part props

### ToolTimelineDot

Status dot on the timeline rail (a `StatusDot` placed on the rail): success, failure, progress (pulsing), warning or pending (dashed ring).

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Accessible label; defaults to the status name. |
| `status` | `ToolTimelineStatusInput` |  | Omit for a neutral narration dot (hidden from assistive tech). Accepts `TaskStatus` values too. |

### ToolTimelineItem

One compact tool call row: icon, bold name, mono argument, meta and an expandable body (children).

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `React.ReactNode` |  | Tool name, e.g. "Read", "Bash". |
| `arg` | `React.ReactNode` |  | Primary argument (path, command, pattern) in muted mono. |
| `defaultOpen` | `boolean` | `false` | Initial expanded state when `open` is not controlled. |
| `diffStat` | `{ additions: number; deletions: number }` |  | Line counts shown as "+12 −3". |
| `duration` | `number` |  | Duration in milliseconds. |
| `exitCode` | `number` |  | Exit code of a command tool, shown as an "exit N" badge; non-zero turns it red. |
| `icon` | `React.ReactNode` |  | Replaces the default icon chosen from the tool name. |
| `meta` | `React.ReactNode` |  | Extra right-side meta. |
| `onOpenChange` | `(open: boolean) => void` |  | Called with the new state when the user expands or collapses the row. |
| `open` | `boolean` |  | Controlled expanded state of the body (`children`). |
| `runningLabel` | `React.ReactNode` |  | Label while running (default "Running {name}…"). |
| `status` | `ToolTimelineStatusInput` | `"success"` | Default `success`. Accepts canonical `TaskStatus` values (`succeeded`, `failed`, `running`, `canceled`). |

### ToolTimelineText

Assistant narration between tool calls.

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` | `ToolTimelineStatusInput` |  | Optional status for the dot (narration usually has none). |

## Example (live: `#/components/agent-timeline/tool-timeline` in the playground)

```tsx
import {
  ReadToolBody,
  ToolTimeline,
  ToolTimelineItem,
  ToolTimelineText,
} from "@cleanprompt/sutra-ui/agent";

function TimelineDemo() {
  return (
    <>
      <ToolTimeline className="mx-auto w-full max-w-2xl">
        <ToolTimelineText>Narration sits on the rail between calls with a neutral dot.</ToolTimelineText>
        <ToolTimelineItem name="Read" arg="src/app.tsx" duration={38}>
          <ReadToolBody path="src/app.tsx" startLine={1} endLine={3} snippet={'import { App } from "./app";\n\ncreateRoot(root).render(<App />);'} language="tsx" />
        </ToolTimelineItem>
        <ToolTimelineItem name="Edit" arg="src/app.tsx" diffStat={{ additions: 12, deletions: 3 }} duration={210} />
        <ToolTimelineItem name="Bash" arg="pnpm build" status="failed" exitCode={2} duration={8300} />
        <ToolTimelineItem name="WebFetch" arg="https://react.dev/reference/react/useCallback" status="warning" meta="redirected" />
        <ToolTimelineItem name="Bash" arg="pnpm test --watch=false" status="running" />
        <ToolTimelineItem name="Write" arg="CHANGELOG.md" status="pending" />
      </ToolTimeline>
    </>
  );
}
```
