# CardAction

> Control placed at the end of the card header (a button, menu or badge).

- Import: `import { CardAction } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/layout` (primitives)
- `data-slot`: `card-action`
- Part of [`Card`](Card.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

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
