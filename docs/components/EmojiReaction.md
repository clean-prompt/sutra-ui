# EmojiReaction

> A reaction pill showing an emoji and its count; highlighted when the user has reacted.

- Import: `import { EmojiReaction } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/emoji-reactions` (assets)
- Parts: [`EmojiReactionBar`](EmojiReactionBar.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `emoji` (required) | `string` |  | The emoji shown on the chip. |
| `count` | `number` | `0` | How many people reacted; shown beside the emoji, hidden at 0. |
| `defaultReacted` | `boolean` | `false` | Initial reacted state when uncontrolled. |
| `onToggle` | `(reacted: boolean) => void` |  | Called with the new reacted state when the chip is toggled. |
| `reacted` | `boolean` |  | Whether the current user has reacted (controlled). |
| `size` | `"sm" \| "md"` | `"md"` | Chip height and text size. |

## Part props

### EmojiReactionBar

A row of reaction pills with an add-reaction button that opens an emoji picker.

| Prop | Type | Default | Description |
|---|---|---|---|
| `addLabel` | `string` | `"Add reaction"` | Accessible name of the add-reaction button. |
| `defaultReactions` | `EmojiReactionItem[]` | `[]` | Initial reactions when uncontrolled. |
| `onReact` | `(emoji: string, reacted: boolean) => void` |  | Fired whenever the current user adds or removes a reaction. |
| `onReactionsChange` | `(reactions: EmojiReactionItem[]) => void` |  | Called with the full reaction list after the user adds or removes one. |
| `presets` | `readonly string[]` | `reactionPresets` | Quick picks shown at the top of the picker. |
| `reactions` | `EmojiReactionItem[]` |  | Reactions (controlled). |
| `readOnly` | `boolean` | `false` | Hide the add-reaction button. |
| `size` | `"sm" \| "md"` | `"md"` | Chip height and text size. |

## Example (live: `#/components/assets/emoji-reactions` in the playground)

```tsx
import * as React from "react";
import { EmojiPicker, EmojiReactionBar } from "@sutra/ui/assets";
import { Text } from "@sutra/ui/core";

function EmojiReactionsDemo() {
  const [reactions, setReactions] = React.useState<EmojiReactionItem[]>([
    { emoji: "👍", count: 12, reacted: true },
    { emoji: "🎉", count: 5 },
    { emoji: "👀", count: 3 },
    { emoji: "❤️", count: 1 },
  ]);
  const [picked, setPicked] = React.useState<string | null>(null);

  return (
    <>
      <div className="max-w-md space-y-3 rounded-box border border-border bg-card p-4">
        <div className="space-y-1">
          <Text size="sm" weight="semibold">
            Priya Raman
          </Text>
          <Text size="sm" tone="neutral">
            The new onboarding flow shipped to everyone this morning. Activation is up 18% in the first cohort.
          </Text>
        </div>
        <EmojiReactionBar reactions={reactions} onReactionsChange={setReactions} />
      </div>

      <div className="space-y-3">
        {/* Small, read-only */}
        <EmojiReactionBar
          size="sm"
          readOnly
          defaultReactions={[
            { emoji: "🔥", count: 24 },
            { emoji: "😂", count: 9 },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <EmojiPicker onSelect={(emoji) => setPicked(emoji)} />
        <Text size="sm" tone="neutral">
          {picked ? (
            <>
              Selected <span className="text-2xl">{picked}</span>
            </>
          ) : (
            "Pick an emoji"
          )}
        </Text>
      </div>
    </>
  );
}
```
