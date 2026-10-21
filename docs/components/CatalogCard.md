# CatalogCard

> Plugin/skill catalog entry with tier, trust, capabilities, platforms, stars and install/update states.

- Import: `import { CatalogCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/extensions-catalog-card` (kit `agent-admin`)
- `data-slot`: `catalog-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Extension name, shown as the card title. |
| `author` | `string` |  | Publisher, shown as "by <author>" under the name. |
| `banner` | `string \| React.ReactNode` |  | Banner image URL or node. |
| `capabilities` | `string[]` | `[]` | Capability ids (mono chips), capped at `maxCapabilities`. |
| `description` | `React.ReactNode` |  | Short summary of what the extension does; clamped to two lines. |
| `docsUrl` | `string` |  | Link to the extension's documentation; shows a Docs link when set. |
| `icon` | `React.ReactNode` |  | Extension icon or logo, shown beside the name. |
| `latestVersion` | `string` |  | Newest available version; with `onUpdate` and `state="update-available"` it labels the Update button ("Update to v1.2"). |
| `maxCapabilities` | `number` | `4` | How many capability chips to show before collapsing the rest into a "+N" badge. |
| `onInstall` | `() => void \| Promise<void>` |  | Called when the user presses Install; may return a promise to keep the button busy until it settles. |
| `onOpen` | `() => void` |  | Called when the user presses Open; the button is hidden when unset. |
| `onUpdate` | `() => void` |  | Called when the user presses Update (shown when the entry has a newer version). |
| `platforms` | `string[]` | `[]` | Supported platforms (e.g. "macos", "linux"), shown as small chips. |
| `repoUrl` | `string` |  | Link to the source repository; shows a Repository link when set. |
| `stars` | `number` |  | Star count from the source repository; hidden when unset. |
| `state` | `CatalogEntryState` | `"available"` | Install state of this entry; drives the action button (Install, Installed, Update, Removed). |
| `tier` | `ExtensionTier` |  | `official` (first-party) or `community`; sets the tier badge. |
| `trust` | `CapabilityTrustLevel` |  | Trust level of the publisher or capability; shown as a trust badge. |
| `version` | `string` |  | Version of the catalog entry (without the leading `v`). |

## Example (live: `#/components/capabilities/catalog-cards` in the playground)

```tsx
import * as React from "react";
import { CatalogCard } from "@cleanprompt/sutra-ui/agent-admin";

function CatalogDemo() {
  const [plugins, setPlugins] = React.useState(CATALOG_PLUGINS);
  return (
    <div className="grid grid-cols-1 w-full gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {plugins.map((p) => (
        <CatalogCard
          key={p.name}
          name={p.name}
          author={p.author}
          description={p.description}
          icon={p.icon}
          tier={p.tier}
          trust={p.trust}
          version={p.version}
          latestVersion={p.latestVersion}
          capabilities={p.capabilities}
          maxCapabilities={3}
          platforms={p.platforms}
          stars={p.stars}
          state={p.state}
          docsUrl="https://example.com/docs"
          repoUrl="https://example.com/repo"
          banner={p.name === "Kanban Board" ? <div className="size-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-700" /> : undefined}
          onInstall={async () => {
            await wait(900);
            setPlugins((all) => all.map((x) => (x.name === p.name ? { ...x, state: "installed" } : x)));
          }}
          onUpdate={() => setPlugins((all) => all.map((x) => (x.name === p.name ? { ...x, state: "installed", version: x.latestVersion ?? x.version } : x)))}
          onOpen={() => {}}
        />
      ))}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): CATALOG_PLUGINS, wait.
