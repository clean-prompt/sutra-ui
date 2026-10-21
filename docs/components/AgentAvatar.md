# AgentAvatar

> Procedural agent avatar drawn as pure SVG from `{ shape, color, face, seed }`.

- Import: `import { AgentAvatar } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/patterns/agent-avatar` (patterns)
- `data-slot`: `agent-avatar`
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `spec` (required) | `AgentAvatarSpec` |  | What to draw: shape, colour, face and seed, plus an optional uploaded image. |
| `label` | `string` | `"Agent avatar"` | Accessible name. Pass "" to hide from assistive tech. Default "Agent avatar". |
| `size` | `number` | `40` | Pixel size. Default 40. |
