# PermissionPendingHint

> Subtle "Waiting for permission…" pill near the composer; click scrolls the pending prompt into view.

- Import: `import { PermissionPendingHint } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/ai/permission-prompt` (kit `ai`)
- `data-slot`: `permission-pending-hint`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` |  | Replaces the default "N pending" text. |
| `count` | `number` | `1` | Number of pending prompts. |
| `target` | `React.RefObject<HTMLElement \| null> \| HTMLElement \| null` |  | Element (or ref) to scroll into view on click. |

## Example (live: `#/components/agent-permissions/pending-hint` in the playground)

```tsx
import * as React from "react";
import { PermissionPendingHint, PermissionPrompt } from "@cleanprompt/sutra-ui/agent";

function PendingHintDemo() {
  const ref = React.useRef<HTMLDivElement>(null);
  return (
    <>
      <div className="scrollbar-thin h-64 overflow-y-auto rounded-box border border-border bg-card p-4">
        <div className="space-y-3 text-sm text-muted-foreground">
          {Array.from({ length: 6 }, (_, i) => (
            <p key={i}>
              Transcript line {i + 1}: the agent read <code>src/components/button.tsx</code> and summarized the variants.
            </p>
          ))}
        </div>
        <PermissionPrompt ref={ref} tool="bash" target="rm -rf node_modules/.cache" onDecision={() => {}} className="mt-4" />
        <div className="h-40" />
      </div>
      <div className="flex justify-center">
        <PermissionPendingHint target={ref} />
      </div>
    </>
  );
}
```
