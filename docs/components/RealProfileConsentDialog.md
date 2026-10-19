# RealProfileConsentDialog

> Asks before letting the agent use the user's real browser profile (cookies, logins) instead of a clean one.

- Import: `import { RealProfileConsentDialog } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-browser` (kit `agent`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `agentName` | `string` | `"The agent"` | Name of the agent asking for the real browser profile, shown in the copy. |
| `className` | `string` |  | Extra classes for the dialog content. |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `defaultRemember` | `boolean` | `false` | Default state of "Remember my choice". |
| `onChoose` | `(choice: RealProfileChoice, options: { remember: boolean }) => void` |  | Called with the choice and whether to remember it. Closes the dialog. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `open` | `boolean` |  | Controlled open state of the dialog. |
| `profileName` | `string` |  | e.g. "Chrome — Personal". |
| `site` | `string` |  | Site the agent wants to open, shown in the copy. |

## Example (live: `#/components/browser-review/real-profile-consent` in the playground)

```tsx
import * as React from "react";
import { RealProfileConsentDialog } from "@sutra/ui/agent";
import { Button } from "@sutra/ui/core";
import { RiShieldUserLine } from "@sutra/ui/icons";

function ConsentDemo() {
  const [open, setOpen] = React.useState(false);
  const [last, setLast] = React.useState<string | null>(null);
  return (
    <div className="flex flex-col items-center gap-2">
      <Button leadingIcon={<RiShieldUserLine />} onClick={() => setOpen(true)}>
        Ask to use my real profile
      </Button>
      {last && <span className="text-sm text-muted-foreground">{last}</span>}
      <RealProfileConsentDialog
        open={open}
        onOpenChange={setOpen}
        agentName="Sutra"
        profileName="Chrome — Personal"
        site="github.com"
        onChoose={(c: RealProfileChoice, { remember }) => setLast(`Choice: ${c}${remember ? " (remembered)" : ""}`)}
      />
    </div>
  );
}
```
