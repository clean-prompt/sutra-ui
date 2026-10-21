# MarketplaceHero

> Marketplace / docs hero: title, subtitle, meta stats row and a search field on a mesh-gradient glow.

- Import: `import { MarketplaceHero } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/marketing-blocks-hero` (blocks)
- `data-slot`: `hero-stats`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` |  | Extra content under the search (popular tags, CTAs). |
| `defaultQuery` | `string` | `""` | Initial search text when uncontrolled. |
| `eyebrow` | `React.ReactNode` | `"Extensions"` | Small label above the title. |
| `onQueryChange` | `(query: string) => void` |  | Called with the search text as it changes. |
| `query` | `string` |  | Controlled search text. Use with `onQueryChange`. |
| `searchPlaceholder` | `string` | `"Search plugins, tools, authors…"` | Placeholder of the search field. |
| `stats` | `MarketplaceHeroStat[]` | `[ { value: "678", label: "plugins" }, { value: "120", label: "authors" }, { value: "1.2M", label: "installs" }, ]` | Counters under the search (e.g. plugins, authors); each has a `label` and a `value`. |
| `subtitle` | `React.ReactNode` | `"Tools, hooks and integrations built by the Sutra team and the community. Install in one command."` | Supporting text under the headline. |
| `title` | `React.ReactNode` | `"Extend Sutra with plugins"` | Hero headline. |

## Example (live: `#/components/billing-marketing/marketplace` in the playground)

```tsx
<MarketplaceDemo onOpen={open} />
```

Playground helpers in this snippet (not part of the library): MarketplaceDemo.
