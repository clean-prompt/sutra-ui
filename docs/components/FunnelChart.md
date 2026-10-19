# FunnelChart

> Funnel chart: stage names and values at the left, the narrowing shape at the right, keyboard and tooltip readouts.

- Import: `import { FunnelChart } from "@sutra/ui"` (or from `@sutra/ui/dataviz`)
- Source: `packages/ui/src/patterns/chart-funnel` (patterns)
- `data-slot`: `chart-skeleton`, `chart-stage`, `chart-stage-label`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` (required) | `ChartDatum[]` |  | One row per stage, in funnel order (the chart does not sort). |
| `animate` | `boolean` | `true` | CSS transitions on data changes (disabled under prefers-reduced-motion). Default true. |
| `color` | `string` |  | One color for every stage; stages shade from full strength at the top to lighter at the bottom. Default the first chart color. |
| `colorFor` | `(datum: ChartDatum, index: number) => string` |  | Returns a colour for a step (a token name or CSS colour), or `undefined` to use the palette colour. |
| `colors` | `string[]` |  | A color per stage instead (no shading). |
| `connected` | `boolean` | `true` | Stages join with sloping sides (default) or are separate centered bars (`false`). |
| `conversion` | `"previous" \| "first" \| false` | `"previous"` | The conversion rate shown beside each stage (after the first): `"previous"` is the share of the stage before (default), `"first"` the share of the top stage, `false` hides rates. The tooltip and the table always list both. |
| `emptyState` | `React.ReactNode` |  | Content shown instead of the funnel when there is no data. |
| `height` | `number` |  | Plot height in px. Default 44px per stage (at least 120). |
| `index` | `string` | `"label"` | Key of the stage name. Default "label". |
| `label` | `string` |  | Accessible name. Defaults to a description built from the stages. |
| `loading` | `boolean` |  | Data is on its way: with no data, a placeholder funnel of the same size; with data, the root is marked busy. |
| `onActiveIndexChange` | `(index: number \| null) => void` |  | Called with the hovered step index (or `null` when the pointer leaves); use it to sync other views. |
| `tooltip` | `boolean` | `true` | Shows a tooltip with the step value and the drop-off from the previous step. |
| `valueFormatter` | `(value: number) => string` | `defaultValueFormatter` | Formats the step values in the tooltip and labels. Default is the localized number. |
| `valueKey` | `string` | `"value"` | Key of the stage value. Default "value". |

## Example (live: `#/components/dataviz/funnel-chart` in the playground)

```tsx
import { FunnelChart } from "@sutra/ui/dataviz";

<div className="@container space-y-8">
  <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-2">
    <div className="min-w-0 space-y-2">
      {/* Default: share of the previous stage */}
      <FunnelChart data={signupFunnel} valueFormatter={(v) => v.toLocaleString("en-US")} />
    </div>
    <div className="min-w-0 space-y-2">
      {/* conversion=&quot;first&quot;, separate bars, own colors */}
      <FunnelChart
        data={signupFunnel}
        conversion="first"
        connected={false}
        valueFormatter={(v) => v.toLocaleString("en-US")}
        colors={["info", "primary", "warning", "success", "destructive"]}
      />
    </div>
  </div>
  <div className="min-w-0 space-y-2">
    {/* Many stages, rates hidden, formatted values */}
    <FunnelChart data={longFunnel} conversion={false} valueFormatter={(v) => compact.format(v)} color="success" height={380} />
  </div>
  <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-3">
    <div className="min-w-0 space-y-2">
      {/* Loading */}
      <FunnelChart data={[]} loading />
    </div>
    <div className="min-w-0 space-y-2">
      {/* Empty */}
      <FunnelChart data={[]} emptyState="No visits this week" />
    </div>
    <div className="min-w-0 space-y-2">
      {/* Narrow container */}
      <div className="w-full max-w-[260px]">
        <FunnelChart data={signupFunnel} valueFormatter={(v) => compact.format(v)} />
      </div>
    </div>
  </div>
</div>
```

Playground helpers in this snippet (not part of the library): compact, longFunnel, signupFunnel.
