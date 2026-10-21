# PlatformIcon

> Monochrome glyph tile for a messaging platform (original shapes, not brand logos).

- Import: `import { PlatformIcon } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/channels-icon` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `platform` (required) | `ChannelPlatform` |  | Messaging platform whose logo to draw. |
| `decorative` | `boolean` |  | Hide from assistive tech when the name is already next to it. |
| `label` | `string` |  | Accessible name. Defaults to the platform name. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Icon box size: `sm`, `md` or `lg`. |

## Example (live: `#/components/channels/platform-icons` in the playground)

```tsx
import { PlatformIcon } from "@cleanprompt/sutra-ui/agent-admin";

function PlatformIconsDemo() {
  const all: ChannelPlatform[] = ["telegram", "whatsapp", "slack", "discord", "signal", "matrix", "email", "sms", "imessage", "webhook"];
  return (
    <div className="flex flex-wrap gap-3">
      {all.map((p) => (
        <div key={p} className="flex flex-col items-center gap-1.5">
          <PlatformIcon platform={p} size="lg" />
          <span className="text-2xs text-muted-foreground">{p}</span>
        </div>
      ))}
    </div>
  );
}
```
