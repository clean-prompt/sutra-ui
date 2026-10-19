# WorkspaceSwitcher

> Workspace picker: current workspace with its app icon, a checked list and "Create workspace".

- Import: `import { WorkspaceSwitcher } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/dropdown-menu-blocks` (blocks)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `Align` | `"start"` | Alignment of the menu against the trigger. |
| `className` | `string` |  | Classes for the trigger. |
| `defaultValue` | `string` |  | Initially active workspace id when uncontrolled. |
| `onCreate` | `() => void` |  | Called when "Create workspace" is chosen. |
| `onValueChange` | `(id: string) => void` |  | Called with the workspace id the user picked. |
| `side` | `Side` | `"bottom"` | Side of the trigger the menu opens on. |
| `value` | `string` |  | Controlled id of the active workspace. Use with `onValueChange`. |
| `variant` | `"sidebar" \| "compact"` | `"sidebar"` | `sidebar` is a full-width row (collapses to an icon in an icon sidebar); `compact` is a small inline button. |
| `workspaces` | `Workspace[]` | `defaultWorkspaces` | Workspaces to choose from; each has an `id`, a `name` and optional plan and app. The default is demo data. |

## Example (live: `#/components/workspace/workspace-switcher` in the playground)

```tsx
import * as React from "react";
import { ProfileScopeBanner, WorkspaceProfileSwitcher } from "@sutra/ui/workspace";

function SwitcherDemo() {
  const [value, setValue] = React.useState<WorkspaceSelection>({ gatewayId: "homelab", profileId: "ops" });
  const [log, setLog] = React.useState("—");
  const gateway = gateways.find((g) => g.id === value.gatewayId)!;
  const profile = gateway.profiles.find((p) => p.id === value.profileId)!;
  const isDefault = value.gatewayId === defaultSelection.gatewayId && value.profileId === defaultSelection.profileId;
  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      {/* The nav anchor lives on this always-rendered wrapper: the banner itself is absent on the default profile. */}
      <div id="profile-scope-banner" className="scroll-mt-20 overflow-hidden rounded-box border border-border">
        {!isDefault ? (
          <ProfileScopeBanner
            profileName={profile.name}
            gatewayName={gateway.name}
            onSwitchBack={() => setValue(defaultSelection)}
          />
        ) : (
          <div className="border-b border-border bg-subtle px-4 py-2 text-sm text-muted-foreground">On your default profile: no banner.</div>
        )}
        <div className="flex flex-col gap-2 p-4">
          {/* Sidebar header */}
          <WorkspaceProfileSwitcher
            gateways={gateways}
            value={value}
            onValueChange={(v, d) => {
              setValue(v);
              setLog(`Switched to ${d.profile.name} on ${d.gateway.name}`);
            }}
            onManageConnections={() => setLog("Manage connections")}
            onNewProfile={(gw) => setLog(`New profile on ${gw ?? "?"}`)}
            className="max-w-72"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Last action: {log}</p>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): defaultSelection, gateways.
