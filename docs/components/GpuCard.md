# GpuCard

> One GPU: model, VRAM bar, utilization, temperature gauge and process count.

- Import: `import { GpuCard } from "@sutra/ui"` (or from `@sutra/ui/ops`)
- Source: `packages/ui/src/kits/ops/node-card` (kit `ops`)
- `data-slot`: `gpu-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `index` (required) | `number` |  | Zero-based GPU index, shown as "GPU 0". |
| `memoryTotal` (required) | `number` |  | VRAM total, GB. |
| `memoryUsed` (required) | `number` |  | VRAM used, GB. |
| `footer` | `React.ReactNode` |  | Extra content at the bottom of the card. |
| `model` | `React.ReactNode` |  | GPU model name, shown beside the index. |
| `power` | `number \| null` |  | Power draw W. |
| `powerLimit` | `number` |  | Power cap in W; shown after the draw, for example "120 / 300 W". |
| `processes` | `number` |  | Running processes on this GPU. |
| `temperature` | `number \| null` |  | Temperature °C. |
| `temperatureThresholds` | `{ warn: number; danger: number }` | `{ warn: 75, danger: 85 }` | Temperature thresholds in °C. Default warn 75, danger 85. |
| `utilization` | `number \| null` |  | Utilization percent. |

## Example (live: `#/components/monitoring/gpu-cards` in the playground)

```tsx
import * as React from "react";
import { GpuCard, NodeGrid } from "@sutra/ui/ops";

function GpuCardsDemo() {
  const [gpus, setGpus] = React.useState(() =>
    Array.from({ length: 4 }, (_, i) => ({ used: 10 + i * 9, util: 20 + i * 18, temp: 52 + i * 9, procs: i }))
  );
  useInterval(() => {
    setGpus((prev) => prev.map((g) => ({ ...g, used: jitter(g.used, 3, 0, 48), util: jitter(g.util, 20), temp: jitter(g.temp, 4, 30, 95) })));
  }, 2000);
  return (
    <NodeGrid minCardWidth={220} className="w-full">
      {gpus.map((g, i) => (
        <GpuCard
          key={i}
          index={i}
          model="NVIDIA RTX A6000"
          memoryUsed={Number(g.used.toFixed(1))}
          memoryTotal={48}
          utilization={g.util}
          temperature={g.temp}
          processes={g.procs}
          power={120 + g.util * 1.8}
          powerLimit={300}
        />
      ))}
    </NodeGrid>
  );
}
```

Playground helpers in this snippet (not part of the library): jitter, useInterval.
