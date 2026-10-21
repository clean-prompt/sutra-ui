# KunjiLink

> Link a kunji wallet to the signed-in account: scan, confirm with the server, then "Linked ✓".

- Import: `import { KunjiLink } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/kunji`)
- Source: `packages/ui/src/kits/identity/kunji-link` (kit `identity`)
- `data-slot`: `kunji-link`
- Parts: [`KunjiLinkedBadge`](KunjiLinkedBadge.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `client` (required) | `KunjiClient` |  | Kunji client that creates the session and polls for approval. |
| `defaultLinked` | `boolean` | `false` | Initial linked state when `linked` is not controlled. |
| `description` | `React.ReactNode` |  | Helper text under the heading. |
| `linked` | `boolean` |  | Controlled linked state. |
| `onLink` | `(result: KunjiPollResult) => unknown` |  | Confirm the approved scan with the server. Throw to show an error. |
| `onLinkedChange` | `(linked: boolean) => void` |  | Called with the new state after a link or unlink succeeds. |
| `onUnlink` | `() => unknown` |  | Remove the link. Hidden when omitted. |
| `sub` | `string` |  | Linked identity (`sub`). |
| `title` | `React.ReactNode` | `"kunji sign-in"` | Heading of the card. Default "kunji sign-in". |

## Part props

### KunjiLinkedBadge

Small badge: "kunji linked" or "kunji not linked".

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
