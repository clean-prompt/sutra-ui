# FanControl

> Fan speeds with a per-fan Automatic / Fixed switch and, when Fixed, a target slider (step 100, "2,400 rpm"). Shows a note that fans return to automatic when the app quits, and a safety message when the target is below what the system needs. Data in, events out.

- Import: `import { FanControl } from "@sutra/ui"` (or from `@sutra/ui/system`)
- Source: `packages/ui/src/kits/system/thermals` (kit `system`)
- `data-slot`: `fan-control`, `fan-control-disabled-reason`, `fan-control-skeleton`, `fan-control-skeleton-rpm`, `fan-control-empty`, `fan-control-item`, `fan-control-rpm`, `fan-control-target`, `fan-control-note`, `fan-control-warning`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `fans` (required) | `FanControlFan[]` |  | Fans to list, each with a name, current rpm, target rpm and mode. |
| `accent` | `Accent` | `"orange"` | Default "orange". |
| `disabled` | `boolean` |  | Turns every control off (e.g. the privileged helper is not installed). |
| `disabledReason` | `React.ReactNode` |  | Why the controls are off, with any action ("Install Helper…"); shown above the fans when `disabled`. |
| `emptyState` | `React.ReactNode` | `"No controllable fans"` | Shown when `fans` is empty. Default "No controllable fans". |
| `label` | `string` | `"Fans"` | Accessible name of the list. Default "Fans". |
| `loading` | `boolean` | `false` | Data is on its way. With no fans yet placeholder fan cards are shown (no mode switch or slider); with fans the root is only marked busy. |
| `loadingRows` | `number` | `2` | Placeholder fans while loading. Default 2. |
| `locale` | `string` |  | BCP 47 locale used to format numbers. |
| `note` | `React.ReactNode \| false` | `"Returns to automatic when the app quits"` | Note under a fixed fan's slider. Default "Returns to automatic when the app quits"; `false` hides it. |
| `onModeChange` | `(id: string, mode: FanMode) => void` |  | Called with the fan id and the mode (automatic or fixed) when the user switches a fan's mode. |
| `onTargetChange` | `(id: string, rpm: number) => void` |  | Fires while the target slider moves. |
| `onTargetCommit` | `(id: string, rpm: number) => void` |  | Fires once when the slider is released or a key press ends; write the fan speed here. |
| `step` | `number` | `100` | Slider step in rpm. Default 100. |

## Example (live: `#/components/system/thermals` in the playground)

```tsx
import * as React from "react";
import { FanControl, HeatByApp, ThermalSensors } from "@sutra/ui/system";

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
