# Presence

> Mounts a child when `present` turns true and unmounts it after its exit animation when it turns false. The child carries `data-state="open" | "closed"` and `data-presence="enter" | "idle" | "exit"`, so plain classes do the motion:

- Import: `import { Presence } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/motion`)
- Source: `packages/ui/src/patterns/presence` (patterns)
- `data-slot`: `presence`

<Presence present={open}> <div className="data-[presence=enter]:animate-pop-in data-[presence=exit]:animate-fade-out">...</div> </Presence>

An exiting child is `inert` and `aria-hidden` (out of the tab order and the accessibility tree at once, still painted) and is removed on its own `animationend` / `transitionend`, or after `exitDuration`. Under `prefers-reduced-motion` it mounts and unmounts at once, with no enter or exit state. For a list use `AnimatedList`; Radix overlays already do this.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` (required) | `React.ReactElement` |  | One element that accepts DOM props (it gets `data-state`, `data-presence`, `inert` and the animation listeners). |
| `present` (required) | `boolean` |  | Whether the child should be on screen. Going to false keeps it mounted until its exit animation has ended. |
| `enterDuration` | `number` | `600` | Milliseconds before an entering child settles to `idle` even if no `animationend` or `transitionend` arrived (a safety net; the child's own end event settles it first). Default 600. |
| `exitDuration` | `number` | `200` | Milliseconds before an exiting child is removed even if no `animationend` or `transitionend` arrived. Default 200, the speed of `animate-fade-out`. |
| `initial` | `boolean` | `false` | Animate the child in when it is present on the first render too. Default false. |
| `onExited` | `() => void` |  | Called once the child has been removed. |

## Example (live: `#/foundations/colors/presence` in the playground)

```tsx
import * as React from "react";
import { CodeBlock } from "@cleanprompt/sutra-ui/ai";
import { Button } from "@cleanprompt/sutra-ui/core";
import { Presence } from "@cleanprompt/sutra-ui/motion";

function MotionPresence() {
  const [open, setOpen] = React.useState(true);
  const [exits, setExits] = React.useState(0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} aria-pressed={open}>
          {open ? "Hide" : "Show"} the card
        </Button>
        {/* Removed after its exit animation: {exits} */}
      </div>
      <div className="min-h-28">
        <Presence present={open} onExited={() => setExits((n) => n + 1)}>
          <div className="max-w-sm rounded-box border border-border bg-card p-4 data-[presence=enter]:animate-pop-in data-[presence=exit]:animate-fade-out">
            <p className="text-sm font-medium">A card that leaves properly</p>
            <p className="mt-1 text-sm text-muted-foreground">Mounted on demand, with data-state and data-presence, inert while it leaves.</p>
          </div>
        </Presence>
      </div>
      <CodeBlock
        filename="presence.tsx"
        language="tsx"
        copyable={false}
        code={`<Presence present={open}>
  <div className="data-[presence=enter]:animate-pop-in data-[presence=exit]:animate-fade-out">…</div>
</Presence>
// exit = inert + aria-hidden, removed on animationend (or exitDuration). Reduced motion: at once.`}
      />
    </div>
  );
}
```
