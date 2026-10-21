---
component: DonutChart
module: patterns/chart-donut
use: A ring split into segments for the parts of a whole, with the total (or a value you choose) in the centre, a legend that hides and shows segments, and a tooltip with name, value and share.
instead: StackedMeter = the same parts as one horizontal bar; BreakdownList = only the legend rows, no ring; Gauge = one value against a range; BarChart = compare many categories or values that are not parts of a whole; Treemap = parts with a hierarchy or many tiles
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab | Focuses the ring; leaving it clears the active segment |
| ArrowRight, ArrowDown | Next visible segment, clockwise; wraps from the last to the first |
| ArrowLeft, ArrowUp | Previous visible segment; wraps from the first to the last |
| Escape | Clears the active segment and its tooltip |
| Enter, Space | On a legend entry: hide or show that segment. With Alt: show only that one, or restore all |

There is no Home or End. The ring is a `dir="ltr"` island, so the arrows never swap in RTL. The legend is outside it and follows the page direction, so `legend="right"` puts it at the inline end (visually left in RTL).

## Screen readers
- The ring is a focusable `role="img"` named by `label`, by default "Donut chart: alice 40, bob 35" listing every segment, hidden ones included. The SVG and the centre text are not read separately.
- A visually hidden table follows it: columns are the `index` key, the `valueKey` and "Share"; a hidden segment shows "hidden" as its share. Shares are of the visible total.
- Stepping with the keyboard writes "alice: 40 (40%)" into a polite live region. Hovering shows the tooltip but does not announce.
- The chip legend is a `group` named "Toggle series" of `aria-pressed` buttons; with `legendValues` or `iconFor` it becomes a `list` named "Legend" whose rows are the same toggle buttons. With `loading`, the root has `aria-busy` and one hidden "Loading donut chart…".

## Reduced motion
Segments carry `motion-safe:transition-all duration-500` (`animate`, default true), which eases the hover dimming and colour changes; the arc shape is a `d` attribute, so it changes at once when data or the hidden set changes, and under `prefers-reduced-motion` nothing eases. The loading ring pulses with `animate-pulse` and carries `motion-reduce:animate-none`. There is no entrance animation on mount.

## Server rendering
The ring is drawn from `size` alone, so the server HTML already contains the segments, centre text and legend; nothing waits for mount. The one thing that can differ is number text: values and shares go through `Intl` with the runtime default locale, so pass `valueFormatter` when the server and the browser locale differ.

## Slots
- `chart-segment`: one ring segment (hidden segments are not rendered)
- `chart-center-value`: the centre number
- `chart-center-label`: the caption under it
- `chart-skeleton`: the loading ring
- `chart-empty`: the empty placeholder

## Gotchas
- Values below 0 or that are not finite numbers count as 0. When the visible total is 0 the ring is one muted track and the centre shows 0.
- The centre defaults to the formatted total of visible segments, so it changes when you hide one; `centerValue={null}` removes it, `centerLabel` alone still shows.
- Segment keys are the `index` text; a repeated name gets `#1`, `#2` suffixes, which is what `hiddenSeries` and `onHiddenSeriesChange` contain for the repeats.
- `legend={false}` removes the only toggle control (segments then cannot be hidden by keyboard or pointer unless you control `hiddenSeries`). `legendInteractive={false}` keeps the legend as a plain list.

## Example
```tsx
import { DonutChart } from "@cleanprompt/sutra-ui";

const storage = [
  { type: "Photos", gb: 42 },
  { type: "Documents", gb: 18 },
  { type: "Apps", gb: 31 },
];

export function Example() {
  return (
    <DonutChart
      data={storage}
      index="type"
      valueKey="gb"
      label="Storage used by type"
      valueFormatter={(gb) => `${gb} GB`}
      centerLabel="used"
      legendValues="both"
    />
  );
}
```
