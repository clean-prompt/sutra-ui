# PageHeaderWithStats

> Dashboard header: title, range select and a row of stat cards with sparklines and trend badges.

- Import: `import { PageHeaderWithStats } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/section-header-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `actions` | `React.ReactNode` |  | Buttons shown on the right of the title row. |
| `defaultRange` | `string` |  | Initially selected range value when uncontrolled. |
| `description` | `React.ReactNode` | `"Here's how your week is going across Sutra."` | Supporting text under the title. |
| `onRangeChange` | `(value: string) => void` |  | Called with the range value the user picked. |
| `range` | `string` |  | Controlled selected range value. Use with `onRangeChange`. |
| `rangeOptions` | `SelectOption[]` | `defaultRanges` | Choices for the date-range select; omit to hide the select. |
| `stats` | `PageHeaderStat[]` | `defaultStats` | Metric tiles under the title; each has a `label`, a `value` and an optional `change`. |
| `title` | `React.ReactNode` | `"Overview"` | Page title; the default is sample text, so always set it. |
