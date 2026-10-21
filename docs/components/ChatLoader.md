# ChatLoader

> Assistant "working" indicator for the reply slot: a `Spinner` (or TextShimmer) plus an optional label.

- Import: `import { ChatLoader } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-loader` (kit `ai`)
- `data-slot`: `chat-loader`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `React.ReactNode` |  | Visible text next to the indicator (the shimmer variant uses it as its text). |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Loader size. |
| `variant` | `ChatLoaderVariant` | `"dots"` | dots: typing indicator · shimmer: shimmering "Thinking…" · pulse: breathing dot · spinner: ring · wave: equalizer bars · glyph: cycling text glyph. Every indicator except shimmer is a `Spinner`. |

## Example (live: `#/components/ai/chat-loader` in the playground)

```tsx
import { ChatLoader } from "@sutra/ui/ai";

function ChatLoaderDemo() {
  const variants = ["dots", "shimmer", "pulse", "spinner", "wave"] as const;
  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {variants.map((v) => (
          <div key={v} className="flex flex-col gap-3 rounded-box border border-border bg-card p-4">
            {/* {v} */}
            <ChatLoader variant={v} size="sm" />
            <ChatLoader variant={v} />
            <ChatLoader variant={v} size="lg" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {/* With labels */}
        <div className="flex flex-wrap items-center gap-6">
          <ChatLoader variant="dots" label="Sutra is typing" />
          <ChatLoader variant="shimmer" label="Searching the web…" />
          <ChatLoader variant="spinner" label="Running code" />
          <ChatLoader variant="wave" label="Listening" />
        </div>
      </div>
    </>
  );
}
```
