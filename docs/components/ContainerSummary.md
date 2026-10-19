# ContainerSummary

> Container overview: total memory with lowest/peak, a per-container breakdown and CPU, limit, network and port tiles.

- Import: `import { ContainerSummary } from "@sutra/ui"` (or from `@sutra/ui/system`)
- Source: `packages/ui/src/kits/system/containers` (kit `system`)
- `data-slot`: `container-summary`, `container-summary-skeleton`, `container-summary-total`, `container-summary-cpu`, `container-summary-limit`, `container-summary-network`, `container-summary-ports`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `containers` (required) | `ContainerInfo[]` |  | Containers to summarise: totals, the breakdown by container and the one closest to its limit. |
| `accent` | `Accent` | `"cyan"` | Categorical colour for the tiles. Default "cyan". |
| `breakdownLimit` | `number` | `6` | Rows in the "By Container" breakdown before the rest fold into "Other". Default 6. |
| `formatBytes` | `(bytes: number) => string` | `formatMemory` | Memory text formatter. Default decimal units ("312 MB"). |
| `history` | `number[]` |  | Recent total-memory readings (bytes) for the Lowest / Peak rows. |
| `limitWarnAt` | `number` | `0.8` | Tint the "Closest to Its Limit" bar as a warning from this share. Default 0.8. |
| `loading` | `boolean` | `false` | Data is on its way. With no containers yet the total, breakdown and tiles show placeholders; with containers the root is only marked busy. |
| `maxPorts` | `number` | `4` | Published ports shown before "+N". Default 4. |
| `runtimeName` | `string` | `"Docker"` | Where the containers run, for the heading ("4 containers in Docker"). Default "Docker". |

## Example (live: `#/components/system/loading` in the playground)

```tsx
import { AgentProcessList } from "@sutra/ui/agent";
import { QuotaStrip } from "@sutra/ui/ai";
import { ProcessTable } from "@sutra/ui/ops";
import {
  ContainerSummary,
  DevServerList,
  MetricReadout,
  MetricReadoutGroup,
  VolumeMixer,
} from "@sutra/ui/system";

<div className="grid w-full grid-cols-1 gap-4">
  <MetricReadoutGroup label="Menu bar (loading)" className="w-fit rounded-control border border-border bg-card px-3 py-1.5">
    <MetricReadout label="CPU" value={null} unit="%" loading />
    <MetricReadout label="MEM" value={null} unit="%" loading />
    <MetricReadout label="GPU" value={null} unit="%" loading />
  </MetricReadoutGroup>
  <QuotaStrip quotas={[]} loading />
  <VolumeMixer apps={[]} loading />
  <DevServerList projects={[]} loading />
  <ContainerSummary containers={[]} loading />
  <AgentProcessList sessions={[]} loading loadingRows={1} />
  <ProcessTable processes={[]} loading loadingRows={4} />
</div>
```
