# ContainerList

> Docker containers grouped by Compose project: state, ports, a limit warning, CPU and memory per container.

- Import: `import { ContainerList } from "@sutra/ui"` (or from `@sutra/ui/system`)
- Source: `packages/ui/src/kits/system/containers` (kit `system`)
- `data-slot`: `container-list`, `container-empty`, `container-group`, `container-group-header`, `container-group-description`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `containers` (required) | `ContainerInfo[]` |  | Containers to list, grouped by Compose project; each with a name, state, ports, CPU and memory. |
| `accent` | `Accent` | `"cyan"` | Categorical colour for icons, port badges and CPU bars. Default "cyan". |
| `defaultExpanded` | `string[]` |  | Initially expanded group names when `expanded` is not controlled. |
| `emptyState` | `React.ReactNode` |  | Shown when `containers` is empty. |
| `expanded` | `string[]` |  | Expanded Compose groups (by name). Uncontrolled default: every group expanded. |
| `formatBytes` | `(bytes: number) => string` | `formatMemory` | Memory text. Default decimal units ("312 MB"). |
| `groupDescription` | `React.ReactNode` | `"Started together by Docker Compose"` | Group subtitle lead. Default "Started together by Docker Compose". |
| `label` | `string` | `"Containers"` | Accessible name of the list. Default "Containers". |
| `limitWarnAt` | `number` | `0.8` | Warn when memory reaches this share of the container's limit. Default 0.8. |
| `loading` | `boolean` | `false` | Data is on its way. With no containers yet the list shows placeholder rows; with containers the root is only marked busy. |
| `loadingRows` | `number` | `3` | Placeholder container rows (under one placeholder group header) while loading. Default 3. |
| `now` | `TimeInput` |  | Reference time for "Up 5 hours" (pass it for deterministic output). Default: the live clock, refreshed every 30 seconds. |
| `onExpandedChange` | `(expanded: string[]) => void` |  | Called with the expanded group names when the user expands or collapses a group. |
| `onStop` | `(id: string) => void \| Promise<void>` |  | Stops a container (after confirmation). May return a promise; the dialog waits for it. |
