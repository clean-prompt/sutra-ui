# WebToolBody

> Web fetch / search body: favicon, domain, title and an optional excerpt.

- Import: `import { WebToolBody } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/tool-timeline-bodies` (kit `agent`)
- `data-slot`: `web-tool-body`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `url` (required) | `string` |  | Address that was fetched or searched. |
| `favicon` | `string` |  | Favicon image URL; a letter tile is used when unset. |
| `snippet` | `React.ReactNode` |  | Short excerpt or result summary. |
| `title` | `React.ReactNode` |  | Page title shown as the link text; the URL is used when unset. |
