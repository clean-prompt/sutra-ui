# AgentRoomMembers

> Room member manager: add / remove agents, reorder the turn order (buttons or Alt+Arrow) and mute.

- Import: `import { AgentRoomMembers } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-room` (kit `agent-admin`)
- `data-slot`: `agent-room-members`
- Part of [`AgentRoom`](AgentRoom.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `available` | `AgentRoomMember[]` | `[]` | Agents that can be added. Ones already in the room are hidden. |
| `defaultValue` | `AgentRoomMember[]` | `[]` | Initial members when `value` is not controlled. |
| `onValueChange` | `(members: AgentRoomMember[]) => void` |  | Called with the members in the new order when the user adds, removes or reorders one. |
| `value` | `AgentRoomMember[]` |  | Members in turn order. |
