# AnnotationLayer

> Lets the user pin numbered comments on a page for the agent, then send them in one batch.

- Import: `import { AnnotationLayer } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-browser-annotations` (kit `agent`)
- `data-slot`: `annotation-layer`, `annotation-surface`, `annotation-pin`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` |  | Annotate mode: clicks on the surface drop pins. |
| `annotations` | `BrowserAnnotation[]` |  | Controlled pins, each with a position and optional comment. |
| `children` | `React.ReactNode` |  | Page content to annotate. |
| `clearOnSend` | `boolean` | `true` | Clear the pins after sending. Default true. |
| `defaultActive` | `boolean` | `false` | Initial annotate mode when `active` is not controlled. |
| `defaultAnnotations` | `BrowserAnnotation[]` | `[]` | Initial pins when `annotations` is not controlled. |
| `onActiveChange` | `(active: boolean) => void` |  | Called with the new state when the user toggles annotate mode. |
| `onAnnotationsChange` | `(annotations: BrowserAnnotation[]) => void` |  | Called with the pins when the user adds, edits or removes one. |
| `onSendAnnotations` | `(annotations: BrowserAnnotation[]) => void` |  | "Send to agent". Receives annotations that have a comment. |
| `showList` | `boolean` | `true` | Show the numbered list under the surface. Default true. |
| `surfaceClassName` | `string` |  | Extra classes for the surface that wraps `children`. |

## Example (live: `#/components/browser-review/annotation-layer` in the playground)

```tsx
import * as React from "react";
import { AnnotationLayer } from "@cleanprompt/sutra-ui/agent";

function AnnotateDemo() {
  const [annotations, setAnnotations] = React.useState<BrowserAnnotation[]>([
    { id: "seed", x: 22, y: 48, comment: "Headline feels too long on mobile" },
  ]);
  const [sent, setSent] = React.useState<BrowserAnnotation[] | null>(null);
  return (
    <div className="w-full space-y-2">
      <div className="overflow-hidden rounded-box border border-border">
        <AnnotationLayer
          annotations={annotations}
          onAnnotationsChange={setAnnotations}
          defaultActive
          onSendAnnotations={setSent}
        >
          <MockPage path="https://acme-notes.example/" />
        </AnnotationLayer>
      </div>
      {sent && (
        <p className="text-sm text-muted-foreground">
          Sent {sent.length} {sent.length === 1 ? "note" : "notes"} to the agent: {sent.map((a) => `“${a.comment}” @ ${a.x}%,${a.y}%`).join(" · ")}
        </p>
      )}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): MockPage.
