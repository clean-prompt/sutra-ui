# EmptyStateIllustration

> Simple line illustrations for empty, error and success states.

- Import: `import { EmptyStateIllustration } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/empty-state-illustration` (assets)
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `number` | `160` | Width in pixels (height follows the 4:3 ratio). |
| `title` | `string` |  | Accessible name; when set the illustration is exposed as an image, otherwise it is decorative. |
| `variant` | `EmptyStateIllustrationVariant` | `"search"` | Which scene to draw: `search`, `inbox`, `files`, `error`, `success` or `cloud`. |
