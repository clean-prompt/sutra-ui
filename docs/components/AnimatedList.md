# AnimatedList

> See `AnimatedListInner`: the generic cast keeps `ref` and the item type together.

- Import: `import { AnimatedList } from "@sutra/ui"` (or from `@sutra/ui/motion`)
- Source: `packages/ui/src/patterns/animated-list` (patterns)
- `data-slot`: `animated-list`, `animated-list-item`, `animated-list-content`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `getKey` (required) | `(item: T) => string \| number` |  | A stable key per item (an id, not the index). |
| `items` (required) | `readonly T[]` |  | Items to render, in order; items added or removed animate in and out. |
| `renderItem` (required) | `(item: T, state: PresenceState, index: number) => React.ReactNode` |  | The content of one row. `state` is `"enter"`, `"idle"` or `"exit"` (an exiting row is a copy of its last render). |
| `as` | `"ul" \| "ol" \| "div"` |  | The list element: `ul` and `ol` wrap each row in an `li`. Default `ul`. |
| `collapse` | `boolean \| "height" \| "width"` |  | Let the neighbours close the gap as a removed row collapses (a `0fr` track, no measuring): `true` or `"height"` for a column, `"width"` for a wrapping row of chips. Default true. Put spacing inside the rows (padding or margin on the content), not as a `gap` between them, or the gap jumps when the row finally unmounts. |
| `exitDuration` | `number` |  | Milliseconds a removed row stays while it leaves. Default 200, the speed of `animate-fade-out` and the collapse. |
| `flip` | `boolean \| UseFlipOptions` |  | Slide the siblings to their new place when rows are inserted, removed or reordered (`useFlip`; `true` or its options). With `collapse` the gap of a leaving row closes by itself, so it adds inserts and reorders; with `collapse={false}` the rows below slide up when a leaving row finally unmounts. Off under reduced motion. Default false. |
| `initial` | `boolean` |  | Animate the rows of the first render too. Default false. |
| `itemClassName` | `string` |  | Class names for every row wrapper. |
| `stagger` | `boolean` |  | Rows added in one update enter one after the other (`--sutra-stagger`). Default true. |

## Example (live: `#/foundations/colors/animated-list` in the playground)

```tsx
import { CodeBlock } from "@sutra/ui/ai";

function MotionLists() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        {/* Task list: rows pop in (a batch is staggered) and collapse out */}
        <TaskList />
      </div>
      <div className="space-y-2">
        {/* Chips and tags */}
        <ChipRow />
      </div>
      <CodeBlock
        filename="animated-list.tsx"
        language="tsx"
        copyable={false}
        code={`<AnimatedList items={tasks} getKey={(t) => t.id} renderItem={(t) => <TaskRow task={t} />} />
// nothing animates on first render; a removed row stays for exitDuration (default 200 ms), inert and aria-hidden,
// while its height collapses. No live region: announce changes yourself. Keep spacing inside the rows, not as a gap.`}
      />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): ChipRow, TaskList.
