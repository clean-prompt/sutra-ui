# Carousel

> A snap carousel: native CSS scroll-snap strip (swipe, trackpad and wheel just work), previous and next buttons, dots, Arrow / Home / End keys on the strip, and the slide in view as `value` (found with an IntersectionObserver, so a free scroll updates it). It follows the ARIA carousel pattern: `aria-roledescription="carousel"` and "slide" with "n of N" names, and a status line that announces the slide unless it is rotating. `autoplay` pauses while the pointer or focus is inside, has a visible pause button (WCAG 2.2.2) and stays off under reduced motion until the user starts it. Controlled or uncontrolled.

- Import: `import { Carousel } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/patterns/carousel` (patterns)
- `data-slot`: `carousel`, `carousel-track`, `carousel-controls`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `"start" \| "center"` | `"start"` | Where a slide stops in the strip. Default "start". |
| `arrows` | `boolean` | `true` | Previous and next buttons. Default true. |
| `autoplay` | `boolean \| number` |  | Advance by itself: `true` every 5 s or a number of ms. It pauses on hover and focus and has a visible pause button; off under reduced motion until the user presses play. |
| `children` | `React.ReactNode` |  | The slides, one child each (a fragment's children count one by one). |
| `defaultValue` | `number` | `0` | Initially visible slide index when uncontrolled. |
| `dots` | `boolean` | `true` | One dot per slide. Default true. |
| `emptyState` | `React.ReactNode` | `"Nothing to show"` | Shown when there are no slides. Default "Nothing to show". |
| `label` | `string` |  | Accessible name of the carousel. |
| `labels` | `CarouselLabels` |  | Overrides for the accessible texts (strip name, previous, next, play, pause, dot names). |
| `loading` | `boolean` | `false` | Placeholder slide and `aria-busy` while the slides are on their way. |
| `loop` | `boolean` | `false` | The arrows go round (rewinding to the other end) instead of stopping. Default false. |
| `onValueChange` | `(index: number) => void` |  | Called with the new slide index after a swipe, a button press or a dot press. |
| `progress` | `boolean` | `false` | A bar that fills over the autoplay interval (a CSS transition, hidden under reduced motion). Default false. |
| `slideClassName` | `string` |  | Classes for each slide: its width (`basis-4/5` to show the next slide peeking). Default `basis-full`. |
| `trackClassName` | `string` |  | Classes for the strip that holds the slides. |
| `value` | `number` |  | Index of the slide in view. |

## Notes

**When to use:** A scroll-snap strip of slides with previous and next buttons, dots, arrow and Home and End keys, and optional autoplay. Swiping, trackpad and wheel are native scrolling; the slide in view is `value`.

**Use instead when:**
- `Tabs`: switch between named views
- `StepWizard`: ordered steps with validation
- `SwipeDeck`: decide on cards one by one
- `WheelPicker`: pick a value by scrolling a wheel
- `ScrollArea`: plain scrolling content with no slide state

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Strip (it is focusable), then play or pause, previous, each dot, next. Slides that are fully off-screen are `inert`, so their links and buttons are skipped (a slide showing even a sliver stays interactive) |
| ArrowRight, ArrowLeft | On the strip or on any control: next or previous slide. Stops at the ends unless `loop` |
| Home, End | First or last slide |
| Enter, Space | Press the focused button or dot |

Keys with Alt, Ctrl or Meta are ignored, and so are keys pressed inside a slide, so an input in a slide keeps its arrows. In RTL the keys follow reading order: ArrowLeft is next and ArrowRight previous (the test pins it). The arrow glyphs are mirrored, the strip is scrolled by on-screen distance, and the `progress` bar fills from the right.

### Screen readers

- The root is a `<section aria-roledescription="carousel">` named by `label`. Pass `label`: a section with a name is a `region` landmark, without one it has none.
- The strip is a focusable `group` named "Slides". Each slide is a `group` with `aria-roledescription="slide"` named "n of N".
- Dots are buttons named "Go to slide n", the current one has `aria-current="true"`. Previous and next are disabled at the ends unless `loop`. `labels` replaces the English strings (the strip, previous, next, play, pause, dot and slide names).
- A polite `role="status"` says "n of N" after a button, dot, key press or a free scroll. A slide that autoplay changes by itself is not announced.
- `loading` sets `aria-busy` and renders a skeleton with hidden "Loading…" text, which `labels` does not cover.

### Reduced motion

Under `prefers-reduced-motion` the strip jumps to a slide instead of scrolling smoothly, the `progress` bar is not drawn, and autoplay stays off until the user presses play. The dot size and colour changes are transitions that the net ends in 1 ms. The snap itself is the browser's scrolling.

### Server rendering

Server render: part of it fills in after mount. The server renders every slide, the strip and the controls. A starting slide other than the first is scrolled into view after mount, the slide in view is read from an `IntersectionObserver` in an effect, and the preference for autoplay is read in the browser: the server markup of an `autoplay` carousel shows "Pause slide show" and flips to "Start slide show" after hydration for a reduced-motion user.

### Slots

- `carousel`: the root section
- `carousel-track`: the scrolling strip that holds the slides
- `carousel-controls`: the row with play or pause, arrows and dots

### Gotchas

- Slides that do not intersect the strip at all are `inert` (set from the same observer that tracks the slide in view, so they are not inert on the server or before the first report): Tab and the accessibility tree skip their content, and a keyboard user reaches them with the arrows, Home, End or the dots. If nothing reports as showing, no slide is made inert.
- `value` follows the strip as well as the buttons, because the slide with the largest visible share wins, so `onValueChange` also fires on a free swipe. Controlled, the parent decides: a press only reports the index.
- `autoplay` is `true` for 5 s or a number of ms (at least 1000). It pauses while the pointer or focus is inside and restarts its interval afterwards. Without `loop` it stops on the last slide. A play or pause button shows only with more than one slide.
- Each child is one slide (the children of a fragment count one by one), `basis-full` wide unless `slideClassName` says otherwise (`basis-4/5` lets the next one peek). One slide shows no controls.

## Example

```tsx
import * as React from "react";
import { Carousel } from "@sutra/ui";

const highlights = [
  { title: "Dark mode", body: "Follows your system setting, or pick one in Preferences." },
  { title: "Shared folders", body: "Invite a teammate and edit the same files together." },
  { title: "Offline access", body: "Keep the files you need on this device." },
];

export function Example() {
  const [index, setIndex] = React.useState(0);
  return (
    <Carousel label="What's new" value={index} onValueChange={setIndex} loop slideClassName="basis-4/5 pe-3">
      {highlights.map((item) => (
        <div key={item.title} className="flex h-40 flex-col justify-end rounded-lg border bg-muted p-4">
          <h3 className="font-medium">{item.title}</h3>
          <p className="text-sm text-muted-foreground">{item.body}</p>
        </div>
      ))}
    </Carousel>
  );
}
```
