# DividerPill

> Horizontal rule with a centered pill, e.g. "Teleported from web" or a checkpoint marker.

- Import: `import { DividerPill } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-transcript` (kit `agent`)
- `data-slot`: `divider-pill`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `action` | `React.ReactNode` |  | Trailing action inside the pill, e.g. a "Restore" link. |
| `icon` | `React.ReactNode` |  | Icon before the text inside the pill. |
