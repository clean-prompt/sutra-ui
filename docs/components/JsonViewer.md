# JsonViewer

> Collapsible JSON tree with search, copy value/path, chunked arrays and a raw view.

- Import: `import { JsonViewer } from "@sutra/ui"` (or from `@sutra/ui/ops`)
- Source: `packages/ui/src/patterns/json-viewer` (patterns)
- `data-slot`: `json-viewer`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `chunkSize` | `number` | `100` | Children shown per "Show more" chunk. Default 100. |
| `data` | `unknown` |  | Value to display. |
| `defaultExpandDepth` | `number` | `1` | Levels expanded initially. Default 1. |
| `defaultMode` | `JsonViewerMode` | `"tree"` | Initial view when uncontrolled. |
| `defaultSearch` | `string` | `""` | Initial search text when uncontrolled. |
| `json` | `string` |  | Raw JSON text (parsed; invalid JSON shows an error and the raw text). |
| `label` | `string` | `"JSON"` | Accessible label. |
| `maxHeight` | `number \| string` | `480` | Maximum height of the viewer in px or CSS length; longer content scrolls. |
| `mode` | `JsonViewerMode` |  | Controlled view: the collapsible `tree` or the `raw` text. Use with `onModeChange`. |
| `onCopy` | `(text: string, kind: "value" \| "path", path: string) => void` |  | Called when a value or a path is copied, with the copied text, what was copied and the path. |
| `onModeChange` | `(mode: JsonViewerMode) => void` |  | Called when the user switches between tree and raw. |
| `onSearchChange` | `(q: string) => void` |  | Called with the search text as it changes. |
| `search` | `string` |  | Controlled search query. |
| `searchable` | `boolean` | `true` | Show the search box in the toolbar. Default true. |
| `toolbar` | `boolean` | `true` | Show the toolbar (search, expand/collapse all, tree/raw). Default true. |

## Example (live: `#/components/tiling/layout-json` in the playground)

```tsx
import { JsonViewer } from "@sutra/ui/ops";

<JsonViewer data={layout} defaultExpandDepth={3} maxHeight={360} label="Layout tree" className="w-full" />
```
