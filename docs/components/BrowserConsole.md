# BrowserConsole

> Collapsible page console with level toggles and a text filter.

- Import: `import { BrowserConsole } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-browser` (kit `agent`)
- `data-slot`: `browser-console`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `entries` (required) | `readonly BrowserConsoleEntry[]` |  | Console messages to list, each with a level, text and time. |
| `defaultFilter` | `string` | `""` | Initial text filter when `filter` is not controlled. |
| `defaultLevels` | `BrowserConsoleLevel[]` | `BROWSER_CONSOLE_LEVELS` | Initially visible levels when `levels` is not controlled. |
| `defaultOpen` | `boolean` | `false` | Initial expanded state when `open` is not controlled. |
| `filter` | `string` |  | Controlled text filter applied to the messages. |
| `levels` | `BrowserConsoleLevel[]` |  | Levels shown. Default all. |
| `maxHeight` | `number \| string` | `200` | Max height of the list (CSS length). Default 200. |
| `onClear` | `() => void` |  | Called when the user presses Clear; the button is hidden when unset. |
| `onFilterChange` | `(filter: string) => void` |  | Called with the filter text on every change. |
| `onLevelsChange` | `(levels: BrowserConsoleLevel[]) => void` |  | Called with the visible levels when the user toggles a level filter. |
| `onOpenChange` | `(open: boolean) => void` |  | Called with the new state when the user expands or collapses the console. |
| `open` | `boolean` |  | Controlled expanded state of the console. |

## Example (live: `#/components/browser-review/browser-console` in the playground)

```tsx
import { BrowserConsole } from "@sutra/ui/agent";

<div className="w-full overflow-hidden rounded-box border border-border">
  <BrowserConsole entries={initialConsole} defaultOpen />
</div>
```

Playground helpers in this snippet (not part of the library): initialConsole.
