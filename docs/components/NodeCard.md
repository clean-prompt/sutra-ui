# NodeCard

> Server / node status card: identity, status dot, uptime, metric tiles, chart, core grid and actions.

- Import: `import { NodeCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ops`)
- Source: `packages/ui/src/kits/ops/node-card` (kit `ops`)
- `data-slot`: `node-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `React.ReactNode` |  | Node name, shown as the card heading. |
| `status` (required) | `NodeStatus` |  | Connection state of the node (`online`, `offline`, `connecting` or `error`); sets the status dot and label. |
| `badges` | `React.ReactNode` |  | Badges next to the name (e.g. "Priority"). |
| `chart` | `React.ReactNode` |  | Mini chart slot (e.g. `<NodeMiniChart/>`). |
| `coreGrid` | `React.ReactNode` |  | Core grid slot (e.g. `<HeatmapGrid shape="bar"/>`). |
| `cpu` | `number \| null` |  | CPU percent. |
| `description` | `React.ReactNode` |  | Hostname / IP / role line under the name. |
| `error` | `React.ReactNode` |  | Error message (status="error"). |
| `footer` | `React.ReactNode` |  | Footer actions. |
| `gpu` | `number \| null` |  | GPU utilization percent (average). |
| `headingAs` | `"h2" \| "h3" \| "h4" \| "div"` | `"h3"` | Element used for the name, so the heading level fits the page outline. Default "h3". |
| `icon` | `React.ReactNode` |  | Icon beside the name. |
| `metrics` | `NodeMetric[]` |  | Custom metric tiles (replaces cpu/ram/gpu/vram). |
| `noGpu` | `boolean` |  | Node has no GPU: GPU tiles are replaced with a "No GPU" note. |
| `onRetry` | `() => void` |  | Called when the user presses Retry in the error state; the button is hidden when unset. |
| `ram` | `NodeMemory \| number \| null` |  | RAM in GB (`{used,total}`) or percent. |
| `retrying` | `boolean` |  | Shows a busy state on the retry button. |
| `statusLabel` | `string` |  | Replaces the default text of the status. |
| `thresholds` | `MeterThresholds` |  | Percent levels at which the CPU, RAM, GPU and VRAM meters turn warning and danger. |
| `uptime` | `React.ReactNode` |  | Preformatted uptime shown in the header. |
| `vram` | `NodeMemory \| null` |  | VRAM in GB. |
