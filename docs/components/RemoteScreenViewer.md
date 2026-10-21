# RemoteScreenViewer

> Frame for an agent's computer-use screen: state, control lease, fit / fullscreen, latency and screenshot. Bring your own VNC canvas.

- Import: `import { RemoteScreenViewer } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/remote-screen` (kit `agent-admin`)
- `data-slot`: `remote-screen-viewer`, `remote-screen-surface`, `remote-screen-lease`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `state` (required) | `RemoteScreenState` |  | Connection state: `connecting`, `live`, `paused` or `disconnected`; sets the status badge and overlay. |
| `children` | `React.ReactNode` |  | Your remote-desktop surface. Sutra does not bundle a VNC / RDP client: mount e.g. a noVNC `RFB` canvas (or a WebRTC `<video>`) here and it is scaled into the frame. |
| `controller` | `RemoteScreenController` |  | Who holds the input lease. |
| `defaultController` | `RemoteScreenController` | `"agent"` | Initially controlling party when `controller` is not controlled. |
| `defaultFit` | `boolean` | `true` | Initial scale-to-fit state when `fit` is not controlled. |
| `fit` | `boolean` |  | Scale-to-fit (default) or actual size with scrolling. |
| `frameSrc` | `string` |  | Alternative to `children`: an image stream (MJPEG URL or the latest screenshot data URL). |
| `latencyMs` | `number` |  | Round-trip latency in ms. |
| `onControllerChange` | `(controller: RemoteScreenController) => void` |  | Called with the new controller when the user takes or hands back control. |
| `onFitChange` | `(fit: boolean) => void` |  | Called with the new state when the user toggles between fit and actual size. |
| `onReconnect` | `() => void` |  | Shows a Reconnect button while disconnected. |
| `onScreenshot` | `() => void` |  | Shows a screenshot button. |
| `screenHeight` | `number` | `800` | Remote desktop height in px, used with `screenWidth` for the aspect ratio. Default 800. |
| `screenWidth` | `number` | `1280` | Remote desktop width / height, used for the aspect ratio and "actual size". Default 1280×800. |
| `title` | `React.ReactNode` | `"Agent screen"` | Heading in the viewer toolbar. |

## Example (live: `#/components/channels/remote-screen` in the playground)

```tsx
import * as React from "react";
import { RemoteScreenViewer } from "@cleanprompt/sutra-ui/agent-admin";
import { Button } from "@cleanprompt/sutra-ui/core";

function RemoteScreenDemo() {
  const [state, setState] = React.useState<RemoteScreenState>("connecting");
  const [latency, setLatency] = React.useState(48);
  React.useEffect(() => {
    if (state !== "connecting") return;
    const t = setTimeout(() => setState("live"), 1500);
    return () => clearTimeout(t);
  }, [state]);
  React.useEffect(() => {
    const id = setInterval(() => setLatency(30 + Math.round(Math.random() * 90)), 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex w-full flex-col gap-3">
      <RemoteScreenViewer
        state={state}
        latencyMs={latency}
        title="Ada's computer"
        onScreenshot={() => {}}
        onReconnect={() => setState("connecting")}
      >
        <FakeDesktop />
      </RemoteScreenViewer>
      <div className="flex flex-wrap gap-1.5">
        {(["connecting", "live", "paused", "disconnected"] as RemoteScreenState[]).map((s) => (
          <Button key={s} size="xs" variant={s === state ? "soft" : "ghost"} onClick={() => setState(s)}>
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): FakeDesktop.
