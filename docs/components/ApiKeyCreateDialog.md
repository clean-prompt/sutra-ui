# ApiKeyCreateDialog

> Create-key dialog: name, scopes, expiry and permissions, then a show-once secret.

- Import: `import { ApiKeyCreateDialog } from "@sutra/ui"` (or from `@sutra/ui/security`)
- Source: `packages/ui/src/kits/identity/api-keys` (kit `identity`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onCreate` (required) | `(input: ApiKeyCreateInput) => string \| { secret: string } \| Promise<string \| { secret: string }>` |  | Create the key and return its secret (string or `{ secret }`). Throw to show an error. |
| `scopes` (required) | `ApiKeyOption[]` |  | Scopes the key can be limited to, each with an id and label. |
| `defaultExpiryIndex` | `number` | `1` | Default expiry index. Default 1 (30 days). |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `description` | `React.ReactNode` | `"Keys are shown once. Grant only the scopes this key needs."` | Helper text under the heading. |
| `expiryOptions` | `ApiKeyExpiryOption[]` | `defaultApiKeyExpiryOptions` | Expiry choices, each with a label and a number of days (or none); defaults to the built-in set. |
| `fileName` | `string` | `"api-key.txt"` | File name for the show-once download. |
| `onCreateDiscarded` | `(result: string \| { secret: string }, input: ApiKeyCreateInput) => void` |  | Called when `onCreate` resolves after the dialog was closed (or unmounted) mid-request. The key exists server-side but its secret was never shown, so apps should revoke it. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `open` | `boolean` |  | Controlled open state of the dialog. |
| `permissions` | `ApiKeyOption[]` | `[]` | Extra permission options shown after the scopes; the section is hidden when empty. |
| `title` | `React.ReactNode` | `"Create API key"` | Dialog heading. Default "Create API key". |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog when pressed. |

## Example (live: `#/components/security/api-keys` in the playground)

```tsx
import * as React from "react";
import { Button } from "@sutra/ui/core";
import { RiAddLine } from "@sutra/ui/icons";
import { ApiKeyCreateDialog, ApiKeyList, ApiKeyUsage } from "@sutra/ui/security";

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
