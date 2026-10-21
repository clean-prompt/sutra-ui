# ConnectionState

> Full-panel host states: unresponsive / disconnected (reconnect link + spinner) and load error (retry).

- Import: `import { ConnectionState } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-onboarding` (kit `agent`)
- `data-slot`: `connection-state`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `state` (required) | `ConnectionStateKind` |  | Why the connection is shown: `unresponsive`, `disconnected` or `error`; picks the default title and description. |
| `description` | `React.ReactNode` |  | Replaces the default description of the state. |
| `details` | `string` |  | Error details shown in a mono block (error state). |
| `fullPanel` | `boolean` | `true` | Fill the parent panel and center the content. Default true. |
| `onReconnect` | `() => void` |  | Called when the user presses Reconnect; the link is hidden when unset. |
| `onRetry` | `() => void` |  | Called when the user presses Retry in the error state; the button is hidden when unset. |
| `reconnecting` | `boolean` |  | Shows a spinner in place of the reconnect link. |
| `title` | `React.ReactNode` |  | Replaces the default title of the state. |

## Example (live: `#/components/agent-sessions/connection-state` in the playground)

```tsx
import * as React from "react";
import { ConnectionState } from "@sutra/ui/agent";

function ConnectionStateDemo() {
  const [reconnecting, setReconnecting] = React.useState(false);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-box border border-border">
          <ConnectionState
            state="unresponsive"
            reconnecting={reconnecting}
            onReconnect={() => {
              setReconnecting(true);
              setTimeout(() => setReconnecting(false), 2000);
            }}
          />
        </div>
        <div className="rounded-box border border-border">
          <ConnectionState state="disconnected" onReconnect={() => {}} />
        </div>
        <div className="rounded-box border border-border">
          <ConnectionState state="error" details="ECONNREFUSED 127.0.0.1:43117" onRetry={() => {}} />
        </div>
      </div>
    </>
  );
}
```
