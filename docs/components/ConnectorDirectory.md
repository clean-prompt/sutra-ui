# ConnectorDirectory

> Catalog of connectors: category picker and a grid of cards with ways and install/connect.

- Import: `import { ConnectorDirectory } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/mcp-connectors` (kit `agent-admin`)
- `data-slot`: `connector-directory`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `entries` (required) | `ConnectorCatalogEntry[]` |  | Connectors to list, each with name, description, category and install state. |
| `categories` | `string[]` |  | Category order; derived from entries when omitted. |
| `category` | `string \| null` |  | Controlled category filter; `null` shows every category. |
| `defaultCategory` | `string \| null` | `null` | Initial category filter when `category` is not controlled. |
| `onCategoryChange` | `(category: string \| null) => void` |  | Called with the category (or `null` for all) when the user picks a filter. |
| `onInstall` | `(entry: ConnectorCatalogEntry) => void \| Promise<void>` |  | Called when the user installs a connector that is not installed yet; may return a promise to keep the button busy. |
| `onManage` | `(entry: ConnectorCatalogEntry) => void` |  | Called when the user presses Manage on an installed connector. |
| `search` | `string` | `""` | Filter by name/description. |

## Example (live: `#/components/capabilities/connector-directory` in the playground)

```tsx
import * as React from "react";
import { ConnectorDirectory } from "@sutra/ui/agent-admin";

function DirectoryDemo() {
  const [entries, setEntries] = React.useState(CATALOG_CONNECTORS);
  return (
    <ConnectorDirectory
      className="w-full"
      entries={entries}
      onInstall={async (e) => {
        await wait(900);
        setEntries((all) => all.map((x) => (x.id === e.id ? { ...x, installed: true } : x)));
      }}
      onManage={() => {}}
    />
  );
}
```

Playground helpers in this snippet (not part of the library): CATALOG_CONNECTORS, wait.
