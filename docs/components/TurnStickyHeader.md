# TurnStickyHeader

> User prompt pinned at the top of the scroll area while its turn scrolls; click to jump to the turn start.

- Import: `import { TurnStickyHeader } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-transcript` (kit `agent`)
- `data-slot`: `turn-sticky-header`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `prompt` (required) | `React.ReactNode` |  | The user's prompt for this turn. |
| `headingLevel` | `2 \| 3 \| 4` | `2` | Level of the visually hidden heading. Default 2. |
| `index` | `number` |  | 1-based turn number for the screen-reader heading. |
| `onJump` | `() => void` |  | Called when the user presses the header, after it scrolls to `targetId`. |
| `targetId` | `string` |  | Id of the element marking the start of the turn; clicking scrolls it into view. |
