# ConnectedAppList

> Connected apps and agents with a detail drawer (scopes, holder key, push per device, activity) and revoke.

- Import: `import { ConnectedAppList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/security`)
- Source: `packages/ui/src/kits/identity/connected-apps` (kit `identity`)
- `data-slot`: `connected-app-list`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `apps` (required) | `ConnectedApp[]` |  | Connected apps, one row each; pressing a row opens its detail with scopes and devices. |
| `definitions` | `Record<string, ScopeDefinition>` |  | Extra or overriding scope definitions, merged over the built-in set, for the scope labels in the detail. |
| `empty` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no apps. Default "No connected apps". |
| `now` | `number` |  | Reference time for relative labels; set it in tests and SSR for stable output. |
| `onPushChange` | `(app: ConnectedApp, deviceId: string, enabled: boolean) => void` |  | Called with the app, the device id and the new state when the user flips a device's push switch. |
| `onRevoke` | `(app: ConnectedApp) => void \| Promise<void>` |  | May return a promise; the confirm dialog waits for it. |

## Example (live: `#/components/security/connected-apps` in the playground)

```tsx
import * as React from "react";
import { Button } from "@cleanprompt/sutra-ui/core";
import { ConnectedAppList } from "@cleanprompt/sutra-ui/security";

function ConnectedAppsDemo() {
  const [apps, setApps] = React.useState(initialApps);
  return (
    <div className="w-full max-w-lg">
      <ConnectedAppList
        apps={apps}
        onRevoke={async (app) => {
          await new Promise((r) => setTimeout(r, 400));
          setApps((all) => all.filter((a) => a.id !== app.id));
        }}
        onPushChange={(app, deviceId, enabled) =>
          setApps((all) =>
            all.map((a) => (a.id === app.id ? { ...a, devices: a.devices?.map((d) => (d.id === deviceId ? { ...d, push: enabled } : d)) } : a))
          )
        }
        empty="Nothing connected. Revoked apps lose access immediately."
      />
      {apps.length < initialApps.length && (
        <Button variant="ghost" size="xs" onClick={() => setApps(initialApps)}>
          Restore demo apps
        </Button>
      )}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): initialApps.
