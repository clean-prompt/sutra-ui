# ContextMeter

> Context-window usage ring; its popover is a `ContextUsageBreakdown` with an optional compact action.

- Import: `import { ContextMeter } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/context-meter` (kit `ai`)
- `data-slot`: `context-meter`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `limit` (required) | `number` |  | Model context size in tokens. |
| `breakdown` | `ContextMeterBreakdown` |  | Fixed-key breakdown. Ignored when `categories` is set. |
| `canCompact` | `boolean` |  | Default: true when `onCompact` is set. |
| `canCompress` | `boolean` |  | **Deprecated.** Use `canCompact`. Whether compressing is available. Default true when `onCompress` is set. |
| `categories` | `ContextUsageCategory[]` |  | Free-form breakdown, the same shape as `ContextUsageBreakdown` (mark reply reservations with `reserved: true`). |
| `compacting` | `boolean` |  | Shows a spinner on the compact button. |
| `compressing` | `boolean` |  | **Deprecated.** Use `compacting`. Shows a spinner on the button and disables it while compressing. |
| `model` | `string` |  | Model name shown in the popover. |
| `note` | `React.ReactNode` |  | Extra content under the breakdown. |
| `onCompact` | `() => void` |  | Shows a "Compact conversation" button in the popover. |
| `onCompress` | `() => void` |  | **Deprecated.** Use `onCompact`. Keeps the old "Compress conversation" wording. Called when the user presses the compress button. |
| `size` | `number` | `20` | Ring diameter in px. Default 20. |
| `thresholds` | `MeterThresholds` | `defaultMeterThresholds` | Percent thresholds for warn/danger coloring. Default 75 / 90. |
| `used` | `number` |  | Tokens currently in the prompt. Defaults to the sum of the breakdown (or of the non-reserved categories). |

## Example (live: `#/components/ai-extras/context-meter` in the playground)

```tsx
import * as React from "react";
import { ContextMeter } from "@sutra/ui/ai";
import { Button } from "@sutra/ui/core";

function ContextMeterDemo() {
  const [history, setHistory] = React.useState(9000);
  const [compressing, setCompressing] = React.useState(false);
  const compress = () => {
    setCompressing(true);
    setTimeout(() => {
      setHistory((h) => Math.round(h * 0.25));
      setCompressing(false);
    }, 1200);
  };
  const levels = [
    { label: "Plenty of room", history: 6000 },
    { label: "Getting full (warn)", history: 22000 },
    { label: "Almost full (danger)", history: 27500 },
  ];
  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <ContextMeter
          limit={32000}
          model="qwen3-8b"
          breakdown={{ system: 1400, history, attachments: 2600, reserved: 2000 }}
          onCompact={compress}
          compacting={compressing}
          canCompact={history > 2000}
        />
        {/* Interactive */}
        <div className="flex gap-1">
          <Button size="xs" variant="outline" onClick={() => setHistory((h) => Math.min(30000, h + 4000))}>
            + history
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setHistory(9000)}>
            Reset
          </Button>
        </div>
      </div>
      {levels.map((l) => (
        <div key={l.label} className="flex flex-col items-center gap-2">
          <ContextMeter limit={32000} breakdown={{ system: 1400, history: l.history, attachments: 0 }} />
          {/* {l.label} */}
        </div>
      ))}
    </>
  );
}
```
