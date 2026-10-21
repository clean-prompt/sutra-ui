# Text

> Body text with `size`, `tone` and `weight`; renders a `<p>` unless `as` says otherwise. Extra props are spread to the element.

- Import: `import { Text } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/typography` (primitives)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `as` | `"p" \| "span" \| "div" \| "small" \| "strong" \| "em"` | `"p"` | Element to render, independent of the visual styles. |
| `asChild` | `boolean` |  | Render as the child element instead of the text tag, keeping the text styles. |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Type scale step: `xs`, `sm`, `md` (base), `lg` or `xl`. |
| `tone` | `"default" \| "primary" \| "neutral" \| "success" \| "warning" \| "destructive" \| "info" \| "muted"` | `"default"` | `default` is plain foreground text; the semantic tones follow `Tone` (`muted` is the legacy name of `neutral`). |
| `weight` | `"regular" \| "medium" \| "semibold"` | `"regular"` | Font weight. |

## Variants

- `size`: `xs`, `sm`, `md`, `lg`, `xl` (default "md")
- `tone`: `default`, `primary`, `neutral`, `success`, `warning`, `destructive`, `info`, `muted` (default "default")
- `weight`: `regular`, `medium`, `semibold` (default "regular")

## Notes

**When to use:** Body text with size, tone and weight steps, plus the small typographic pieces: `Eyebrow` (an all-caps label above a heading), `Kbd` (a key hint) and `InlineCode`.

**Use instead when:**
- `Heading`: a heading with the display scale
- `ShortcutKeys`: a whole key combination from a shortcut string
- `CodeBlock`: multi-line code
- `Badge`: a short status label

### Keyboard

Not focusable: no keyboard interaction. `Kbd` only shows a key; it does not listen for it.

### Screen readers

- `Text` renders a `p` by default; `as` takes `p`, `span`, `div`, `small`, `strong` or `em`, and `asChild` styles your own element. Use `span` inside a line of text so you do not nest paragraphs.
- `Eyebrow` is a plain `p`, not a heading: it is read as a paragraph in front of the heading it labels.
- `Kbd` renders a native `<kbd>`, which screen readers read as its text. A symbol such as the command key may be read as nothing or as a name, so for combinations that matter use `ShortcutKeys` (it carries spoken text) or add visually hidden words.
- `InlineCode` renders a native `<code>`.

### Reduced motion

Static: no animation.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API, so server and client output match.

### Gotchas

- `tone` is `default` (foreground), `neutral`, `primary`, `success`, `warning`, `destructive` or `info`; `muted` is the old name of `neutral`. `neutral` is the muted grey, so it is quieter than `default`; `warning` uses the darker readable shade.
- `size` is `xs` to `xl` with `md` being `text-base`; `Text` sets no line-height or margin, so spacing comes from the parent (a `Stack`) and line-height from the surrounding styles.
- `Eyebrow` is always `text-primary`, uppercase and tracked; override with `className`. `Kbd` and `InlineCode` take only the HTML props of their element plus `className`; they have no size or tone variants.

## Example

```tsx
import { Eyebrow, InlineCode, Kbd, Text } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <div className="flex max-w-prose flex-col gap-2">
      <Eyebrow>Quick start</Eyebrow>
      <Text>
        Install the package, then press <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> to open the command menu.
      </Text>
      <Text size="sm" tone="neutral">
        Set <InlineCode>NODE_ENV=production</InlineCode> before you build.
      </Text>
      <Text size="sm" tone="destructive" weight="medium">
        Your session has expired.
      </Text>
    </div>
  );
}
```
