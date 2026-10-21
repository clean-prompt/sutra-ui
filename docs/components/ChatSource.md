# ChatSource

> Citation chip (favicon or number + domain) with a hover preview card.

- Import: `import { ChatSource } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-source` (kit `ai`)
- `data-slot`: `chat-source`
- Parts: [`ChatSourceList`](ChatSourceList.md)
- Also accepts the props of HTMLAttributes, AnchorHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `href` (required) | `string` |  | URL of the source; unsafe URLs are not linked. |
| `disablePreview` | `boolean` |  | Disable the hover preview card. |
| `favicon` | `string` |  | Icon URL for this source. Without it (and without a FaviconProvider) a local monogram is shown. |
| `index` | `number` |  | Show this number instead of the favicon. |
| `snippet` | `string` |  | Excerpt shown in the preview card. |
| `title` | `string` |  | Source title, shown in the preview card and used in the accessible name. |

## Part props

### ChatSourceList

Collapsed "N sources" favicon stack that expands into a full list.

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
