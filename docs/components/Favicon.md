# Favicon

> Site icon for a domain: explicit `src`, provider-resolved URL, or a local monogram.

- Import: `import { Favicon } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/primitives/favicon` (primitives)
- Parts: [`FaviconProvider`](FaviconProvider.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `domain` (required) | `string` |  | Domain of the site, e.g. "github.com"; it feeds the resolver and the monogram fallback. |
| `shape` | `"circle" \| "square"` | `"circle"` | Outline of the icon. |
| `src` | `string` |  | Explicit icon URL; overrides the provider. |

## Part props

### FaviconProvider

Opt in to remote favicons. Without a provider, Sutra makes no network requests and renders a local monogram tile instead.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` (required) | `React.ReactNode` |  | The subtree whose `Favicon` components use this resolver. |
| `resolve` (required) | `FaviconResolver` |  | Maps a domain to an icon URL, or returns `undefined` to fall back to the monogram. |

## Notes

**When to use:** The small icon of a website: an explicit `src`, an icon your `FaviconProvider` resolves for the domain, or a local letter tile. By default it makes no network request.

**Use instead when:**
- `Monogram`: a letter tile for an app or tool you name yourself
- `Avatar`: a person
- `Item`: a row that holds a logo, title and description

### Keyboard

Not focusable: no keyboard interaction.

### Screen readers

Always decorative: the `img` has `alt=""` and the letter tile is `aria-hidden`. The site name must be visible text next to it (a link label, a source title); a favicon alone tells a screen reader nothing.

### Reduced motion

Static: no animation.

### Server rendering

Server render: same markup as the client. The same markup on server and client for the same props: the letter tile, or an `img` when a `src` or resolver gives a URL. The tile letter and colour are pure functions of `domain`. An image that fails to load switches to the tile through its `onError` handler, which runs in the browser.

### Gotchas

- Without a `FaviconProvider` and without `src`, `Favicon` renders the local tile: no request leaves the page. `FaviconProvider resolve` opts in, and `googleFaviconResolver` sends every rendered domain to Google, so prefer your own resolver for private data. A resolver that returns `undefined` falls back to the tile.
- `src` wins over the provider. A failed `img` (`onError`) falls back to the tile and tries again when the URL changes.
- There is no default size: set it with `className` (`size-4`, `size-5`). `shape` is `circle` (default) or `square`.
- The tile letter is the first letter or digit of `domain` as given, so pass a bare host: `"www.example.com"` gives W. `domainOf(url)` returns a clean host to pass in.

## Example

```tsx
import { Favicon, FaviconProvider } from "@sutra/ui";

const sources = ["github.com", "vercel.com", "news.ycombinator.com"];

export function Example() {
  return (
    <FaviconProvider resolve={(domain) => `/favicons/${domain}.png`}>
      <ul className="flex flex-col gap-2 text-sm">
        {sources.map((domain) => (
          <li key={domain} className="flex items-center gap-2">
            <Favicon domain={domain} className="size-4" />
            {domain}
          </li>
        ))}
      </ul>
    </FaviconProvider>
  );
}
```
