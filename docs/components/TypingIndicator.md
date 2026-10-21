# TypingIndicator

> Polite live region announcing who is typing, with bouncing dots (`Spinner variant="dots"`).

- Import: `import { TypingIndicator } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/mobile`)
- Source: `packages/ui/src/kits/social/presence` (kit `social`)
- `data-slot`: `typing-indicator`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `users` (required) | `Array<string \| Pick<PresenceUser, "name">>` |  | People currently typing: names or presence users. |
| `hideDots` | `boolean` |  | Hide the animated dots. |
| `maxNames` | `number` | `2` | Names listed before "and N others". Default 2. |
