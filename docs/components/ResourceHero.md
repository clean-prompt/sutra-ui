# ResourceHero

> Endpoint / service header: name, status, copyable endpoint, uptime, readiness and config chips.

- Import: `import { ResourceHero } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ops`)
- Source: `packages/ui/src/kits/ops/node-card` (kit `ops`)
- `data-slot`: `resource-hero`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `React.ReactNode` |  | Resource name, shown as the heading. |
| `actions` | `React.ReactNode` |  | Buttons on the right of the header. |
| `chips` | `ResourceHeroChip[]` |  | Config chips (key → value). |
| `description` | `React.ReactNode` |  | Line under the name (for example a model or region). |
| `endpoint` | `string` |  | Endpoint URL with a copy button. |
| `icon` | `React.ReactNode` |  | Icon beside the name. |
| `ready` | `{ ready: number; total: number; noun?: string }` |  | "N of M ready" counter. |
| `status` | `NodeStatus` | `"online"` | Connection state (`online`, `offline`, `connecting` or `error`); sets the status dot and label. Default "online". |
| `statusLabel` | `string` |  | Replaces the default text of the status. |
| `uptime` | `React.ReactNode` |  | Preformatted uptime shown beside the status. |

## Example (live: `#/components/monitoring/resource-hero` in the playground)

```tsx
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiRefreshLine, RiRouterLine } from "@cleanprompt/sutra-ui/icons";
import { ResourceHero } from "@cleanprompt/sutra-ui/ops";

<ResourceHero
  icon={<RiRouterLine />}
  name="model-gateway"
  description="OpenAI-compatible gateway for the lab cluster"
  status="online"
  endpoint="http://gpu-gw.lab.internal:8000/v1"
  uptime="18d 6h"
  ready={{ ready: 2, total: 3, noun: "models ready" }}
  chips={[
    { label: "GPUs", value: "4× A6000" },
    { label: "max_ctx", value: "32k" },
    { label: "sleep after", value: "15m" },
    { label: "auth", value: "keys" },
  ]}
  actions={
    <Button size="sm" variant="outline" leadingIcon={<RiRefreshLine />}>
      Reload config
    </Button>
  }
/>
```
