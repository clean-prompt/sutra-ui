# CloseButton

> Icon-only "X" button for dismissing dialogs, alerts and toasts, and (`shape="pill"`) removing a chip or tag.

- Import: `import { CloseButton } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/close-button` (primitives)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `shape` | `"control" \| "pill"` | `"control"` | `control` (default): a standalone dismiss button with press, disabled and focus styling. `pill`: the small round remove × inside a chip, tag or badge; the pill supplies the rest. |
| `size` | `"3xs" \| "2xs" \| "xs" \| "sm" \| "md" \| "lg"` | `"md"` | Button size from `3xs` (16px) up; icons scale with it. |
| `variant` | `"ghost" \| "subtle" \| "inverse" \| "current" \| "muted"` | `"ghost"` | Look: `ghost`, `subtle` (muted fill), `inverse` (for dark surfaces), `current` (inherits the text colour, dimmed until hover) or `muted`. |

## Variants

- `shape`: `control`, `pill` (default "control")
- `variant`: `ghost`, `subtle`, `inverse`, `current`, `muted` (default "ghost")
- `size`: `3xs`, `2xs`, `xs`, `sm`, `md`, `lg` (default "md")

## Notes

**When to use:** The icon-only "X" for dismissing a dialog, alert or toast, and, with `shape="pill"`, the small round remove mark inside a chip, tag or badge.

**Use instead when:**
- `Button`: a labelled action (use an `icon-*` size for other icons)
- `Badge`: a removable label, it has `onRemove` built in
- `Chip`: a removable or selectable chip, it has `onRemove` built in
- `DialogClose`: the close part of a Dialog

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to and from the button. A `disabled` button is skipped |
| Enter, Space | Activates it (native `<button>` behaviour) |

Left and Right arrows have no meaning, so nothing changes in RTL. The X glyph is symmetric and is not mirrored. A parent can take the button out of the tab order: `Chip` does this for its remove button.

### Screen readers

- A native `<button>` with `type="button"` unless you pass `type`, so it never submits a form by accident.
- The accessible name is `aria-label`, which defaults to the English "Close". Pass a specific one ("Remove filter", "Close settings") when it does not close a whole dialog or when the UI is localized.
- The default X icon is `aria-hidden`. If you pass `children`, they replace the icon and you must hide a decorative icon yourself.

### Reduced motion

The press effect (`active:scale-95`) and the colour fades are transitions, which the reduced-motion net ends within 1 ms. The `pill` shape has no press effect.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API, so the server and client output match.

### Gotchas

- `shape="pill"` carries no focus ring, no press effect and no `disabled` styling: it assumes the chip, tag or badge around it supplies them. Used on its own, add `focusRing` through `className`.
- `shape="control"` (the default) has a 24px hit area, 44px under a coarse pointer, even at the small sizes. `pill` keeps the 24px minimum for its 16px `3xs` size.
- `variant` only sets colours: `ghost` (default), `subtle`, `inverse` for dark surfaces, `current` (inherits the text colour, dimmed until hover) and `muted`. `current` is meant for pills.
- `size` runs from `3xs` (16px) to `lg` (36px), default `md` (32px); the icon scales with it.

## Example

```tsx
import * as React from "react";
import { CloseButton } from "@cleanprompt/sutra-ui";

export function Example() {
  const [tipOpen, setTipOpen] = React.useState(true);
  return (
    <div className="flex flex-col items-start gap-3">
      {tipOpen ? (
        <div className="flex items-start gap-3 rounded-lg border bg-muted p-3 text-sm">
          <p>Press Cmd+K to search from anywhere.</p>
          <CloseButton aria-label="Dismiss tip" onClick={() => setTipOpen(false)} />
        </div>
      ) : null}
      <span className="inline-flex items-center gap-1 rounded-full bg-muted py-1 ps-3 pe-1 text-sm">
        design
        <CloseButton shape="pill" size="2xs" aria-label="Remove tag design" />
      </span>
    </div>
  );
}
```
