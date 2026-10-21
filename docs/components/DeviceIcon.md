# DeviceIcon

> One glyph per kind of device; unrecognised types fall back to a desktop monitor.

- Import: `import { DeviceIcon } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/media`)
- Source: `packages/ui/src/kits/media/cast-picker` (kit `media`)
- Also accepts the props of SVGAttributes, RemixiconProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Accessible label; decorative (aria-hidden) when omitted. |
| `type` | `string \| null` |  | tv, phone, tablet, laptop, desktop, speaker, browser, cast (case-insensitive aliases accepted). |
