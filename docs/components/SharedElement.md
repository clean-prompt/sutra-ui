# SharedElement

> An element that flies between two screens when the change is applied with `useViewTransition`: render it with the same `name` in the list and in the detail view. It is a plain box with a `view-transition-name` (`data-shared-element` carries the name for tests and debugging); without browser support, or under reduced motion, nothing animates.

- Import: `import { SharedElement } from "@sutra/ui"` (or from `@sutra/ui/motion`)
- Source: `packages/ui/src/patterns/shared-element` (patterns)
- `data-slot`: `shared-element`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string \| number` |  | The entity id (a note id, a photo id). The same name on the old and the new screen is what morphs; it must be unique on screen at any one time. |
| `active` | `boolean` | `true` | Set false to leave the element unnamed (name only the row that is about to transition, so a long list is not snapshotted whole). Default true. |
| `as` | `"div" \| "span" \| "section" \| "article" \| "figure" \| "li" \| "header"` |  | Element to render. Default `div`. |
| `group` | `string` | `"sutra-shared"` | `view-transition-class` for the group, so one CSS rule styles every shared element. Default `sutra-shared` (see sutra.css). |
