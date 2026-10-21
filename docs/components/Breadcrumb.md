# Breadcrumb

> Breadcrumb navigation landmark.

- Import: `import { Breadcrumb } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/primitives/breadcrumbs` (primitives)
- Parts: [`BreadcrumbEllipsis`](BreadcrumbEllipsis.md), [`BreadcrumbItem`](BreadcrumbItem.md), [`BreadcrumbLink`](BreadcrumbLink.md), [`BreadcrumbList`](BreadcrumbList.md), [`BreadcrumbPage`](BreadcrumbPage.md), [`BreadcrumbSeparator`](BreadcrumbSeparator.md), [`Breadcrumbs`](Breadcrumbs.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `separator` | `BreadcrumbSeparatorVariant` | `"chevron"` | Default separator for every `BreadcrumbSeparator` inside. |
| `size` | `"sm" \| "md"` | `"md"` | Text size of the trail. |

## Part props

### BreadcrumbEllipsis

Collapsed middle crumbs, revealed in a dropdown menu.

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `BreadcrumbCrumb[]` |  | Hidden crumbs shown in a dropdown. Without items, renders a plain ellipsis. |
| `renderLink` | `BreadcrumbRenderLink` |  | Renders a crumb link in place of the default `<a>`, e.g. to use your router's Link. |

### BreadcrumbLink

Navigable crumb.

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render your router's link as the child. |

### BreadcrumbSeparator

Decorative divider between crumbs. Pass children to use a custom glyph.

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `BreadcrumbSeparatorVariant` |  | Separator glyph for this one separator; overrides the `separator` of the trail. |

### Breadcrumbs

Data-driven breadcrumb trail with optional collapsing. The last item is the current page.

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `BreadcrumbCrumb[]` |  | Crumbs in order; the last one is the current page. |
| `itemsAfterCollapse` | `number` |  | Crumbs kept after the ellipsis. Default 1 (or maxItems - itemsBeforeCollapse - 1 when larger). |
| `itemsBeforeCollapse` | `number` | `1` | Crumbs kept before the ellipsis. Default 1. |
| `maxItems` | `number` |  | Collapse middle crumbs into an ellipsis menu when there are more than this many. |
| `renderLink` | `BreadcrumbRenderLink` |  | Render links through your router (receives href, className, children). |
| `separator` | `BreadcrumbSeparatorVariant` |  | Default separator for every `BreadcrumbSeparator` inside. |
| `size` | `"sm" \| "md"` |  | Text size of the trail. |

## Notes

**When to use:** The path to the current page as a trail of links. `Breadcrumbs` takes an `items` array and can fold the middle crumbs into a menu with `maxItems`; the parts build custom trails.

**Use instead when:**
- `TabMenu`: switching between sibling views of one page
- `Steps`: progress through a fixed sequence
- `TreeView`: browsing a hierarchy rather than showing where you are

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves between the crumb links and the ellipsis button; the current page and separators are not focusable |
| Enter | Follows the focused link (a native `<a>` does not activate on Space) |
| Enter, Space, ArrowDown | On the ellipsis button: open the hidden-crumbs menu; ArrowUp and ArrowDown move through it, Enter follows a link, Escape closes it |

There are no left and right arrow keys, so nothing swaps in RTL. The trail itself follows the reading direction: it flows right to left in an RTL document, and the default chevron separator is mirrored (`slash` and `dot` are not).

### Screen readers

`Breadcrumb` is a `<nav>` landmark labelled "Breadcrumb" by default (translate it with `aria-label`), holding an ordered list. The last crumb is a `<span aria-current="page">`, not a link, even when its item has an `href`. A middle crumb without an `href` is plain text with no `aria-current`. Separators are `aria-hidden` list items with `role="presentation"`. The ellipsis button is named "Show N more"; a plain ellipsis (no `items`) is hidden from assistive technology entirely.

### Reduced motion

Static: hover colours are transitions that end in 1 ms under reduced motion. The only popup is the ellipsis menu, which keeps its fade and loses its movement like every `DropdownMenu`.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API: server and client output match. The ellipsis menu is closed, so only its button renders on the server.

### Gotchas

- `maxItems` collapses only when `items.length > maxItems` and `maxItems` is at least 2. It keeps `itemsBeforeCollapse` (default 1) crumbs first and `itemsAfterCollapse` last (default `maxItems - itemsBeforeCollapse - 1`, at least 1); if those two cover every item, nothing collapses.
- Hidden crumbs without an `href` appear in the menu as disabled rows, because there is nowhere to go.
- For client-side routing pass `renderLink` (it receives `href`, `className` and `children`) on `Breadcrumbs`, or `BreadcrumbLink asChild` around your router link when composing the parts yourself.
- `separator` on `Breadcrumb` (`chevron`, `slash`, `dot`) sets every separator; a `variant` on one `BreadcrumbSeparator`, or children, override it. Parts need a `Breadcrumb` ancestor only for the shared `size` and `separator` defaults.

## Example

```tsx
import { Breadcrumbs } from "@cleanprompt/sutra-ui";

const trail = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Atlas", href: "/projects/atlas" },
  { label: "Settings", href: "/projects/atlas/settings" },
  { label: "Members" },
];

export function Example() {
  return (
    <div className="space-y-4">
      <Breadcrumbs items={trail} />
      <Breadcrumbs items={trail} maxItems={3} separator="slash" size="sm" />
    </div>
  );
}
```
