---
component: StatusBadge
module: primitives/status-badge
covers: StatusDot
use: A status pill with a coloured dot, spinner or icon and a label, from 13 preset statuses or any `tone`. `StatusDot` is the same indicator on its own.
instead: Badge = a category or tag with no status meaning; Chip = a clickable filter or tag; Spinner = only a loading indicator; Meter = a measured value
server: ssr-safe
---

## Keyboard
Not focusable: no keyboard interaction.

## Screen readers
- `StatusBadge` is a plain `<span>`. The label is visible text (the status name, `label`, or `children`), and the indicator inside it is always `aria-hidden`: the text carries the meaning, so never pass an empty label with a coloured dot.
- `StatusDot` on its own is a `role="img"` named by `label`, which defaults to the status name ("Busy"). With only `tone` and no `status` or `label` it is `aria-hidden`, so a bare dot is silent. `label=""` hides it on purpose.
- `icon="spinner"` renders a `Spinner` with an empty label (decorative); the node you pass as `icon` is wrapped in `aria-hidden`.

## Reduced motion
The `pulse` halo uses `motion-safe:animate-ping`, so it never runs under `prefers-reduced-motion`. The pop of a changed custom icon (`animate-pop`) is stopped by the net in `sutra.css`, and the colour fade ends in 1 ms. The `spinner` icon keeps spinning, as it carries meaning.

## Server rendering
Plain markup with no browser API, so server and client output match. The icon pop is skipped on the first render and only plays when the status changes later.

## Gotchas
- `tone` wins over the colour of `status`, and `status` still supplies the default label. Statuses: online, offline, busy, away, active, inactive, pending, success, error, warning, info, draft, processing (`processing` is primary and pulses by default).
- `pulse` only affects the dot: it does nothing with `icon="spinner"` or a custom icon node. In `StatusBadge`, `variant` is the pill style (`soft`, `outline`, `plain`); the dot's own fill (`solid`, `hollow`, `dashed`) exists only on `StatusDot`.
- `icon={null}` or `false` removes the indicator on `StatusBadge`; on `StatusDot` any `null` or boolean icon draws the plain dot.
- `children` replace the default label, and `label` is ignored when `children` are present.

## Example
```tsx
import { StatusBadge, StatusDot } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge status="online" />
      <StatusBadge status="pending" label="Awaiting approval" />
      <StatusBadge status="processing" variant="outline" />
      <StatusBadge status="error" label="Deploy failed" />
      <StatusDot status="busy" />
    </div>
  );
}
```
