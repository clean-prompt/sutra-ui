# SystemResourcesBar

> Compact status-bar meters for CPU, RAM, GPU and VRAM.

- Import: `import { SystemResourcesBar } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/local-models` (kit `agent-admin`)
- `data-slot`: `system-resources-bar`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `cpuPercent` | `number` |  | CPU load in percent (0 to 100); the reading is hidden when unset. |
| `gpuPercent` | `number` |  | GPU load in percent (0 to 100); the reading is hidden when unset. |
| `ram` | `{ usedGB: number; totalGB: number }` |  | Memory in use and total in GB; the reading is hidden when unset. |
| `readings` | `SystemResourceReading[]` | `[]` | Extra or custom readings appended after the built-ins. |
| `thresholds` | `MeterThresholds` | `{ warn: 75, danger: 90 }` | Used-percent levels at which a reading turns warning and danger. Default 75 / 90. |
| `vram` | `{ usedGB: number; totalGB: number }` |  | GPU memory in use and total in GB; the reading is hidden when unset. |

## Example (live: `#/components/providers/system-resources` in the playground)

```tsx
import * as React from "react";
import { SystemResourcesBar } from "@cleanprompt/sutra-ui/agent-admin";

function ResourcesDemo() {
  const [r, setR] = React.useState({ cpu: 34, ram: 18.2, gpu: 71, vram: 9.4 });
  React.useEffect(() => {
    const t = setInterval(() => {
      const jitter = (v: number, d: number, min: number, max: number) => Math.max(min, Math.min(max, v + (Math.random() - 0.5) * d));
      setR((x) => ({ cpu: jitter(x.cpu, 18, 3, 100), ram: jitter(x.ram, 1.2, 8, 31.5), gpu: jitter(x.gpu, 20, 0, 100), vram: jitter(x.vram, 0.8, 2, 11.9) }));
    }, 1200);
    return () => clearInterval(t);
  }, []);
  const round = (n: number) => Math.round(n * 10) / 10;
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between rounded-control border border-border bg-subtle px-3 py-1.5">
        <SystemResourcesBar cpuPercent={Math.round(r.cpu)} ram={{ usedGB: round(r.ram), totalGB: 32 }} gpuPercent={Math.round(r.gpu)} vram={{ usedGB: round(r.vram), totalGB: 12 }} />
        <span className="text-2xs text-muted-foreground">Hearth Local · Wren 8B</span>
      </div>
      <div className="rounded-control border border-border bg-subtle px-3 py-1.5">
        <SystemResourcesBar cpuPercent={12} ram={{ usedGB: 30.4, totalGB: 32 }} />
      </div>
    </div>
  );
}
```
