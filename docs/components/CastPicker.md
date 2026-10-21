# CastPicker

> Lists cast targets (TVs, phones, speakers…) with current-device marker and connecting/connected states.

- Import: `import { CastPicker } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/media`)
- Source: `packages/ui/src/kits/media/cast-picker` (kit `media`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `devices` (required) | `CastDevice[]` |  | Devices to list, each with a name, kind and connection state. |
| `closeOnSelect` | `boolean` | `false` | Close as soon as a device is picked. Default false (stay open to show connecting/connected). |
| `contentClassName` | `string` |  | Extra classes for the dialog or popover content. |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `description` | `React.ReactNode` |  | What is about to be cast (shown under the title). |
| `emptyMessage` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `emptyState` | `React.ReactNode` |  | Shown when there is nothing to list. Default "No other devices are available right now". |
| `error` | `React.ReactNode` |  | Message shown in place of the list when discovery fails. |
| `label` | `string` |  | Accessible list name. Default "Devices". |
| `loading` | `boolean` |  | Shows placeholder rows while devices are being discovered. |
| `onDisconnect` | `(device: CastDevice) => void` |  | Called with the device when the user disconnects the connected one. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the picker opens or closes. |
| `onRetry` | `() => void` |  | Called when the user presses Retry on the error message; the button is hidden when unset. |
| `onSelect` | `(device: CastDevice) => void` |  | Called with the device when the user picks one to connect to. |
| `open` | `boolean` |  | Controlled open state of the picker. |
| `title` | `React.ReactNode` | `"Play on…"` | Heading. Default "Play on…". |
| `trigger` | `React.ReactElement` |  | Custom trigger element. Default: an icon button with a cast glyph. |
| `triggerLabel` | `string` | `"Play on another device"` | Accessible name of the default trigger button. Default "Play on another device". |
| `triggerTone` | `"default" \| "overlay"` | `"default"` | Trigger tone, e.g. on top of a video. |
| `variant` | `"dialog" \| "popover"` | `"dialog"` | Modal dialog (bottom sheet on phones) or an anchored popover. Default "dialog". |

## Example (live: `#/components/media-player/cast-picker` in the playground)

```tsx
import * as React from "react";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiCastLine } from "@cleanprompt/sutra-ui/icons";
import { CastPicker, DeviceIcon } from "@cleanprompt/sutra-ui/media";

function CastDemo() {
  const [devices, setDevices] = React.useState(castDevices);
  const select = (d: CastDevice) => {
    setDevices((list) => list.map((x) => (x.id === d.id ? { ...x, status: "connecting" } : x.status === "connected" ? { ...x, status: "available" } : x)));
    setTimeout(() => setDevices((list) => list.map((x) => (x.id === d.id ? { ...x, status: "connected" } : x))), 1500);
  };
  const disconnect = (d: CastDevice) => setDevices((list) => list.map((x) => (x.id === d.id ? { ...x, status: "available" } : x)));
  return (
    <div className="flex flex-wrap items-center gap-6">
      <CastPicker devices={devices} onSelect={select} onDisconnect={disconnect} description="Arrival (2016)" trigger={<Button leadingIcon={<RiCastLine />}>Play on…</Button>} />
      <CastPicker variant="popover" devices={devices} onSelect={select} onDisconnect={disconnect} description="Harbor Lights" />
      <CastPicker devices={[]} trigger={<Button variant="secondary">No devices</Button>} />
      <CastPicker devices={[]} loading trigger={<Button variant="secondary">Loading</Button>} />
      <div className="flex items-center gap-3 text-muted-foreground">
        {["tv", "phone", "tablet", "laptop", "desktop", "speaker", "browser", "cast"].map((t) => (
          <DeviceIcon key={t} type={t} label={t} />
        ))}
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): castDevices.
