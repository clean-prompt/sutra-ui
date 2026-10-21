# useAsyncAction

> Tracks a possibly-async action: `busy`, `error`, and a stable `run`. Errors are caught (no unhandled rejections); results of superseded runs and after unmount are ignored.

- Import: `import { useAsyncAction } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-async-action`

## Signature

```ts
useAsyncAction<A extends unknown[] = [], R = unknown>(fn?: ((...args: A) => R | PromiseLike<R>) | undefined, options?: UseAsyncActionOptions<Awaited<R>>): AsyncAction<A, Awaited<R>>
```

## Example (live: `#/foundations/form-recipes/async-states` in the playground)

```tsx
import * as React from "react";
import { Button, InlineCode, Text } from "@cleanprompt/sutra-ui/core";
import { useAsyncAction } from "@cleanprompt/sutra-ui/tokens";

function AsyncStates() {
  const [outcome, setOutcome] = React.useState<"ok" | "fail">("ok");
  const [last, setLast] = React.useState<string | null>(null);
  const action = useAsyncAction(
    async () => {
      await wait(1200);
      if (outcome === "fail") throw new Error("The server said no");
      return "Saved";
    },
    { onSuccess: setLast }
  );
  return (
    <div className="w-full max-w-md space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button loading={action.busy} onClick={() => void action.run()}>
          Save
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOutcome((o) => (o === "ok" ? "fail" : "ok"))}>
          Next run: {outcome === "ok" ? "succeeds" : "fails"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void (action.reset(), setLast(null))}>
          Reset
        </Button>
      </div>
      <div role="status" className="min-h-6 text-sm">
        {action.busy ? <span className="text-muted-foreground">Saving</span> : action.error ? <span className="text-destructive">{action.error}</span> : last ? <span className="text-success">{last}</span> : <span className="text-muted-foreground">Idle</span>}
      </div>
      <Text size="xs" tone="neutral">
        <InlineCode>run</InlineCode> never rejects. A newer run supersedes an older one, and a result that arrives after unmount is dropped. <InlineCode>busy</InlineCode>, <InlineCode>error</InlineCode> and <InlineCode>reset</InlineCode> come
        from the hook.
      </Text>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): wait.
