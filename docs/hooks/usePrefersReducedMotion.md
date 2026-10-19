# usePrefersReducedMotion

> Live `prefers-reduced-motion: reduce` preference.

- Import: `import { usePrefersReducedMotion } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-media-query`

## Signature

```ts
usePrefersReducedMotion(): boolean
```

## Example (live: `#/foundations/colors/reduced` in the playground)

```tsx
import {
  InlineAlert,
  InlineAlertDescription,
  InlineAlertTitle,
  InlineCode,
  Text,
} from "@sutra/ui/core";
import { usePrefersReducedMotion } from "@sutra/ui/tokens";

function ReducedMotionNote() {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="space-y-4">
      <InlineAlert tone={reduced ? "success" : "info"}>
        <InlineAlertTitle>{reduced ? "Reduced motion is on" : "Reduced motion is off"}</InlineAlertTitle>
        <InlineAlertDescription>
          {reduced
            ? "Your system asks for less motion, so everything on this page is already still."
            : "To try it, turn on Reduce motion in your system settings, or emulate prefers-reduced-motion in the browser's rendering tools."}
        </InlineAlertDescription>
      </InlineAlert>
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>Decorative loops and entrances stop: the pulse, ping, dots, bars, caret, mesh, bob and ring, and every entrance utility above.</li>
        <li>
          Every transition ends in <InlineCode>1ms</InlineCode>, so state changes still land and <InlineCode>transitionend</InlineCode> still fires.
        </li>
        <li>Overlays keep their fade and lose their movement. Collapsibles end in 1 ms, so Radix still unmounts them on <InlineCode>animationend</InlineCode>.</li>
        <li>
          <InlineCode>animate-spin</InlineCode> keeps turning: it is a progress indicator, not decoration. Indeterminate bars slow down to 3 s.
        </li>
        <li>
          Never put <InlineCode>animation: none</InlineCode> on something that unmounts on <InlineCode>animationend</InlineCode>: use a 1 ms duration.
        </li>
      </ul>
      <Text size="sm" tone="neutral">
        <InlineCode>test/motion-guard.test.ts</InlineCode> keeps this honest: every looping animation is covered by the net or guarded on the site, durations stay on the scale, and curves come from the shared ease.
      </Text>
    </div>
  );
}
```
