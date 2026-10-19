# ConnectorAccounts

> Multiple accounts per connector: inline alias rename, status, repair, folded retired accounts and add.

- Import: `import { ConnectorAccounts } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/mcp` (kit `agent-admin`)
- `data-slot`: `connector-accounts`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `accounts` (required) | `ConnectorAccount[]` |  | Accounts linked to the connector, each with alias, status and identity. |
| `connectorName` | `string` |  | Connector name used in the heading ("Slack accounts"); the heading reads "Accounts" when unset. |
| `onAdd` | `() => void` |  | Called when the user presses Add account; the button is hidden when unset. |
| `onRemove` | `(id: string) => void` |  | Called with the account id when the user presses Remove on a non-retired account. |
| `onRename` | `(id: string, alias: string) => void \| Promise<void>` |  | Rename an account. Throw to show an error. |
| `onRepair` | `(id: string) => void` |  | Called with the account id when the user presses Repair on an expired or errored account. |

## Example (live: `#/components/capabilities/connector-accounts` in the playground)

```tsx
import * as React from "react";
import { ConnectorAccounts } from "@sutra/ui/agent-admin";

function AccountsDemo() {
  const [accounts, setAccounts] = React.useState(ACCOUNTS);
  return (
    <ConnectorAccounts
      className="w-full max-w-xl"
      connectorName="Google"
      accounts={accounts}
      onRename={(id, alias) => setAccounts((all) => all.map((a) => (a.id === id ? { ...a, alias } : a)))}
      onRepair={(id) => setAccounts((all) => all.map((a) => (a.id === id ? { ...a, status: "connected", error: undefined } : a)))}
      onRemove={(id) => setAccounts((all) => all.map((a) => (a.id === id ? { ...a, status: "retired" } : a)))}
      onAdd={() =>
        setAccounts((all) => [...all, { id: `a${all.length + 1}`, alias: `Account ${all.length + 1}`, identity: "new@example.com", status: "connected", lastUsed: "just now" }])
      }
    />
  );
}
```

Playground helpers in this snippet (not part of the library): ACCOUNTS.
