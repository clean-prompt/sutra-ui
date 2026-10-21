# ProfileScopeBanner

> App-wide amber banner warning that actions apply to a non-default profile. A preset over `InlineAlert layout="strip"`.

- Import: `import { ProfileScopeBanner } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/workspace`)
- Source: `packages/ui/src/kits/workspace/workspace-switcher` (kit `workspace`)
- `data-slot`: `profile-scope-banner`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `profileName` (required) | `React.ReactNode` |  | Profile currently being acted on. |
| `gatewayName` | `React.ReactNode` |  | Optional gateway name appended to the message. |
| `message` | `React.ReactNode` |  | Custom message; replaces the default sentence. |
| `onSwitchBack` | `() => void` |  | Called when the user presses the switch-back button; the button is hidden when unset. |
| `sticky` | `boolean` | `true` | Stick to the top of the scroll container. Default true. |
| `switchBackLabel` | `React.ReactNode` | `"Switch back"` | Label of the switch-back button. Default "Switch back". |
