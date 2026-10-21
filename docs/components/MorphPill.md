# MorphPill

> One surface that changes size between states (idle, a picker, a running timer, a sync status): its width and height follow the measured content on a spring token, and the new content fades in as the old one goes. Under reduced motion the size and the content swap at once (the shared net). Controlled (`state`) or uncontrolled (`defaultState`); pass a function as a state's content to switch states from inside. It is an inline surface: put it in a container with room (`max-w-full` keeps it inside a narrow one, and its content is clipped, not overflowing).

- Import: `import { MorphPill } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/motion`)
- Source: `packages/ui/src/patterns/morph-pill` (patterns)
- `data-slot`: `morph-pill`, `morph-pill-content`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `states` (required) | `Record<S, React.ReactNode \| ((context: MorphPillContext<S>) => React.ReactNode)>` |  | The content of each state; a function receives the current state and `setState`, for buttons inside the pill. |
| `announcement` | `string` |  | Text for a polite live region that screen readers hear when the state changes (the pill itself is silent). |
| `defaultState` | `S` |  | Initial state key when uncontrolled. |
| `label` | `string` |  | Accessible name; makes the pill a `role="group"`. |
| `onStateChange` | `(state: S) => void` |  | Called with the new state key when `setState` from a state's render function is used. |
| `ref` | `React.Ref<HTMLDivElement>` |  | Ref to the pill's root `<div>` (the component is generic, so `ref` is a plain prop). |
| `spring` | `"gentle" \| "snappy" \| "bouncy"` | `"snappy"` | Which spring token the size change rides. Default "snappy". |
| `state` | `S` |  | Controlled state key; one of the keys of `states`. Use with `onStateChange`. |

## Example (live: `#/components/layout-patterns/morph-pill` in the playground)

```tsx
import { Text } from "@cleanprompt/sutra-ui/core";

function MorphPillDemo() {
  return (
    <>
      <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-3">
        <div className="min-w-0 space-y-2">
          {/* Focus timer (snappy): Focus, pick a length, Start */}
          <FocusPill />
        </div>
        <div className="min-w-0 space-y-2">
          {/* spring="bouncy" */}
          <FocusPill spring="bouncy" />
        </div>
        <div className="min-w-0 space-y-2">
          {/* spring="gentle", narrow container */}
          <div className="w-40 max-w-full">
            <FocusPill spring="gentle" />
          </div>
          <Text size="sm" tone="neutral">
            A narrow container clips the pill instead of overflowing.
          </Text>
        </div>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): FocusPill.
