# QueuedMessages

> Messages typed while the agent is busy: inline edit, remove, send now (interrupt), reorder, and a collapsible "n queued" pill.

- Import: `import { QueuedMessages } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-composer` (kit `agent`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `QueuedMessage[]` |  | Messages waiting to be sent, in send order. |
| `collapsed` | `boolean` |  | Controlled collapsed state; collapsed shows only the count pill. |
| `defaultCollapsed` | `boolean` | `false` | Initial collapsed state when `collapsed` is not controlled. |
| `formatCount` | `(count: number) => string` | `(n) => `${n} queued`` | Pill label. Default `${n} queued`. |
| `onCollapsedChange` | `(collapsed: boolean) => void` |  | Called with the new state when the user expands or collapses the list. |
| `onEdit` | `(id: string, text: string) => void` |  | Saves an inline edit. Editing is disabled when unset. |
| `onRemove` | `(id: string) => void` |  | Called with the message id when the user removes it from the queue; the button is hidden when unset. |
| `onReorder` | `(ids: string[]) => void` |  | Enables move up / down (buttons and Alt+↑/↓) and reports the new order. |
| `onSendNow` | `(id: string) => void` |  | Interrupt the agent and send this message now. |
| `onSteer` | `(id: string) => void` |  | Inject this message into the live turn without interrupting it ("Steer"). |
| `steerHint` | `React.ReactNode` | `"Steer: add this to the current turn so the agent adjusts course without stopping. Send now interrupts and starts a new turn."` | Tooltip for the Steer action. |

## Example (live: `#/components/agent-composer/queued-messages` in the playground)

```tsx
import * as React from "react";
import { QueuedMessages } from "@sutra/ui/agent";

function QueuedMessagesDemo() {
  const [items, setItems] = React.useState<QueuedMessage[]>([
    { id: "q1", text: "Also add a test for the empty-string case" },
    { id: "q2", text: "Then update the CHANGELOG with a short note about the date parsing fix and link the issue", attachments: 1 },
    { id: "q3", text: "Finally run lint" },
  ]);
  const [sent, setSent] = React.useState<string | null>(null);
  return (
    <>
      <div className="mx-auto w-full max-w-xl">
        <QueuedMessages
          items={items}
          onEdit={(id, text) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, text } : x)))}
          onRemove={(id) => setItems((xs) => xs.filter((x) => x.id !== id))}
          onReorder={(ids) => setItems((xs) => ids.map((id) => xs.find((x) => x.id === id)!))}
          onSendNow={(id) => {
            setSent(items.find((x) => x.id === id)?.text ?? null);
            setItems((xs) => xs.filter((x) => x.id !== id));
          }}
        />
        <p className="mt-2 text-xs text-muted-foreground">{sent ? `Sent now: “${sent}”` : items.length ? "" : "Queue is empty."}</p>
      </div>
    </>
  );
}
```
