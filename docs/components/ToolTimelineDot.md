# ToolTimelineDot

> Status dot on the timeline rail (a `StatusDot` placed on the rail): success, failure, progress (pulsing), warning or pending (dashed ring).

- Import: `import { ToolTimelineDot } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/tool-timeline` (kit `agent`)
- `data-slot`: `tool-timeline-dot`
- Part of [`ToolTimeline`](ToolTimeline.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Accessible label; defaults to the status name. |
| `status` | `ToolTimelineStatusInput` |  | Omit for a neutral narration dot (hidden from assistive tech). Accepts `TaskStatus` values too. |

## Example (live: `#/components/agent-timeline/tool-timeline` in the playground)

```tsx
import { ReadToolBody, ToolTimeline, ToolTimelineItem, ToolTimelineText } from "@sutra/ui/agent";

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
