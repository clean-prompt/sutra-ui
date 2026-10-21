---
component: Skeleton
module: primitives/progress
use: A loading placeholder shaped like the content to come: text lines, a circle or a rectangle, with a shimmer sweep or a pulse.
instead: Spinner = a short wait with no content shape; Progress = a known amount of work; Meter = a level that is not loading
server: ssr-safe
---

## Keyboard
Not focusable: no keyboard interaction.

## Screen readers
Every skeleton is `aria-hidden`, so it is invisible to assistive technology. Announce the wait yourself: set `aria-busy="true"` on the region being loaded, and add visually hidden text ("Loading profile…") or a status message, as the loading states of `Meter` and `BatteryLevel` do.

## Reduced motion
The shimmer (`animate-shimmer`) and the pulse both carry `motion-reduce:animate-none`, so a skeleton is a still muted block.

## Server rendering
Plain `div` markup with no browser API, so server and client output match, which makes skeletons the right fallback for streamed content.

## Gotchas
- `shape` defaults to `"rect"` (96 px tall, full width). `"circle"` is 40 px unless you pass `width` (the height follows the width); `"text"` is one line high.
- `lines` only applies to `shape="text"` and makes a stack with a shorter last line (60 percent wide); the wrapper takes `width`, the lines take `height`.
- `shimmer={false}` swaps the sweep for `animate-pulse`.
- `width` and `height` accept a number (px) or any CSS length, and they win over `className` sizes because they are inline styles.

## Example
```tsx
import { Skeleton } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <div aria-busy="true" className="flex max-w-sm items-center gap-3">
      <span className="sr-only">Loading profile…</span>
      <Skeleton shape="circle" width={48} />
      <div className="flex-1">
        <Skeleton shape="text" width="40%" />
        <Skeleton shape="text" lines={2} className="mt-2" />
      </div>
    </div>
  );
}
```
