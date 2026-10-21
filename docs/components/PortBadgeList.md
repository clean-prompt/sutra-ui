# PortBadgeList

> A row of port badges with a "+N" overflow chip that names the hidden ports to screen readers and on hover.

- Import: `import { PortBadgeList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/system`)
- Source: `packages/ui/src/primitives/port-badge` (primitives)
- `data-slot`: `port-badge-list`, `port-badge-overflow`
- Part of [`PortBadge`](PortBadge.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `ports` (required) | `readonly (number \| string)[]` |  | Ports to show, in order. |
| `accent` | `Accent` |  | Categorical colour for every badge; without `accent` or `tone` they follow the inherited accent. |
| `colon` | `boolean` | `false` | Shows a leading colon on every badge (":3000"). |
| `host` | `string` | `"localhost"` | Host for the links when `linked`. |
| `label` | `string` | `"Ports"` | Accessible name of the list. Default "Ports". |
| `linked` | `boolean` | `false` | Link each port to localhost. Default false. |
| `max` | `number` |  | Show at most this many badges, then "+N". Default: all. |
| `size` | `"sm" \| "md" \| "lg"` | `"sm"` | Badge height and text size. |
| `tone` | `ToneInput` |  | Semantic colour for every badge; wins over `accent`. |

## Notes

See the notes in [`PortBadge`](PortBadge.md#notes).

## Example

```tsx
import { PortBadge, PortBadgeList } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <div className="flex flex-col items-start gap-3">
      <PortBadge port={3000} href />
      <PortBadge port={5432} colon />
      <PortBadgeList ports={[3000, 5173, 8080, 9001, 15672]} max={3} />
    </div>
  );
}
```
