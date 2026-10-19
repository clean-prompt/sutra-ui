# AgentProcessCard

> One agent session: logo, title, status pill, "agent · project · running 48 min", memory and the processes it started.

- Import: `import { AgentProcessCard } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-processes` (kit `agent`)
- `data-slot`: `agent-process-card-skeleton`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `accent` | `Accent` | `"violet"` | Default violet. |
| `collapsible` | `boolean` | `false` | Lets the process list collapse behind the "Started · N" toggle. |
| `defaultExpanded` | `boolean` | `true` | Initial expanded state when `expanded` is not controlled. |
| `expanded` | `boolean` |  | Controlled expanded state of the process list (with `collapsible`). |
| `loading` | `boolean` |  | Waiting for data: with no `session` the whole card is a placeholder; with a session whose `processes` are not known yet the header is real and the process rows are placeholders (no Quit button). |
| `loadingRows` | `number` | `3` | Placeholder process rows while loading. Default 3. |
| `now` | `TimeInput` |  | Reference time for durations. Default: the clock, refreshed every 30 s. |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called with the new state when the user expands or collapses the process list. |
| `onOpen` | `(sessionId: string) => void` |  | Makes the title a button. |
| `onQuit` | `(sessionId: string) => void \| Promise<void>` |  | Called after the "Quit Session…" confirmation. May return a promise (the dialog waits). |
| `onStopProcess` | `(sessionId: string, process: AgentProcess) => void` |  | Adds a stop button to each process row. |
| `session` | `AgentProcessSession` |  | The session. May be left out while `loading` (the whole card is a placeholder). |
