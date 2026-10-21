# ScopeMatrix

> Apps × scopes grant grid with a TTL per row and a "replace prior grant" option.

- Import: `import { ScopeMatrix } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/security`)
- Source: `packages/ui/src/kits/identity/consent` (kit `identity`)
- `data-slot`: `scope-matrix`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `apps` (required) | `ScopeMatrixApp[]` |  | Apps to list as rows, each with an id and name. |
| `scopes` (required) | `string[]` |  | Column scope ids. |
| `defaultReplacePrior` | `boolean` | `false` | Initial state of the option when `replacePrior` is not controlled. |
| `defaultTtl` | `Record<string, number>` |  | Initial lifetime in seconds per app id when `ttl` is not controlled. |
| `defaultValue` | `Record<string, string[]>` |  | Initial grants (scope ids per app id) when `value` is not controlled. |
| `definitions` | `Record<string, ScopeDefinition>` |  | Extra or overriding scope definitions (label, description, icon, risk), merged over the built-in set. |
| `held` | `Record<string, string[]>` | `{}` | Scopes each app already holds; pre-ticked and tagged. |
| `onReplacePriorChange` | `(replace: boolean) => void` |  | Called with the new state when the user flips the option. |
| `onTtlChange` | `(ttl: Record<string, number>) => void` |  | Called with the lifetime in seconds per app id when the user changes one. |
| `onValueChange` | `(value: Record<string, string[]>) => void` |  | Called with the grants (scope ids per app id) when the user ticks or clears a cell. |
| `replacePrior` | `boolean` |  | Controlled state of the "Replace prior grant" option. |
| `showReplacePrior` | `boolean` |  | Show the "Replace prior grant" option (defaults to on when any app holds scopes). |
| `ttl` | `Record<string, number>` |  | TTL seconds per app id. |
| `ttlOptions` | `ScopeMatrixTTLOption[]` | `defaultScopeTTLOptions` | Lifetimes offered per app, each with seconds and a label; defaults to the built-in set. |
| `value` | `Record<string, string[]>` |  | Granted scope ids per app id. |

## Example (live: `#/components/security/scope-matrix` in the playground)

```tsx
import * as React from "react";
import { ScopeMatrix } from "@cleanprompt/sutra-ui/security";

function ScopeMatrixDemo() {
  const [value, setValue] = React.useState<Record<string, string[]>>({
    notes: ["read:notes"],
    agent: ["read:calendar", "read:mail"],
    shop: [],
  });
  const [replace, setReplace] = React.useState(false);
  const [ttl, setTtl] = React.useState<Record<string, number>>({ notes: 604800, agent: 3600, shop: 86400 });
  return (
    <div className="flex w-full flex-col gap-3">
      <ScopeMatrix
        apps={[
          { id: "notes", name: "Notes Sync", domain: "notes.example" },
          { id: "agent", name: "Research agent", domain: "agent.local" },
          { id: "shop", name: "Acme Shop", domain: "shop.acme.com", available: ["login", "read:notes"] },
        ]}
        scopes={["login", "read:notes", "write:notes", "read:calendar", "read:mail", "offline_access"]}
        held={{ notes: ["read:notes"], agent: ["read:calendar"] }}
        value={value}
        onValueChange={setValue}
        ttl={ttl}
        onTtlChange={setTtl}
        replacePrior={replace}
        onReplacePriorChange={setReplace}
      />
      <pre className="overflow-x-auto rounded-md bg-subtle p-3 font-mono text-xs text-muted-foreground">
        {JSON.stringify({ grants: value, ttl, replacePrior: replace }, null, 0)}
      </pre>
    </div>
  );
}
```
