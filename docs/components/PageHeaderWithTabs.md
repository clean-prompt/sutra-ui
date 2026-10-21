# PageHeaderWithTabs

> Page header with title, actions and an underline tab bar.

- Import: `import { PageHeaderWithTabs } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/section-header-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `actions` | `React.ReactNode` |  | Buttons shown on the right of the title row. |
| `children` | `React.ReactNode` |  | Tab panels (`TabsContent`) rendered under the header, sharing the tab state. |
| `defaultValue` | `string` |  | Initially selected tab value when uncontrolled. |
| `description` | `React.ReactNode` | `"Everything the team needs to ship Sutra 3.0 before December."` | Supporting text under the title. |
| `onValueChange` | `(value: string) => void` |  | Called with the value of the tab the user picked. |
| `tabs` | `PageHeaderTab[]` | `defaultTabs` | Tabs under the title; each has a `value`, a `label` and optional count and icon. |
| `title` | `React.ReactNode` | `"Q4 Launch Plan"` | Page title; the default is sample text, so always set it. |
| `value` | `string` |  | Controlled selected tab value. Use with `onValueChange`. |
