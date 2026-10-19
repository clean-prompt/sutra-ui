# QuickCapture

> Global quick-capture bar: type naturally, see the parsed preview, Alt+↑/↓ to switch app, Enter to save.

- Import: `import { QuickCapture } from "@sutra/ui"` (or from `@sutra/ui/suite`)
- Source: `packages/ui/src/kits/workspace/quick-capture` (kit `workspace`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `apps` | `SutraApp[]` | `["tasks", "notes", "calendar", "journal"]` | Target apps that Alt+↑ / Alt+↓ cycle through. |
| `className` | `string` |  | Extra classes for the inline bar or the dialog content. |
| `defaultApp` | `SutraApp` | `"tasks"` | App selected at first; defaults to the first of `apps`. |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `now` | `Date` |  | Reference time for relative dates (defaults to the current time). |
| `onCapture` | `(value: QuickCaptureValue) => unknown` |  | Called on Enter with the parsed capture. May return a promise. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `open` | `boolean` |  | Controlled open state of the dialog variant. |
| `placeholder` | `string` | `"Capture anything… try “event tomorrow 3pm Dentist #health”"` | Placeholder of the capture field; the default shows an example with a date and a tag. |
| `shortcut` | `string \| null` | `"mod+shift+space"` | Toggle shortcut for the dialog. Default "mod+shift+space"; `null` disables. |
| `variant` | `"dialog" \| "inline"` | `"dialog"` | "dialog" (default) opens on the shortcut; "inline" renders the bar in place. |

## Example (live: `#/components/suite/quick-capture` in the playground)

```tsx
import * as React from "react";
import { Button } from "@sutra/ui/core";
import { EntityChip, QuickCapture, ShortcutKeys, parseCapture } from "@sutra/ui/suite";

function QuickCaptureDemo() {
  const [captured, setCaptured] = React.useState<QuickCaptureValue[]>([]);
  const [open, setOpen] = React.useState(false);
  const add = (v: QuickCaptureValue) => setCaptured((c) => [v, ...c].slice(0, 5));
  const examples = ["event tomorrow 3pm Dentist #health", "task: Pay rent !high fri", "note: Gift ideas #family", "Coffee $4.50"];
  return (
    <div className="space-y-4">
      <QuickCapture variant="inline" onCapture={add} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          Open dialog
        </Button>
        <span className="text-xs text-muted-foreground">
          or press <ShortcutKeys keys="mod+shift+space" />
        </span>
      </div>
      <QuickCapture open={open} onOpenChange={setOpen} onCapture={add} />
      <div className="@container w-full">
        <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
          <div className="space-y-1.5">
            {/* parseCapture() */}
            {examples.map((ex) => (
              <div key={ex} className="rounded-md border border-border p-2 text-xs">
                <p className="font-medium">{ex}</p>
                <code className="block break-all text-muted-foreground">{JSON.stringify(parseCapture(ex))}</code>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {/* Captured */}
            {captured.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet. Type above and press Enter.</p>
            ) : (
              captured.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <EntityChip type={c.app} id={String(i)} title={c.title} />
                  <span className="text-xs text-muted-foreground">
                    {[c.date, c.time, c.priority, ...c.tags.map((t) => `#${t}`)].filter(Boolean).join(" · ")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```
