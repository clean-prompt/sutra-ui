# JobNextRun

> "in 12:34" under an hour (live), otherwise "in 3h".

- Import: `import { JobNextRun } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-jobs-list` (kit `agent-admin`)
- `data-slot`: `job-next-run`
- Also accepts the props of HTMLAttributes, TimeHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `at` (required) | `TimeLike` |  | Time of the next run (timestamp or date); renders a relative "in 5 min" label with the exact time on hover. |
