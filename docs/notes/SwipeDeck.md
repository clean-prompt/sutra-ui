---
component: SwipeDeck
module: patterns/swipe-deck
use: Triage cards one at a time. Drag the top card to either side (or press Skip and Keep, the arrow keys or Enter) and it flies away, with the cards behind stepping up and Undo bringing the last one back.
instead: Carousel = browse slides with no decision per card; SwipeRow = swipe actions on a list row; ReorderableList = reorder items by dragging; StepWizard = ordered steps
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Focuses the deck, then the Skip, Undo and Keep buttons below it |
| ArrowRight | On the deck: swipes the top card to the right, which is the `end` side in LTR and the `start` side in RTL |
| ArrowLeft | Swipes it to the left: `start` in LTR, `end` in RTL |
| Enter | Always the `end` side (Keep) |
| Ctrl+Z, Cmd+Z | Takes the last swipe back (not with Shift) |

The arrows are physical (the card flies the way the arrow points) while `start` and `end` follow the reading direction, so in RTL ArrowLeft is the `end` side (the test pins it). Keys only count when the deck itself has focus, not when focus is on an input or button inside a card, and are ignored while `disabled` or `loading`.

## Screen readers
- The focusable stage is a `group` with `aria-roledescription="card deck"`, named "Card deck" (`label`) and described by a hidden hint that lists the keys. The top card is a `group` with `aria-roledescription="card"` named "Card n of N".
- Cards behind and flying cards are `aria-hidden` and `inert`. The Skip and Keep stamps on a card are `aria-hidden`.
- A polite live region announces each swipe, for example "Keep: Invoice 12. 2 left" or "No cards left", and "Undid Skip" for an undo. `getLabel` supplies the item name; without it only the side and the count are said.
- Skip, Undo and Keep are real buttons (`startLabel` and `endLabel` rename them and the announcements). `loading` sets `aria-busy`, hides the controls and adds hidden "Loading cards…" text. The hint, "Undo" and the empty text are English and not in a prop.

## Reduced motion
The tilt, the stamps and the follow-the-finger offset are written while you drag, with no animation. The flight of a dismissed card and the fly-in of an undone one are springs that `useDrag` skips under `prefers-reduced-motion`: the card is simply replaced. The cards behind move up through a transition that the reduced-motion net ends in 1 ms.

## Server rendering
The server renders the top card and the cards behind it (at most `stack` + 1), the controls and the hint, with no browser API at render. Direction, measuring and the drag are all read in handlers and effects.

## Slots
- `swipe-deck`: the root
- `swipe-deck-stage`: the focusable group that holds the cards
- `swipe-deck-card`: one card, with `data-position` of `top`, `behind` or `leaving`
- `swipe-deck-stamp`: the Skip or Keep stamp on a card (`data-side`)
- `swipe-deck-empty`: what shows when no cards are left
- `swipe-deck-actions`: the row with the Skip, Undo and Keep buttons

## Gotchas
- `getKey` must return a stable id per item: cards, their flights and Undo are tracked by it. Undo only takes back the latest swipe, and only while that card is still directly before the current index and still the same item.
- `renderCard` also runs for the cards behind the top one (the deepest is hidden), so keep it cheap. The deck draws the card surface; give it a height through `cardClassName`.
- `onSwipe(side, item, index)` reports the side by reading direction (`start` is left in LTR). `index` is the top card, `items.length` means none left; controlled, a swipe asks for the new index through `onIndexChange`.
- `actions={false}` removes the buttons, leaving drag and keys only, so keep them unless you provide another path. Only the top card can be dragged, and a drag commits past `distance` (default 90 px) or on a flick.

## Example
```tsx
import { SwipeDeck } from "@sutra/ui";

const invoices = [
  { id: "inv-12", vendor: "Northwind Traders", amount: "$1,240.00" },
  { id: "inv-13", vendor: "Acme Hosting", amount: "$89.00" },
  { id: "inv-14", vendor: "Bright Print Co.", amount: "$412.50" },
];

export function Example({ onDecide }: { onDecide: (id: string, approved: boolean) => void }) {
  return (
    <SwipeDeck
      className="mx-auto w-full max-w-xs"
      label="Invoices to review"
      items={invoices}
      getKey={(invoice) => invoice.id}
      getLabel={(invoice) => invoice.vendor}
      startLabel="Reject"
      endLabel="Approve"
      cardClassName="h-56"
      onSwipe={(side, invoice) => onDecide(invoice.id, side === "end")}
      emptyState="All invoices reviewed"
      renderCard={(invoice) => (
        <div className="flex h-full flex-col justify-between p-5">
          <p className="text-sm text-muted-foreground">{invoice.vendor}</p>
          <p className="text-2xl font-semibold">{invoice.amount}</p>
        </div>
      )}
    />
  );
}
```
