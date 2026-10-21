# PromptInput

> Chat composer card. Compose with PromptInputAttachments, PromptInputTextarea and PromptInputToolbar.

- Import: `import { PromptInput } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/prompt-input` (kit `ai`)
- `data-slot`: `prompt-input`, `prompt-input-large-paste`
- Parts: [`PromptInputRestoredDraft`](PromptInputRestoredDraft.md)
- Also accepts the props of HTMLAttributes, FormHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `canSubmit` | `boolean` |  | Override whether submitting is allowed (default: text is non-empty). Useful with attachments. |
| `clearOnSubmit` | `boolean` | `true` | Clear the text after submitting (default true). |
| `defaultValue` | `string` | `""` | Initial text when `value` is not controlled. |
| `disabled` | `boolean` | `false` | Disables the textarea and the submit button. |
| `isLoading` | `boolean` |  | **Deprecated.** Use `loading`. A response is streaming: the submit button becomes a stop button and Enter will not submit. |
| `largePasteNoticeDuration` | `number` | `8000` | Auto-hide the large-paste notice after this many ms (0 = never). Default 8000. |
| `largePasteThreshold` | `number` |  | Opt-in: plain-text pastes longer than this many characters (e.g. 3000) become an attachment instead of flooding the textarea. Routed to `onLargePaste`, else to `onFilesAdded` as a generated `.txt` File. |
| `loading` | `boolean` |  | A response is streaming: the submit button becomes a stop button and Enter won't submit. |
| `onContextDrop` | `(data: DataTransfer) => void` |  | Accept non-file drops too (e.g. files dragged from an editor's explorer as `text/uri-list`). Called with the drop's DataTransfer when the drop carries no files (or `onFilesAdded` is unset). |
| `onFilesAdded` | `(files: File[]) => void` |  | Enables drag-and-drop, paste and the attach button. Receives the dropped / picked files. |
| `onLargePaste` | `(text: string) => void` |  | Receives an oversized paste (see `largePasteThreshold`). |
| `onLargePasteUndo` | `(text: string, file?: File) => void` |  | The user chose "Paste inline" on the notice: the text is inserted; remove the attachment you created. |
| `onStop` | `() => void` |  | Called by the stop button while `loading`. |
| `onSubmit` | `(value: string, event: React.FormEvent<HTMLFormElement>) => void` |  | Called with the current text when the user submits (Enter or the submit button). |
| `onValueChange` | `(value: string) => void` |  | Called with the new text on every edit. |
| `value` | `string` |  | Controlled text of the prompt. |

## Part props

### PromptInputRestoredDraft

Notice shown when an unsent draft was restored into the composer, with Discard / Keep.

| Prop | Type | Default | Description |
|---|---|---|---|
| `clearOnDiscard` | `boolean` | `true` | Clears the prompt text when Discard is pressed inside a `PromptInput`. Default true. |
| `defaultOpen` | `boolean` | `true` | Initial visibility when uncontrolled. Default true. |
| `discardLabel` | `string` | `"Discard"` | Label of the discard button. Default "Discard". |
| `keepLabel` | `string` | `"Keep"` | Label of the keep button. Default "Keep". |
| `message` | `React.ReactNode` | `"Restored your unsent draft"` | Main line. Default "Restored your unsent draft". |
| `onDiscard` | `() => void` |  | Discard the draft. Inside a PromptInput the text is also cleared unless `clearOnDiscard={false}`. |
| `onKeep` | `() => void` |  | Keep the draft (just dismisses the notice). |
| `onOpenChange` | `(open: boolean) => void` |  | Called when Discard or Keep hides the notice. |
| `open` | `boolean` |  | Controlled visibility. Uncontrolled notices hide themselves after either choice. |
| `savedAt` | `React.ReactNode` |  | When the draft was saved, shown muted after the message (e.g. "2h ago"). |

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
