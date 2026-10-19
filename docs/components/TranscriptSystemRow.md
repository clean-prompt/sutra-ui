# TranscriptSystemRow

> System rows in a transcript: compaction, interruption, slash commands, errors, dividers and day changes.

- Import: `import { TranscriptSystemRow } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-transcript` (kit `agent`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `kind` (required) | `TranscriptSystemRowKind` |  | What the row announces: `compaction`, `compacting`, `interrupted`, `command`, `error`, `divider` or `date`. |
| `action` | `React.ReactNode` |  | divider: trailing action in the pill. |
| `args` | `string` |  | Command rows: arguments shown after the command name. |
| `command` | `string` |  | command: slash command name, e.g. "/review". |
| `date` | `TimeInput` |  | date: the day to show. |
| `defaultExpanded` | `boolean` | `false` | Compaction rows: whether the summary starts revealed. |
| `error` | `React.ReactNode` |  | error: details. |
| `icon` | `React.ReactNode` |  | Divider rows: icon before the text in the pill. |
| `now` | `number` |  | Date rows: reference time for "Today" and "Yesterday" labels; set it in tests and SSR. |
| `onRetry` | `() => void` |  | Error rows: called when the user presses Retry; the button is hidden when unset. |
| `result` | `React.ReactNode` |  | command: output shown under the command. |
| `retryLabel` | `string` | `"Retry"` | Error rows: label of the retry button. Default "Retry". |
| `summary` | `React.ReactNode` |  | compaction: the summary revealed by "Show summary". |
| `title` | `React.ReactNode` |  | Overrides the default label for the kind. |

## Example (live: `#/components/agent-sessions/transcript-system-rows` in the playground)

```tsx
import * as React from "react";
import { TranscriptSystemRow } from "@sutra/ui/agent";
import { RiGitMergeLine } from "@sutra/ui/icons";

function SystemRowsDemo() {
  const [retries, setRetries] = React.useState(0);
  return (
    <>
      <TranscriptSystemRow kind="date" />
      <TranscriptSystemRow kind="compaction" summary="Summary of the earlier conversation goes here." />
      <TranscriptSystemRow kind="compacting" />
      <TranscriptSystemRow kind="interrupted" />
      <TranscriptSystemRow kind="command" command="/review" args="src/billing" result="Reviewed 6 files: 2 suggestions, 0 blocking issues." />
      <TranscriptSystemRow
        kind="error"
        title="Request failed"
        error={`API error 529: overloaded${retries ? ` (retried ${retries}×)` : ""}`}
        onRetry={() => setRetries((r) => r + 1)}
      />
      <TranscriptSystemRow kind="divider" icon={<RiGitMergeLine aria-hidden />} title="Merged main into feat/dark-mode" />
    </>
  );
}
```
