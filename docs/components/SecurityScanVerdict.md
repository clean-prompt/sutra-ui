# SecurityScanVerdict

> Security scan result: verdict, policy, per-severity counts and findings with file:line.

- Import: `import { SecurityScanVerdict } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/extensions-catalog` (kit `agent-admin`)
- `data-slot`: `security-scan-verdict`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `verdict` (required) | `ScanVerdictLevel` |  | Overall scan result (`safe`, `caution` or `dangerous`); sets the headline and tone. |
| `findings` | `ScanFinding[]` | `[]` | Individual issues the scan found, listed under the verdict. |
| `policy` | `string` |  | Policy outcome, e.g. "Blocked by policy" or "Allowed". |
| `policyTone` | `"allow" \| "block" \| ToneInput` | `"allow"` | Colour of the policy badge: `allow` (success), `block` (destructive) or any `Tone`. `warn` is a deprecated alias of `warning`. |
| `scannedAt` | `string` |  | Preformatted scan time. |
| `scanner` | `string` |  | Name of the scanner that produced the verdict. |

## Example (live: `#/components/capabilities/security-scan` in the playground)

```tsx
import { SecurityScanVerdict } from "@sutra/ui/agent-admin";

<SecurityScanVerdict verdict="dangerous" policy="Blocked by policy" policyTone="block" findings={SCAN_FINDINGS} scanner="skill-guard 1.4" scannedAt="2 min ago" />
<div className="space-y-6">
  <SecurityScanVerdict verdict="caution" policy="Allowed with warning" policyTone="warning" findings={SCAN_FINDINGS.slice(3)} scanner="skill-guard 1.4" />
  <SecurityScanVerdict verdict="safe" policy="Allowed" findings={[]} scanner="skill-guard 1.4" />
</div>
```

Playground helpers in this snippet (not part of the library): SCAN_FINDINGS.
