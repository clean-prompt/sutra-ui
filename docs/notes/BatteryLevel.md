---
component: BatteryLevel
module: primitives/battery-level
use: A battery reading for a device: a glyph or small bar plus the percentage, warning when low, destructive when critical, with a charging bolt.
instead: Meter = any other bounded value; Progress = the progress of a task; StatusBadge = a status word or dot, not a number
server: ssr-safe
---

## Keyboard
Not focusable: no keyboard interaction.

## Screen readers
- The root is a `role="img"` named from `formatBatteryLevel`: "42% battery", "42% battery, charging", "18% battery, low", "7% battery, critically low", or "Battery level unknown". `label` replaces the whole sentence ("Case battery unknown"). The visible percentage sits inside the image role, so it is not read separately.
- The charging bolt is `aria-hidden`; the word "charging" comes from the label.
- `loading` with no `value` renders placeholders with `aria-busy` and sr-only text "Loading battery level…" (no image role); `loading` with a `value` keeps the reading and only adds `aria-busy="true"`.

## Reduced motion
The fill animates its width over 500 ms and the loading placeholder pulses, both with `motion-reduce:` variants that switch them off.

## Server rendering
Plain markup computed from the props, no browser API, so server and client output match.

## Slots
- `battery-level`: the root, with `data-state` (`ok`, `low`, `critical`, `unknown`, `loading`) and `data-charging`
- `battery-level-fill`: the filled part of the glyph or bar (its width is the percentage; the `text` variant has none)

## Gotchas
- Thresholds are inclusive: `low` (default 20) and `critical` (default 10) are the values at or below which the tone changes, so exactly 20 reads "low" and exactly 10 reads "critically low". The value is clamped to 0 to 100.
- The fill colour is chosen in this order: critical, low, charging (success), then `accent`, then the default foreground. `accent` only applies in the normal range.
- `showValue={false}` hides the percentage for `icon` and `bar`, but the `text` variant always shows it (otherwise it would render nothing).
- A missing, `null` or `NaN` `value` is an unknown reading: a dash and an empty glyph, not 0%.

## Example
```tsx
import { BatteryLevel } from "@sutra/ui";

const devices = [
  { name: "Door sensor", level: 82, charging: false },
  { name: "Thermostat", level: 18, charging: false },
  { name: "Camera", level: 45, charging: true },
];

export function Example() {
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {devices.map((d) => (
        <li key={d.name} className="flex items-center justify-between gap-4">
          <span>{d.name}</span>
          <BatteryLevel value={d.level} charging={d.charging} />
        </li>
      ))}
    </ul>
  );
}
```
