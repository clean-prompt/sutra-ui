# RotatingNoticeBar

> Global notice strip that rotates through notices with a dot pager and a pause button, also pausing on hover or focus. Renders an `AlertBanner`.

- Import: `import { RotatingNoticeBar } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/patterns/notice-bar` (patterns)
- `data-slot`: `rotating-notice-bar`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `notices` (required) | `NoticeItem[]` |  | Notices to rotate through; each has an `id` and `content`, with optional tone and action. |
| `autoRotate` | `boolean` | `true` | Default true. Always off under prefers-reduced-motion. |
| `interval` | `number` | `6` | Seconds per notice. Default 6. |
| `label` | `string` | `"Notices"` | Accessible name of the notice region. |
| `labels` | `RotatingNoticeBarLabels` |  | Texts for the controls and their accessible names (English by default); pass them to translate the bar. |
| `onDismiss` | `(id: string) => void` |  | Persist a dismissal (the bar hides it locally either way). |
| `onIndexChange` | `(index: number, notice: NoticeItem) => void` |  | Called with the shown index and the notice when the rotation advances or the user pages. |
| `sticky` | `boolean` |  | Stick to the top. Default false. |

## Example (live: `#/components/workspace/notice-bar` in the playground)

```tsx
import * as React from "react";
import { Button } from "@sutra/ui/core";
import { RiRestartLine } from "@sutra/ui/icons";
import { RotatingNoticeBar, useNoticeQueue } from "@sutra/ui/workspace";

function NoticeDemo() {
  const [persisted, setPersisted] = React.useState<string[]>([]);
  const queue = useNoticeQueue(noticeSource, { onDismiss: (_, all) => setPersisted(all) });
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="overflow-hidden rounded-box border border-border">
        <RotatingNoticeBar notices={queue.notices} interval={5} onDismiss={queue.dismiss} />
        <div className="h-16 bg-background p-3 text-xs text-muted-foreground">App content… (hover or focus the strip to pause)</div>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Dismissed (persist these): {persisted.length ? persisted.join(", ") : "none"}</span>
        <Button
          size="xs"
          variant="outline"
          leadingIcon={<RiRestartLine />}
          className="ml-auto"
          onClick={() => {
            queue.clearDismissed();
            setPersisted([]);
          }}
        >
          Restore notices
        </Button>
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): noticeSource.
