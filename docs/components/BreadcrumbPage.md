# BreadcrumbPage

> The current page (last crumb).

- Import: `import { BreadcrumbPage } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/primitives/breadcrumbs` (primitives)
- Part of [`Breadcrumb`](Breadcrumb.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

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
