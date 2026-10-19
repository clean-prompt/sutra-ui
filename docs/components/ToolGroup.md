# ToolGroup

> Folds consecutive low-signal calls into one row ("Explored 6 files"), expandable to list them.

- Import: `import { ToolGroup } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/tool-timeline` (kit `agent`)
- `data-slot`: `tool-group`
- Also accepts the props of HTMLAttributes, LiHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `autoCollapse` | `boolean` | `true` | Collapse when the group finishes running (uncontrolled only). Default true. |
| `defaultOpen` | `boolean` |  | Initial expanded state when `open` is not controlled. |
| `icon` | `React.ReactNode` |  | Replaces the default group icon. |
| `label` | `(info: ToolGroupLabelInfo) => React.ReactNode` |  | Custom label, e.g. ({ count }) => `Searched ${count} patterns`. |
| `noun` | `string` | `"file"` | Singular noun. Default "file". |
| `onOpenChange` | `(open: boolean) => void` |  | Called with the new state when the user expands or collapses the group. |
| `open` | `boolean` |  | Controlled expanded state of the group. |
| `pluralNoun` | `string` |  | Plural noun. Default `${noun}s`. |
| `runningVerb` | `string` | `"Exploring"` | Present participle while running. Default "Exploring". |
| `status` | `ToolTimelineStatusInput` |  | Group status; derived from the children's `status` when omitted. Accepts `TaskStatus` values too. |
| `verb` | `string` | `"Explored"` | Past-tense verb. Default "Explored". |

## Example (live: `#/components/agent-timeline/tool-group` in the playground)

```tsx
import * as React from "react";
import { ToolGroup, ToolTimeline, ToolTimelineItem } from "@sutra/ui/agent";
import { Button } from "@sutra/ui/core";

function ToolGroupDemo() {
  const [done, setDone] = React.useState(false);
  return (
    <>
      <div className="flex justify-end">
        <Button size="xs" variant="secondary" onClick={() => setDone((d) => !d)}>
          {done ? "Restart" : "Finish"}
        </Button>
      </div>
      <ToolTimeline className="mx-auto w-full max-w-2xl">
        <ToolGroup>
          <ToolTimelineItem name="Read" arg="package.json" />
          <ToolTimelineItem name="Read" arg="tsconfig.json" />
          <ToolTimelineItem name="Glob" arg="src/**/*.test.ts" />
          <ToolTimelineItem name="Read" arg="vitest.config.ts" status={done ? "succeeded" : "running"} />
        </ToolGroup>
        <ToolGroup verb="Searched" runningVerb="Searching" noun="pattern">
          <ToolTimelineItem name="Grep" arg="TODO" />
          <ToolTimelineItem name="Grep" arg="console\.log" />
          <ToolTimelineItem name="Grep" arg="@deprecated" />
        </ToolGroup>
        <ToolGroup label={({ count }) => `Fetched ${count} pages`}>
          <ToolTimelineItem name="WebFetch" arg="https://tailwindcss.com/docs" />
          <ToolTimelineItem name="WebFetch" arg="https://www.radix-ui.com" />
        </ToolGroup>
      </ToolTimeline>
    </>
  );
}
```
