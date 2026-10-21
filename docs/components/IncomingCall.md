# IncomingCall

> Ringing incoming call card with pulsing avatar rings and Accept / Decline / Message actions.

- Import: `import { IncomingCall } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/social`)
- Source: `packages/ui/src/kits/social/call-overlay` (kit `social`)
- `data-slot`: `incoming-call`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Caller display name. |
| `avatar` | `React.ReactNode` |  | Custom avatar node (overrides `avatarSrc`). |
| `avatarSrc` | `string` |  | Caller avatar image URL; initials are shown when unset. |
| `onAccept` | `() => void` |  | Called when the user accepts the call. |
| `onDecline` | `() => void` |  | Called when the user declines the call, or when it rings out without `onTimeout`. |
| `onMessage` | `() => void` |  | Shows a "Message" quick-reply action. |
| `onTimeout` | `() => void` |  | Called when `ringFor` elapses; `onDecline` is called instead when unset. |
| `ringFor` | `number` | `30000` | Auto-dismiss after this many ms (calls `onTimeout`, else `onDecline`). `0` disables. Default 30000. |
| `subtitle` | `React.ReactNode` |  | Extra line under the call type, e.g. "Sutra Mail · work". |
| `type` | `CallType` | `"audio"` | `audio` or `video`; sets the call type line and the accept icon. Default "audio". |
| `variant` | `"card" \| "overlay"` | `"card"` | `card` renders inline as a non-modal dialog (focus stays where it is; Escape inside it declines). `overlay` is a modal alert dialog over a scrim: it focuses Accept, traps focus, hides the page from assistive tech, declines on Escape and returns focus when it unmounts. |

## Example (live: `#/components/social/incoming-call` in the playground)

```tsx
import * as React from "react";
import { Button, TextLink } from "@cleanprompt/sutra-ui/core";
import { IncomingCall } from "@cleanprompt/sutra-ui/social";

function IncomingCallDemo() {
  const [state, setState] = React.useState<"ringing" | "accepted" | "declined" | "missed" | "message">("ringing");
  const [overlay, setOverlay] = React.useState(false);
  return (
    <div className="flex flex-col items-center gap-4">
      {state === "ringing" ? (
        <IncomingCall
          name="Ana Lima"
          type="video"
          subtitle="Sutra Messenger"
          ringFor={30000}
          onAccept={() => setState("accepted")}
          onDecline={() => setState("declined")}
          onTimeout={() => setState("missed")}
          onMessage={() => setState("message")}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Call {state === "message" ? "declined with a quick message" : state}.{" "}
          <TextLink variant="subtle" onClick={() => setState("ringing")}>Ring again</TextLink>
        </p>
      )}
      <Button variant="secondary" size="sm" onClick={() => setOverlay(true)}>
        Show as full-screen overlay
      </Button>
      {overlay ? (
        <IncomingCall
          variant="overlay"
          name="Bo Chen"
          type="audio"
          ringFor={15000}
          onAccept={() => setOverlay(false)}
          onDecline={() => setOverlay(false)}
        />
      ) : null}
    </div>
  );
}
```
