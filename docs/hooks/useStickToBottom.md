# useStickToBottom

> Keep a scroller pinned to the bottom while content grows, until the user scrolls up.

- Import: `import { useStickToBottom } from "@cleanprompt/sutra-ui/ai"`
- Source: `packages/ui/src/hooks/use-stick-to-bottom`

## Signature

```ts
useStickToBottom({ threshold, resize, initial, }?: UseStickToBottomOptions): StickToBottomState
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `initial` | `ScrollBehavior \| false` | `"instant"` | Scroll behavior for the first jump to the bottom on mount. |
| `resize` | `ScrollBehavior` | `"smooth"` | Scroll behavior used when content grows while stuck to the bottom. |
| `threshold` | `number` | `64` | Distance in px from the bottom that still counts as "at bottom". |
