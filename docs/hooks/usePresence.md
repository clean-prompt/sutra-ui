# usePresence

> Keeps removed items for a moment (state `"exit"`) so they can animate out, and marks new ones `"enter"`. The hook only decides who is rendered and in which state; CSS does the motion (`data-[presence=enter]:animate-pop-in`, `data-[presence=exit]:animate-fade-out`). Rules: - the first render is idle for everyone (unless `initial`), so a list never animates on mount; - a removed item stays where it was for `exitDuration`: it is kept in the same render that removes it (no one-frame gap), several removals keep their order, and each has its own timer, so a fast update stream cannot strand a row in `"exit"`; a key that comes back while exiting is a new entrance; - under `prefers-reduced-motion` nothing enters or exits: removal is immediate and there is no `"exit"` state.

- Import: `import { usePresence } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-presence`

## Signature

```ts
usePresence<T, K extends string | number = string>(items: readonly T[], getKey: (item: T) => K, { exitDuration, initial, holdEnter }?: UsePresenceOptions): PresenceItem<T, K>[]
```
