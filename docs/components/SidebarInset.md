# SidebarInset

> Main content area next to the sidebar. Raised card when the sidebar is `inset`.

- Import: `import { SidebarInset } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/patterns/sidebar-navigation` (patterns)
- Part of [`Sidebar`](Sidebar.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `as` | `React.ElementType` | `"main"` | Element to render. Default `"main"`; use `"div"` when the page already has a `<main>`. |
| `asChild` | `boolean` |  | Merge props onto the single child element instead of rendering a wrapper. |
