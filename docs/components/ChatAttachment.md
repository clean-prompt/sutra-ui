# ChatAttachment

> File attachment preview for prompts and messages: card, chip or image tile, with upload progress, failed / retry and preview.

- Import: `import { ChatAttachment } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-attachment` (kit `ai`)
- Parts: [`ChatAttachmentList`](ChatAttachmentList.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | File name, shown in the card, chip or tooltip. |
| `alt` | `string` | `""` | Alt text for the thumbnail when it is not inside a preview button. Default "" (decorative). |
| `error` | `string \| boolean` |  | Error message (or `true`) for a failed upload. |
| `fileSize` | `number` |  | Size in bytes. |
| `icon` | `React.ReactNode` |  | Replaces the file-kind icon tile (e.g. a `FileFormatIcon`). |
| `meta` | `React.ReactNode` |  | Overrides the secondary line (card variant). |
| `mimeType` | `string` |  | MIME type (for example `application/pdf`); picks the file-kind icon. |
| `onPreview` | `() => void` |  | Makes the thumbnail a "Preview {name}" button (e.g. to open a Lightbox). |
| `onRemove` | `() => void` |  | Shows a remove button on hover. |
| `onRetry` | `() => void` |  | Shows a retry action while failed. |
| `pages` | `number` |  | Page count (PDFs, documents), shown in the meta line. |
| `previewUrl` | `string` |  | Image thumbnail (object URL or remote URL). |
| `progress` | `number` |  | Upload progress 0–100; shows a progress ring while set and below 100. |
| `status` | `"ready" \| "uploading" \| "failed"` |  | Explicit upload state. `uploading` without `progress` shows a spinner; `ready` hides progress. Default: derived from `progress` / `error`. |
| `variant` | `"card" \| "chip" \| "image"` | `"card"` | card: file tile · chip: compact pill · image: square thumbnail |

## Example

```tsx
import { ChatAttachment, ChatAttachmentList } from "@sutra/ui/ai";

function AttachmentDemo() {
  return (
    <>
      <div className="space-y-2">
        {/* Card */}
        <ChatAttachmentList>
          <ChatAttachment name="Product-spec.docx" fileSize={248_000} onRemove={() => {}} />
          <ChatAttachment name="analytics.xlsx" fileSize={1_240_000} progress={38} />
          <ChatAttachment name="recording.mp3" error="File exceeds 25 MB" onRemove={() => {}} />
        </ChatAttachmentList>
      </div>
      <div className="space-y-2">
        {/* Chip */}
        <ChatAttachmentList>
          <ChatAttachment variant="chip" name="index.tsx" onRemove={() => {}} />
          <ChatAttachment variant="chip" name="release-notes.md" />
          <ChatAttachment variant="chip" name="archive.zip" onRemove={() => {}} />
        </ChatAttachmentList>
      </div>
      <div className="space-y-2">
        {/* Image */}
        <ChatAttachmentList>
          <ChatAttachment variant="image" name="moodboard.png" previewUrl={samplePreview} onRemove={() => {}} />
          <ChatAttachment variant="image" name="screenshot.png" previewUrl={samplePreview} progress={72} />
          <ChatAttachment variant="image" name="photo.heic" error />
        </ChatAttachmentList>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): samplePreview.
