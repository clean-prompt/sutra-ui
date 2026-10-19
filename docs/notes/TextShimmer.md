---
component: TextShimmer
module: primitives/text-shimmer
use: Text with a light sweep moving across it, for "Thinking…" style status lines. It renders a `span` (or the element in `as`), sets the shimmer through CSS variables and keeps the text itself plain.
instead: AgentStatusLine = a live "agent is working" line with verbs and a timer; Spinner = a loading indicator that is not text; Typewriter = text that types itself out; Skeleton = a placeholder shape for content that is loading
server: ssr-safe
---

## Keyboard
Not focusable: no keyboard interaction.

## Screen readers
The text is ordinary text in a `span` (or `as`), read as written. The shimmer is a background gradient clipped to the text, so it adds nothing to the accessibility tree. It is not a live region and has no role: for a status that changes, wrap it in your own `role="status"` or put it inside one.

## Reduced motion
The component adds `motion-reduce:animate-none` itself, because the global net does not cover the shimmer animation (the motion guard test lists it as self-guarded). Under `prefers-reduced-motion` the text stops on a static gradient: muted text that brightens towards its right edge.

## Server rendering
Plain markup and inline CSS variables, no browser API, so server and client output match. The animation is pure CSS.

## Gotchas
- `duration` is in seconds (default 2) and `spread` is the half-width of the bright band as a percentage of the gradient, clamped to 1 to 50 (default 12). The gradient is twice as wide as the text, so the band covers about twice that share of the text.
- The text is `color: transparent` with the gradient clipped to it, and the gradient reads `--muted-foreground` and `--foreground`. A `text-<colour>` class in `className` (`text-foreground`, `text-primary`) is dropped by the class merge so the shimmer keeps working; colour the two ends of the sweep with `--muted-foreground` and `--foreground` instead. Size classes such as `text-sm` are kept.
- It is `inline-block`, so it does not wrap with the surrounding line like inline text; give it a block parent for long text. `style` you pass is merged after the shimmer variables, so you can override them.

## Example
```tsx
import { TextShimmer } from "@sutra/ui";

export function Example({ thinking }: { thinking: boolean }) {
  return (
    <div role="status" className="text-sm">
      {thinking ? (
        <TextShimmer duration={2.4} className="font-medium">
          Thinking about your question...
        </TextShimmer>
      ) : (
        <span className="text-muted-foreground">Answer ready</span>
      )}
    </div>
  );
}
```
