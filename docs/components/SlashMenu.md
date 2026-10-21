# SlashMenu

> Inline command / mention listbox anchored to the caret of a composer textarea.

- Import: `import { SlashMenu } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/patterns/slash-menu` (patterns)
- `data-slot`: `slash-menu`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `anchorRef` (required) | `React.RefObject<HTMLTextAreaElement \| HTMLInputElement \| null>` |  | The composer textarea to attach to. |
| `commands` (required) | `SlashCommand[]` |  | Commands (or mentions) to offer, each with a name, optional description and keywords. |
| `emptyState` | `React.ReactNode` |  | Shown when nothing matches. Default "No matching commands". |
| `emptyText` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `filter` | `(commands: SlashCommand[], query: string) => SlashCommand[]` | `defaultCommandFilter` | Custom filter; default matches name/keywords (prefix matches first). |
| `heading` | `React.ReactNode` |  | Header label. Default "Commands" (or "Mentions" for "@"). |
| `maxRows` | `number` | `8` | Max visible rows before scrolling. Default 8. |
| `onSelect` | `(command: SlashCommand, match: SlashTriggerMatch) => void` |  | Called with the chosen command and the trigger match (trigger, query and caret range) when the user picks one. |
| `trigger` | `string \| string[]` | `"/"` | Trigger character(s). Default "/". Use "@" for mentions. |

## Example (live: `#/components/ai-extras/slash-menu` in the playground)

```tsx
import * as React from "react";
import { SlashMenu } from "@cleanprompt/sutra-ui/ai";

function SlashMenuDemo() {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState("");
  const [last, setLast] = React.useState<string | null>(null);
  return (
    <>
      <textarea
        ref={ref}
        aria-label="Message"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="Try /sum or @a…"
        className="w-full resize-none rounded-box border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
      />
      <SlashMenu anchorRef={ref} commands={slashCommands} onSelect={(c) => setLast(`/${c.name}`)} />
      <SlashMenu anchorRef={ref} trigger="@" commands={people} onSelect={(c) => setLast(`@${c.name}`)} />
      {/* Last selected: {last ?? "—"} */}
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): people, slashCommands.
