# PermissionPreflightCard

> OS permission checklist (screen recording, accessibility, microphone…) with open-settings and re-check.

- Import: `import { PermissionPreflightCard } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/remote-screen` (kit `agent-admin`)
- `data-slot`: `permission-preflight-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `permissions` (required) | `OsPermission[]` |  | OS permissions to check, each with its granted state. |
| `description` | `React.ReactNode` | `"The agent needs these macOS permissions to see and control the screen."` | Helper text under the heading. |
| `onOpenSettings` | `(id: string) => void` |  | Opens the OS settings pane for a permission. |
| `onRecheck` | `() => void \| Promise<void>` |  | Re-queries permission state. The button spins until a returned promise settles. |
| `title` | `React.ReactNode` | `"Computer use permissions"` | Heading of the card. |

## Example (live: `#/components/channels/permission-preflight` in the playground)

```tsx
import * as React from "react";
import { PermissionPreflightCard } from "@sutra/ui/agent-admin";

function PreflightDemo() {
  const [perms, setPerms] = React.useState<OsPermission[]>([
    { id: "screen", label: "Screen recording", description: "See what's on screen.", state: "granted" },
    { id: "ax", label: "Accessibility", description: "Move the pointer and type.", state: "denied" },
    { id: "mic", label: "Microphone", description: "Voice commands.", state: "unknown", optional: true },
    { id: "cam", label: "Camera", state: "unknown", optional: true },
  ]);
  return (
    <PermissionPreflightCard
      className="w-full max-w-md"
      permissions={perms}
      onOpenSettings={(id) => setPerms((ps) => ps.map((p) => (p.id === id ? { ...p, state: "granted" } : p)))}
      onRecheck={async () => {
        await new Promise((r) => setTimeout(r, 800));
        setPerms((ps) => ps.map((p) => (p.state === "unknown" ? { ...p, state: "denied" } : p)));
      }}
    />
  );
}
```
