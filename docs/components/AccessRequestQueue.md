# AccessRequestQueue

> Pending pairing requests with approve / deny, plus approved users with confirm-to-revoke.

- Import: `import { AccessRequestQueue } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/channels` (kit `agent-admin`)
- `data-slot`: `access-request-queue`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `requests` (required) | `AccessRequest[]` |  | Pending pairing requests awaiting approval or denial. |
| `approved` | `ApprovedChannelUser[]` | `[]` | Users already approved; listed with a confirm-to-revoke action. |
| `emptyHint` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Text shown when there are no pending requests. |
| `emptyState` | `React.ReactNode` |  | Text shown when there are no pending requests; defaults to a hint about pairing codes. |
| `now` | `number` |  | Reference time for relative stamps (tests / SSR). |
| `onApprove` | `(id: string) => void \| Promise<void>` |  | Called with the request id when the user approves it; may return a promise. |
| `onDeny` | `(id: string) => void \| Promise<void>` |  | Called with the request id when the user denies it; may return a promise. |
| `onRevoke` | `(id: string) => void \| Promise<void>` |  | Called with the approved user's id after the user confirms revoking access; may return a promise. |

## Example (live: `#/components/channels/access-requests` in the playground)

```tsx
import * as React from "react";
import { AccessRequestQueue } from "@sutra/ui/agent-admin";

function AccessQueueDemo() {
  const [requests, setRequests] = React.useState<AccessRequest[]>(() => [
    { id: "r1", handle: "@ada_l", name: "Ada Lovelace", platform: "telegram", code: "K7Q2PX", requestedAt: Date.now() - 2 * MIN },
    { id: "r2", handle: "+44 7700 900123", platform: "whatsapp", code: "M4ZT9C", requestedAt: Date.now() - 18 * MIN },
    { id: "r3", handle: "grace#0001", name: "Grace Hopper", platform: "discord", code: "B2R8WN", requestedAt: Date.now() - 3 * 60 * MIN },
  ]);
  const [approved, setApproved] = React.useState<ApprovedChannelUser[]>(() => [
    { id: "u1", handle: "@vyom", name: "Vyom", platform: "telegram", approvedAt: Date.now() - 2 * 24 * 60 * MIN },
  ]);
  return (
    <AccessRequestQueue
      className="w-full max-w-xl"
      requests={requests}
      approved={approved}
      onApprove={(id) => {
        const r = requests.find((x) => x.id === id);
        setRequests((rs) => rs.filter((x) => x.id !== id));
        if (r) setApproved((a) => [...a, { id: r.id, handle: r.handle, name: r.name, platform: r.platform, approvedAt: Date.now() }]);
      }}
      onDeny={(id) => setRequests((rs) => rs.filter((x) => x.id !== id))}
      onRevoke={(id) => setApproved((a) => a.filter((x) => x.id !== id))}
    />
  );
}
```

Playground helpers in this snippet (not part of the library): MIN.
