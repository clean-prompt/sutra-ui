# GatewayStatusPopover

> Status-bar gateway indicator with a popover of uptime, version, controls and a live log tail.

- Import: `import { GatewayStatusPopover } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/workspace-switcher-status` (kit `workspace`)
- `data-slot`: `gateway-status-popover`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `state` (required) | `GatewayRunState` |  | Run state of the gateway (`running`, `starting`, `stopping`, `stopped` or `error`); sets the dot, label and the actions offered. |
| `className` | `string` |  | Extra classes for the trigger button. |
| `contentClassName` | `string` |  | Extra classes for the popover content. |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `error` | `React.ReactNode` |  | Error detail shown when state is "error". |
| `host` | `string` |  | Host or address the gateway listens on, shown in the popover. |
| `logLines` | `string[]` |  | Recent log lines rendered in the tail panel. |
| `logSlot` | `React.ReactNode` |  | Custom log tail content (e.g. a streaming LogViewer); replaces `logLines`. |
| `name` | `React.ReactNode` | `"Gateway"` | Gateway display name. Default "Gateway". |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the popover opens or closes. |
| `onRestart` | `() => void` |  | Called when the user presses Restart; the button is hidden when unset. |
| `onStart` | `() => void` |  | Called when the user presses Start on a stopped gateway; the button is hidden when unset. |
| `onStop` | `() => void` |  | Called when the user presses Stop; the button is hidden when unset. |
| `open` | `boolean` |  | Controlled open state of the popover. |
| `uptime` | `number \| string` |  | Seconds (formatted) or a preformatted string. |
| `version` | `string` |  | Gateway version, shown in the popover. |

## Example (live: `#/components/workspace/gateway-status` in the playground)

```tsx
import * as React from "react";
import { GatewayStatusPopover } from "@sutra/ui/workspace";

function GatewayStatusDemo() {
  const [state, setState] = React.useState<GatewayRunState>("running");
  const [uptime, setUptime] = React.useState(5 * 3600 + 17 * 60);
  const [lines, setLines] = React.useState<string[]>(["INFO  gateway: listening on 127.0.0.1:8642"]);
  React.useEffect(() => {
    if (state !== "running") return;
    const id = setInterval(() => {
      setUptime((u) => u + 2);
      setLines((ls) => [...ls.slice(-40), logSamples[Math.floor(Math.random() * logSamples.length)]!]);
    }, 2000);
    return () => clearInterval(id);
  }, [state]);
  const transition = (via: GatewayRunState, to: GatewayRunState, line: string) => {
    setState(via);
    setLines((ls) => [...ls, line]);
    setTimeout(() => {
      setState(to);
      if (to === "running") setUptime(0);
      setLines((ls) => [...ls, to === "running" ? "INFO  gateway: listening on 127.0.0.1:8642" : "INFO  gateway: stopped"]);
    }, 1200);
  };
  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      <div className="flex h-8 items-center gap-3 rounded-box border border-border bg-subtle px-2 text-xs text-muted-foreground">
        <GatewayStatusPopover
          state={state}
          name="Local gateway"
          uptime={uptime}
          version="1.4.2"
          host="127.0.0.1:8642"
          logLines={lines}
          onRestart={() => transition("stopping", "running", "INFO  gateway: restarting…")}
          onStop={() => transition("stopping", "stopped", "INFO  gateway: shutting down…")}
          onStart={() => transition("starting", "running", "INFO  gateway: starting…")}
        />
        <span className="ml-auto">main · 3 agents</span>
      </div>
      <p className="text-xs text-muted-foreground">Status bar item: click it for uptime, version, controls and a live log tail.</p>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): logSamples.
