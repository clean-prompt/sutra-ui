# ToolsetProviderDrawer

> Side sheet to configure a toolset: on/off, backend provider, credentials and a post-setup install step.

- Import: `import { ToolsetProviderDrawer } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/tool-toggles` (kit `agent-admin`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `providers` (required) | `ToolsetProvider[]` |  | Backends that can power the toolset, each with its credential fields and setup state. |
| `title` (required) | `string` |  | Drawer heading, usually the toolset name. |
| `className` | `string` |  | Extra classes for the drawer content. |
| `defaultEnabled` | `boolean` | `true` | Initial on/off state when `enabled` is not controlled. |
| `defaultOpen` | `boolean` |  | Initial open state when `open` is not controlled. |
| `defaultProvider` | `string` |  | Initially selected provider id when `provider` is not controlled. |
| `description` | `React.ReactNode` |  | Helper text under the heading. |
| `enabled` | `boolean` |  | Controlled on/off state of the toolset switch in the drawer header. |
| `installLabel` | `React.ReactNode` | `"Run setup"` | Label of the install button. Default "Run setup". |
| `installLog` | `readonly LogLine[]` |  | Installer output lines shown while and after the install step runs. |
| `installStatus` | `ToolsetInstallStatus` | `"idle"` | Progress of the install step: `idle`, `running`, `success` or `error`. |
| `onClearCredential` | `(providerId: string, key: string) => void` |  | Called with the provider id and credential key when the user clears a stored credential. |
| `onEnabledChange` | `(enabled: boolean) => void` |  | Called with the new state when the user flips the switch. |
| `onInstall` | `() => void` |  | Post-setup install step (e.g. pip install). Omit to hide. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the drawer opens or closes. |
| `onProviderChange` | `(id: string) => void` |  | Called with the provider id when the user selects another provider. |
| `onSaveCredential` | `(providerId: string, key: string, value: string) => void \| Promise<void>` |  | Store a credential. May return a promise. |
| `open` | `boolean` |  | Controlled open state of the drawer. |
| `provider` | `string` |  | Controlled id of the selected provider. |

## Example (live: `#/components/capabilities/toolset-provider-drawer` in the playground)

```tsx
<ProviderDrawerDemo />
<ProviderDrawerDemo fail />
```

Playground helpers in this snippet (not part of the library): ProviderDrawerDemo.
