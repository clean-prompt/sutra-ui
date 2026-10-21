# ChatAttachmentList

> Horizontally scrolling row of attachments.

- Import: `import { ChatAttachmentList } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-attachment` (kit `ai`)
- `data-slot`: `chat-attachment-list`
- Part of [`ChatAttachment`](ChatAttachment.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

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
