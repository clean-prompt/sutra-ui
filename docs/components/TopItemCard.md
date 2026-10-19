# TopItemCard

> StatCard preset for "the biggest item right now": label, item icon + name and its value, optionally linked.

- Import: `import { TopItemCard } from "@sutra/ui"` (or from `@sutra/ui/dataviz`)
- Source: `packages/ui/src/patterns/stat-card` (patterns)
- `data-slot`: `top-item`, `stat-chevron`, `top-item-skeleton`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `item` (required) | `React.ReactNode` |  | The leading item's name ("Google Chrome"). |
| `accent` | `Accent` |  | Categorical colour for the icon chip, label, trend and progress bar. `tone` stays for status. |
| `animate` | `boolean` |  | Roll the digits when a numeric `value` changes. Opt-in; strings and nodes render as given. |
| `caption` | `React.ReactNode` |  | Small text above the value ("Now", "In use of 64 GB"). |
| `chevron` | `boolean` |  | Trailing chevron in the header. Default true when the card is a link or button. |
| `children` | `React.ReactNode` |  | Extra body content under the value and stats (a chart, a list). |
| `href` | `string` |  | Makes the label a link that covers the whole card. |
| `icon` | `React.ReactNode` |  | Icon shown beside the label. |
| `iconPlacement` | `"start" \| "end"` |  | Icon chip before the label or in the top-right corner. Default start with `accent`/`href`/`onClick`, else end. |
| `itemIcon` | `React.ReactNode` |  | The item's icon or logo. |
| `label` | `React.ReactNode` | `"Top App"` | Card label. Default "Top App". |
| `labelTone` | `"accent" \| "muted"` | `"muted"` | Label colour: the accent (default when `accent` is set) or muted. |
| `loading` | `boolean` |  | Shows placeholders instead of the value, hint, delta and stat values (the label, caption and stat labels stay); the progress bar, trend and `children` body get placeholders of the same size. |
| `onClick` | `React.MouseEventHandler<HTMLElement>` |  | Makes the label a button that covers the whole card (when there is no `href`). |
| `progress` | `number` |  | A thin bar under the value (`progressMax` default 100). |
| `progressMax` | `number` | `100` | Value that counts as 100% for `progress`. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Card padding and value size. |
| `status` | `React.ReactNode` |  | Right-aligned next to the value, e.g. a `StatusBadge`. |
| `tone` | `StatTone` |  | Semantic colour of the trend and accents. |
| `trendColor` | `SparklineColor` |  | Colour of the trend line; defaults to follow `tone`. |
| `trendMax` | `number` |  | Fixed upper bound of the trend scale (e.g. 100). |
| `trendMin` | `number` |  | Fixed lower bound of the trend scale (e.g. 0). |
| `trendPlacement` | `"inline" \| "footer"` |  | `footer` draws the trend full-width at the bottom on an accent-tinted strip. Default inline. |
| `trendType` | `"line" \| "area" \| "bar"` | `"area"` | Sparkline style for `trend`. |
| `value` | `React.ReactNode` |  | The item's value ("37.0%"). |
| `valueFont` | `"mono" \| "sans"` |  | Number face for the value: monospaced (default) or the UI sans with tabular figures. |
| `valueFormat` | `Intl.NumberFormatOptions` |  | `Intl.NumberFormat` options for an animated `value`. |
| `valueLocale` | `string \| string[]` |  | Locale for an animated `value`. |

## Notes

**When to use:** A metric tile: label, big value with unit, optional delta, hint, sparkline, progress bar, stat row and body. With `href` or `onClick` the whole card is one link or button. `StatGroup` lays tiles out in a row, `TopItemCard` is the preset for "the biggest item right now", `StatValue` is just the number.

**Use instead when:**
- `MetricHero`: the page-header metric with a live chart
- `Meter`: a value against a limit
- `Gauge`: one reading on an arc
- `AnimatedNumber`: only a rolling number
- `BarList`: a ranked list
- `Sparkline`: just the trend
- `Card`: a plain container

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Without `href` or `onClick` the card is not focusable. With either, the label is the one tab stop and the focus ring is drawn around the whole card |
| Enter | Follows the link or presses the button |
| Space | Presses the button (a link does not react to Space) |

Nothing depends on the arrow keys, so RTL changes only the chevron, which mirrors.

### Screen readers

- The card is a plain `div` with no role. The label, value, unit and delta are read as text in order; a delta adds hidden "Increased", "Decreased" or "Unchanged" before it.
- With `href` or `onClick` the label is an `<a>` or a `<button>` stretched over the card, and `aria-describedby` points at the value block (caption, value, delta), so the link is announced with its value.
- `trend` is an image named "<label> trend" ("Trend" when the label is not a string) with no values: show the number as text too. `progress` is a `progressbar` named by the label.
- With `loading` the root has `aria-busy`, there is one hidden "Loading CPU…", and the label, caption and stat labels stay visible.

### Reduced motion

Hover only tints the card and nudges the chevron, both transitions the global net ends in 1 ms. The digit roll of `animate` (opt-in, numbers only) is a transition too, so under `prefers-reduced-motion` the value changes at once. The sparkline does not animate, except bars (`trendType="bar"`).

### Server rendering

Server render: same markup as the client. Plain markup from props with a `useId` id; the same on server and client. `animate` and the default number text use the runtime locale: pass `valueLocale` and `valueFormat` when the server and the browser may differ.

### Slots

- `stat-card`: the root; `stat-body`: caption, value row and delta; `stat-value`: the number
- `stat-delta`: the change (`data-direction`, `data-quality`); `stat-status`: the right-aligned `status`
- `stat-link`: the label link or button; `stat-chevron`: its arrow
- `stat-stats`, `stat-content`, `stat-trend`: the stat row, the `children` body and the footer trend
- `stat-skeleton` and the `*-skeleton` parts: loading placeholders
- `stat-group`: the `StatGroup` grid; `top-item`: the `TopItemCard` item

### Gotchas

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
