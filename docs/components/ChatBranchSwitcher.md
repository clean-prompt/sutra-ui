# ChatBranchSwitcher

> "‹ 2/3 ›" pager for switching between response versions.

- Import: `import { ChatBranchSwitcher } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-message-actions` (kit `ai`)
- `data-slot`: `chat-branch-switcher`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `count` (required) | `number` |  | Number of alternative versions. |
| `defaultValue` | `number` | `0` | Index of the initially visible version when `value` is not controlled. |
| `onValueChange` | `(index: number) => void` |  | Called with the zero-based index when the user steps to another version. |
| `value` | `number` |  | Zero-based index of the visible version. |
