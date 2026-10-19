# ProvenancePill

> Where a capability came from: official, learned, hub, community, local or bundled.

- Import: `import { ProvenancePill } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/capabilities` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `provenance` (required) | `CapabilityProvenance` |  | Where the capability comes from (`official`, `learned`, `hub`, `community`, `local` or `bundled`); sets the pill text and icon. |
| `hideIcon` | `boolean` |  | Hide the icon. |
| `size` | `"sm" \| "md"` | `"sm"` | Badge size of the pill. |

## Example (live: `#/components/capabilities/provenance-trust` in the playground)

```tsx
import {
  CapabilityDetailHeader,
  ProvenancePill,
  ScopeChip,
  ScopeSelector,
  TrustBadge,
} from "@sutra/ui/agent-admin";
import { Button } from "@sutra/ui/core";
import { RiSearchLine } from "@sutra/ui/icons";

<div className="space-y-2">
  {/* Provenance */}
  <div className="flex flex-wrap gap-2">
    {PROVENANCES.map((p) => (
      <ProvenancePill key={p} provenance={p} />
    ))}
  </div>
</div>
<div className="space-y-2">
  {/* Trust (hover or focus for the explanation) */}
  <div className="flex flex-wrap gap-2">
    {TRUST.map((t) => (
      <TrustBadge key={t} level={t} showScale />
    ))}
  </div>
</div>
<div className="space-y-2">
  {/* Scope */}
  <div className="flex flex-wrap items-center gap-2">
    <ScopeChip />
    <ScopeChip profile="research" />
    <ScopeSelector profiles={["work", "home", "research"]} value={scopeProfile} onValueChange={setScopeProfile} />
  </div>
</div>
<CapabilityDetailHeader
  className="rounded-box border border-border p-4"
  icon={<RiSearchLine />}
  title="Web search"
  subtitle="toolset · web"
  description="Search and fetch pages with your preferred backend."
  provenance="bundled"
  trust="verified"
  actions={<Button size="sm" variant="outline">Configure</Button>}
/>
```

Playground helpers in this snippet (not part of the library): PROVENANCES, TRUST.
