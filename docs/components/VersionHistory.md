# VersionHistory

> Version history: timeline grouped by day with contributors and named versions; click to see what changed in a version, Shift-click a second to compare the range, preview, rename and restore.

- Import: `import { VersionHistory } from "@sutra/ui"` (or from `@sutra/ui/editor`)
- Source: `packages/ui/src/kits/editor/version-history` (kit `editor`)
- `data-slot`: `version-history`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `versions` (required) | `DocumentVersion[]` |  | Newest first. |
| `defaultDiffMode` | `DiffMode` | `"inline"` | Initial diff layout when uncontrolled. Default "inline". |
| `defaultSelection` | `VersionSelection \| null` |  | Initial selection when `selection` is not controlled; defaults to the newest version. |
| `defaultTab` | `VersionHistoryTab` | `"all"` | Initial filter when `tab` is not controlled. |
| `diffMode` | `DiffMode` |  | Diff layout. Default "inline". |
| `now` | `Date \| number` |  | Reference time for day grouping. |
| `onDiffModeChange` | `(mode: DiffMode) => void` |  | Called with the diff layout (`inline` or `split`) when the user changes it. |
| `onRename` | `(version: DocumentVersion, label: string) => void` |  | Enables "Name this version" (empty string clears the name). |
| `onRestore` | `(version: DocumentVersion) => void \| Promise<void>` |  | Enables Restore (after a confirmation). |
| `onSelectionChange` | `(selection: VersionSelection) => void` |  | Called with the selected range when the user picks a version or extends the range. |
| `onTabChange` | `(tab: VersionHistoryTab) => void` |  | Called with the filter when the user switches tab. |
| `renderContent` | `(version: DocumentVersion) => React.ReactNode` |  | Custom preview of a single version (default: plain text). |
| `selection` | `VersionSelection \| null` |  | Controlled selected range: `from` is the older version id, `to` the newer; equal for one version. |
| `tab` | `VersionHistoryTab` |  | Controlled list filter: `all` or `named` versions. |
| `title` | `React.ReactNode` | `"Version history"` | Heading of the panel. Default "Version history". |

## Example (live: `#/components/editor/version-history` in the playground)

```tsx
import * as React from "react";
import { Markdown } from "@sutra/ui/ai";
import { VersionHistory } from "@sutra/ui/editor";

function VersionHistoryDemo() {
  const [versions, setVersions] = React.useState(makeVersions);
  const [restored, setRestored] = React.useState<string | null>(null);
  return (
    <div className="w-full space-y-2">
      <VersionHistory
        versions={versions}
        onRename={(v, label) => setVersions((all) => all.map((x) => (x.id === v.id ? { ...x, label: label || undefined } : x)))}
        onRestore={(v) => setRestored(new Date(v.createdAt).toLocaleString())}
        renderContent={(v) => <Markdown>{v.content ?? ""}</Markdown>}
        className="h-[520px]"
      />
      {restored && <p className="text-sm text-muted-foreground">Restored the version from {restored}.</p>}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): makeVersions.
