# PermissionModeSwitcher

> Composer-footer pill showing the agent's permission mode; opens a menu and cycles with Shift+Tab.

- Import: `import { PermissionModeSwitcher } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-mode` (kit `agent`)
- `data-slot`: `permission-mode-switcher`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `cycleScope` | `"composer" \| "global"` | `"composer"` | Where the cycle shortcut listens. "composer" (default) only fires while focus is inside the closest `form` / `[data-composer]` around the switcher (or on the switcher itself), so Shift+Tab keeps its normal reverse-tab behaviour elsewhere on the page. "global" fires anywhere. |
| `cycleShortcut` | `string \| null` | `"shift+tab"` | Keys that cycle through the modes (fires from inputs too). `null` disables. Default "shift+tab". |
| `cycleWhen` | `() => boolean` |  | Extra guard for the cycle shortcut. |
| `defaultValue` | `string` |  | Initially active mode id when `value` is not controlled. |
| `iconOnly` | `boolean` | `false` | Hide the label and show only the icon. |
| `modes` | `PermissionModeOption[]` | `defaultPermissionModes` | Modes to offer, each with an id, label and description; defaults to the built-in set. |
| `onValueChange` | `(mode: string) => void` |  | Called with the mode id when the user picks a mode or cycles with the shortcut. |
| `size` | `"sm" \| "md"` | `"sm"` | Trigger size. |
| `value` | `string` |  | Controlled id of the active mode. |

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
