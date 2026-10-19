# TranscriptTimelineRail

> Minimap rail beside a long transcript: one tick per user turn, hover previews, jump and in-view sync.

- Import: `import { TranscriptTimelineRail } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/timeline-rail` (kit `workspace`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `turns` (required) | `TimelineRailTurn[]` |  | Conversation turns to mark on the rail, each with an id and a label. |
| `activeId` | `string \| null` |  | Controlled current turn; tracked via IntersectionObserver when omitted. |
| `getTurnElement` | `(id: string) => HTMLElement \| null` |  | Resolve a turn element. Default `document.getElementById(id)`. |
| `label` | `string` | `"Transcript timeline"` | Accessible name of the rail. Default "Transcript timeline". |
| `onActiveChange` | `(id: string \| null) => void` |  | Called with the turn id (or `null`) when the active turn changes while scrolling. |
| `onJump` | `(id: string) => void` |  | Called on click / Enter; when omitted the turn element is scrolled into view. |
| `scrollContainer` | `React.RefObject<HTMLElement \| null>` |  | Scrollable transcript element (IntersectionObserver root and position source). Defaults to the viewport. |

## Example (live: `#/components/workspace/timeline-rail` in the playground)

```tsx
import * as React from "react";
import { TranscriptTimelineRail } from "@sutra/ui/workspace";

function TranscriptDemo() {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState<string | null>(null);
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex h-[480px] w-full overflow-hidden rounded-box border border-border">
        <div ref={scrollRef} className="relative flex-1 overflow-y-auto scrollbar-thin">
          <div className="flex flex-col gap-4 p-4">
            {transcriptTurns.map((t, i) => (
              <div key={t.id} id={t.id} className="flex scroll-mt-4 flex-col gap-2">
                <div className="self-end rounded-box bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground">{t.preview}</div>
                <div className="max-w-[85%] rounded-box bg-subtle px-3 py-2 text-sm text-foreground">
                  {`Here's what I found for “${t.preview.toLowerCase()}”. `}
                  {"Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(1 + (i % 4))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-l border-border bg-subtle/50">
          <TranscriptTimelineRail turns={transcriptTurns} scrollContainer={scrollRef} onActiveChange={setActive} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">In view: {active ?? "—"} · focus the rail and use ↑ ↓, Enter to jump</p>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): transcriptTurns.
