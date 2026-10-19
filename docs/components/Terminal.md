# Terminal

> xterm.js terminal (lazy-loaded) themed from Sutra tokens, with fit-on-resize, connection overlay and fullscreen.

- Import: `import { Terminal } from "@sutra/ui/terminal"`
- Source: `packages/ui/src/kits/terminal/terminal` (kit `terminal`)
- Parts: [`TerminalSessionPicker`](TerminalSessionPicker.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `connection` | `TerminalConnection` | `"connected"` | Connection state; anything but "connected" shows an overlay. Default "connected". |
| `connectionMessage` | `React.ReactNode` |  | Error / disconnect detail shown in the overlay. |
| `cursorBlink` | `boolean` | `true` | Blinks the cursor. Default true. |
| `defaultFullscreen` | `boolean` | `false` | Initial fullscreen state when `fullscreen` is not controlled. |
| `fontFamily` | `string` | `'var(--font-mono), "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace'` | CSS font stack; defaults to the mono font of the theme. |
| `fontSize` | `number` | `13` | Font size in px. Default 13. |
| `fullscreen` | `boolean` |  | Controlled fullscreen state. |
| `fullscreenable` | `boolean` | `true` | Shows the fullscreen button in the header. Default true. |
| `height` | `number \| string` | `360` | Height of the terminal area (ignored in fullscreen). Default 360. |
| `hideHeader` | `boolean` |  | Hides the header bar with the title, connection state and toolbar. |
| `label` | `string` | `"Terminal"` | Accessible name. Default "Terminal". |
| `onData` | `(data: string) => void` |  | Keystrokes / pasted data from the user. |
| `onFullscreenChange` | `(fullscreen: boolean) => void` |  | Called with the new state when the user enters or leaves fullscreen. |
| `onReady` | `(handle: TerminalHandle) => void` |  | Called once with the imperative handle (write, clear, focus and so on) when the terminal has mounted. |
| `onReconnect` | `() => void` |  | Called when the user presses Reconnect in the disconnected or error overlay; the button is hidden when unset. |
| `onResize` | `(size: { cols: number; rows: number }) => void` |  | Called with the new columns and rows when the terminal is resized to fit its container. |
| `options` | `Record<string, unknown>` |  | Extra xterm constructor options. |
| `scrollback` | `number` | `5000` | Lines kept in the scrollback buffer. Default 5000. |
| `themeOverrides` | `TerminalTheme` |  | Colours that replace parts of the theme-derived terminal palette (background, foreground, cursor, ANSI colours). |
| `title` | `React.ReactNode` |  | Text in the header bar. |
| `toolbar` | `React.ReactNode` |  | Extra header controls. |

## Part props

### TerminalSessionPicker

tmux-style session list: name, windows, attached / active badges and "New session".

| Prop | Type | Default | Description |
|---|---|---|---|
| `sessions` (required) | `TerminalSession[]` |  | Terminal sessions to choose from, each with an id, title and state. |
| `creating` | `boolean` |  | Shows a busy state on the new-session button while a session is being created. |
| `defaultValue` | `string \| null` | `null` | Initially active session id when `value` is not controlled. |
| `emptyState` | `React.ReactNode` | `"No sessions"` | Shown when there are no sessions. Default "No sessions". |
| `label` | `string` | `"Terminal sessions"` | Accessible name of the session list. Default "Terminal sessions". |
| `loading` | `boolean` |  | Shows placeholder rows while the sessions load. |
| `onCreate` | `() => void` |  | Shows a "New session" button. |
| `onValueChange` | `(id: string) => void` |  | Called with the session id when the user picks a session. |
| `value` | `string \| null` |  | Selected (active) session id. |
