# MarketplaceCard

> Marketplace entry card: banner, icon, name, author, description, stars, version, capabilities (+N), platforms, dates, tier.

- Import: `import { MarketplaceCard } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/marketing-blocks-card` (blocks)
- `data-slot`: `more-capabilities`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `extension` (required) | `MarketplaceExtension` |  | The extension to show: name, author, tier, description, capabilities, install count and dates. |
| `compact` | `boolean` |  | **Deprecated.** Use `density="compact"`. Legacy form of `density="compact"`. |
| `density` | `Density` |  | `compact` hides the dates row (shelves). Default "normal". |
| `maxCapabilities` | `number` | `3` | Capability chips shown before "+N". Default 3. |
| `onOpen` | `(extension: MarketplaceExtension) => void` |  | Called with the extension when the card is clicked; the card then becomes a button. |
