# BootScreen

> What fills the window while an app decides who you are: a brand mark, a slow pulse and one line.

- Import: `import { BootScreen } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/identity`)
- Source: `packages/ui/src/patterns/loading-screen` (patterns)
- `data-slot`: `boot-screen`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `delay` | `number` | `250` | Milliseconds to wait before showing anything, so fast loads never flash. |
| `fullscreen` | `boolean` | `true` | Cover the window (`fixed`). Set false to fill the parent box instead. |
| `mark` | `React.ReactNode` |  | Brand mark; defaults to the Sutra mark. Pass `null` for text only. |
| `message` | `React.ReactNode` |  | Status line. Defaults to "Checking session…". |

## Example (live: `#/components/identity/boot-screen` in the playground)

```tsx
import { Button } from "@cleanprompt/sutra-ui/core";
import { BootScreen } from "@cleanprompt/sutra-ui/identity";

<div className="relative h-64 overflow-hidden rounded-box border border-border">
  <BootScreen key={bootKey} fullscreen={false} delay={250} />
</div>
<Button size="sm" variant="secondary" className="self-start" onClick={() => setBootKey((k) => k + 1)}>
  Replay
</Button>
```
