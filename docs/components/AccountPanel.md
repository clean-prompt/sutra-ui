# AccountPanel

> Signed-in summary: avatar, name, role, app launch links, and sign out / sign out everywhere.

- Import: `import { AccountPanel } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/identity`)
- Source: `packages/ui/src/kits/identity/device-sessions` (kit `identity`)
- `data-slot`: `account-panel`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Account holder's name, shown as the heading and used for the avatar fallback. |
| `apps` | `AccountPanelApp[]` |  | Apps signed in on this account, listed in the panel. |
| `avatarSrc` | `string` |  | Avatar image URL; initials are shown when unset. |
| `handle` | `string` |  | Handle or email under the name. |
| `onSignOut` | `() => void \| Promise<void>` |  | Called when the user signs out of this session; the button is hidden when unset. |
| `onSignOutEverywhere` | `() => void \| Promise<void>` |  | Ends every session (with a confirm dialog). |
| `role` | `React.ReactNode` |  | Role badge, e.g. "Admin". |

## Example (live: `#/components/identity/account-panel` in the playground)

```tsx
import { SutraAppIcon } from "@cleanprompt/sutra-ui/assets";
import { AccountPanel } from "@cleanprompt/sutra-ui/identity";

<AccountPanel
  name="Vyom Shah"
  handle="vyom@sutra.app"
  role="Admin"
  apps={[
    { id: "notes", name: "Notes", href: "#", icon: <SutraAppIcon app="notes" size={22} /> },
    { id: "tasks", name: "Tasks", href: "#", icon: <SutraAppIcon app="tasks" size={22} /> },
    { id: "calendar", name: "Calendar", href: "#", icon: <SutraAppIcon app="calendar" size={22} /> },
    { id: "files", name: "Files", href: "#", icon: <SutraAppIcon app="files" size={22} /> },
  ]}
  onSignOut={() => new Promise((r) => setTimeout(r, 600))}
  onSignOutEverywhere={() => new Promise((r) => setTimeout(r, 600))}
/>
```
