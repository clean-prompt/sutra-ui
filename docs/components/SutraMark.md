# SutraMark

> The Sutra logomark: a crescent bead on an upright thread. Ink on paper by default, so it follows the text colour.

- Import: `import { SutraMark } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/brand` (assets)
- `data-slot`: `sutra-mark`
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `intro` | `boolean` | `false` | Play the intro once when the mark mounts: the crescent drops in and lands with a short bounce, then the thread draws down through its opening and on behind the base (about 1.4 s). Reduced motion shows the still mark. Remount (change `key`) to play it again. |
| `size` | `number \| string` | `32` | Rendered pixel size (width and height). |
| `title` | `string` |  | Accessible title. When omitted, the graphic is hidden from assistive tech. |
| `variant` | `SutraMarkVariant` | `"glyph"` | `glyph` the crescent bead and its thread alone in `currentColor`, ink on paper (default), `tile` the bead in ink on a paper tile with a hairline edge, `reversed` paper bead on an ink tile (for dark surfaces), `solid` flat `--primary` tile with a `--primary-foreground` bead (follows the theme and the paper style), `outline` thin frame in `currentColor` around the bead, `badge` heavy frame in `currentColor` around a bold bead. |

## Example (live: `#/components/assets/logo-intro` in the playground)

```tsx
import * as React from "react";
import { SutraLogo, SutraMark } from "@cleanprompt/sutra-ui/assets";
import { Button } from "@cleanprompt/sutra-ui/core";

function LogoIntroDemo() {
  const [run, setRun] = React.useState(0);
  return (
    <>
      <div className="flex flex-wrap items-center gap-10" key={run}>
        <SutraMark intro size={96} title="Sutra" />
        <SutraLogo intro size="xl" />
        <SutraMark intro variant="reversed" size={64} title="Sutra" />
      </div>
      <Button variant="outline" size="sm" className="self-start" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
    </>
  );
}
```
