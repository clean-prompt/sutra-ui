# Spinner

> Loading indicator. Uses `currentColor`, so set a text color to recolor it.

- Import: `import { Spinner } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/spinner` (primitives)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `frames` | `SpinnerGlyphFrameSet \| readonly string[]` |  | glyph only: a built-in frame set or custom frames. Default "dots". |
| `interval` | `number` |  | glyph only: milliseconds per frame. Default 80. |
| `label` | `string` | `"Loading"` | Accessible label. Default "Loading". Pass `""` to make the spinner decorative (hidden from assistive tech). |
| `paused` | `boolean` |  | glyph only: hold the current frame. |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Spinner diameter: `xs` 12px, `sm` 16px, `md` 20px, `lg` 24px or `xl` 32px. |
| `variant` | `SpinnerVariant` | `"ring"` | ring: arc spinner · dots: three bouncing dots · bars: equalizer · pulse: breathing dot · glyph: cycling text glyphs (braille dots, arcs, …; inherits font size and colour unless `size` is set). The box variants scale with their box, so `className="h-1.5 w-6"` gives a compact row of dots. |

## Variants

- `size`: `xs`, `sm`, `md`, `lg`, `xl` (default "md")

## Notes

**When to use:** The loading indicator. Five looks (`ring`, `dots`, `bars`, `pulse` and `glyph`, a cycling text character) in five sizes, drawn in the current text colour.

**Use instead when:**
- `Skeleton`: a placeholder in the shape of content that is loading
- `Progress`: the amount done is known
- `GlyphSpinner`: the text-glyph look as a component of its own, with `variant` instead of `frames` names
- `Button`: a button with built-in `loading`

### Keyboard

Not focusable: no keyboard interaction.

### Screen readers

- Every variant is a `role="status"` named "Loading" (`label` changes it). The `ring`, `dots`, `bars` and `pulse` variants put it in `aria-label`; `glyph` renders the label as visually hidden text and hides the changing character with `aria-hidden`, so the frames are never read out.
- `label=""` makes the spinner decorative: no role and `aria-hidden`. Do that when the surrounding text already says what is loading (a Button with `loading` does it with its own label).
- Several spinners on one page are several `status` regions with the same name: label them by what is loading.

### Reduced motion

`ring` keeps spinning, because it carries meaning (the net in `sutra.css` keeps `animate-spin`). `dots`, `bars` and the halo of `pulse` use looping utilities that the net stops, leaving a still row of dots, a still row of full-height bars, or a still disc with a dot in it. `glyph` checks `usePrefersReducedMotion` and holds its current frame.

### Server rendering

Server render: same markup as the client. Plain markup, and the glyph variant always starts on frame 0 (the reduced-motion hook reads `false` on the server), so server and client output match and the cycling starts after mount.

### Gotchas

- The box variants are `text-primary` by default (they use `currentColor`): recolour with a `text-*` class. The `glyph` variant has no colour class and inherits it, and takes its font size from the parent unless you pass `size`.
- `size` is `xs` 12px, `sm` 16px, `md` 20px (default), `lg` 24px or `xl` 32px for the box variants; they scale with their box, so `className="h-1.5 w-6"` gives a compact row of dots.
- `frames` (glyph only) takes a set name (`dots`, `line`, `arc`, `circle`, `bounce`, `star`, `pulse`) or your own array of strings; an empty array or an unknown name falls back to `dots`. `interval` is clamped to at least 16 ms, and `paused` holds the frame.
- `frames`, `interval` and `paused` are ignored by the other variants.

## Example

```tsx
import { Spinner } from "@sutra/ui";

export function Example({ loading }: { loading: boolean }) {
  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        {loading ? <Spinner size="sm" label="Loading invoices" /> : null}
        {loading ? "Loading invoices..." : "Up to date"}
      </span>
      <Spinner variant="dots" size="md" label="Syncing" className="text-muted-foreground" />
      <Spinner variant="glyph" frames="arc" label="Thinking" className="text-foreground" />
    </div>
  );
}
```
