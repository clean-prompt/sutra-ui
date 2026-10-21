# FadeText

> Truncates text with a soft gradient fade instead of an ellipsis; the fade only appears when the text overflows.

- Import: `import { FadeText } from "@sutra/ui"`
- Source: `packages/ui/src/patterns/fade-text` (patterns)
- `data-slot`: `fade-text`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `fade` | `string` | `"2.5rem"` | Width (single line) or height (multi-line) of the fade, CSS length. Default "2.5rem". |
| `lines` | `number` | `1` | Clamp to this many lines (fades the last line). Default 1. |
| `showTitle` | `boolean` | `true` | Native tooltip with the full text when truncated (string children only). Default true. |

## Example (live: `#/components/chat-extras/fade-text` in the playground)

```tsx
import { FadeText } from "@sutra/ui";

function FadeTextDemo() {
  return (
    <>
      <div className="w-64 rounded-box border border-border p-2 text-sm">
        <FadeText>Refactor the authentication middleware to support rotating refresh tokens</FadeText>
      </div>
      <div className="w-64 rounded-box border border-border p-2 text-sm">
        <FadeText>Short title</FadeText>
      </div>
      <div className="w-64 rounded-box border border-border p-2 text-sm">
        <FadeText lines={2} fade="1.25rem">
          Multi-line fade: the last visible line dissolves when the paragraph is longer than two lines, which keeps cards tidy without hard cuts.
        </FadeText>
      </div>
    </>
  );
}
```
