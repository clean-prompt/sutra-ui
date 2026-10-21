# PageHeaderWithActions

> Page header with breadcrumbs, title, description and primary/secondary buttons.

- Import: `import { PageHeaderWithActions } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/section-header-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `actions` | `React.ReactNode` |  | Replace the generated buttons entirely. |
| `breadcrumbs` | `BreadcrumbCrumb[]` | `[{ label: "Workspace", href: "#" }, { label: "Projects" }]` | Breadcrumb trail shown above the title; the last crumb is the current page. |
| `description` | `React.ReactNode` | `"Plan, track and ship work across every app in your workspace."` | Supporting text under the title. |
| `divider` | `boolean` | `true` | Draws a bottom border under the header. |
| `meta` | `React.ReactNode` |  | Small badges or meta next to the title. |
| `onBack` | `() => void` |  | Called when the back button is clicked; setting it shows the button. |
| `primaryAction` | `HeaderAction \| null` | `{ label: "New project", icon: <RiAddLine aria-hidden /> }` | Main action button (`label`, optional `icon`, and `onClick` or `href`); `null` hides it. |
| `secondaryActions` | `HeaderAction[]` | `[ { label: "Share", icon: <RiShareForwardLine className="rtl:-scale-x-100" aria-hidden /> }, { label: "Export", icon: <RiDownload2Line aria-hidden /> }, ]` | Secondary buttons shown beside the primary action. |
| `title` | `React.ReactNode` | `"Projects"` | Page title; the default is sample text, so always set it. |
