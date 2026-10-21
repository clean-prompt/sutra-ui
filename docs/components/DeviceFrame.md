# DeviceFrame

> Wraps content in browser window chrome or a phone/tablet bezel.

- Import: `import { DeviceFrame } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/device-frame` (assets)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `screenClassName` | `string` |  | Extra classes for the screen/content area. |
| `statusBar` | `boolean` | `true` | Show a status bar with time and indicators (phone/tablet). |
| `trafficLights` | `boolean` | `true` | Colored traffic-light buttons (browser). Neutral dots when false. |
| `url` | `string` | `"sutra.app"` | Address bar text (browser). |
| `variant` | `DeviceFrameVariant` | `"browser"` | Frame style: a `browser` window, a `phone` or a `tablet`. |

## Example (live: `#/components/assets/device-frame` in the playground)

```tsx
import { DeviceFrame } from "@cleanprompt/sutra-ui/assets";
import { Text } from "@cleanprompt/sutra-ui/core";

function DeviceFrameDemo() {
  return (
    <>
      <div className="space-y-3">
        {/* Browser */}
        <DeviceFrame variant="browser" url="app.sutra.dev/tasks" className="max-w-2xl">
          <SampleScreen />
        </DeviceFrame>
        <DeviceFrame variant="browser" url="sutra.app/pricing" trafficLights={false} className="max-w-md">
          <div className="flex h-32 items-center justify-center bg-muted">
            <Text size="sm" tone="neutral">
              Neutral window controls
            </Text>
          </div>
        </DeviceFrame>
      </div>

      <div className="flex flex-wrap items-start gap-10 overflow-x-auto pb-2">
        <div className="space-y-3">
          {/* Phone */}
          <DeviceFrame variant="phone">
            <SampleScreen compact />
          </DeviceFrame>
        </div>
        <div className="space-y-3">
          {/* Tablet */}
          <DeviceFrame variant="tablet">
            <SampleScreen />
          </DeviceFrame>
        </div>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): SampleScreen.
