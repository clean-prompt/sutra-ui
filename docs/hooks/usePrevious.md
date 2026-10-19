# usePrevious

> The last value that `value` had before its current one (`undefined`, or `initial`, until it first changes). It keeps its answer across re-renders where nothing changed, so it is safe for "which way did this move" checks, and it is derived while rendering, so it needs no effect and survives StrictMode remounts.

- Import: `import { usePrevious } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-previous`

## Signature

```ts
usePrevious<T>(value: T, initial?: T | undefined): T | undefined
```

## Example (live: `#/components/utility/use-previous` in the playground)

```tsx
import * as React from "react";
import { Button } from "@sutra/ui/core";
import { usePrevious } from "@sutra/ui/tokens";

function PreviousDemo() {
  const [n, setN] = React.useState(5);
  const previous = usePrevious(n);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" onClick={() => setN((v) => v - 1)}>
          Decrease
        </Button>
        <span className="text-sm tabular-nums">
          {previous === undefined ? `Value ${n}` : `${previous} → ${n} (${n > previous ? "up" : "down"})`}
        </span>
        <Button size="sm" variant="secondary" onClick={() => setN((v) => v + 1)}>
          Increase
        </Button>
      </div>
    </>
  );
}
```
