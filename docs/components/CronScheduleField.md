# CronScheduleField

> Schedule builder: interval / hourly / daily / weekdays / weekly / monthly / once / raw cron, with a live summary and next-runs preview.

- Import: `import { CronScheduleField } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/patterns/cron` (patterns)
- `data-slot`: `cron-summary`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `CronScheduleValue \| string \| null` |  | Initial value (schedule object or schedule string) when uncontrolled. |
| `disabled` | `boolean` |  | Disables every control. |
| `hour12` | `boolean` |  | Forces a 12-hour (`true`) or 24-hour (`false`) clock in the preview; the locale decides otherwise. |
| `legend` | `React.ReactNode` | `"Schedule"` | Caption of the fieldset, shown above the controls. |
| `locale` | `string` |  | BCP 47 locale for the preview and the plain-language description. |
| `modes` | `CronScheduleMode[]` | `ALL_MODES` | Modes offered (and their order). Default: all eight. |
| `now` | `Date \| number` |  | Reference time for the preview. Default: now. |
| `onValueChange` | `(value: CronScheduleValue \| null, details: CronScheduleChangeDetails) => void` |  | Fires on every edit; `value` is `null` while the schedule is invalid. |
| `previewCount` | `number` | `3` | Number of upcoming runs to preview. Default 3; 0 hides the list. |
| `timeZone` | `string` |  | IANA zone the schedule runs in; shown next to the preview. Default: the browser zone. |
| `value` | `CronScheduleValue \| string \| null` |  | Value or schedule string ("every 30m", cron, ISO timestamp). |

## Example (live: `#/components/automation/schedule-builder` in the playground)

```tsx
import * as React from "react";
import { CronScheduleField, toScheduleString } from "@cleanprompt/sutra-ui/agent-admin";

function ScheduleBuilderDemo() {
  const [value, setValue] = React.useState<CronScheduleValue | null>({ kind: "cron", expr: "0 9 * * 1-5" });
  return (
    <div className="grid grid-cols-1 w-full gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <CronScheduleField defaultValue={value} onValueChange={(v) => setValue(v)} />
      <div className="flex flex-col gap-2">
        {/* Emitted value */}
        <pre className="overflow-auto rounded-box bg-muted p-3 font-mono text-xs">{JSON.stringify(value, null, 2)}</pre>
        {/* toScheduleString() */}
        <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs">{value ? toScheduleString(value) : "— invalid —"}</code>
      </div>
    </div>
  );
}
```
