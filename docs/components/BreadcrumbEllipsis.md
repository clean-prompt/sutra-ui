# BreadcrumbEllipsis

> Collapsed middle crumbs, revealed in a dropdown menu.

- Import: `import { BreadcrumbEllipsis } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/primitives/breadcrumbs` (primitives)
- Part of [`Breadcrumb`](Breadcrumb.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `BreadcrumbCrumb[]` |  | Hidden crumbs shown in a dropdown. Without items, renders a plain ellipsis. |
| `renderLink` | `BreadcrumbRenderLink` |  | Renders a crumb link in place of the default `<a>`, e.g. to use your router's Link. |

## Notes

See the notes in [`Breadcrumb`](Breadcrumb.md#notes).

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
