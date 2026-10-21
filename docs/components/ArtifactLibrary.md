# ArtifactLibrary

> Searchable grid / list of artifacts with kind filter chips and sorting.

- Import: `import { ArtifactLibrary } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/artifacts-library` (kit `agent`)
- `data-slot`: `artifact-library`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `artifacts` (required) | `ArtifactData[]` |  | Artifacts to list, each with title, kind, dates and content. |
| `defaultKind` | `ArtifactKind \| "all"` | `"all"` | Initial kind filter when `kind` is not controlled. |
| `defaultLayout` | `ArtifactLibraryLayout` | `"grid"` | Initial layout when `layout` is not controlled. |
| `defaultQuery` | `string` | `""` | Initial search text when `query` is not controlled. |
| `defaultSort` | `ArtifactLibrarySort` | `"newest"` | Initial sort order when `sort` is not controlled. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no artifacts at all. |
| `kind` | `ArtifactKind \| "all"` |  | Kind filter; "all" shows everything. |
| `layout` | `ArtifactLibraryLayout` |  | Controlled layout: `grid` or `list`. |
| `now` | `number` |  | Reference time for relative dates (tests). |
| `onKindChange` | `(kind: ArtifactKind \| "all") => void` |  | Called with the kind (or `"all"`) when the user picks a filter. |
| `onLayoutChange` | `(layout: ArtifactLibraryLayout) => void` |  | Called with the layout when the user switches between grid and list. |
| `onOpenArtifact` | `(artifact: ArtifactData) => void` |  | Called with the artifact when the user opens one. |
| `onQueryChange` | `(query: string) => void` |  | Called with the search text on every change. |
| `onSortChange` | `(sort: ArtifactLibrarySort) => void` |  | Called with the sort order when the user changes it. |
| `query` | `string` |  | Controlled search text. |
| `sort` | `ArtifactLibrarySort` |  | Controlled sort order: `newest`, `oldest` or `title`. |

## Example (live: `#/components/browser-review/artifact-library` in the playground)

```tsx
import { ArtifactLibrary } from "@sutra/ui/agent";

<ArtifactLibrary artifacts={libraryItems} className="w-full" />
<ArtifactLibrary artifacts={[]} className="w-full" />
```

Playground helpers in this snippet (not part of the library): libraryItems.
