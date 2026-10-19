# SutraAppIcon

> App icon for a Sutra suite app: a tile with a thread running across it, a bead on the thread and one pictogram in the bead. The thread leaves the tile on both sides, so a row of icons reads as beads on one string.

- Import: `import { SutraAppIcon } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/brand` (assets)
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `app` (required) | `SutraApp` |  | The Sutra app to draw the icon for. |
| `shape` | `"rounded" \| "squircle" \| "circle"` | `"rounded"` | Corner style of the tile. |
| `size` | `number \| string` | `40` | Rendered pixel size (width and height). |
| `title` | `string` |  | Accessible title. When omitted, the graphic is hidden from assistive tech. |
| `tone` | `SutraAppTone` | `"mono"` | Colour of the icon. Default `mono`. |

## Example (live: `#/components/suite/app-theming` in the playground)

```tsx
import { SutraAppIcon, sutraAppMeta, sutraApps } from "@sutra/ui/assets";
import { Button } from "@sutra/ui/core";

<div className="@container w-full">
  <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2 @4xl:grid-cols-4">
    {sutraApps.map((app) => (
      <div key={app} data-app={app} className="space-y-3 rounded-box border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <SutraAppIcon app={app} size={28} />
          <span className="font-medium">{sutraAppMeta[app].name}</span>
        </div>
        <div className="h-1.5 rounded-full bg-[linear-gradient(90deg,var(--app-from),var(--app-to))]" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm">Primary</Button>
          <Button size="sm" variant="soft">
            Soft
          </Button>
        </div>
      </div>
    ))}
  </div>
</div>
```
