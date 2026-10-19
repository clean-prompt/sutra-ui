# LogoCloud

> A grid or marquee row of company logos.

- Import: `import { LogoCloud } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/placeholder-logos` (assets)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | `2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8` | `6` | Grid columns (non-marquee). |
| `duration` | `number` | `30` | Seconds per full marquee loop. |
| `limit` | `number` | `6` | Number of placeholder logos when `logos` is not provided. |
| `logos` | `PlaceholderLogoEntry[]` |  | Logos to show. Defaults to the first `limit` placeholder logos. |
| `logoSize` | `PlaceholderLogoProps["size"]` | `"md"` | Size of each logo. |
| `marquee` | `boolean` | `false` | Scroll the logos in an infinite marquee row instead of a grid. |
| `muted` | `boolean` | `true` | Muted grayscale logos that brighten on hover. |
| `pausable` | `boolean` | `false` | Marquee mode: show a pause and play button beside the row (see `Marquee` `pausable`). |
| `pauseOnHover` | `boolean` | `true` | Pauses the marquee while the pointer is over it. |
| `reverse` | `boolean` | `false` | Runs the marquee in the opposite direction. |
| `title` | `React.ReactNode` |  | Optional caption above the logos, e.g. "Trusted by teams at". |

## Example (live: `#/components/assets/placeholder-logos` in the playground)

```tsx
import { LogoCloud, placeholderLogos } from "@sutra/ui/assets";

function PlaceholderLogosDemo() {
  return (
    <>
      <div className="space-y-3">
        {/* All logos */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-x-6 gap-y-6">
          {placeholderLogos.map(({ name, Logo }) => (
            <div key={name} className="flex items-center text-foreground">
              <Logo size="md" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {/* Sizes and mark only */}
        <div className="flex flex-wrap items-center gap-8 text-foreground">
          {placeholderLogos.slice(0, 3).map(({ name, Logo }, i) => (
            <Logo key={name} size={(["sm", "md", "lg"] as const)[i]} />
          ))}
          {placeholderLogos.slice(3, 8).map(({ name, Logo }) => (
            <Logo key={name} size="lg" markOnly />
          ))}
        </div>
      </div>

      <LogoCloud title="Trusted by teams at" limit={6} columns={6} />

      <LogoCloud title="Marquee" marquee logos={placeholderLogos} duration={40} />
      <LogoCloud marquee reverse logos={placeholderLogos.slice(4)} logoSize="sm" duration={30} />
    </>
  );
}
```
