# AgentRoom

> Multi-agent group chat: speaker-attributed transcript, round / turn indicator, hold state, mentions and typing indicators.

- Import: `import { AgentRoom } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-room` (kit `agent-admin`)
- `data-slot`: `agent-room`, `agent-room-turn`
- Parts: [`AgentRoomMembers`](AgentRoomMembers.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `members` (required) | `AgentRoomMember[]` |  | Agents in the room, in turn order. |
| `messages` (required) | `AgentRoomMessage[]` |  | Transcript messages, oldest first. |
| `actions` | `React.ReactNode` |  | Header actions. |
| `composer` | `React.ReactNode` |  | Composer node rendered under the transcript (e.g. `MessageComposer` or `PromptInput`). |
| `currentSpeakerId` | `string` |  | Whose turn it is. |
| `hideMembers` | `boolean` |  | Hide the members rail. |
| `round` | `number` |  | Current round number (1-based). |
| `title` | `React.ReactNode` | `"Agent room"` | Heading of the room. |
| `turnOrder` | `string[]` |  | Speaking order (member ids). Defaults to agents in `members` order. |

## Part props

### AgentRoomMembers

Room member manager: add / remove agents, reorder the turn order (buttons or Alt+Arrow) and mute.

| Prop | Type | Default | Description |
|---|---|---|---|
| `available` | `AgentRoomMember[]` | `[]` | Agents that can be added. Ones already in the room are hidden. |
| `defaultValue` | `AgentRoomMember[]` | `[]` | Initial members when `value` is not controlled. |
| `onValueChange` | `(members: AgentRoomMember[]) => void` |  | Called with the members in the new order when the user adds, removes or reorders one. |
| `value` | `AgentRoomMember[]` |  | Members in turn order. |
