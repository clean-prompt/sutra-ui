# StatementHero

> A centred statement section: big mark, headline, short subtitle, one action and a hint.

- Import: `import { StatementHero } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/patterns/statement-hero` (patterns)
- `data-slot`: `statement-hero`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `React.ReactNode` |  | The statement. Set in a big, tight, balanced display size that steps down on phones. |
| `action` | `React.ReactNode` |  | The one action, e.g. a pill `Button size="xl"` or a `FileUploadTrigger`. |
| `align` | `"center" \| "start"` | `"center"` | Centre everything (default) or align it to the start edge. |
| `animated` | `boolean` | `true` | Stagger the parts in with `animate-fade-up` (off under reduced motion). Default true. |
| `as` | `HeadingLevel` | `"h1"` | Heading element for the title. Default `h1`. |
| `description` | `React.ReactNode` |  | One or two lines under the title (muted, large, balanced). |
| `float` | `boolean` | `false` | Let the media bob gently (`animate-bob`; it stands still under reduced motion). |
| `hint` | `React.ReactNode` |  | A small muted line under the action. |
| `media` | `React.ReactNode` |  | A big mark or icon above the headline. |
| `size` | `StatementHeroSize` | `"lg"` | `lg` is the landing-page statement (110px headline on desktop), `md` a compact section. |

## Example (live: `#/components/statement-hero/landing` in the playground)

```tsx
import { SutraMark } from "@sutra/ui/assets";
import { StatementHero } from "@sutra/ui/blocks";
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
