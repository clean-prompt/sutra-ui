# BookmarkButton

> Toggle that bookmarks a message.

- Import: `import { BookmarkButton } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-transcript` (kit `agent`)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultPressed` | `boolean` | `false` | Initial bookmarked state when `pressed` is not controlled. |
| `onPressedChange` | `(pressed: boolean) => void` |  | Called with the new state when the user toggles the bookmark. |
| `pressed` | `boolean` |  | Controlled bookmarked state. |
| `size` | `"xs" \| "sm"` | `"xs"` | Button size. |
