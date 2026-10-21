---
component: GlyphSpinner
module: primitives/glyph-spinner
use: A loading indicator made of a cycling text character (braille dots, arcs, a rotating line), for terminals, agent status lines and anywhere a monospace look fits. A preset of `Spinner` with `variant="glyph"`.
instead: Spinner = a ring, dots, bars or pulse that scales with `size`; Skeleton = a placeholder in the shape of content that is loading; Progress = the amount done is known
server: ssr-safe
---

## Keyboard
Not focusable: no keyboard interaction.

## Screen readers
A `role="status"` span with visually hidden text, "Loading" unless `label` says otherwise. The glyph itself is `aria-hidden`, so screen readers do not hear each frame. `label=""` makes it decorative (`aria-hidden`, no role). Name what is loading when several are on the page.

## Reduced motion
It reads `usePrefersReducedMotion` and holds its current frame (frame 0 on first render) instead of cycling. This is the component's own check, not a CSS rule.

## Server rendering
Always renders frame 0 first: the preference hook reads `false` on the server and the interval starts after mount, so the server and client markup match.

## Gotchas
- `frames` overrides `variant` when it is not empty; an empty array falls back to `variant`. `variant` is one of `dots` (default), `line`, `arc`, `circle`, `bounce`, `star` or `pulse`, the same sets as `glyphSpinnerFrames`.
- `size` (`xs` to `xl`, as on `Spinner`) sets the font size; without it the glyph takes the font size and colour of its parent, so a `text-*` class on `className` or a wrapper also works.
- `interval` is milliseconds per frame (default 80) and is clamped to at least 16; `paused` holds the current frame, as does a single-frame `frames` array.
- The glyph sits in a `min-w-[1ch]` monospace box, so a custom frame set should use characters of similar width to avoid jitter.

## Example
```tsx
import { GlyphSpinner } from "@cleanprompt/sutra-ui";

export function Example({ running }: { running: boolean }) {
  return (
    <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
      <GlyphSpinner variant="dots" label="Running tests" paused={!running} className="text-primary" />
      <span>{running ? "Running 48 tests..." : "Idle"}</span>
    </div>
  );
}
```
