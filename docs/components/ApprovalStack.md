# ApprovalStack

> A stacked queue of pending approvals: the top card is interactive, the rest peek out behind with a "+n more" count.

- Import: `import { ApprovalStack } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/ai/approval-stack` (kit `ai`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `readonly T[]` |  | Items to approve, in order; the first is the top card and `renderItem` draws each one. |
| `renderItem` (required) | `(item: T, state: ApprovalStackRenderState) => React.ReactNode` |  | Renders the interactive top card (e.g. a PermissionPrompt). |
| `defaultIndex` | `number` |  | Initial index of the top card when `index` is not controlled. |
| `depth` | `number` |  | How many cards peek out behind the top one. Default 2. |
| `empty` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `emptyState` | `React.ReactNode` |  | Shown when `items` is empty. Renders nothing by default. |
| `getKey` | `(item: T, index: number) => React.Key` |  | Stable key for an item. Default: its index. |
| `index` | `number` |  | Index of the top card (controlled). |
| `label` | `string` |  | Region label. Default "Pending approvals". |
| `onApproveAll` | `() => void` |  | Shows "Approve all" when set. |
| `onDenyAll` | `() => void` |  | Shows "Deny all" when set. |
| `onIndexChange` | `(index: number) => void` |  | Called with the index of the new top card when the user steps through the stack. |
| `ref` | `React.Ref<HTMLElement>` |  |  |

## Example (live: `#/components/chat-extras/approval-stack` in the playground)

```tsx
import * as React from "react";
import { ApprovalStack, PermissionPrompt } from "@sutra/ui/agent";
import { Button } from "@sutra/ui/core";

function ApprovalStackDemo() {
  const [items, setItems] = React.useState(initialApprovals);
  const [index, setIndex] = React.useState(0);
  const resolve = (id: string) => setItems((xs) => xs.filter((x) => x.id !== id));
  return (
    <>
      <ApprovalStack
        items={items}
        index={index}
        onIndexChange={setIndex}
        getKey={(it) => it.id}
        onApproveAll={() => setItems([])}
        onDenyAll={() => setItems([])}
        empty={
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            All approvals handled.
            <Button size="xs" variant="secondary" onClick={() => setItems(initialApprovals)}>
              Reset
            </Button>
          </div>
        }
        renderItem={(it) => (
          <PermissionPrompt
            tool={it.tool}
            target={it.target}
            preview={<pre className="overflow-x-auto font-mono text-xs">{it.preview}</pre>}
            showHints={false}
            onDecision={() => resolve(it.id)}
          />
        )}
      />
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): initialApprovals.
