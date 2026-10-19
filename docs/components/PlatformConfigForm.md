# PlatformConfigForm

> Env-var style settings form for a channel, with per-platform ID validation and paste-splitting allowlists.

- Import: `import { PlatformConfigForm } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/channels` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes, FormHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `platform` (required) | `ChannelPlatform` |  | Messaging platform being configured; picks the default fields. |
| `defaultValues` | `PlatformConfigValues` |  | Initial field values keyed by field id. |
| `fields` | `PlatformConfigField[]` |  | Defaults to `platformConfigFields(platform)`. |
| `onCancel` | `() => void` |  | Called when the user presses Cancel; the button is hidden when unset. |
| `onSubmit` | `(values: PlatformConfigValues) => void \| Promise<void>` |  | Called with valid values. May return a promise; the button shows a spinner until it settles. |
| `submitLabel` | `React.ReactNode` | `"Save"` | Label of the submit button. |

## Example (live: `#/components/channels/platform-config-form` in the playground)

```tsx
import * as React from "react";
import { PlatformConfigForm, PlatformIcon } from "@sutra/ui/agent-admin";
import { SimpleSelect } from "@sutra/ui/forms";

function ConfigFormDemo() {
  const [platform, setPlatform] = React.useState<ChannelPlatform>("telegram");
  const [saved, setSaved] = React.useState<string | null>(null);
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <SimpleSelect
        aria-label="Platform"
        value={platform}
        onValueChange={(v) => {
          setPlatform(v as ChannelPlatform);
          setSaved(null);
        }}
        options={(["telegram", "slack", "discord", "signal", "matrix", "sms"] as ChannelPlatform[]).map((p) => ({
          value: p,
          label: p.charAt(0).toUpperCase() + p.slice(1),
          icon: <PlatformIcon platform={p} size="sm" decorative className="size-5" />,
        }))}
      />
      <PlatformConfigForm key={platform} platform={platform} onSubmit={(v) => setSaved(JSON.stringify(v, null, 2))} />
      {saved && <pre className="overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">{saved}</pre>}
    </div>
  );
}
```
