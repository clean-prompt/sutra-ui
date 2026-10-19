# useDebouncedValue

> A copy of `value` that follows it after it has stopped changing for `delay` ms (default 300). Feed it a search box value and fetch on the debounced one. The first render returns `value` untouched, a pending update is dropped when the component unmounts, and a `delay` of 0 or less updates on the next tick.

- Import: `import { useDebouncedValue } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-debounced-value`

## Signature

```ts
useDebouncedValue<T>(value: T, delay?: number): T
```

## Example (live: `#/components/utility/use-debounced-value` in the playground)

```tsx
import * as React from "react";
import { Input } from "@sutra/ui/forms";
import { useDebouncedValue } from "@sutra/ui/tokens";

function DebouncedDemo() {
  const [text, setText] = React.useState("");
  const debounced = useDebouncedValue(text, 400);
  const results = ["Alpine", "Aspen", "Birch", "Cedar", "Cypress", "Elm", "Maple", "Oak", "Pine", "Spruce"].filter((t) =>
    t.toLowerCase().includes(debounced.trim().toLowerCase())
  );
  return (
    <>
      <div className="w-full max-w-sm space-y-3">
        <Input aria-label="Search trees" placeholder="Type to search trees" value={text} onChange={(e) => setText(e.target.value)} />
        <p className="text-xs text-muted-foreground">
          typed: <code>{text || "(empty)"}</code> · debounced: <code>{debounced || "(empty)"}</code>
        </p>
        {results.length ? (
          <ul className="flex flex-wrap gap-2 text-sm">
            {results.map((r) => (
              <li key={r} className="rounded-control bg-muted px-2 py-1">
                {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No matches</p>
        )}
      </div>
    </>
  );
}
```
