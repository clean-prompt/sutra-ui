# ShareCodeControls

> Copy the current view as a compact base64url share code, or load one (validated).

- Import: `import { ShareCodeControls } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/memory-map-share` (kit `workspace`)
- `data-slot`: `share-code-controls`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onImport` (required) | `(state: MemoryMapViewState) => void` |  | Called with a validated view decoded from a pasted code. |
| `state` (required) | `MemoryMapViewState` |  | Current view to export. |
