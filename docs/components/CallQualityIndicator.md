# CallQualityIndicator

> Four-bar connection quality indicator.

- Import: `import { CallQualityIndicator } from "@sutra/ui"` (or from `@sutra/ui/social`)
- Source: `packages/ui/src/kits/social/call-overlay` (kit `social`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `quality` (required) | `CallQuality` |  | Connection quality (`excellent`, `good`, `poor` or `offline`); sets the bars and tone. |
