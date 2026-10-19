# DevServerList

> Running dev servers by project: ports, activity ("working", "idle 2 hours"), memory, and a banner to stop idle ones.

- Import: `import { DevServerList } from "@sutra/ui"` (or from `@sutra/ui/system`)
- Source: `packages/ui/src/kits/system/dev-servers` (kit `system`)
- `data-slot`: `dev-server-list`, `dev-server-idle-banner`, `dev-server-skeleton-row`, `dev-server-skeleton-port`, `dev-server-skeleton-pill`, `dev-server-empty`, `dev-server-row`, `dev-server-memory`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `projects` (required) | `DevServerProject[]` |  | Projects with their dev servers, each with a name, port, state, CPU and memory. |
| `accent` | `Accent` | `"orange"` | Categorical colour for icons and port badges. Default "orange". |
| `emptyState` | `React.ReactNode` |  | Shown when `projects` is empty. |
| `formatBytes` | `(bytes: number) => string` | `formatMemory` | Memory text. Default decimal units ("458 MB", "1.18 GB"). |
| `idleAfterMs` | `number` |  | A `running` server idle this long counts as idle. Default 30 minutes. |
| `label` | `string` | `"Dev servers"` | Accessible name of the list. Default "Dev servers". |
| `loading` | `boolean` | `false` | Data is on its way. With no projects yet the list shows placeholder rows; with projects the root is only marked busy. |
| `loadingRows` | `number` | `3` | Placeholder rows while loading. Default 3. |
| `now` | `TimeInput` |  | Reference time for idle and uptime text (pass it for deterministic output). Default: the live clock, refreshed every 30 seconds. |
| `onOpen` | `(id: string) => void` |  | Makes the project name a button. |
| `onStop` | `(id: string) => void \| Promise<void>` |  | Stops one server (after confirmation). May return a promise; the dialog waits for it. |
| `onStopIdle` | `(ids: string[]) => void \| Promise<void>` |  | Stops every idle server (after confirmation from the banner's "Stop All…"). |
| `showIdleBanner` | `boolean` | `true` | Show the "running but idle" banner when some servers are idle. Default true. |

## Example (live: `#/components/system/dev-servers` in the playground)

```tsx
import * as React from "react";
import { DevServerList } from "@sutra/ui/system";

function ProjectsDemo() {
  const [projects, setProjects] = React.useState(initialProjects);
  const stop = (ids: string[]) => setProjects((list) => list.filter((p) => !ids.includes(p.id)));
  return (
    <DevServerList
      className="w-full"
      projects={projects}
      now={NOW}
      onStop={(id) => stop([id])}
      onStopIdle={stop}
      emptyState="No dev servers running"
    />
  );
}
```

Playground helpers in this snippet (not part of the library): NOW, initialProjects.
