# ArtifactPreview

> Renders artifact content safely: code, markdown, SVG/image via `<img>`, HTML in a `sandbox=""` iframe.

- Import: `import { ArtifactPreview } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/artifacts-preview` (kit `agent`)
- `data-slot`: `artifact-preview`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` (required) | `string` |  | The artifact body: source text, Markdown, SVG markup or an image URL, depending on `kind`. |
| `kind` (required) | `ArtifactKind` |  | Artifact kind; decides how `content` is rendered (source, Markdown, SVG, image and so on). |
| `title` (required) | `string` |  | Artifact name; used for the code header filename and the accessible name. |
| `codeHeader` | `boolean` | `false` | Code fallback shows the header (filename / copy). |
| `language` | `string` |  | Code language for syntax highlighting (for example `tsx`); html, data and diagram artifacts default to `html`, `json` and `mermaid`. |
| `maxHeight` | `number \| string` | `240` | Maximum height of the preview before it scrolls; a number is px. |
| `renderHtml` | `boolean` | `false` | Render HTML in a sandboxed iframe (scripts, forms, same-origin all blocked). Otherwise show source. |
