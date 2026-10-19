# CountryFlag

> A small, recognizable country flag drawn in inline SVG, with an emoji fallback.

- Import: `import { CountryFlag } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/country-flags` (assets)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `code` (required) | `CountryFlagCode \| (string & {})` |  | ISO 3166-1 alpha-2 country code (case-insensitive). |
| `label` | `string` |  | Accessible label; defaults to the country name. Pass `""` to hide from assistive tech. |
| `shape` | `"rect" \| "square" \| "circle"` | `"rect"` | `rect` is 4:3, `square` 1:1, `circle` a round badge. |
| `size` | `CountryFlagSize \| number` | `"md"` | Size token or height in pixels. |

## Example (live: `#/components/assets/country-flags` in the playground)

```tsx
import { CountryFlag, countries } from "@sutra/ui/assets";

function CountryFlagsDemo() {
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-x-6 gap-y-3">
        {countries.map((country) => (
          <div key={country.code} className="flex min-w-0 items-center gap-2.5">
            <CountryFlag code={country.code} size="md" />
            <span className="truncate text-sm text-foreground">{country.name}</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{country.code}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {/* Shapes and sizes */}
        <div className="flex flex-wrap items-center gap-4">
          {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
            <CountryFlag key={size} code="KR" size={size} />
          ))}
          <span className="mx-2 h-6 w-px bg-border" />
          {(["US", "JP", "BR", "IN", "DE"] as const).map((code) => (
            <CountryFlag key={code} code={code} shape="circle" size="xl" />
          ))}
          {(["SE", "CH", "CA"] as const).map((code) => (
            <CountryFlag key={code} code={code} shape="square" size="xl" />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {/* Emoji fallback for unlisted codes */}
        <div className="flex flex-wrap items-center gap-3">
          {["GR", "KE", "CL", "IS"].map((code) => (
            <CountryFlag key={code} code={code} size="lg" />
          ))}
        </div>
      </div>
    </>
  );
}
```
