# CodeBlockTabs

> Code block with tabs, e.g. npm / pnpm / yarn or several files.

- Import: `import { CodeBlockTabs } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/patterns/code-block` (patterns)
- `data-slot`: `code-block-tabs`
- Part of [`CodeBlock`](CodeBlock.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tabs` (required) | `CodeBlockTab[]` |  | Tabs to show; each has a `label`, a `code` and optional language, filename and highlighted lines. |
| `copyable` | `boolean` | `true` | Shows the copy button. |
| `defaultValue` | `string` |  | Initially active tab value when uncontrolled. |
| `maxHeight` | `number \| string` |  | Maximum height of the code area (px number or CSS length); longer code scrolls. |
| `onValueChange` | `(value: string) => void` |  | Called with the tab value the user picked. |
| `showLineNumbers` | `boolean` |  | Shows a line-number gutter. |
| `theme` | `CodeBlockTheme` | `"dark"` | `dark` keeps the editor surface dark; `light` follows the app theme. |
| `value` | `string` |  | Controlled active tab value. Use with `onValueChange`. |
| `wrap` | `boolean` |  | Soft-wraps long lines. |

## Notes

See the notes in [`CodeBlock`](CodeBlock.md#notes).

## Example

```tsx
import { CodeBlock } from "@cleanprompt/sutra-ui";

const code = `import { Button } from "@cleanprompt/sutra-ui";

export function Save() {
  return <Button type="submit">Save changes</Button>;
}`;

export function Example() {
  return <CodeBlock code={code} language="tsx" filename="save.tsx" showLineNumbers highlightLines={[4]} />;
}
```
