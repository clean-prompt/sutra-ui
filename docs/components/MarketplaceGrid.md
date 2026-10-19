# MarketplaceGrid

> Filterable marketplace: tier/category pills with counts, sort pills, category sections with "View all", load more and empty state.

- Import: `import { MarketplaceGrid } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/marketing-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `MarketplaceExtension[]` |  | Extensions to list, before search and filters. |
| `defaultCategory` | `string` | `"all"` | Initially selected category filter when uncontrolled. |
| `defaultSort` | `MarketplaceSort` | `"popular"` | Initial sort order when uncontrolled. |
| `defaultTier` | `MarketplaceTier \| "all"` | `"all"` | Initially selected tier filter when uncontrolled. |
| `onClearQuery` | `() => void` |  | Called when the empty state's reset button is pressed (after filters reset). |
| `onOpen` | `(extension: MarketplaceExtension) => void` |  | Called with the extension when a card is opened. |
| `pageSize` | `number` | `9` | Cards per page in the flat grid. Default 9. |
| `query` | `string` | `""` | Search query (e.g. from MarketplaceHero). |
| `sectioned` | `boolean` | `true` | Group by category with "View all" when no category is selected. Default true. |
| `sectionLimit` | `number` | `3` | Cards per category section. Default 3. |
