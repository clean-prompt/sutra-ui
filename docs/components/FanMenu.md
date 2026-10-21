# FanMenu

> A hub button that fans out circular action discs along an arc (e.g. voice modes). Keyboard accessible as a menu.

- Import: `import { FanMenu } from "@sutra/ui"` (or from `@sutra/ui/overlays`)
- Source: `packages/ui/src/patterns/fan-menu` (patterns)
- `data-slot`: `fan-menu`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` (required) | `React.ReactNode` |  | Hub button icon. |
| `items` (required) | `FanMenuItem[]` |  | Actions that fan out from the hub button; each has an `id`, a `label` and an `icon`. |
| `label` (required) | `string` |  | Accessible name of the hub button. |
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled. |
| `direction` | `FanMenuDirection` | `"up"` | Direction the fan opens towards. Default "up". |
| `discSize` | `number` | `44` | Disc diameter, px. Default 44. |
| `hubSize` | `number` | `48` | Hub diameter, px. Default 48. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the menu opens or closes. |
| `onSelect` | `(id: string) => void` |  | Fired with the selected item id (after the item's own `onSelect`). |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
| `radius` | `number` | `76` | Distance from the hub centre to each disc, px. Default 76. |
| `showLabels` | `boolean` | `true` | Show item labels as tooltips next to the discs. Default true. |
| `spread` | `number` | `120` | Total arc covered by the discs, degrees. Default 120. |

## Example (live: `#/components/chat-extras/fan-menu` in the playground)

```tsx
import * as React from "react";
import {
  RiChatVoiceLine,
  RiHeadphoneLine,
  RiMicLine,
  RiTranslate2,
  RiVoiceprintLine,
} from "@sutra/ui/icons";
import { FanMenu } from "@sutra/ui/overlays";

function FanMenuDemo() {
  const [mode, setMode] = React.useState("dictate");
  const items = [
    { id: "dictate", label: "Dictate", icon: <RiMicLine /> },
    { id: "talk", label: "Talk", icon: <RiChatVoiceLine /> },
    { id: "translate", label: "Translate", icon: <RiTranslate2 /> },
    { id: "listen", label: "Listen", icon: <RiHeadphoneLine /> },
  ].map((it) => ({ ...it, active: it.id === mode }));
  return (
    <>
      <FanMenu items={items} icon={<RiVoiceprintLine />} label="Voice mode" onSelect={setMode} />
      {/* Mode: {mode} */}
    </>
  );
}
```
