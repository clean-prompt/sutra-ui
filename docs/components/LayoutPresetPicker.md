# LayoutPresetPicker

> Thumbnail grid of layout presets plus saving and re-applying custom arrangements.

- Import: `import { LayoutPresetPicker } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/workspace`)
- Source: `packages/ui/src/patterns/tiling-layout-presets` (patterns)
- `data-slot`: `layout-preset-picker`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onSelect` (required) | `(layout: LayoutNode, presetId: string) => void` |  | Called with the layout to apply. |
| `allowSave` | `boolean` | `true` | Show the save form. Default true. |
| `current` | `LayoutNode` |  | Current arrangement: highlights the matching preset and is what "Save" stores. |
| `defaultSavedPresets` | `SavedLayoutPreset[]` | `[]` | Initially saved layouts when uncontrolled. |
| `onSavedPresetsChange` | `(presets: SavedLayoutPreset[]) => void` |  | Called with the full list of saved layouts after one is saved or deleted. |
| `panes` | `string[]` |  | Panes to distribute into a chosen preset (default: panes of `current`). |
| `presets` | `LayoutPreset[]` | `layoutPresets` | Built-in presets. Default `layoutPresets`. |
| `savedPresets` | `SavedLayoutPreset[]` |  | Controlled list of saved layouts (each with an `id`, a `name` and a `layout`), listed after the built-in presets. Use with `onSavedPresetsChange`. |

## Example (live: `#/components/tiling/preset-picker` in the playground)

```tsx
import { LayoutPresetPicker } from "@cleanprompt/sutra-ui/workspace";

<LayoutPresetPicker
  className="w-full max-w-lg"
  current={layout}
  panes={panesForPresets}
  savedPresets={saved}
  onSavedPresetsChange={setSaved}
  onSelect={setLayout}
/>
```
