# ToolTimelineText

> Assistant narration between tool calls.

- Import: `import { ToolTimelineText } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/tool-timeline-steps` (kit `agent`)
- `data-slot`: `tool-timeline-text`
- Part of [`ToolTimeline`](ToolTimeline.md)
- Also accepts the props of HTMLAttributes, LiHTMLAttributes

## Props

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
