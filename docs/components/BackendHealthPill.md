# BackendHealthPill

> Health probe status (a live StatusBadge preset): checking spinner, healthy + latency, unreachable + reason, or not configured.

- Import: `import { BackendHealthPill } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/backends` (kit `agent-admin`)
- `data-slot`: `backend-health`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `health` (required) | `BackendHealth` |  | Probe result of a backend (for example ok, failed, not configured or unknown); sets the pill text and tone. |
