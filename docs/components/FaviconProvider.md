# FaviconProvider

> Opt in to remote favicons. Without a provider, Sutra makes no network requests and renders a local monogram tile instead.

- Import: `import { FaviconProvider } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/primitives/favicon` (primitives)
- Part of [`Favicon`](Favicon.md)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` (required) | `React.ReactNode` |  | The subtree whose `Favicon` components use this resolver. |
| `resolve` (required) | `FaviconResolver` |  | Maps a domain to an icon URL, or returns `undefined` to fall back to the monogram. |

## Notes

See the notes in [`Favicon`](Favicon.md#notes).

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
