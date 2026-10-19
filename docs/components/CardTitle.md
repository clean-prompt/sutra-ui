# CardTitle

> Card title; pass `as="h3"` (or h2, h4) to make it a heading.

- Import: `import { CardTitle } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/layout` (primitives)
- `data-slot`: `card-title`
- Part of [`Card`](Card.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `as` | `"h2" \| "h3" \| "h4" \| "div"` |  | Element to render; pick the heading level that fits the page outline. Defaults to a plain `div`. |

## Notes

See the notes in [`Card`](Card.md#notes).

## Example

```tsx
import { Button, Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@sutra/ui";

export function Example() {
  return (
    <Card as="section" aria-label="Billing" className="max-w-sm">
      <CardHeader>
        <CardTitle as="h3">Team plan</CardTitle>
        <CardDescription>Renews on 1 November 2026.</CardDescription>
        <CardAction>
          <Button size="xs" variant="outline">Change</Button>
        </CardAction>
      </CardHeader>
      <CardContent>12 of 15 seats in use.</CardContent>
      <CardFooter variant="panel">
        <Button size="sm">Manage seats</Button>
      </CardFooter>
    </Card>
  );
}
```
