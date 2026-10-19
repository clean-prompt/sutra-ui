# ConnectionMethodChooser

> Hosted vs local radio cards with pros and cons.

- Import: `import { ConnectionMethodChooser } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/mcp` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes, RadioGroupProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `ConnectorWay` |  | Initially selected way (`hosted` or `local`) when `value` is not controlled. |
| `info` | `Partial<Record<ConnectorWay, ConnectionMethodInfo>>` |  | Override copy per way. |
| `invalid` | `boolean` |  | Marks the group invalid: error styling on the items and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `onValueChange` | `(way: ConnectorWay) => void` |  | Called with the way the user selects. |
| `value` | `ConnectorWay` |  | Controlled selected way: `hosted` or `local`. |
| `ways` | `ConnectorWay[]` | `["hosted", "local"]` | Ways offered. Default both. |

## Example (live: `#/components/capabilities/connection-method` in the playground)

```tsx
import { ConnectionMethodChooser } from "@sutra/ui/agent-admin";

<ConnectionMethodChooser className="max-w-2xl" />
```
