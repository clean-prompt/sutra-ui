# IdentityMark

> Procedural identity glyph: a dial of twelve ticks, five lit by a hash of the seed.

- Import: `import { IdentityMark } from "@sutra/ui"` (or from `@sutra/ui/social`)
- Source: `packages/ui/src/patterns/identity-mark` (patterns)
- `data-slot`: `pulse`, `state-ring`, `picture`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `seed` (required) | `string` |  | Identity string (person, machine or app id). The same seed always draws the same mark. |
| `color` | `"hash" \| "current" \| (string & {})` | `"hash"` | `hash` picks a color from the seed, `current` uses currentColor, or pass any CSS color. |
| `decorative` | `boolean` |  | Hide from assistive tech (when the name is already next to it). |
| `kind` | `IdentityMarkKind` | `"person"` | Shape of the core: a circle with an initial (person), a square core (machine) or a squircle (app). |
| `label` | `string` |  | Accessible name. Defaults to the seed. |
| `letter` | `string \| false` |  | Overrides the initial shown for people. Pass `false` for a bare ring. |
| `picture` | `string \| null` |  | Image URL (a photo or app icon) drawn inside the core shape, with the tick dial and outline kept as its frame. The generated mark shows while it loads and stays if the image fails or the URL is unsafe (http(s), relative, `blob:` and `data:image/` are allowed). The mark's `label` is its accessible name. |
| `size` | `IdentityMarkSize \| number` | `"md"` | Mark size: a step from `xs` to `xl`, or a pixel number. |
| `state` | `IdentityMarkState \| null` |  | Adds an outer ring: pulsing green for live, amber for busy, dashed grey for offline. |

## Example (live: `#/components/social/identity-mark` in the playground)

```tsx
import { IdentityMark } from "@sutra/ui/social";

function IdentityDemo() {
  const states = ["live", "busy", "offline", null] as const;
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {/* People (the same id always draws the same dial) */}
        <div className="flex flex-wrap items-center gap-4">
          {people.map((p, i) => (
            <div key={p} className="flex flex-col items-center gap-1.5">
              <IdentityMark seed={p} size="lg" state={states[i % states.length]} />
              <span className="font-mono text-2xs text-muted-foreground">{p}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {/* Machines */}
        <div className="flex flex-wrap items-center gap-4">
          {machines.map((m, i) => (
            <div key={m} className="flex flex-col items-center gap-1.5">
              <IdentityMark seed={m} kind="machine" size="lg" state={i < 3 ? "live" : i === 3 ? "busy" : "offline"} />
              <span className="font-mono text-2xs text-muted-foreground">{m}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {/* Sizes · apps · currentColor */}
        <div className="flex flex-wrap items-end gap-4">
          {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
            <IdentityMark key={s} seed="user:alice" size={s} />
          ))}
          <IdentityMark seed="app:notes" kind="app" size="xl" />
          <span className="text-primary">
            <IdentityMark seed="user:alice" size="xl" color="current" state="live" />
          </span>
        </div>
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): machines, people.
