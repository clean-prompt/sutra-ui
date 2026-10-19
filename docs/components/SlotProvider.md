# SlotProvider

> Provides a slot registry to `SlotOutlet` and `SlotFill` below it.

- Import: `import { SlotProvider } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/slot-outlet` (kit `agent-admin`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` |  | App subtree that can render `SlotOutlet`s and `SlotFill`s. |
| `contributions` | `SlotContribution[]` |  | Initial contributions when no `registry` is given. |
| `registry` | `SlotRegistry` |  | Use an existing registry (e.g. one plugins register into at startup). |
