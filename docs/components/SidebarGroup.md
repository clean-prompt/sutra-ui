# SidebarGroup

> Section of related menu items.

- Import: `import { SidebarGroup } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/patterns/sidebar-navigation` (patterns)
- `data-slot`: `sidebar-group`
- Part of [`Sidebar`](Sidebar.md)
- Parts: [`SidebarGroupLabel`](SidebarGroupLabel.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

## Part props

### SidebarGroupLabel

Group heading; fades out in icon mode.

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render the label as its child element (a heading, a link) instead of a `div`, merging the label's classes and props into it. |
