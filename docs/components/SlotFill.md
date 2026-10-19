# SlotFill

> Declaratively contribute `children` to a slot while mounted. Renders nothing in place. Registers once per slot/id/order/source; later `children` updates re-render only the filled content.

- Import: `import { SlotFill } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/slot-outlet` (kit `agent-admin`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `slot` (required) | `string` |  | Target slot name. |
| `children` | `React.ReactNode` |  | Content to render in the slot. |
| `id` | `string` |  | Stable id; defaults to a generated one. |
| `order` | `number` |  | Lower renders first; ties keep registration order. Default 0. |
| `source` | `string` |  | Name of the contributor (for example a plugin), shown in the error note when the fill throws. |
