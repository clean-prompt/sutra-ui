# AuthorShelf

> Author header with a horizontally scrolling shelf of their extensions.

- Import: `import { AuthorShelf } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/marketing-blocks-card` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `author` (required) | `MarketplaceAuthor` |  | The author shown in the shelf header (name, avatar, handle). |
| `items` (required) | `MarketplaceExtension[]` |  | The author's extensions, shown as cards. |
| `onOpen` | `(extension: MarketplaceExtension) => void` |  | Called with the extension when a card is opened. |
| `onViewAll` | `() => void` |  | Called when "View all" is clicked; setting it shows the link. |
| `title` | `React.ReactNode` |  | Shelf heading; defaults to the author's name. |

## Example (live: `#/components/billing-marketing/author-shelf` in the playground)

```tsx
import { AuthorShelf } from "@sutra/ui/blocks";

<AuthorShelf author={sutraAuthor} items={extensions.filter((e) => e.author.handle === sutraAuthor.handle)} onOpen={open} onViewAll={() => {}} />
```
