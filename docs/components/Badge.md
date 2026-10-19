# Badge

> Compact label for status, category or count.

- Import: `import { Badge } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/badge` (primitives)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `"neutral" \| "primary" \| "brand" \| "success" \| "warning" \| "destructive" \| "info" \| "gray" \| "blue" \| "purple" \| "pink" \| "orange"` | `"neutral"` | Legacy colour name; prefer `tone`. Also accepts the categorical hues (gray, blue, purple, pink, orange). |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `onRemove` | `() => void` |  | Shows a small remove button. |
| `removeLabel` | `string` | `"Remove"` | Accessible name of the remove button. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Badge height and text size. |
| `tone` | `ToneInput` |  | Semantic colour (`neutral \| primary \| success \| warning \| destructive \| info`). Wins over `color`. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"soft" \| "solid" \| "outline" \| "dot"` | `"soft"` | Fill style: `soft` (tinted), `solid` (full colour), `outline` (border only) or `dot` (neutral pill with a coloured dot). |

## Variants

- `variant`: `soft`, `solid`, `outline`, `dot` (default "soft")
- `color`: `neutral`, `primary`, `brand`, `success`, `warning`, `destructive`, `info`, `gray`, `blue`, `purple`, `pink`, `orange` (default "neutral")
- `size`: `sm`, `md`, `lg` (default "md")

## Notes

**When to use:** A compact label for a category, tag, status word or count. Four fill styles, three sizes, optional icons and a remove button.

**Use instead when:**
- `StatusBadge`: a status with a ready-made dot, icon or spinner and a default label
- `Chip`: a filter or selection token that toggles
- `Eyebrow`: a small caption above a heading

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to the remove button, which only exists with `onRemove` |
| Enter, Space | Removes (native `<button>`) |

The badge itself is not focusable and has no direction-dependent keys, so RTL changes nothing.

### Screen readers

- A plain `<span>`: no role, so its text is read inline. Colour carries no meaning for assistive technology, so put the meaning in the text ("Paid", not just a green badge).
- The remove button is labelled "Remove" by default. Several badges would all read the same, so pass `removeLabel` with the item ("Remove beta").
- `variant="dot"` draws its dot as an `aria-hidden` span. Icons you pass as `leadingIcon` or `trailingIcon` are not hidden for you: pass `aria-hidden` icons.

### Reduced motion

Static. The only motion is a colour transition, which the reduced-motion net in `sutra.css` ends within 1 ms.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API, so server and client output match.

### Gotchas

- `tone` (`neutral`, `primary`, `success`, `warning`, `destructive`, `info`, plus legacy aliases like `brand`, `danger`) wins over `color` when both are set. The categorical hues `gray`, `blue`, `purple`, `pink` and `orange` exist only on `color`.
- `variant="dot"` is always a neutral bordered pill: the colour only tints the dot, so `variant="dot" tone="success"` is not a green pill.
- Long text is truncated (`max-w-full` plus `truncate`), so give the badge a width limit from its parent rather than expecting it to wrap.
- `color` is kept for older call sites (the types say "legacy"); new code should pass `tone`.

## Example

```tsx
import { Badge } from "@sutra/ui";
import { RiCheckLine } from "@sutra/ui/icons";

export function Example() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Draft</Badge>
      <Badge tone="success" leadingIcon={<RiCheckLine aria-hidden />}>
        Published
      </Badge>
      <Badge tone="warning" variant="outline">
        Needs review
      </Badge>
      <Badge tone="destructive" variant="solid" size="sm">
        3
      </Badge>
      <Badge variant="dot" tone="info">
        Beta
      </Badge>
    </div>
  );
}
```
