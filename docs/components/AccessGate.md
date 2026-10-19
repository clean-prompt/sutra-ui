# AccessGate

> Request-access flow for admin-approved apps: request → pending → approved (collect key) | denied.

- Import: `import { AccessGate } from "@sutra/ui"` (or from `@sutra/ui/kunji`)
- Source: `packages/ui/src/kits/identity/kunji-access-gate` (kit `identity`)
- `data-slot`: `access-gate`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `adapter` (required) | `AccessGateAdapter` |  | Functions that send, poll and cancel the access request against your backend. |
| `defaultRecord` | `AccessGateRecord` | `{ status: "none" }` | Initial record when `record` is not controlled. |
| `defaultScopes` | `string[]` | `[]` | Scope ids ticked initially. |
| `onCollected` | `() => void` |  | Called once the user has collected the approved access (for example after copying the credential). |
| `onRecordChange` | `(record: AccessGateRecord) => void` |  | Called with the record whenever the request changes state. |
| `otherWays` | `React.ReactNode` |  | Escape hatch shown under the form, e.g. "Sign in with kunji instead". |
| `pollInterval` | `number` | `5000` | Poll interval while pending. Default 5000ms. |
| `purposePlaceholder` | `string` | `"e.g. running the benchmark suite against the new model"` | Placeholder of the purpose field. |
| `record` | `AccessGateRecord` |  | Controlled access request record (status and details); drives which step is shown. |
| `resourceName` | `string` | `"access"` | What is being requested, e.g. "GPU access". |
| `scopes` | `AccessGateScopeOption[]` |  | Scopes the user can ask for in the form. |
| `signedInAs` | `React.ReactNode` |  | Who is signed in. |

## Example (live: `#/components/kunji/access-gate` in the playground)

```tsx
import { Button } from "@sutra/ui/core";
import { SegmentedControl } from "@sutra/ui/forms";
import { AccessGate } from "@sutra/ui/kunji";

<SegmentedControl
  className="max-w-full overflow-x-auto"
  size="sm"
  value={gateRecord.status}
  onValueChange={(v) => {
    setGateRecord(
      v === "approved"
        ? { status: "approved", keyName: "maya-gpu-01", grant: { resources: ["qwen3-8b"], ttlDays: 30, canEvict: false } }
        : v === "pending"
          ? { status: "pending", createdAt: Date.now() }
          : { status: v as AccessGateRecord["status"], decidedAt: Date.now(), keyName: "maya-gpu-00" }
    );
    setGateKey((k) => k + 1);
  }}
  options={["none", "pending", "approved", "denied", "delivered"].map((v) => ({ value: v, label: v }))}
/>
<AccessGate
  key={gateKey}
  adapter={gateAdapter}
  record={gateRecord}
  onRecordChange={setGateRecord}
  resourceName="GPU access"
  signedInAs="maya"
  scopes={[
    { value: "evict", label: "Displace other models", description: "Let my jobs unload someone else's idle model." },
    { value: "large", label: "70B-class models" },
  ]}
  otherWays={
    <span>
      Allow-listed? <Button variant="link" size="sm" className="h-auto p-0">Sign in with kunji instead</Button> for access straight away.
    </span>
  }
/>
```
