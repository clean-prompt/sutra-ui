# ProviderKeysGroups

> Environment keys grouped into provider cards (sorted by priority) plus a custom keys section.

- Import: `import { ProviderKeysGroups } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/llm-providers-keys` (kit `agent-admin`)
- `data-slot`: `provider-keys-groups`, `provider-key-group`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `groups` (required) | `ProviderKeyGroup[]` |  | Provider groups, each with the environment keys it needs and whether they are set. |
| `customKeys` | `ProviderEnvKey[]` | `[]` | User-added environment keys listed in the custom section. |
| `hideCustom` | `boolean` |  | Hide the custom keys section. |
| `onAddCustomKey` | `(name: string, value: string) => void` |  | Called with the name and value when the user adds a custom key. |
| `onClearKey` | `(name: string) => void` |  | Called with the key name when the user clears a stored key. |
| `onSetKey` | `(name: string, value: string) => void \| Promise<void>` |  | Store a key. May return a promise; a rejection is shown under the input. |

## Example (live: `#/components/providers/provider-keys` in the playground)

```tsx
import * as React from "react";
import { ProviderKeysGroups } from "@sutra/ui/agent-admin";

function KeysDemo() {
  const [groups, setGroups] = React.useState(keyGroups);
  const [custom, setCustom] = React.useState<ProviderEnvKey[]>([{ name: "HTTPS_PROXY", value: "http://proxy.internal:3128" }]);
  const setKey = (name: string, value: string | undefined) => {
    setGroups((gs) => gs.map((g) => ({ ...g, keys: g.keys.map((k) => (k.name === name ? { ...k, value } : k)) })));
    setCustom((cs) => (value === undefined ? cs.filter((c) => c.name !== name) : cs.map((c) => (c.name === name ? { ...c, value } : c))));
  };
  return (
    <ProviderKeysGroups
      className="max-w-3xl"
      groups={groups}
      customKeys={custom}
      onSetKey={setKey}
      onClearKey={(name) => setKey(name, undefined)}
      onAddCustomKey={(name, value) => setCustom((cs) => [...cs.filter((c) => c.name !== name), { name, value }])}
    />
  );
}
```

Playground helpers in this snippet (not part of the library): keyGroups.
