# SidebarUserCard

> Account row with an `Avatar` (solid seed colour), name, email and chevron. Use as a dropdown trigger.

- Import: `import { SidebarUserCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/patterns/sidebar-navigation` (patterns)
- `data-slot`: `sidebar-user-card`
- Part of [`Sidebar`](Sidebar.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Display name shown in the card (and used for the initials). |
| `avatarColor` | `string` |  | Background of the initials circle. Defaults to a color derived from the name. |
| `avatarSrc` | `string` |  | Image URL; falls back to initials. |
| `email` | `string` |  | Email shown under the name. |
| `hideChevron` | `boolean` |  | Hide the trailing chevron. |
