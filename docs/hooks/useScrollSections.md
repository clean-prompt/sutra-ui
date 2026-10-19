# useScrollSections

> Scroll-spy for a list of sections: tracks which element is in view with one `IntersectionObserver`, and scrolls to one on request (`scrollIntoView`, so a target's `scroll-margin-top` clears a fixed header). Stays on the last section seen while none is in the observed band, never re-renders unless the active id changes, and does nothing where `IntersectionObserver` is missing. Build your own rail on it, or use `SectionRail`.

- Import: `import { useScrollSections } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-scroll-sections`

## Signature

```ts
useScrollSections({ ids, offset, rootMargin, root, enabled, defaultActive, smooth, onActiveChange, }: UseScrollSectionsOptions): ScrollSections
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `ids` (required) | `readonly string[]` |  | Element ids of the sections, in page order. |
| `defaultActive` | `string` |  | Active id before any section has been seen. Default the first id. |
| `enabled` | `boolean` | `true` | Turn tracking off (the active id then only changes through `scrollTo` and `setActive`). Default true. |
| `offset` | `number` | `0` | Pixels below the top of the scroll area where a section starts to count as current (a fixed header's height). Default 0. |
| `onActiveChange` | `(id: string) => void` |  | Called when the active id changes, whether tracked or set. |
| `root` | `Element \| null \| React.RefObject<Element \| null>` |  | The scrolling element (or a ref to it). Default: the viewport. |
| `rootMargin` | `string` |  | Full `IntersectionObserver` root margin, replacing the `offset` based default (`0px 0px -65% 0px`: the top third counts). |
| `smooth` | `boolean` | `true` | Smooth-scroll in `scrollTo`; reduced motion always jumps. Default true. |
