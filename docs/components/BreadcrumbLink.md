# BreadcrumbLink

> Navigable crumb.

- Import: `import { BreadcrumbLink } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/primitives/breadcrumbs` (primitives)
- Part of [`Breadcrumb`](Breadcrumb.md)
- Also accepts the props of HTMLAttributes, AnchorHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render your router's link as the child. |

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
