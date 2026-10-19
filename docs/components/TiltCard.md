# TiltCard

> A `Card` that tilts toward the mouse in 3D. The pointer is read on a still wrapper (`data-slot="tilt-card-field"`) and the card inside tilts, so it never moves out from under the pointer. Props and the ref go to the card. Touch, reduced motion and no hover leave it flat. Use it for hero, plan and entity cards, not for dense or live content.

- Import: `import { TiltCard } from "@sutra/ui"` (or from `@sutra/ui/motion`)
- Source: `packages/ui/src/patterns/pointer-fx` (patterns)
- `data-slot`: `tilt-card-field`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `as` | `CardElement` |  | Element to render, so a card can sit in the page outline as an `article`, `section` or list item. |
| `max` | `number` |  | Tilt at the edge, in degrees. Default 7 (the `--sutra-tilt-max` token; paper uses 3). |
| `padded` | `boolean` |  | Adds 24px (16px at `size="sm"`) of padding on the card itself; the parts carry their own padding instead. |
| `size` | `"sm" \| "md"` |  | `sm` tightens the padding of the card and its parts. |
| `spotlight` | `boolean` | `false` | Add the pointer glow too. Default false. |

## Example (live: `#/foundations/colors/pointer` in the playground)

```tsx
import { Button, InlineCode } from "@sutra/ui/core";
import { RiHeartLine } from "@sutra/ui/icons";
import { Magnetic, TiltCard } from "@sutra/ui/motion";

function MotionPointer() {
  return (
    <div className="min-w-0 space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <PointerStatus />
        <span className="text-xs text-muted-foreground">Hover with a mouse. Tab into a card: the glow shows at the centre. Touch and reduced motion: still.</span>
      </div>

      <div className="@container min-w-0 space-y-2">
        {/* SpotlightCard: a glow that follows the pointer (the last one with glowSize 90) */}
        <div className="grid grid-cols-1 gap-3 @lg:grid-cols-3" data-slot="spotlight-grid">
          <PlanCard plan={PLANS[0]} />
          <PlanCard plan={PLANS[1]} />
          <PlanCard plan={PLANS[2]} glowSize={90} />
        </div>
      </div>

      <div className="@container min-w-0 space-y-2">
        {/* TiltCard: the pointer is read on a still wrapper, the card tilts (second: max 14 degrees plus the glow) */}
        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2" data-slot="tilt-grid">
          <TiltCard className="min-w-0 p-5">
            <p className="text-sm font-medium">Default tilt</p>
            <p className="mt-1 text-sm text-muted-foreground">7 degrees at the edge; paper uses 3. It springs back when the pointer leaves.</p>
          </TiltCard>
          <TiltCard max={14} spotlight className="min-w-0 p-5">
            <p className="text-sm font-medium">Strong, with a glow</p>
            <p className="mt-1 text-sm text-muted-foreground">Tilt and spotlight compose: both read the same variables.</p>
          </TiltCard>
        </div>
      </div>

      <div className="@container min-w-0 space-y-2">
        {/* Magnetic: the child drifts toward the pointer inside a reach of 80 px (clicks and focus are unchanged) */}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 rounded-box border border-dashed border-border p-8" data-slot="magnetic-row">
          <Magnetic>
            <Button>Get started</Button>
          </Magnetic>
          <Magnetic radius={120} strength={0.5}>
            <Button variant="outline" size="icon" aria-label="Like">
              <RiHeartLine />
            </Button>
          </Magnetic>
          <Magnetic radius={50}>
            <a href="#/foundations/motion/pointer" className="rounded-control px-3 py-2 text-sm font-medium underline-offset-4 hover:underline">
              A link
            </a>
          </Magnetic>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <InlineCode>usePointerVars()</InlineCode> sets <InlineCode>data-pointer</InlineCode>, <InlineCode>--px --py --tx --ty --pull-x --pull-y</InlineCode> once per frame for a mouse or pen only, and removes them on leave;
        the <InlineCode>spotlight</InlineCode>, <InlineCode>tilt</InlineCode> and <InlineCode>magnetic</InlineCode> utilities read them and spring back on the snappy token.
        Strengths are tokens (<InlineCode>--sutra-tilt-max</InlineCode>, <InlineCode>--sutra-spotlight-alpha</InlineCode>, <InlineCode>--sutra-magnetic-scale</InlineCode>), calmer in paper.
      </p>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): PLANS, PlanCard, PointerStatus.
