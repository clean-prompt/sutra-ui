---
component: Favicon
module: primitives/favicon
covers: FaviconProvider
use: The small icon of a website: an explicit `src`, an icon your `FaviconProvider` resolves for the domain, or a local letter tile. By default it makes no network request.
instead: Monogram = a letter tile for an app or tool you name yourself; Avatar = a person; Item = a row that holds a logo, title and description
server: ssr-safe
---

## Keyboard
Not focusable: no keyboard interaction.

## Screen readers
Always decorative: the `img` has `alt=""` and the letter tile is `aria-hidden`. The site name must be visible text next to it (a link label, a source title); a favicon alone tells a screen reader nothing.

## Reduced motion
Static: no animation.

## Server rendering
The same markup on server and client for the same props: the letter tile, or an `img` when a `src` or resolver gives a URL. The tile letter and colour are pure functions of `domain`. An image that fails to load switches to the tile through its `onError` handler, which runs in the browser.

## Gotchas
- Without a `FaviconProvider` and without `src`, `Favicon` renders the local tile: no request leaves the page. `FaviconProvider resolve` opts in, and `googleFaviconResolver` sends every rendered domain to Google, so prefer your own resolver for private data. A resolver that returns `undefined` falls back to the tile.
- `src` wins over the provider. A failed `img` (`onError`) falls back to the tile and tries again when the URL changes.
- There is no default size: set it with `className` (`size-4`, `size-5`). `shape` is `circle` (default) or `square`.
- The tile letter is the first letter or digit of `domain` as given, so pass a bare host: `"www.example.com"` gives W. `domainOf(url)` returns a clean host to pass in.

## Example
```tsx
import { Favicon, FaviconProvider } from "@cleanprompt/sutra-ui";

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
