# EffortGlyph

> Ascending bars glyph: `level + 1` of `count` bars filled.

- Import: `import { EffortGlyph } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-mode` (kit `agent`)
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `level` (required) | `number` |  | 0-based filled level. |
| `count` | `number` | `4` | Total levels (bars). Default 4. |
| `size` | `number` | `14` | Glyph width and height in px. |
