# ChatSourceList

> Collapsed "N sources" favicon stack that expands into a full list.

- Import: `import { ChatSourceList } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-source` (kit `ai`)
- `data-slot`: `chat-source-list`, `chat-source-trigger`, `chat-source-content`
- Part of [`ChatSource`](ChatSource.md)
- Also accepts the props of HTMLAttributes, CollapsibleProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `sources` (required) | `ChatSourceData[]` |  | Sources to show, each with a title, URL and optional favicon. |
| `label` | `React.ReactNode` |  | Custom trigger label; defaults to "N sources". |
| `maxIcons` | `number` | `4` | Max favicons in the collapsed stack. |

## Example (live: `#/components/ai/chat-source` in the playground)

```tsx
import { ChatInlineCitation, ChatSource, ChatSourceList } from "@sutra/ui/ai";

function ChatSourceDemo() {
  return (
    <>
      <div className="space-y-2">
        {/* Favicon chips */}
        <div className="flex flex-wrap gap-2">
          {sampleSources.slice(0, 3).map((s) => (
            <ChatSource key={s.href} {...s} />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {/* Numbered, custom label, no preview */}
        <div className="flex flex-wrap gap-2">
          {sampleSources.slice(0, 3).map((s, i) => (
            <ChatSource key={s.href} {...s} index={i + 1} />
          ))}
          <ChatSource href="https://github.com/karpathy/nanoGPT" disablePreview>
            nanoGPT repo
          </ChatSource>
        </div>
      </div>
      <div className="space-y-2">
        {/* Inline citations */}
        <p className="max-w-2xl text-[15px] leading-7 text-foreground">
          The Transformer replaced recurrence with self-attention
          <ChatInlineCitation index={1} {...sampleSources[1]} />, which made it practical to train language models on
          vast amounts of text
          <ChatInlineCitation index={2} {...sampleSources[2]} />. How a model samples its output matters as much as the
          model itself
          <ChatInlineCitation index={3} />.
        </p>
      </div>
      <div className="max-w-xl space-y-2">
        {/* Source list */}
        <ChatSourceList sources={sampleSources} />
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): sampleSources.
