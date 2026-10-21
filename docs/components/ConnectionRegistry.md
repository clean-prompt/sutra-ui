# ConnectionRegistry

> Saved remote gateways list with an editor, connection test, default and remove.

- Import: `import { ConnectionRegistry } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/workspace-switcher` (kit `workspace`)
- `data-slot`: `connection-registry`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `connections` | `SavedConnection[]` |  | Controlled list of saved connections. |
| `createId` | `() => string` | `() => `conn-${Date.now().toString(36)}-${++connectionSeq}`` | Id generator for new entries. |
| `defaultConnections` | `SavedConnection[]` | `[]` | Initial connections when `connections` is not controlled. |
| `onConnectionsChange` | `(connections: SavedConnection[]) => void` |  | Called with the full list after the user adds, edits, removes or defaults a connection. |
| `onRemove` | `(connection: SavedConnection) => void` |  | Called with the connection when the user removes it. |
| `onSave` | `(connection: SavedConnection, isNew: boolean) => void` |  | Called with the connection and whether it is new when the user saves the editor. |
| `onSetDefault` | `(connection: SavedConnection) => void` |  | Called with the connection when the user makes it the default. |
| `onTest` | `(connection: SavedConnection) => Promise<ConnectionTestResult> \| ConnectionTestResult` |  | Runs a connection check for the editor's current values. |

## Example (live: `#/components/workspace/connection-registry` in the playground)

```tsx
import { ConnectionRegistry } from "@sutra/ui/workspace";

<ConnectionRegistry defaultConnections={savedConnections} onTest={fakeTest} className="w-full max-w-2xl" />
```

Playground helpers in this snippet (not part of the library): fakeTest, savedConnections.
