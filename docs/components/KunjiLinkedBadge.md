# KunjiLinkedBadge

> Small badge: "kunji linked" or "kunji not linked".

- Import: `import { KunjiLinkedBadge } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/kunji`)
- Source: `packages/ui/src/kits/identity/kunji-link` (kit `identity`)
- `data-slot`: `kunji-linked-badge`
- Part of [`KunjiLink`](KunjiLink.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `linked` | `boolean` | `true` | Whether the account is linked to kunji; `false` shows the not-linked state. Default true. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Badge size. |
| `sub` | `string` |  | kunji `sub`, shortened in the tooltip. |

## Example (live: `#/components/kunji/kunji-link` in the playground)

```tsx
import { KunjiLink, KunjiLinkedBadge } from "@cleanprompt/sutra-ui/kunji";

<div className="@container w-full">
  <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
    <KunjiLink client={client} onLink={() => new Promise((r) => setTimeout(r, 600))} onUnlink={() => {}} />
    <KunjiLink client={client} defaultLinked sub="9f2c41d07be35a18c6e04f9d2b7a13c58e6f0d4a91b2c3d4" onUnlink={() => {}} />
  </div>
</div>
<div className="flex flex-wrap gap-2">
  <KunjiLinkedBadge sub="9f2c41d07be35a18c6e04f9d2b7a13c58e6f0d4a91b2c3d4" />
  <KunjiLinkedBadge linked={false} />
  <KunjiLinkedBadge size="sm" />
</div>
```
