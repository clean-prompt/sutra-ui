# MediaPortalProvider

> Menus rendered by media controls portal into this element (needed while a player is fullscreen).

- Import: `import { MediaPortalProvider } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/media`)
- Source: `packages/ui/src/kits/media/media-controls-base` (kit `media`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `container` (required) | `HTMLElement \| null` |  | The element the media menus portal into (the player root, so they stay visible in fullscreen); `null` uses `document.body`. |
| `children` | `React.ReactNode` |  | The media controls that read the container. |
