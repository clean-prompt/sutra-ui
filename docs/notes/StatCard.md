---
component: StatCard
module: patterns/stat-card
covers: StatValue, StatGroup, TopItemCard
use: A metric tile: label, big value with unit, optional delta, hint, sparkline, progress bar, stat row and body. With `href` or `onClick` the whole card is one link or button. `StatGroup` lays tiles out in a row, `TopItemCard` is the preset for "the biggest item right now", `StatValue` is just the number.
instead: MetricHero = the page-header metric with a live chart; Meter = a value against a limit; Gauge = one reading on an arc; AnimatedNumber = only a rolling number; BarList = a ranked list; Sparkline = just the trend; Card = a plain container
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Without `href` or `onClick` the card is not focusable. With either, the label is the one tab stop and the focus ring is drawn around the whole card |
| Enter | Follows the link or presses the button |
| Space | Presses the button (a link does not react to Space) |

Nothing depends on the arrow keys, so RTL changes only the chevron, which mirrors.

## Screen readers
- The card is a plain `div` with no role. The label, value, unit and delta are read as text in order; a delta adds hidden "Increased", "Decreased" or "Unchanged" before it.
- With `href` or `onClick` the label is an `<a>` or a `<button>` stretched over the card, and `aria-describedby` points at the value block (caption, value, delta), so the link is announced with its value.
- `trend` is an image named "<label> trend" ("Trend" when the label is not a string) with no values: show the number as text too. `progress` is a `progressbar` named by the label.
- With `loading` the root has `aria-busy`, there is one hidden "Loading CPU…", and the label, caption and stat labels stay visible.

## Reduced motion
Hover only tints the card and nudges the chevron, both transitions the global net ends in 1 ms. The digit roll of `animate` (opt-in, numbers only) is a transition too, so under `prefers-reduced-motion` the value changes at once. The sparkline does not animate, except bars (`trendType="bar"`).

## Server rendering
Plain markup from props with a `useId` id; the same on server and client. `animate` and the default number text use the runtime locale: pass `valueLocale` and `valueFormat` when the server and the browser may differ.

## Slots
- `stat-card`: the root; `stat-body`: caption, value row and delta; `stat-value`: the number
- `stat-delta`: the change (`data-direction`, `data-quality`); `stat-status`: the right-aligned `status`
- `stat-link`: the label link or button; `stat-chevron`: its arrow
- `stat-stats`, `stat-content`, `stat-trend`: the stat row, the `children` body and the footer trend
- `stat-skeleton` and the `*-skeleton` parts: loading placeholders
- `stat-group`: the `StatGroup` grid; `top-item`: the `TopItemCard` item

## Gotchas
- `loading` always shows placeholders for the value, hint, delta, stat values, progress, trend and `children`, even when a value is present (there is no refresh state); pass it only until the first value arrives.
- Delta direction comes from the sign of a number or a leading `+`, `-` or `−` in a string; colour comes from `deltaIntent` (default `positive-is-good`: up is green; `negative-is-good` flips it, `neutral` greys it). `deltaSuffix` ("%") is added to numbers only.
- A linked card covers its content with the stretched link: other buttons inside (in `children` or `status`) need `relative z-10` to stay clickable.
- `tone` tints the value only for `warning` and `destructive`; the trend follows the delta quality unless `accent` or `trendColor` is set. In a `StatGroup variant="divided"` the cards lose their own border and shadow.

## Example
```tsx
import { StatCard, StatGroup } from "@sutra/ui";

export function Example() {
  return (
    <StatGroup columns={2}>
      <StatCard label="Revenue" value="$48,200" delta={12.4} deltaLabel="vs last month" trend={[30, 34, 33, 40, 44, 48]} />
      <StatCard label="p95 latency" value="310" unit="ms" delta={24} deltaIntent="negative-is-good" hint="Last 24 hours" />
    </StatGroup>
  );
}
```
