# Marquee

> An endless, slowly scrolling row of items (logos, chips, quotes). The row repeats its items as often as the width needs, hides the repeats from assistive tech and stands still, wrapped onto lines, under `prefers-reduced-motion`. Keep the items presentational: the repeats are inert, so links and buttons inside would not work in them.

- Import: `import { Marquee } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/marquee` (assets)
- `data-slot`: `marquee`, `marquee-track`, `marquee-list`, `marquee-item`, `marquee-frame`, `marquee-pause`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` |  | The items. Each child becomes one list item; the whole set is repeated to make the loop seamless. |
| `defaultPaused` | `boolean` | `false` | Initial paused state when uncontrolled. Default false. |
| `duration` | `number` | `30` | Seconds for one loop. Default 30. |
| `fade` | `boolean` | `true` | Fade the left and right edges out. Default true. |
| `gap` | `number \| string` | `"3rem"` | Space between items: a number is pixels, a string is any CSS length. Default `3rem`. |
| `itemClassName` | `string` |  | Classes for every item's `li`. |
| `label` | `string` |  | Accessible name of the list. |
| `onPausedChange` | `(paused: boolean) => void` |  | Called with the new state when the button is pressed. |
| `pausable` | `boolean` | `false` | Show a pause and play button at the end of the row, in the flow beside the track (WCAG 2.2.2: moving content needs a control that outlasts hover and focus, for touch and keyboard users). Hidden under reduced motion, where the row is already still. Default false. |
| `paused` | `boolean` |  | Controlled paused state. The button toggles it; `pauseOnHover` still pauses on top of it. |
| `pauseLabel` | `string` | `"Pause scrolling"` | Accessible name of the pause button (a toggle: it stays the same while `aria-pressed` flips). Default "Pause scrolling". |
| `pauseOnHover` | `boolean` | `true` | Stop scrolling while the pointer or keyboard focus is inside. Default true. |
| `reverse` | `boolean` | `false` | Scroll left to right instead of right to left. |

## Notes

**When to use:** An endless, slowly scrolling row of presentational items (logos, chips, short quotes). It repeats the items to fill the width, pauses on hover and focus, and becomes a still, wrapped row under reduced motion.

**Use instead when:**
- `Carousel`: slides the user steps through
- `LogoCloud`: logos only, with a marquee mode built on this
- `RotatingNoticeBar`: messages that take turns
- `AnimatedList`: a list whose items enter and leave

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Reaches focusable items in the first copy only; the repeats are `inert`. With `pausable` it also reaches the pause button |
| Enter, Space | On the pause button: pauses or resumes the scroll |

Focus inside the scroller pauses it while `pauseOnHover` is on (the default). The pause button sits beside the track, not inside it, so focusing it does not pause by itself. No arrow keys are used. In RTL the track runs the other way with its own keyframes (`sutra-marquee-rtl`); `reverse` still flips whichever direction applies.

### Screen readers

- The first copy is a `ul` with `role="list"` named by `label`, and each child is an `li`. The repeats are `aria-hidden` and `inert`, so the items are read once.
- The pause button is a toggle named "Pause scrolling" (`pauseLabel`) whose name does not change: `aria-pressed` flips and the icon swaps.
- `label` names the list, not the root. Props you pass go on the root scrolling region.

### Reduced motion

Under `prefers-reduced-motion` (CSS `motion-reduce:` classes, no JavaScript) the animation stops, the repeats are hidden, the items wrap onto centred lines, the edge fade is removed and the pause button is hidden, because the row is already still. The row can become taller than the single line it was.

### Server rendering

Server render: part of it fills in after mount. The server renders two copies. After mount the root and one copy are measured and the number of copies grows to fill the width (at most 10), so the markup gains lists after hydration. The animation itself is CSS.

### Slots

- `marquee`: the scrolling root
- `marquee-track`: the moving strip that holds the copies
- `marquee-list`: one copy of the items
- `marquee-item`: one `li`
- `marquee-frame`: the wrapper, only with `pausable`
- `marquee-pause`: the pause and play button

### Gotchas

- Keep the items presentational. Only the first copy is interactive and it moves, and links or buttons in the repeats are `inert`. Items that must be clickable belong in a `Carousel` or a static grid.
- `pausable` is off by default, so touch and keyboard users have only the hover and focus pause. Turn it on for any row that moves for more than a few seconds (WCAG 2.2.2). A controlled `paused` pauses the row even without the button, and `pauseOnHover` pauses on top of it.
- `duration` is the seconds for one loop of the items (default 30, an invalid value falls back to 30), `gap` a number of pixels or any CSS length (default `3rem`), and `fade` softens both edges.
- Each child becomes one `li`; the `key` of a child element is kept.

## Example

```tsx
import { Marquee } from "@cleanprompt/sutra-ui";

const customers = ["Northwind", "Acme Hosting", "Bright Print", "Globex", "Initech", "Umbrella Labs"];

export function Example() {
  return (
    <Marquee label="Trusted by" duration={40} gap={48} pausable>
      {customers.map((name) => (
        <span key={name} className="text-lg font-semibold text-muted-foreground">
          {name}
        </span>
      ))}
    </Marquee>
  );
}
```
