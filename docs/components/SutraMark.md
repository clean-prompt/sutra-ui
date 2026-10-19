# SutraMark

> The Sutra logomark: a bead strung on a thread. Ink on paper by default, so it follows the text colour.

- Import: `import { SutraMark } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/brand` (assets)
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `number \| string` | `32` | Rendered pixel size (width and height). |
| `title` | `string` |  | Accessible title. When omitted, the graphic is hidden from assistive tech. |
| `variant` | `SutraMarkVariant` | `"glyph"` | `glyph` the bead alone in `currentColor`, ink on paper (default), `tile` the bead in ink on a paper tile with a hairline edge, `reversed` paper bead on an ink tile (for dark surfaces), `solid` flat `--primary` tile with a `--primary-foreground` bead (follows the theme and the paper style), `outline` thin frame in `currentColor` around the bead, `badge` heavy frame in `currentColor` around a bold bead. |

## Example (live: `#/components/statement-hero/landing` in the playground)

```tsx
import { StatementHero } from "@sutra/ui";
import { SutraMark } from "@sutra/ui/assets";
import { Button } from "@sutra/ui/core";
import { RiFileUploadLine } from "@sutra/ui/icons";

function LandingDemo() {
  return (
    <>
      <StatementHero
        as="h2"
        float
        media={<SutraMark variant="badge" size={96} className="text-foreground" />}
        title="Your files, handled quietly"
        description="Drop in what you have and get back what you need. No account, no clutter, nothing to learn first."
        action={
          <Button size="xl" leadingIcon={<RiFileUploadLine aria-hidden />}>
            Choose a file
          </Button>
        }
        hint="Files stay on your device. Up to 100 MB."
      />
    </>
  );
}
```
