# FrequencyMeter

> Three-bar "how common is this word" indicator.

- Import: `import { FrequencyMeter } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/voice`)
- Source: `packages/ui/src/kits/voice/translate-dictionary` (kit `voice`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `level` (required) | `0 \| 1 \| 2 \| 3` |  | 0 (rare) … 3 (very common). |
