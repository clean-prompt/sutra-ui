# AgentJobForm

> Create or edit a scheduled agent job: prompt or script, schedule, model, profile, skills, toolsets, repeat limit and delivery.

- Import: `import { AgentJobForm } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-jobs-form` (kit `agent-admin`)
- `data-slot`: `agent-job-form`
- Also accepts the props of HTMLAttributes, FormHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `Partial<AgentJobDraft>` |  | Initial draft (uncontrolled). Missing fields get defaults. |
| `deliveryPlatforms` | `DeliveryPlatform[]` |  | Delivery targets to offer; defaults to the built-in platforms. |
| `deliveryStatus` | `Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>` |  | Delivery state per platform, shown beside the delivery targets. |
| `models` | `(string \| SelectOption)[]` |  | Model options (or replace the select with `modelSlot`). |
| `modelSlot` | `React.ReactNode` |  | Replaces the model select, for a custom model picker. |
| `now` | `Date \| number` |  | Reference time for the schedule preview. |
| `onCancel` | `() => void` |  | Called when the user presses Cancel; the button is hidden when unset. |
| `onConfigureChannels` | `() => void` |  | Called when the user presses Configure channels next to the delivery targets; the link is hidden when unset. |
| `onSubmit` | `(job: AgentJobDraft) => void \| Promise<void>` |  | Called with the valid job draft; may return a promise, and the submit button shows a spinner until it settles. |
| `onValueChange` | `(draft: AgentJobDraft) => void` |  | Called with the next draft on every edit. |
| `profiles` | `(string \| SelectOption)[]` |  | Profile options for the profile select; the select is hidden when empty or unset. |
| `skills` | `(string \| NameCheckboxOption)[]` |  | Skills the user can attach to the job, as names or option objects. |
| `submitLabel` | `React.ReactNode` |  | Label of the submit button. |
| `timeZone` | `string` |  | IANA time zone for the schedule preview (for example `Europe/Berlin`); the viewer's zone when unset. |
| `toolsets` | `(string \| NameCheckboxOption)[]` |  | Toolsets the user can enable for the job, as names or option objects. |
| `value` | `AgentJobDraft` |  | Controlled draft. Pair with `onValueChange`. |

## Example (live: `#/components/automation/job-form` in the playground)

```tsx
import * as React from "react";
import { AgentJobForm } from "@cleanprompt/sutra-ui/agent-admin";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiAddLine } from "@cleanprompt/sutra-ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@cleanprompt/sutra-ui/overlays";

function JobFormDialogDemo() {
  const [open, setOpen] = React.useState(false);
  const [payload, setPayload] = React.useState<AgentJobDraft | null>(null);
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <Button leadingIcon={<RiAddLine />} onClick={() => setOpen(true)}>
        Schedule a job
      </Button>
      {payload ? <pre className="max-h-64 w-full overflow-auto rounded-box bg-muted p-3 font-mono text-xs">{JSON.stringify(payload, null, 2)}</pre> : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg" className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New scheduled job</DialogTitle>
            <DialogDescription>Agent mode runs a prompt; script mode delivers a command's stdout as-is.</DialogDescription>
          </DialogHeader>
          <AgentJobForm
            models={MODELS}
            profiles={PROFILES}
            skills={SKILLS}
            toolsets={TOOLSETS}
            deliveryStatus={DELIVERY_STATUS}
            onCancel={() => setOpen(false)}
            onSubmit={(job) => {
              setPayload(job);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): DELIVERY_STATUS, MODELS, PROFILES, SKILLS, TOOLSETS.
