# useDisclosure

> Open/close state for any overlay or disclosure, controlled or uncontrolled, with stable handlers.

- Import: `import { useDisclosure } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-disclosure`

## Signature

```ts
useDisclosure({ open, defaultOpen, onOpenChange }?: UseDisclosureOptions): UseDisclosureReturn
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled (default false). |
| `onOpenChange` | `(open: boolean) => void` |  | Called with the next state whenever it changes through `onOpen`, `onClose`, `toggle`, `setOpen` or `props`. |
| `open` | `boolean` |  | Controlled open state. |

## Example (live: `#/components/utility/use-disclosure` in the playground)

```tsx
import * as React from "react";
import { Button, Collapse } from "@sutra/ui/core";
import { useDisclosure } from "@sutra/ui/tokens";

function DisclosureDemo() {
  const disclosure = useDisclosure();
  const [count, setCount] = React.useState(0);
  const controlled = useDisclosure({ open: count % 2 === 1, onOpenChange: () => setCount((c) => c + 1) });
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-2">
          {/* Uncontrolled */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={disclosure.onOpen}>
              Open
            </Button>
            <Button size="sm" variant="secondary" onClick={disclosure.onClose}>
              Close
            </Button>
            <Button size="sm" variant="ghost" onClick={disclosure.toggle}>
              Toggle
            </Button>
          </div>
          <Collapse open={disclosure.open}>
            <p className="rounded-box border border-border bg-card p-3 text-sm text-muted-foreground">
              open is {String(disclosure.open)}.
            </p>
          </Collapse>
        </div>
        <div className="min-w-0 space-y-2">
          {/* Controlled by the parent (every request flips a counter) */}
          <Button size="sm" variant="secondary" onClick={controlled.toggle}>
            Request toggle ({count})
          </Button>
          <p className="text-sm text-muted-foreground">open is {String(controlled.open)}.</p>
        </div>
      </div>
    </>
  );
}
```
