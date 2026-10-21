# AttachmentThumbnails

> Data-driven row of `ChatAttachment`s: image tiles (click to preview in a Lightbox) and file cards with pages / size, upload progress, failed + retry and remove on hover.

- Import: `import { AttachmentThumbnails } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-composer-attachments` (kit `agent`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `AttachmentThumbnailItem[]` |  | Attachments to show as thumbnails, each with a name, kind and upload status. |
| `onRemove` | `(id: string) => void` |  | Called with the item id when the user removes an attachment; the remove button is hidden when unset. |
| `onRetry` | `(id: string) => void` |  | Shows a retry action on failed items. |
| `preview` | `boolean` | `true` | Click images to open them in a Lightbox. Default true. |

## Example (live: `#/components/agent-composer/attachment-thumbnails` in the playground)

```tsx
import * as React from "react";
import { AttachmentThumbnails } from "@sutra/ui/agent";
import { Button } from "@sutra/ui/core";

function AttachmentThumbnailsDemo() {
  const initial: AttachmentThumbnailItem[] = [
    ...sampleAttachments,
    { id: "img-3", name: "error-state.png", url: svgThumb("#f97316", "#ef4444", "Error"), mimeType: "image/png", status: "uploading" },
    { id: "csv", name: "metrics.csv", size: 48_200, status: "uploading", progress: 64 },
    { id: "zip", name: "logs.zip", size: 92_000_000, status: "failed", error: "File is larger than 30 MB" },
  ];
  const [items, setItems] = React.useState(initial);
  return (
    <>
      <AttachmentThumbnails
        items={items}
        onRemove={(id) => setItems((xs) => xs.filter((x) => x.id !== id))}
        onRetry={(id) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: "uploading", progress: 10, error: undefined } : x)))}
      />
      {items.length < initial.length && (
        <Button size="sm" variant="ghost" onClick={() => setItems(initial)}>
          Reset
        </Button>
      )}
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): sampleAttachments, svgThumb.
