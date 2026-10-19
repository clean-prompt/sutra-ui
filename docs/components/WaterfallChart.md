# WaterfallChart

> Waterfall chart: floating bars that climb and fall from the running total, with totals, connectors and a signed table.

- Import: `import { WaterfallChart } from "@sutra/ui"` (or from `@sutra/ui/dataviz`)
- Source: `packages/ui/src/patterns/chart-waterfall` (patterns)
- `data-slot`: `chart-skeleton`, `chart-active-band`, `chart-connector`, `chart-bar`, `chart-value`, `chart-reference-line`, `chart-hit`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` (required) | `ChartDatum[]` |  | One row per step. A row is a change (added to the running total; negative values fall) unless its `type` is `"total"` (or `"subtotal"`): that bar rises from zero to its `value`, or to the running total when it has none. |
| `animate` | `boolean` | `true` | CSS transitions on data changes (disabled under prefers-reduced-motion). Default true. |
| `colors` | `Partial<Record<WaterfallKind, string>>` |  | Bar colors (token names or any CSS color). Defaults: success, destructive, primary. |
| `connectors` | `boolean` | `true` | Dashed lines linking each bar to the next. Default true. |
| `emptyState` | `React.ReactNode` |  | Content shown instead of the chart when there is no data. |
| `grid` | `boolean` | `true` | Horizontal gridlines. Default true. |
| `height` | `number` | `260` | Plot height in px (legend excluded). Default 260. |
| `index` | `string` | `"label"` | Key of the step name. Default "label". |
| `kindLabels` | `Partial<Record<WaterfallKind, string>>` |  | Legend and table wording. Defaults "Increase", "Decrease", "Total". |
| `label` | `string` |  | Accessible name. Defaults to a description built from the steps. |
| `legend` | `boolean \| "top" \| "bottom"` |  | Increase / decrease / total key. Default: shown below when more than one kind is present. |
| `loading` | `boolean` |  | Data is on its way: with no data, a placeholder plot (and legend) of the same size; with data, the root is marked busy. |
| `onActiveIndexChange` | `(index: number \| null) => void` |  | Called with the hovered step index (or `null` when the pointer leaves); use it to sync other views. |
| `referenceLines` | `ChartReferenceLine[]` | `[]` | Horizontal threshold lines (`axis: "y"` only). |
| `showValues` | `boolean \| "auto"` | `"auto"` | Value labels above the bars: `"auto"` (default) shows them when they fit. |
| `tooltip` | `boolean` | `true` | Shows a tooltip with the step value and the running total. |
| `typeKey` | `string` | `"type"` | Key of the step type. Default "type". |
| `valueFormatter` | `(value: number) => string` | `defaultValueFormatter` | Formats a magnitude: changes get their sign added ("+18", "−18"), totals are formatted as they are. |
| `valueKey` | `string` | `"value"` | Key of the step value. Default "value". |
| `xAxis` | `Pick<ChartXAxisOptions, "hide" \| "formatter" \| "label" \| "tickCount">` | `{}` | Step name axis: `hide`, `formatter`, `label` (table header) and `tickCount` (a maximum). |
| `yAxis` | `ChartYAxisOptions` | `{}` | Value-axis options: formatter, domain, tick count, hidden. |

## Example (live: `#/components/dataviz/waterfall-chart` in the playground)

```tsx
import { WaterfallChart } from "@sutra/ui/dataviz";

<div className="@container space-y-8">
  <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-2">
    <div className="min-w-0 space-y-2">
      {/* Monthly recurring revenue bridge */}
      <WaterfallChart data={revenueBridge} valueFormatter={(v) => `$${v}k`} yAxis={{ formatter: (v) => `$${v}k` }} />
    </div>
    <div className="min-w-0 space-y-2">
      {/* Negative running total, subtotals, target line */}
      <WaterfallChart
        data={cashFlow.map((d) => (d.label === "Tax" ? { label: "Subtotal", type: "subtotal" } : d))}
        valueFormatter={(v) => `${v}k`}
        referenceLines={[{ value: 50, label: "Reserve", color: "warning" }]}
        kindLabels={{ increase: "Inflow", decrease: "Outflow" }}
      />
    </div>
  </div>
  <div className="min-w-0 space-y-2">
    {/* Many points: weekly net change, labels thin out */}
    <WaterfallChart data={weeklyNet} connectors={false} height={240} />
  </div>
  <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-3">
    <div className="min-w-0 space-y-2">
      {/* Loading */}
      <WaterfallChart data={[]} loading height={200} />
    </div>
    <div className="min-w-0 space-y-2">
      {/* Empty */}
      <WaterfallChart data={[]} emptyState="No movements yet" height={200} />
    </div>
    <div className="min-w-0 space-y-2">
      {/* Narrow container */}
      <div className="w-full max-w-[260px]">
        <WaterfallChart data={revenueBridge} height={200} />
      </div>
    </div>
  </div>
</div>
```

Playground helpers in this snippet (not part of the library): cashFlow, revenueBridge, weeklyNet.
