# FeaturedIcon

> An icon presented in a tinted tile, with soft, solid, ring-halo and glass styles.

- Import: `import { FeaturedIcon } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/icons` (assets)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `FeaturedIconColor \| null` | `"brand"` | **Deprecated.** Use `tone`. Legacy name of `tone`. |
| `icon` | `IconComponent` |  | Icon component to render inside the tile. Alternatively pass the icon as children. |
| `label` | `string` |  | Accessible label; decorative when omitted. |
| `shape` | `"circle" \| "square"` | `"circle"` | Tile outline: round or square. |
| `size` | `"sm" \| "md" \| "lg" \| "xl"` | `"md"` | Tile size from `xs` to `xl`. |
| `tone` | `ToneInput` |  | Semantic colour. Default `primary`. |
| `variant` | `"soft" \| "solid" \| "outline-ring" \| "glass"` | `"soft"` | Look: `soft` (tinted tile), `solid`, `outline-ring` or `glass`. |

## Variants

- `variant`: `soft`, `solid`, `outline-ring`, `glass` (default "soft")
- `color`: `brand`, `neutral`, `success`, `warning`, `destructive`, `info` (default "brand")
- `size`: `sm`, `md`, `lg`, `xl` (default "md")
- `shape`: `circle`, `square` (default "circle")

## Example (live: `#/components/assets/featured-icon` in the playground)

```tsx
import { FeaturedIcon } from "@cleanprompt/sutra-ui/assets";
import { Heading, Text } from "@cleanprompt/sutra-ui/core";
import {
  RiFlashlightLine,
  RiMailLine,
  RiShieldCheckLine,
  RiTeamLine,
} from "@cleanprompt/sutra-ui/icons";

function FeaturedIconDemo() {
  return (
    <>
      {featuredVariants.map((variant) => (
        <div key={variant} className="space-y-3">
          {/* {variant} */}
          <div
            className={
              variant === "glass"
                ? "flex flex-wrap items-center gap-4 rounded-box bg-gradient-to-br from-primary/30 via-info/20 to-success/30 p-4"
                : "flex flex-wrap items-center gap-4"
            }
          >
            {featuredTones.map((tone) => (
              <FeaturedIcon key={tone} variant={variant} tone={tone} icon={featuredToneIcons[tone]} label={tone} />
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-3">
        {/* Sizes and shapes */}
        <div className="flex flex-wrap items-center gap-4">
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <FeaturedIcon key={size} size={size} icon={RiMailLine} />
          ))}
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <FeaturedIcon key={`sq-${size}`} size={size} shape="square" variant="solid" icon={RiFlashlightLine} />
          ))}
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <FeaturedIcon key={`ring-${size}`} size={size} variant="outline-ring" tone="success" icon={RiShieldCheckLine} />
          ))}
        </div>
      </div>

      <div className="flex max-w-sm gap-4 rounded-box border border-border bg-card p-4">
        <FeaturedIcon variant="outline-ring" tone="primary" icon={RiTeamLine} />
        <div className="space-y-1">
          <Heading as="h4" size="sm">
            Invite your team
          </Heading>
          <Text size="sm" tone="neutral">
            Share projects and track progress together. Seats are free until March.
          </Text>
        </div>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): featuredToneIcons, featuredTones, featuredVariants.
