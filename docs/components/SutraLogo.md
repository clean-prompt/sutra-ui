# SutraLogo

> Mark + wordmark lockup.

- Import: `import { SutraLogo } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/brand` (assets)
- `data-slot`: `sutra-logo`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `intro` | `boolean` | `false` | Play the intro once on mount: the mark's intro (see `SutraMark`), then the drawn wordmark writes itself (about 2.3 s in all). Reduced motion shows the still logo. |
| `layout` | `"horizontal" \| "stacked"` | `"horizontal"` | Mark beside the wordmark (`horizontal`) or above it (`stacked`). |
| `markOnly` | `boolean` | `false` | Hide the wordmark and show only the mark. |
| `markVariant` | `SutraMarkVariant` | `"glyph"` | Which `SutraMark` variant leads the lockup. Default `glyph` (ink on paper). |
| `product` | `React.ReactNode` |  | Optional product suffix shown after the wordmark, e.g. "notes". |
| `size` | `SutraLogoSize` | `"md"` | Logo size. |

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
