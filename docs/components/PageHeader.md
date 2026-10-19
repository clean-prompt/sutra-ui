# PageHeader

> Page-level header: breadcrumbs, back button, h1 title, actions and tabs.

- Import: `import { PageHeader } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/patterns/section-header` (patterns)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `React.ReactNode` |  | Section heading. |
| `actions` | `React.ReactNode` |  | Buttons on the right; wrap below the text on mobile. |
| `backHref` | `string` |  | Render the back button as a link. |
| `backLabel` | `string` | `"Back"` | Accessible name of the icon-only back button. |
| `breadcrumbs` | `React.ReactNode` |  | Breadcrumb trail rendered above the title. |
| `description` | `React.ReactNode` |  | Supporting text under the heading. |
| `divider` | `boolean` |  | Bottom border under the header. |
| `eyebrow` | `React.ReactNode` |  | Small label above the title (a section or category name). |
| `leading` | `React.ReactNode` |  | Leading element before the text (icon, avatar). |
| `onBack` | `() => void` |  | Show a back button; called on click. |
| `size` | `Size` | `"md"` | Heading size and spacing. |
| `tabs` | `React.ReactNode` |  | Tabs or filters rendered under the heading row. `children` render there too. |
