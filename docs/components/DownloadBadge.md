# DownloadBadge

> Weights cache state on `Badge`: downloading 42% (with bar), cached, partial, failed, not downloaded.

- Import: `import { DownloadBadge } from "@sutra/ui"` (or from `@sutra/ui/ops`)
- Source: `packages/ui/src/kits/ops/model-row` (kit `ops`)
- `data-slot`: `download-badge`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` (required) | `DownloadStatus` |  | Download state (`downloading`, `cached`, `partial`, `failed` or `missing`); sets the badge text, icon and tone. |
| `progress` | `number` |  | 0–100 for downloading / partial. |
| `size` | `string` |  | Size text, e.g. "54 GB". |
