# BackgroundPattern

> Absolutely positioned decorative pattern with a soft fade mask.

- Import: `import { BackgroundPattern } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/backgrounds` (assets)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `cellSize` | `number` |  | Pattern cell size in pixels. |
| `color` | `string` |  | Line or dot color. Defaults to the border token. |
| `fade` | `BackgroundFade` | `"radial"` | Where the pattern fades out: `radial`, `top`, `bottom`, `edges` or `none`. |
| `variant` | `BackgroundPatternVariant` | `"grid"` | Pattern shape: `grid`, `dots`, `circles` or `lines`. |

## Example (live: `#/components/assets/background-pattern` in the playground)

```tsx
import { BackgroundPattern, SutraMark } from "@cleanprompt/sutra-ui/assets";
import { Button, Heading, Text } from "@cleanprompt/sutra-ui/core";
import { RiArrowRightLine } from "@cleanprompt/sutra-ui/icons";

function BackgroundPatternDemo() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {patternVariants.map((variant) => (
          <div
            key={variant}
            className="relative flex h-44 items-center justify-center overflow-hidden rounded-box border border-border bg-card"
          >
            <BackgroundPattern variant={variant} />
            <div className="relative text-center">
              <Text weight="semibold">{variant}</Text>
              <Text size="xs" tone="neutral">
                fade="radial"
              </Text>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["top", "bottom", "edges"] as const).map((fade) => (
          <div
            key={fade}
            className="relative flex h-32 items-center justify-center overflow-hidden rounded-box border border-border bg-card"
          >
            <BackgroundPattern variant="grid" cellSize={20} fade={fade} />
            <Text size="sm" tone="neutral" className="relative">
              fade="{fade}"
            </Text>
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-box border border-border bg-card px-6 py-14 text-center">
        <BackgroundPattern variant="dots" color="var(--primary)" cellSize={20} />
        <div className="relative mx-auto max-w-md space-y-4">
          <SutraMark size={44} className="mx-auto" />
          <Heading as="h4" size="display-xs">
            Your work, tied together
          </Heading>
          <Text tone="neutral">Notes, tasks and calendar in one calm workspace.</Text>
          <Button trailingIcon={<RiArrowRightLine />}>Get started</Button>
        </div>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): patternVariants.
