---
component: Card
module: primitives/layout
covers: CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter
use: The standard surface for grouped content: a bordered, raised box you compose from a header (title, description, action), a body and a footer.
instead: Frame = a titled tray around a list of rows; Item = a single row with media, title and actions; Dialog = the same content in a modal; StatCard = a ready-made figure with a label and trend; Accordion = sections that open and close
server: ssr-safe
---

## Keyboard
Not focusable: no keyboard interaction. A card is not clickable by itself; put a link or button inside (`CardAction`, `CardFooter`), or make the title a link.

## Screen readers
- `Card` has no role. `as` picks the element: `article`, `section`, `aside`, `li` or `div`. A `section` is only a named `region` landmark when it has `aria-label` or `aria-labelledby`, and an `li` needs a `ul` or `ol` parent.
- `CardTitle` is a plain `div` unless `as` is `h2`, `h3` or `h4`, so it is not a heading by default. Pick the level that fits the page outline.
- `CardDescription` is a `p` and is not linked to the card: add `aria-describedby` on the card yourself if it should be read with it.

## Reduced motion
Static: no animation.

## Server rendering
Plain markup with no browser API, so server and client output match.

## Slots
- `card`: the root, with `data-size` set to `sm` for the small size
- `card-header`: the title row; two columns when it holds a `card-action`
- `card-title`: the title
- `card-description`: the muted line under the title
- `card-action`: the control at the end of the header
- `card-content`: the body
- `card-footer`: the footer, with `data-variant` set to `plain` or `panel`

## Gotchas
- The parts carry the padding (from `--card-pad`): do not add `padded` to a card made of parts, or the padding doubles. `padded` is for a flat card with your own content.
- `size="sm"` shrinks the padding, gap and text through CSS variables on the card (`--card-pad`, `--card-gap` and the text sizes), so every part inside follows it.
- `CardHeader` switches to two columns with a `CardAction` through a CSS `:has()` rule; the action sits at the inline end, so it flips in RTL.
- `CardFooter variant="panel"` is a muted band with a top border flush with the card edges; the default `plain` footer is just spaced content.

## Example
```tsx
import { Button, Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@cleanprompt/sutra-ui";

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
