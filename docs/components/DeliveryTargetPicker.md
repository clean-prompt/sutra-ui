# DeliveryTargetPicker

> Where a job's results go: the local inbox, a messaging platform, an email, a GitHub comment or a webhook.

- Import: `import { DeliveryTargetPicker } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-jobs-delivery` (kit `agent-admin`)
- `data-slot`: `delivery-target-picker`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `DeliveryTarget` | `{ platform: "local" }` | Initial target when `value` is not controlled. |
| `disabled` | `boolean` |  | Disables every option. |
| `legend` | `React.ReactNode` | `"Deliver to"` | Legend of the field set. |
| `onConfigureChannels` | `() => void` |  | Shows a "Channels" button in the home-channel warning. |
| `onValueChange` | `(value: DeliveryTarget) => void` |  | Called with the new target when the user changes the platform or channel. |
| `platforms` | `DeliveryPlatform[]` | `ALL_PLATFORMS` | Platforms offered, in order. |
| `status` | `Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>` |  | Per-platform connection state and home channel. |
| `value` | `DeliveryTarget` |  | Controlled delivery target (platform and optional channel). |

## Example (live: `#/components/automation/delivery-target` in the playground)

```tsx
import { DeliveryTargetPicker } from "@cleanprompt/sutra-ui/agent-admin";

<DeliveryTargetPicker status={DELIVERY_STATUS} onConfigureChannels={() => {}} className="max-w-2xl" />
```

Playground helpers in this snippet (not part of the library): DELIVERY_STATUS.
