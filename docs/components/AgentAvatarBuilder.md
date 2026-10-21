# AgentAvatarBuilder

> Procedural agent avatar editor: shape, color, face, seeded generation and image upload, with a live preview.

- Import: `import { AgentAvatarBuilder } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-persona` (kit `agent-admin`)
- `data-slot`: `agent-avatar-builder`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `colors` | `string[]` | `agentAvatarColors` | Swatches. Default `agentAvatarColors`. |
| `defaultValue` | `AgentAvatarSpec` |  | Initial avatar spec when `value` is not controlled. |
| `onUpload` | `(file: File) => string \| Promise<string>` |  | Turn an uploaded file into a URL. Default reads it as a data URL. |
| `onValueChange` | `(spec: AgentAvatarSpec) => void` |  | Called with the new spec on every change. |
| `previewSize` | `number` | `96` | Preview size in px. Default 96. |
| `value` | `AgentAvatarSpec` |  | Controlled avatar spec (shape, colour, glyph or uploaded image). |

## Example (live: `#/components/channels/agent-avatar-builder` in the playground)

```tsx
import * as React from "react";
import {
  AgentAvatar,
  AgentAvatarBuilder,
  randomAvatarSpec,
} from "@cleanprompt/sutra-ui/agent-admin";

function AvatarDemo() {
  const [spec, setSpec] = React.useState<AgentAvatarSpec>(() => randomAvatarSpec("ada"));
  return (
    <div className="flex w-full flex-col gap-6">
      <AgentAvatarBuilder value={spec} onValueChange={setSpec} />
      <div className="flex flex-wrap items-center gap-3">
        {["ada", "rex", "critic", "ops", "scout", "nova", "juno", "kite"].map((s) => (
          <AgentAvatar key={s} spec={randomAvatarSpec(s)} size={40} label={s} />
        ))}
      </div>
    </div>
  );
}
```
