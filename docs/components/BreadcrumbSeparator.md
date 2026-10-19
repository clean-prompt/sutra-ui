# BreadcrumbSeparator

> Decorative divider between crumbs. Pass children to use a custom glyph.

- Import: `import { BreadcrumbSeparator } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/primitives/breadcrumbs` (primitives)
- Part of [`Breadcrumb`](Breadcrumb.md)
- Also accepts the props of HTMLAttributes, LiHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `BreadcrumbSeparatorVariant` |  | Separator glyph for this one separator; overrides the `separator` of the trail. |

## Notes

See the notes in [`Breadcrumb`](Breadcrumb.md#notes).

## Example

```tsx
import { Breadcrumbs } from "@sutra/ui";

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
