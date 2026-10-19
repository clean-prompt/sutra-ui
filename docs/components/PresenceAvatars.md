# PresenceAvatars

> Live collaborator stack: colored rings, status dots, tooltips and a "+N" popover listing everyone.

- Import: `import { PresenceAvatars } from "@sutra/ui"` (or from `@sutra/ui/mobile`)
- Source: `packages/ui/src/kits/social/presence` (kit `social`)
- `data-slot`: `presence-avatars`, `presence-avatar`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `users` (required) | `PresenceUser[]` |  | Users currently present, each with a name, avatar and active or idle state. |
| `currentUserId` | `string` |  | Mark the current user ("(you)") in tooltips and the list. |
| `max` | `number` | `4` | Avatars shown before the "+N" overflow. Default 4. |
| `onUserClick` | `(user: PresenceUser) => void` |  | Called with the user when the user presses an avatar; avatars are not interactive when unset. |
| `showStatus` | `boolean` | `true` | Show the active/idle dot. Default true. |
| `size` | `Extract<AvatarSize, "xs" \| "sm" \| "md">` | `"sm"` | Avatar size. Defaults to "sm" (not "md"): presence stacks sit in dense toolbars. |
