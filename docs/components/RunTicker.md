# RunTicker

> One-line rolling activity reel: each new line pushes the previous one up and out. Click to see every line.

- Import: `import { RunTicker } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/subagents` (kit `agent-admin`)
- `data-slot`: `run-ticker`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `activities` (required) | `RunTickerActivity[]` |  | Activities to show in the ticker, in order; the latest one is on top of the reel. |
| `defaultExpanded` | `boolean` | `false` | Initial expanded state when `expanded` is not controlled. |
| `expanded` | `boolean` |  | Controlled expanded state of the full activity list. |
| `label` | `React.ReactNode` |  | Label before the reel. |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called with the new state when the user expands or collapses the list. |
| `running` | `boolean` | `true` | Shows a spinner while true. |
