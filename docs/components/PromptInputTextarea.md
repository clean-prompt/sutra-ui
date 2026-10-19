# PromptInputTextarea

> Auto-growing textarea (1 → 8 rows). Enter submits, Shift+Enter adds a line, IME composition is respected.

- Import: `import { PromptInputTextarea } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/prompt-input-textarea` (kit `ai`)
- `data-slot`: `prompt-input-highlight`, `prompt-input-mirror`
- Also accepts the props of HTMLAttributes, TextareaHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `highlight` | `PromptInputHighlight` |  | Highlight tokens inline. Renders a synchronized mirror behind a transparent-text textarea, so caret, selection, IME and native editing are untouched. `true` highlights `@file`, `#tag` and `/command`. |
| `maxRows` | `number` | `8` | Rows after which the textarea stops growing and scrolls. Default 8. |
| `minRows` | `number` | `1` | Rows shown when the text is short. Default 1. |
| `mirrorClassName` | `string` |  | Class for the mirror layer (rarely needed). |
| `submitOnEnter` | `boolean` | `true` | Submit on Enter (Shift+Enter inserts a newline). Default true. |

## Example (live: `#/components/agent-composer/mention-highlight` in the playground)

```tsx
import { PromptInput, PromptInputTextarea } from "@sutra/ui/ai";

function HighlightDemo() {
  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Built-in tokens */}
        <PromptInput defaultValue={"/fix the failing test in @src/utils/date.ts\nsee #flaky and @\"docs/Release Notes.md\""}>
          <PromptInputTextarea highlight minRows={3} />
        </PromptInput>
      </div>
      <div className="flex flex-col gap-2">
        {/* Custom rules */}
        <PromptInput defaultValue="TODO: rename fetchUser → loadUser, FIXME later">
          <PromptInputTextarea
            minRows={3}
            highlight={{
              mentions: true,
              rules: [
                { pattern: /\b(?:TODO|FIXME)\b/g, kind: "todo", className: "rounded-xs bg-destructive-soft text-destructive-soft-foreground" },
                { pattern: /\b\w+(?= →)|(?<=→ )\w+/g, kind: "symbol", className: "rounded-xs bg-success-soft text-success-soft-foreground" },
              ],
            }}
          />
        </PromptInput>
      </div>
    </>
  );
}
```
