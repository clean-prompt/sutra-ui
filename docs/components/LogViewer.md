# LogViewer

- Import: `import { LogViewer } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ops`)
- Source: `packages/ui/src/patterns/log-viewer` (patterns)
- `data-slot`: `log-viewer`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `aria-label` | `string` | `"Logs"` | Defines a string value that labels the current element. |
| `defaultFilter` | `string` | `""` | Initial search text when uncontrolled. |
| `defaultLevels` | `LogLevel[]` | `all levels` | Initially shown levels when uncontrolled. |
| `defaultPaused` | `boolean` | `false` | Initial pause state when uncontrolled. |
| `defaultRegex` | `boolean` | `false` | Initially treat the search text as a regular expression. |
| `defaultShowLineNumbers` | `boolean` | `false` | Initial line-number visibility when uncontrolled. |
| `defaultShowTimestamps` | `boolean` | `true` | Initial timestamp visibility when uncontrolled. |
| `defaultSource` | `string` |  | Initially selected source when uncontrolled. |
| `defaultWrap` | `boolean` | `false` | Initial wrapping when uncontrolled. |
| `downloadName` | `string` | `"logs.log"` | File name for "Download". Default `logs.log`. |
| `emptyMessage` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Legacy name of `emptyState`. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no lines (and no filter/connection message applies). Default "No log lines yet". |
| `entries` | `readonly LogLine[]` |  | Alias of `lines`. |
| `filter` | `string` |  | Controlled search text. Use with `onFilterChange`. |
| `filterBySource` | `boolean` | `false` | Also hide entries whose `source` differs from the selected one (client-side). Default false. |
| `height` | `number \| string` | `360` | Height of the scrolling area. Default 360. |
| `hideToolbar` | `boolean` |  | Hide the toolbar (search, level filters, actions). |
| `levels` | `LogLevel[]` |  | Levels currently shown. Default all. |
| `lines` | `readonly LogLine[]` |  | Log lines: raw strings (ANSI allowed) or structured entries. Append to the same array or pass a new one. |
| `maxLines` | `number` | `10_000` | Ring-buffer cap on retained lines. Default 10 000. |
| `onFilterChange` | `(value: string) => void` |  | Called with the search text as it changes. |
| `onLevelsChange` | `(levels: LogLevel[]) => void` |  | Called with the shown levels when a level filter is toggled. |
| `onPausedChange` | `(value: boolean) => void` |  | Called when the user pauses or resumes. |
| `onReconnect` | `() => void` |  | Called by the "Reconnect" button shown while disconnected. |
| `onRegexChange` | `(value: boolean) => void` |  | Called when the regex toggle changes. |
| `onShowLineNumbersChange` | `(value: boolean) => void` |  | Called when the line-number toggle changes. |
| `onShowTimestampsChange` | `(value: boolean) => void` |  | Called when the timestamp toggle changes. |
| `onSourceChange` | `(source: string) => void` |  | Called with the source the user picked. |
| `onWrapChange` | `(value: boolean) => void` |  | Called when the wrap toggle changes. |
| `paused` | `boolean` |  | Controlled pause state: while paused the view freezes and new lines are counted. Use with `onPausedChange`. |
| `regex` | `boolean` |  | Treat the filter as a regular expression. |
| `rowHeight` | `number` | `20` | Row height in px used for virtualization. Default 20. |
| `showLineNumbers` | `boolean` |  | Controlled visibility of the line-number column. Use with `onShowLineNumbersChange`. |
| `showTimestamps` | `boolean` |  | Controlled visibility of the timestamp column. Use with `onShowTimestampsChange`. |
| `source` | `string` |  | Controlled selected source. Use with `onSourceChange`. |
| `sources` | `(string \| LogSourceOption)[]` |  | Source picker options (e.g. services or models). The picker reports changes via `onSourceChange`. |
| `status` | `LogViewerStatus` |  | Connection state, drives the empty state and a status chip. |
| `toolbarExtra` | `React.ReactNode` |  | Extra toolbar content, rendered before the action buttons. |
| `virtualizeThreshold` | `number` | `200` | Virtualize when more than this many lines are shown and wrapping is off. Default 200. |
| `wrap` | `boolean` |  | Controlled line wrapping (off keeps one line per entry and enables virtualization). Use with `onWrapChange`. |

## Example (live: `#/components/ops/log-viewer-large` in the playground)

```tsx
import * as React from "react";
import { LogViewer } from "@cleanprompt/sutra-ui/ops";

function BigLogDemo() {
  const lines = React.useMemo(
    () =>
      Array.from({ length: 20_000 }, (_, i) =>
        i % 97 === 0 ? `ERROR batch ${i} failed checksum` : i % 13 === 0 ? `WARN batch ${i} retried` : `INFO batch ${i} ok`
      ),
    []
  );
  return <LogViewer lines={lines} height={240} defaultShowLineNumbers maxLines={20_000} />;
}
```
