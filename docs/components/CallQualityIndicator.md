# CallQualityIndicator

> Four-bar connection quality indicator.

- Import: `import { CallQualityIndicator } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/social`)
- Source: `packages/ui/src/kits/social/call-overlay` (kit `social`)
- `data-slot`: `call-quality-indicator`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `quality` (required) | `CallQuality` |  | Connection quality (`excellent`, `good`, `poor` or `offline`); sets the bars and tone. |
