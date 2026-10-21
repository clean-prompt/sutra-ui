---
component: SlideToConfirm
module: primitives/slide-to-confirm
use: Confirms an irreversible or deliberate action by sliding a thumb along a track. A `role="slider"` with arrow, Home, End, Enter and Space keys, a drag that follows the finger, and a spring back when released early.
instead: UndoAction = the action can be reversed for a few seconds; ConfirmDialog = a plain yes or no in a dialog; Button = the action is not dangerous
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Focuses the thumb (the slider). It is skipped when `disabled` |
| ArrowRight, ArrowUp | Move forward by `step` percent (default 10); reaching 100 confirms |
| ArrowLeft, ArrowDown | Move back by `step` percent, down to 0 |
| Home | Back to 0 |
| End, Enter, Space | Confirm at once |

Keys with Alt, Ctrl or Meta held are ignored, and so are all keys once the control is `disabled`, `loading`, busy or confirmed. In RTL the thumb starts at the right and travels left, and ArrowLeft is the forward key and ArrowRight the back key (the test pins it); ArrowUp and ArrowDown do not swap.

## Screen readers
- The thumb is the `role="slider"` (`aria-valuemin` 0, `aria-valuemax` 100, `aria-valuenow`, `aria-orientation="horizontal"`), named through `aria-labelledby` by the visible hint, "Slide to confirm" unless `label` changes it. The hint text switches to `loadingLabel` and then `confirmedLabel`, so the name follows the state.
- At the end it sets `aria-valuetext` to `confirmedLabel` or `loadingLabel`. The root gets `aria-busy` while loading and `aria-disabled` when disabled.
- A visually hidden `role="status"` says `confirmedLabel` once the control is confirmed and no longer busy.
- The fill and the thumb icon are `aria-hidden`; the spinner in the thumb is decorative.

## Reduced motion
There are no CSS transitions: the thumb and the fill follow a CSS variable that the drag writes, and the settle after a release or a key press is a spring from `useDrag`. Under `prefers-reduced-motion` that spring is skipped and the thumb snaps straight to its place.

## Server rendering
The server renders the track and the thumb at the start edge, because the width is measured after mount and the position is applied in an effect. `defaultConfirmed` or `confirmed` marks it confirmed in the markup (value 100, check icon) while the thumb jumps to the end after hydration. Direction is read as `ltr` on the server.

## Slots
- `slide-to-confirm`: the track (the root element)
- `slide-to-confirm-fill`: the tinted fill behind the thumb
- `slide-to-confirm-label`: the hint text, which fades as the thumb moves
- `slide-to-confirm-thumb`: the draggable `slider` element

## Gotchas
- Only the thumb starts a drag; pressing on the track does nothing. A release confirms from 90 percent of the travel, and speed alone never confirms. Vertical scrolling is left to the browser (`touch-action` is set for you).
- `onConfirm` may return a promise: the control stays busy until it settles and slides back if it rejects. A synchronous throw also slides it back and then rethrows. A resolved promise leaves it confirmed.
- Once confirmed it is locked at the end (keys and drags are ignored) until you pass `confirmed={false}`; `onConfirmedChange` reports both changes. `loading` shows the end position and a spinner without calling `onConfirm`.
- With a controlled `confirmed` that stays `false`, `onConfirm` still runs on a confirm gesture and then the thumb slides back home.

## Example
```tsx
import { SlideToConfirm } from "@cleanprompt/sutra-ui";

export function Example({ sendPayment }: { sendPayment: () => Promise<unknown> }) {
  return (
    <div className="w-full max-w-sm">
      <SlideToConfirm
        label="Slide to send $250"
        loadingLabel="Sending..."
        confirmedLabel="Payment sent"
        onConfirm={sendPayment}
      />
    </div>
  );
}
```
