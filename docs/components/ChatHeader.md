# ChatHeader

> Alias of `MessengerHeader`.

**Deprecated:** Use `MessengerHeader` (the AI `Chat*` components are a separate family).

- Import: `import { ChatHeader } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/social`)
- Source: `packages/ui/src/kits/social/messenger` (kit `social`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Conversation or contact name, shown as the title. |
| `avatarSrc` | `string` |  | Avatar image URL for one-to-one chats; initials are shown when unset. |
| `members` | `MessengerHeaderMember[]` |  | Group members: renders stacked avatars instead of a single one. |
| `now` | `Date` |  | Reference time for the last-seen label; set it in tests and SSR for stable output. |
| `onBack` | `() => void` |  | Called when the user presses the back button (small screens); the button is hidden when unset. |
| `onInfo` | `() => void` |  | Called when the user presses the info button; the button is hidden when unset. |
| `onVideoCall` | `() => void` |  | Called when the user presses the video call button; the button is hidden when unset. |
| `onVoiceCall` | `() => void` |  | Called when the user presses the voice call button; the button is hidden when unset. |
| `presence` | `"online" \| Date \| number \| (string & {})` |  | `"online"`, a last-seen time, or any custom string. |
| `typing` | `boolean` |  | Shows "typing…" in place of the presence line. |
