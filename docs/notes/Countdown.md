---
component: Countdown
module: patterns/countdown
use: Time left until a moment, as days, hours, minutes and seconds boxes or a compact "2h 14m" line. It fires `onComplete` once at the deadline and can switch to a warning tone for the last stretch. Use it for sales, expiring codes and session timeouts.
instead: Stopwatch = time counting up with laps; Progress = completion of a task; AnimatedNumber = a changing number without a clock; useCountdown = the remaining time as data for your own layout
server: mixed
---

## Keyboard
Not focusable: no keyboard interaction.

## Screen readers
- The root is `role="timer"` with an `aria-label` such as "Time remaining: 2 hours 14 minutes" (up to three units, seconds shown only under a day), or "Time is up" once finished. The digits, colons and unit captions are `aria-hidden`, so the label is all that is read.
- A timer is not a live region by default, so nothing is announced while it ticks; the label is current when someone reads it. Add `aria-live` only if you want announcements, and expect chatter once a second.
- `data-urgent` and the warning colour are visual: put an explicit message next to the countdown if the last stretch matters.

## Reduced motion
The optional `flip` entrance (`animate-in` with a small slide) is skipped when the reduced-motion preference is on (read live). Without `flip` the digits change in place, so the component never moves.

## Server rendering
The remaining time is computed from `Date.now()` during the first render, so the server's snapshot differs from the browser's first render by the time between them (seconds in the label and digits change on the first tick after mount). Pass a deadline far enough ahead, or hide the countdown until mounted, if a mismatch warning matters.

## Gotchas
- `target` is a `Date` or epoch milliseconds. The display recomputes from the wall clock on every tick, so it does not drift when the tab was in the background.
- `onComplete` fires once per `target`, also when the target is already past on mount. When finished, the zeros stay unless you pass `completeContent`, which replaces the digits (the root still has role `timer` and "Time is up").
- `format="compact"` shows the two largest units ("2h 14m", "45s"); `segments` hides the days box when there are no whole days and `hideSeconds` drops the seconds box (and ticks once a second instead of four times).
- `urgentBelow` (milliseconds) only sets the warning tone and `data-urgent` during the last stretch while time remains; it does not change the label.

## Example
```tsx
import { Countdown } from "@sutra/ui";

export function Example({ endsAt }: { endsAt: Date }) {
  return (
    <Countdown
      target={endsAt}
      urgentBelow={60_000}
      completeContent={<p className="text-sm text-muted-foreground">The sale has ended</p>}
    />
  );
}
```
