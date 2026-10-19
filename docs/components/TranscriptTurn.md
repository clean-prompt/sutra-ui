# TranscriptTurn

> A turn section whose sticky header stays pinned only while the turn is in view.

- Import: `import { TranscriptTurn } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-transcript` (kit `agent`)
- `data-slot`: `transcript-turn`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` (required) | `string` |  | Unique id; the turn start anchor gets `${id}-start`. |
| `prompt` (required) | `React.ReactNode` |  | The user's prompt, shown in the sticky turn header. |
| `headingLevel` | `2 \| 3 \| 4` |  | Level of the visually hidden heading. Default 2. |
| `index` | `number` |  | 1-based turn number for the screen-reader heading. |
