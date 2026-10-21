# GuidedSetupSteps

> Numbered onboarding checklist with copyable values, external links and "I did this" checks. Built on `Steps orientation="vertical"`.

- Import: `import { GuidedSetupSteps } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/channels-pairing` (kit `agent-admin`)
- `data-slot`: `guided-setup-steps`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `steps` (required) | `GuidedSetupStep[]` |  | Setup steps in order, each with an id, title and optional description, copyable value and link. |
| `defaultValue` | `string[]` | `[]` | Initially completed step ids when `value` is not controlled. |
| `onComplete` | `() => void` |  | Fired once every step is checked. |
| `onValueChange` | `(ids: string[]) => void` |  | Called with the ids of the completed steps when the user checks or unchecks a step. |
| `value` | `string[]` |  | Ids of completed steps. |

## Example (live: `#/components/channels/guided-setup` in the playground)

```tsx
import * as React from "react";
import { GuidedSetupSteps } from "@sutra/ui/agent-admin";

function GuidedSetupDemo() {
  const [done, setDone] = React.useState<string[]>(["open"]);
  return (
    <div className="w-full max-w-lg">
      <GuidedSetupSteps
        value={done}
        onValueChange={setDone}
        steps={[
          { id: "open", title: "Open BotFather in Telegram", href: "https://t.me/BotFather", linkLabel: "Open BotFather" },
          { id: "newbot", title: "Create a bot", description: "Send this command, then pick a display name.", copyValue: "/newbot" },
          {
            id: "username",
            title: "Choose a username",
            description: "It must end in “bot”.",
            copyValue: "sutra_helper_bot",
          },
          {
            id: "token",
            title: "Paste the token BotFather sends you",
            description: "It looks like 123456789:AAE… and goes into TELEGRAM_BOT_TOKEN.",
          },
          { id: "dm", title: "Send your bot a message", description: "You'll get a pairing code to approve below." },
        ]}
      />
      <p className="mt-4 text-xs text-muted-foreground">{done.length} of 5 done</p>
    </div>
  );
}
```
