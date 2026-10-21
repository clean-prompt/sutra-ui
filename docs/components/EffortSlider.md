# EffortSlider

> Discrete effort-level control: click or drag the bars, ← → keys, compact pill variant.

- Import: `import { EffortSlider } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-mode` (kit `agent`)
- `data-slot`: `effort-slider-track`, `effort-slider`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string` |  | Initially selected level id when `value` is not controlled. |
| `density` | `Density` |  | `"normal"` (default) shows a labelled track with a legend; `"compact"` is a small pill for the composer. |
| `disabled` | `boolean` | `false` | Disables the slider. |
| `label` | `string` | `"Effort"` | Accessible name and visible caption. Default "Effort". |
| `levels` | `EffortLevel[]` | `defaultEffortLevels` | Levels from lowest to highest, each with an id and label; defaults to the built-in set. |
| `onValueChange` | `(value: string) => void` |  | Called with the level id when the user moves the slider. |
| `tooltip` | `React.ReactNode \| null` | `"Click or drag to set effort level"` | Tooltip text; `null` hides it. |
| `value` | `string` |  | Controlled id of the selected effort level. |
| `variant` | `"default" \| "compact"` |  | **Deprecated.** Use `density` (`"compact"`). `compact` renders a small pill for the composer. |

## Example (live: `#/components/agent-permissions/mode-switcher` in the playground)

```tsx
import * as React from "react";
import { EffortSlider, PermissionModeSwitcher } from "@cleanprompt/sutra-ui/agent";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiArrowUpLine, RiAttachment2 } from "@cleanprompt/sutra-ui/icons";

function ModeSwitcherDemo() {
  const [mode, setMode] = React.useState("manual");
  const [effort, setEffort] = React.useState("medium");
  const composerRef = React.useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={composerRef} className="mx-auto w-full max-w-2xl rounded-box border border-border bg-card shadow-xs">
        <textarea
          aria-label="Message the agent"
          rows={2}
          placeholder="Ask the agent to change something…"
          className="block w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-2.5 py-2">
          <Button size="icon-sm" variant="ghost" aria-label="Attach file">
            <RiAttachment2 />
          </Button>
          <PermissionModeSwitcher
            value={mode}
            onValueChange={setMode}
            cycleWhen={() => !!composerRef.current?.contains(document.activeElement)}
          />
          <EffortSlider density="compact" value={effort} onValueChange={setEffort} />
          <Button size="icon-sm" className="ml-auto" aria-label="Send">
            <RiArrowUpLine />
          </Button>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        mode=<code>{mode}</code> effort=<code>{effort}</code>
      </p>
      {/* Full effort slider */}
      <EffortSlider value={effort} onValueChange={setEffort} />
    </>
  );
}
```
