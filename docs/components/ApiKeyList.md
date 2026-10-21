# ApiKeyList

> API keys table: masked key, scopes, expiry warnings, usage and a row menu (edit, rotate, revoke).

- Import: `import { ApiKeyList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/security`)
- Source: `packages/ui/src/kits/identity/api-keys` (kit `identity`)
- `data-slot`: `api-key-list`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `keys` (required) | `ApiKey[]` |  | API keys to list (name, prefix, scopes, created, last used, expiry); the secret is never part of a key. |
| `empty` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `emptyState` | `React.ReactNode` |  | Shown when there is nothing to list. Default "No API keys yet". |
| `expiringSoonDays` | `number` | `7` | Warn when a key expires within this many days. Default 7. |
| `maxScopes` | `number` | `2` | Scope chips shown before "+N more". Default 2. |
| `now` | `number` |  | Reference time (tests/SSR). |
| `onEdit` | `(key: ApiKey) => void` |  | Called with the key when the user presses Edit; the action is hidden when unset. |
| `onRevoke` | `(key: ApiKey) => void \| Promise<void>` |  | May return a promise; the confirm dialog waits for it. |
| `onRotate` | `(key: ApiKey) => void` |  | Called with the key when the user presses Rotate; the action is hidden when unset. |

## Example (live: `#/components/security/api-keys` in the playground)

```tsx
import * as React from "react";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiAddLine } from "@cleanprompt/sutra-ui/icons";
import { ApiKeyCreateDialog, ApiKeyList, ApiKeyUsage } from "@cleanprompt/sutra-ui/security";

function ApiKeysDemo() {
  const [keys, setKeys] = React.useState(initialKeys);
  const [log, setLog] = React.useState("");
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">API keys</p>
          <p className="text-xs text-muted-foreground">Bearer keys for /v1. Scoped keys cannot evict other models.</p>
        </div>
        <ApiKeyCreateDialog
          trigger={
            <Button size="sm" leadingIcon={<RiAddLine />}>
              New key
            </Button>
          }
          scopes={apiScopes}
          permissions={apiPermissions}
          fileName="sutra-gateway-key.txt"
          onCreate={async (input) => {
            await new Promise((r) => setTimeout(r, 500));
            const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
            const secret = `sk-live-${hex}`;
            setKeys((k) => [
              {
                id: hex.slice(0, 8),
                name: input.name,
                key: secret,
                scopes: input.scopes,
                createdAt: Date.now(),
                expiresAt: input.expiresInDays == null ? null : Date.now() + input.expiresInDays * DAY,
                usageCount: 0,
              },
              ...k,
            ]);
            return secret;
          }}
        />
      </div>
      <ApiKeyList
        keys={keys}
        onEdit={(k) => setLog(`Edit “${k.name}”`)}
        onRotate={(k) => setLog(`Rotated “${k.name}”`)}
        onRevoke={async (k) => {
          await new Promise((r) => setTimeout(r, 500));
          setKeys((all) => all.map((x) => (x.id === k.id ? { ...x, revoked: true } : x)));
          setLog(`Revoked “${k.name}”`);
        }}
      />
      {log && {/* {log} */}}
      <div className="grid grid-cols-1 gap-2">
        <p className="text-sm font-semibold">Usage · Production server (24h)</p>
        <ApiKeyUsage
          rows={[
            { label: "POST /v1/chat/completions", requests: 12_480, errors: 41, lastUsedAt: NOW - 4 * MIN },
            { label: "POST /v1/embeddings", requests: 6_210, errors: 2, lastUsedAt: NOW - 9 * MIN },
            { label: "GET /v1/models", requests: 830, lastUsedAt: NOW - HOUR },
            { label: "POST /v1/files", requests: 64, errors: 7, lastUsedAt: NOW - 5 * HOUR },
          ]}
        />
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): DAY, HOUR, MIN, NOW, apiPermissions, apiScopes, initialKeys.
