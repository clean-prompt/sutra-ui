# InstalledExtensionCard

> Installed plugin row: source, version, runtime status, auth, enable / update (consent) / open / hide / remove, slots and setup.

- Import: `import { InstalledExtensionCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/extensions-catalog-installed` (kit `agent-admin`)
- `data-slot`: `installed-extension-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Extension name, shown as the card title. |
| `runtime` (required) | `ExtensionRuntimeStatus` |  | Runtime status of the extension (`running`, `disabled`, `error`, `restart-required`); sets the status pill. |
| `authRequired` | `boolean` |  | Shows an "Auth required" badge when the extension needs the user to sign in before it works. |
| `defaultEnabled` | `boolean` | `true` | Initial on/off state when `enabled` is not controlled. |
| `enabled` | `boolean` |  | Controlled on/off state of the enable switch. |
| `error` | `string` |  | Error detail shown when `runtime` is `error`. |
| `icon` | `React.ReactNode` |  | Extension icon or logo, shown beside the name. |
| `latestVersion` | `string` |  | Newest available version; an update is offered when it differs from `version` and `onUpdate` is set. |
| `onEnabledChange` | `(enabled: boolean) => void` |  | Called with the new state when the user flips the enable switch. |
| `onHide` | `() => void` |  | Called when the user hides the extension from the UI without uninstalling it; the button is hidden when unset. |
| `onOpen` | `() => void` |  | Called when the user opens the extension's page or settings; the button is hidden when unset. |
| `onRemove` | `() => void \| Promise<void>` |  | Called after the user confirms removal; may return a promise to keep the dialog busy until it settles. |
| `onUpdate` | `() => void \| Promise<void>` |  | Called after the user consents to the update. |
| `setupCommand` | `string` |  | Setup command shown in a copyable block. |
| `slots` | `string[]` |  | UI slots this extension contributes to (e.g. "sidebar.footer"). |
| `source` | `string` |  | "Catalog", a git URL or a local path. |
| `updateNotes` | `React.ReactNode` |  | Changelog or notes shown in the consent dialog. |
| `updatePermissions` | `string[]` |  | New permissions requested by the update. |
| `version` | `string` |  | Installed version (without the leading `v`). |

## Example (live: `#/components/capabilities/installed-extensions` in the playground)

```tsx
import * as React from "react";
import { InstalledExtensionCard } from "@cleanprompt/sutra-ui/agent-admin";
import { Button } from "@cleanprompt/sutra-ui/core";
import {
  RiCalendarLine,
  RiKanbanView,
  RiTerminalBoxLine,
  RiTimeLine,
} from "@cleanprompt/sutra-ui/icons";

function InstalledDemo() {
  const [hidden, setHidden] = React.useState<string[]>([]);
  const items = [
    {
      name: "Kanban Board",
      icon: <RiKanbanView />,
      source: "catalog · sutra/kanban",
      version: "0.4.0",
      latestVersion: "0.5.0",
      runtime: "running" as const,
      slots: ["sidebar.footer", "command.palette"],
      updatePermissions: ["net.fetch:api.trello.com"],
      updateNotes: "Adds Trello import and swimlanes. Fixes drag on touch screens.",
    },
    {
      name: "Calendar Sync",
      icon: <RiCalendarLine />,
      source: "catalog · sutra/calendar-sync",
      version: "1.2.0",
      runtime: "restart-required" as const,
      slots: ["settings.integrations"],
    },
    {
      name: "Terminal Recorder",
      icon: <RiTerminalBoxLine />,
      source: "https://github.com/devtools-collective/term-rec.git",
      version: "2.1.0",
      runtime: "error" as const,
      error: "ModuleNotFoundError: No module named 'asciinema'",
      authRequired: true,
      setupCommand: "sutra plugin setup term-rec --install-deps",
    },
    {
      name: "Pomodoro",
      icon: <RiTimeLine />,
      source: "~/plugins/pomodoro",
      version: "0.2.0",
      runtime: "disabled" as const,
      defaultEnabled: false,
    },
  ].filter((i) => !hidden.includes(i.name));
  return (
    <div className="grid grid-cols-1 w-full gap-3 lg:grid-cols-2">
      {items.map((i) => (
        <InstalledExtensionCard key={i.name} {...i} onUpdate={() => wait(900)} onOpen={() => {}} onHide={() => setHidden((h) => [...h, i.name])} onRemove={() => setHidden((h) => [...h, i.name])} />
      ))}
      {hidden.length > 0 && (
        <Button variant="link" size="sm" onClick={() => setHidden([])}>
          Show {hidden.length} hidden
        </Button>
      )}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): wait.
