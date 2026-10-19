# Button

> The standard button. Extra props are spread to the `<button>` (or to the child with `asChild`); icon-only sizes need an `aria-label`.

- Import: `import { Button } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/button` (primitives)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `fullWidth` | `boolean` |  | Stretches the button to the width of its container. |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl" \| "icon-xs" \| "icon-sm" \| "icon" \| "icon-lg" \| "icon-xl"` | `"md"` | Button height and padding; `icon-*` sizes are square. |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"primary" \| "secondary" \| "tertiary" \| "soft" \| "ghost" \| "outline" \| "destructive" \| "destructive-soft" \| "inverse" \| "link"` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |

## Variants

- `variant`: `primary`, `secondary`, `tertiary`, `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse`, `link` (default "primary")
- `size`: `xs`, `sm`, `md`, `lg`, `xl`, `icon-xs`, `icon-sm`, `icon`, `icon-lg`, `icon-xl` (default "md")
- `fullWidth`: `true`

## Notes

**When to use:** The standard action. Ten variants and five text sizes plus five square icon sizes, with built-in loading and leading and trailing icon slots.

**Use instead when:**
- `TextLink`: the action is inline in running text or navigates
- `SplitButton`: a primary action with a menu of alternatives
- `ToggleGroup`: a set of loose on/off buttons
- `FloatingActionButton`: one pinned screen action

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to and from the button. A `disabled` or `loading` button is not focusable |
| Enter, Space | Activates it (native `<button>` behaviour) |

With `asChild` the child element keeps its own keyboard behaviour: a link activates on Enter only, not Space. Left and Right arrows have no meaning, so nothing changes in RTL.

### Screen readers

- A native `<button type="button">` unless you pass `type`; the name comes from its text. The `icon-*` sizes have no text, so pass `aria-label`.
- `loading` sets `aria-busy="true"` and disables the button; the spinner has its own accessible label (`spinnerProps={{ label }}` changes it, `label=""` makes it decorative).
- Icons passed as `leadingIcon` and `trailingIcon` are not hidden for you: pass `aria-hidden` icons (Remix icons are decorative when you do).
- With `asChild` and `disabled` or `loading`, the child gets `aria-disabled`, `data-disabled` and `tabIndex={-1}`, and clicks are swallowed in the capture phase.

### Reduced motion

The press effect (`active:scale-[0.98]`) and the colour fades are transitions, which the reduced-motion net ends within 1 ms. The `loading` spinner keeps spinning, as it carries meaning.

### Server rendering

Server render: same markup as the client. Renders plain markup with no browser API, so server and client output match. The module is a client module in the build (`"use client"`), which is only a boundary: it still renders to HTML on the first server pass.

### Gotchas

- `loading` replaces `leadingIcon` with the spinner but keeps `trailingIcon`, and it also disables the button: do not combine it with your own `disabled` state expecting a different look.
- `type` defaults to `"button"`, not the browser's `"submit"`: pass `type="submit"` for form submit buttons.
- Use `asChild` for links (`<Button asChild><a href>`); it makes the link look and act inert while disabled or loading, but it is still an anchor, not a button.
- `variant="link"` drops the height and padding (`h-auto px-0`); size classes then only change the text.

## Example

```tsx
import { Button } from "@sutra/ui";
import { RiAddLine } from "@sutra/ui/icons";

export function Example({ saving }: { saving: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button leadingIcon={<RiAddLine aria-hidden />}>New project</Button>
      <Button variant="secondary" loading={saving} type="submit">
        Save
      </Button>
      <Button size="icon" variant="ghost" aria-label="Add item">
        <RiAddLine aria-hidden />
      </Button>
    </div>
  );
}
```
