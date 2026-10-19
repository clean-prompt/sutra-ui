# useViewTransition

> Returns `(update, options?) => Promise<void>` that applies a state change as a view transition: the browser snapshots the page, React commits, and elements that share a `viewTransitionName` morph between the two states. Use it for navigations and big swaps (list to detail, tab to tab), not for hovers or short lists (`useFlip`). It snapshots the whole viewport and the page ignores input until it ends (a few hundred ms), so keep updates quick. No support or reduced motion: the update just runs.

- Import: `import { useViewTransition } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-view-transition`

## Signature

```ts
useViewTransition(): (update: () => void, { types, skip }?: ViewTransitionOptions) => Promise<void>
```

## Example (live: `#/foundations/colors/view-transitions` in the playground)

```tsx
import { InlineCode } from "@sutra/ui/core";

function MotionViewTransitions() {
  return (
    <div className="min-w-0 space-y-8">
      <ListToDetail />
      <TabFade />
      <p className="text-sm text-muted-foreground">
        <InlineCode>useViewTransition()</InlineCode> wraps <InlineCode>document.startViewTransition</InlineCode> with <InlineCode>flushSync</InlineCode>; names come from entity ids with{" "}
        <InlineCode>SharedElement</InlineCode> or <InlineCode>viewTransitionName(id)</InlineCode> and must be unique on screen at one time. Without support, or with reduced motion, the update just runs.
      </p>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): ListToDetail, TabFade.
