# TextButton

> An action that reads as part of a sentence: inline text, underlined on hover. A link with `href`, a button otherwise.

**Deprecated:** Use `TextLink`: `<TextLink onClick={…} variant="subtle">` (or `as="button"`) for the button form, `<TextLink href>` for the link form. `tone` maps to `variant`: default → subtle, muted → muted, destructive → destructive.

- Import: `import { TextButton } from "@sutra/ui"` (or from `@sutra/ui/social`)
- Source: `packages/ui/src/patterns/text-button` (patterns)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `disabled` | `boolean` |  | Disables the button. |
| `download` | `string \| boolean` |  | Makes the link a download; a string sets the file name. |
| `href` | `string` |  | Renders an `<a>` when set; otherwise a `<button type="button">`. |
| `rel` | `string` |  | Link `rel` when `href` is set. |
| `target` | `string` |  | Link `target` when `href` is set. |
| `tone` | `TextButtonTone` | `"default"` | Text colour: `default`, `muted` or `destructive` (`danger` is an alias). |
| `type` | `"button" \| "submit" \| "reset"` | `"button"` | Button `type` when there is no `href`. |

## Example (live: `#/components/social/text-button` in the playground)

```tsx
import { TextLink } from "@sutra/ui/core";

<p className="max-w-md text-sm text-muted-foreground">
  Your draft was saved. You can <TextLink variant="subtle" onClick={() => {}}>start from the beginning</TextLink>, open{" "}
  <TextLink href="#text-button" variant="muted">settings</TextLink>, or <TextLink variant="destructive" onClick={() => {}}>discard it</TextLink>.
</p>
```
