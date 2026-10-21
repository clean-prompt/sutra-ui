# ProfileHeader

> Profile banner: cover, overlapping large avatar, name, meta, stats and actions.

- Import: `import { ProfileHeader } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/section-header-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `actions` | `React.ReactNode` |  | Custom actions; replaces the follow and message buttons. |
| `avatarSrc` | `string` |  | Avatar image URL; falls back to initials from `name`. |
| `bio` | `React.ReactNode` | `"Product designer at Northwind. Writing about calm software, deep work and slow mornings."` | Short bio under the handle. |
| `coverSrc` | `string` |  | Cover image URL; defaults to a brand mesh gradient. |
| `handle` | `string` | `"@maya"` | Handle shown under the name (e.g. "@maya"). |
| `meta` | `ProfileHeaderMeta[]` | `[ { icon: <RiMapPinLine aria-hidden />, label: "Lisbon, Portugal" }, { icon: <RiLinkM aria-hidden />, label: "maya.design", href: "#" }, { icon: <RiCalendarLine aria-hidden />, label: "Joined March 2024" }, ]` | Meta line items (location, link, join date); each has a `label` and optional icon and href. |
| `name` | `string` | `"Maya Patel"` | Display name. |
| `onFollow` | `() => void` |  | Called when the Follow button is clicked; setting it shows the button. |
| `onMessage` | `() => void` |  | Called when the Message button is clicked; setting it shows the button. |
| `stats` | `{ label: React.ReactNode; value: React.ReactNode }[]` | `[ { label: "Following", value: "214" }, { label: "Followers", value: "1,892" }, { label: "Public notes", value: "56" }, ]` | Counters shown under the bio (followers, posts); each has a `label` and a `value`. |
| `verified` | `boolean` | `true` | Shows a verified badge next to the name. |
