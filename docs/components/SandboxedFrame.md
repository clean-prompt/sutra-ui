# SandboxedFrame

> An iframe with a strict sandbox, permissions allow-list, no referrer leakage and lazy loading.

- Import: `import { SandboxedFrame } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/embeds` (kit `ai`)
- `data-slot`: `sandboxed-frame`
- Also accepts the props of HTMLAttributes, IframeHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `string` |  | Required accessible title. |
| `aspectRatio` | `number` | `16 / 9` | Width / height ratio (e.g. 16/9). Ignored when `height` is set. |
| `height` | `number` |  | Fixed height in px. |
| `wrapperClassName` | `string` |  | Class for the outer wrapper. |
