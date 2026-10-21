# SectionRail

> Section navigation that highlights the section in view ("On this page", a sticky sub-nav). The links are real anchors (`aria-current="location"` on the active one); a click scrolls the section to the top of its scroller, respecting reduced motion. Tracking is `useScrollSections`; pass `value` to drive the highlight yourself.

- Import: `import { SectionRail } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/patterns/section-rail` (patterns)
- `data-slot`: `section-rail`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `sections` (required) | `SectionRailItem[]` |  | Sections to list, in order; each has an `id` and a `label`. |
| `defaultValue` | `string` |  | Active id before any section has been seen, when uncontrolled. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no sections. Default: nothing is rendered. |
| `getHref` | `(id: string) => string` | `(id: string) => `#${id}`` | The link target of a section, also written to the address bar on click. Default `#id`; give a router URL where `#id` is taken. |
| `label` | `string` | `"Table of contents"` | Accessible name of the navigation landmark. Default "Table of contents". |
| `loading` | `boolean` | `false` | Show placeholder rows in the rail's layout while the sections are not known yet. |
| `offset` | `number` |  | Pixels below the top of the scroll area where a section starts to count as current (see `useScrollSections`). |
| `onValueChange` | `(id: string) => void` |  | Called when the active id changes (tracked or clicked), and on a click when controlled. |
| `orientation` | `"vertical" \| "horizontal"` | `"vertical"` | `vertical` is an "On this page" column with a rule; `horizontal` is a scrolling row of tabs for a sticky sub-nav. Default vertical. |
| `root` | `Element \| null \| React.RefObject<Element \| null>` |  | The scrolling element the sections live in. Default: the viewport. |
| `rootMargin` | `string` |  | Observer root margin, replacing the `offset` based default. |
| `smoothScroll` | `boolean` | `true` | Smooth-scroll to a section on click (reduced motion jumps). `false` leaves the browser's own anchor jump. Default true. |
| `title` | `React.ReactNode` |  | Heading above the rail. Default "On this page" for a vertical rail; none when horizontal. |
| `value` | `string` |  | Controlled active id. Omit it and the rail tracks the sections in view itself. |

## Notes

**When to use:** A table of contents that highlights the section in view, as an "On this page" column or a scrolling row of tabs for a sticky sub-navigation. The links are real anchors; a click scrolls the section to the top. `useScrollSections` is the tracking behind it.

**Use instead when:**
- `Tabs`: switch panels, nothing scrolls
- `Breadcrumb`: where you are in a site hierarchy
- `Steps`: progress through ordered stages
- `Sidebar`: app navigation between pages
- `TreeView`: a nested hierarchy you expand and select

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Each link is a tab stop (there is no roving focus) |
| Enter | Follows the link: scrolls the section to the top, marks it current and updates the address bar |

Space does nothing on a link, and there are no arrow keys, so RTL changes nothing for the keyboard. A click does not move focus to the section: it stays on the link.

### Screen readers

- A `nav` named by `label` (default "Table of contents") with a list of links. The current one has `aria-current="location"`. The "On this page" title is plain text, not a heading.
- With `loading` the nav is `aria-busy` with one hidden "Loading…" and `aria-hidden` placeholder rows: no links exist until the sections are known.
- The active mark is the only state; nothing is announced when it moves as you scroll.

### Reduced motion

Clicks scroll smoothly (`smoothScroll`, default true) but jump under `prefers-reduced-motion`, read when you click. The horizontal rail also re-centres the active tab with an instant scroll then. Link colour changes are transitions that the global net ends in 1 ms.

### Server rendering

Server render: same markup as the client. The first render is the same on the server and client: the active section is `value`, `defaultValue` or the first id. Tracking starts in an effect after mount.

### Slots

- `section-rail`: the `nav` (`data-orientation`; `data-state="empty"` on the empty-state wrapper)

### Gotchas

- Each section needs an element with the matching `id` that is already in the page when the rail mounts or when the ids change; missing ones are skipped. Add `scroll-margin-top` to the targets when a fixed header covers them, and pass `root` when the sections scroll inside a container rather than the page.
- Tracking marks the first listed section that is in the top third of the scroller (`offset` shifts it down by a header's height, `rootMargin` replaces the rule) and keeps the last one while none is. `value` makes it controlled and turns tracking off, yet a click still scrolls and calls `onValueChange`.
- A plain click scrolls with `scrollIntoView` and writes the link to the address bar with `replaceState`, so Back does not undo it; use `getHref` to give router URLs where `#id` is taken. Modified clicks (Ctrl, Cmd, Shift, Alt, middle button) and `smoothScroll={false}` leave the browser's own anchor jump.
- `level` (2 to 4) indents deeper entries relative to the shallowest one, in the vertical rail only. With no sections it renders nothing unless you give `emptyState`.

## Example

```tsx
import { SectionRail } from "@cleanprompt/sutra-ui";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "install", label: "Installation" },
  { id: "usage", label: "Usage" },
];

export function Example() {
  return (
    <div className="flex gap-8">
      <article className="flex-1 space-y-24">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20">
            <h2 className="text-lg font-semibold">{section.label}</h2>
          </section>
        ))}
      </article>
      <SectionRail sections={sections} className="sticky top-20 w-48 self-start" />
    </div>
  );
}
```
