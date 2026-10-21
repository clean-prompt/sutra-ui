# WorkspaceProfileSwitcher

> Two-level gateway → profile switcher with search, reachability and latency.

- Import: `import { WorkspaceProfileSwitcher } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/workspace-switcher` (kit `workspace`)
- `data-slot`: `workspace-profile-switcher`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `gateways` (required) | `WorkspaceGateway[]` |  | Gateways and their profiles; unreachable gateways are listed but cannot be picked unless `allowUnreachable` is set. |
| `allowUnreachable` | `boolean` | `false` | Allow picking profiles on unreachable gateways. Default false. |
| `className` | `string` |  | Extra classes for the trigger button. |
| `contentClassName` | `string` |  | Extra classes for the menu content. |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `defaultValue` | `WorkspaceSelection` |  | Initial selection when `value` is not controlled. |
| `disabled` | `boolean` |  | Disables the trigger. |
| `onManageConnections` | `() => void` |  | Called when the user presses Manage connections in the menu; the item is hidden when unset. |
| `onNewProfile` | `(gatewayId?: string) => void` |  | "New profile" action; receives the gateway of the current selection. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the menu opens or closes. |
| `onValueChange` | `(value: WorkspaceSelection, detail: { gateway: WorkspaceGateway; profile: WorkspaceProfile }) => void` |  | Called with the new selection and the chosen gateway and profile when the user picks a profile. |
| `open` | `boolean` |  | Controlled open state of the menu. |
| `searchPlaceholder` | `string` | `"Search gateways and profiles…"` | Placeholder of the search field. Default "Search gateways and profiles…". |
| `value` | `WorkspaceSelection` |  | Controlled selection: the gateway id and profile id. |
