# SvgEmbed

> Safely renders user-supplied SVG through an image data URL (no innerHTML, no script execution).

- Import: `import { SvgEmbed } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/embeds` (kit `ai`)
- `data-slot`: `svg-embed`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `svg` (required) | `string` |  | SVG markup (untrusted). Rendered via an <img> data URL, never injected as HTML, so scripts and remote refs don't run. |
| `title` (required) | `string` |  | Alt text. |
| `caption` | `React.ReactNode` |  | Optional caption. |
| `imgClassName` | `string` |  | Extra classes for the rendered image. |
