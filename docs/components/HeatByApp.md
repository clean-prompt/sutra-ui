# HeatByApp

> `BarList` preset ranking apps by energy impact (the heat they add), with a short explanation underneath.

- Import: `import { HeatByApp } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/system`)
- Source: `packages/ui/src/kits/system/thermals` (kit `system`)
- `data-slot`: `heat-by-app`, `heat-by-app-explanation`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `apps` (required) | `HeatByAppItem[]` |  | Apps with their heat contribution, drawn as ranked bars. |
| `accent` | `Accent` | `"orange"` | Bar colour. Default primary. |
| `defaultExpanded` | `boolean` | `false` | Initial expanded state when uncontrolled. |
| `emptyState` | `React.ReactNode` | `"No apps adding heat"` | Content shown when there are no items. |
| `expanded` | `boolean` |  | Controlled expanded state when `limit` hides rows. Use with `onExpandedChange`. |
| `explanation` | `React.ReactNode \| false` | `"Energy impact estimates how hard each app makes the Mac work. Higher numbers mean more heat and faster fans."` | Short note under the list. Pass `false` to hide it. |
| `header` | `{ label?: React.ReactNode; value?: React.ReactNode }` | `{ label: "App", value: "Energy impact" }` | Column headers above the list ("App" / "CPU"). |
| `highlightFirst` | `boolean` | `true` | Subtle background on the first row (the leader). |
| `label` | `string` | `"Heat by app"` | Accessible name of the list. |
| `limit` | `number` |  | Show only the first `limit` rows until expanded. |
| `loading` | `boolean` |  | Data is on its way: with no items, placeholder rows stand in (header labels stay); with items, the root is marked busy. |
| `loadingRows` | `number` |  | Placeholder rows shown while loading with no items. Default 5. |
| `max` | `number` |  | Value of a full bar. Default: the largest value. |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called when the "Show all" toggle expands or collapses the list. |
| `showAllLabel` | `(total: number) => React.ReactNode` |  | Toggle text; receives the number of rows in total. |
| `showAllToggle` | `boolean` |  | Show a "Show all" / "Show less" toggle when rows are hidden. Default true. |
| `showLessLabel` | `React.ReactNode` | `"Show less"` | Text of the toggle while expanded. |
| `sort` | `"desc" \| "none"` |  | "desc" ranks by value (default); "none" keeps the given order. |
| `valueFormatter` | `(value: number) => React.ReactNode` | `(v) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(v)` | Formats the value shown at the end of each row. Default is the localized number. |

## Example (live: `#/components/system/thermals` in the playground)

```tsx
import * as React from "react";
import { FanControl, HeatByApp, ThermalSensors } from "@cleanprompt/sutra-ui/system";

function ThermalsDemo() {
  const [fans, setFans] = React.useState(initialFans);
  const update = (id: string, patch: Partial<FanControlFan>) => setFans((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  return (
    <div className="grid grid-cols-1 w-full gap-4 lg:grid-cols-2">
      <ThermalSensors sensors={sensors} showUnitToggle />
      <FanControl
        fans={fans}
        onModeChange={(id, mode) => update(id, { mode, targetRpm: mode === "fixed" ? fans.find((f) => f.id === id)?.rpm ?? 2000 : undefined })}
        onTargetChange={(id, rpm) => update(id, { targetRpm: rpm })}
      />
      <HeatByApp
        className="lg:col-span-2"
        explanation="Apps ranked by energy impact over the last minute, the closest proxy for heat."
        apps={[
          { id: "figma", name: "Figma", impact: 61, description: "14 processes" },
          { id: "chrome", name: "Google Chrome", impact: 48, description: "96 processes" },
          { id: "zoom", name: "Zoom", impact: 33, description: "8 processes" },
          { id: "docker", name: "Docker", impact: 12, description: "9 processes" },
        ]}
      />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): initialFans, sensors.
