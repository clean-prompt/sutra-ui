# SwipeDeck

> Triage cards one at a time: drag the top card and it flies away (past 90 px or on a flick) or springs back, with a tilt of 0.05 degrees per px and the cards behind stepping up the stack as it goes. The same choices are Skip and Keep buttons, the arrow keys and Enter on the focused deck, and Ctrl or Command + Z or the Undo button takes the last swipe back (the card flies in again). `start` and `end` follow the reading direction, `onSwipe(side, item, index)` reports each choice, `onEmpty` fires after the last card, `index` / `defaultIndex` / `onIndexChange` control the position. Screen readers get a labelled group, the top card as "Card 2 of 8" and a polite announcement per swipe; the cards behind are `inert`. Built on `useDrag`, so a drag writes CSS variables and never re-renders; reduced motion drops the flight (a swipe just changes the card).

- Import: `import { SwipeDeck } from "@sutra/ui"` (or from `@sutra/ui/mobile`)
- Source: `packages/ui/src/patterns/swipe-deck` (patterns)
- `data-slot`: `swipe-deck`, `swipe-deck-stage`, `swipe-deck-empty`, `swipe-deck-actions`, `swipe-deck-card`, `swipe-deck-stamp`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `getKey` (required) | `(item: T, index: number) => string \| number` |  | A stable key per item (an id), so a card keeps its place and its flight when the list changes. |
| `items` (required) | `readonly T[]` |  | The cards in order; the top one is at `index`. |
| `renderCard` (required) | `(item: T, state: SwipeDeckCardState) => React.ReactNode` |  | The content of one card (the deck draws the card surface). Cards behind the top one render too: keep them cheap. |
| `actions` | `boolean` |  | Show the Skip, Undo and Keep buttons under the deck. Default true. |
| `apiRef` | `React.Ref<SwipeDeckApi>` |  | Imperative handle (`swipe(side)`, `undo()`). |
| `cardClassName` | `string` |  | Classes of each card surface (give it a height). |
| `defaultIndex` | `number` | `0` | Initial top-card index when uncontrolled. |
| `disabled` | `boolean` |  | Ignore drags, keys and buttons. |
| `distance` | `number` |  | Distance (px) of a drag that commits. Default 90. |
| `emptyState` | `React.ReactNode` |  | Content shown once every card has been swiped away. |
| `endIcon` | `React.ReactNode` |  | Icon of the end button. Default a check. |
| `endLabel` | `string` |  | Name of the end action (also Enter). Default "Keep". |
| `getLabel` | `(item: T) => string` |  | Names the item in the screen reader announcements ("Kept: Invoice 12"). Default: no name. |
| `index` | `number` |  | Index of the top card (`items.length` = none left). |
| `label` | `string` |  | Accessible name of the deck. Default "Card deck". |
| `loading` | `boolean` |  | Skeleton cards instead of items; the controls are hidden. |
| `onEmpty` | `() => void` |  | The last card was swiped away. |
| `onIndexChange` | `(index: number) => void` |  | Called with the new top-card index after a card is swiped away. |
| `onSwipe` | `(side: SwipeDeckSide, item: T, index: number) => void` |  | A card was dismissed to a side by a drag, a key or a button. `start` and `end` follow the reading direction. |
| `onUndo` | `(item: T, index: number) => void` |  | The last swipe was taken back. |
| `stack` | `number` |  | Cards that show in the stack (the top one included). Default 3. |
| `startIcon` | `React.ReactNode` |  | Icon of the start button. Default a cross. |
| `startLabel` | `string` |  | Name of the start action. Default "Skip". |

## Notes

**When to use:** Triage cards one at a time. Drag the top card to either side (or press Skip and Keep, the arrow keys or Enter) and it flies away, with the cards behind stepping up and Undo bringing the last one back.

**Use instead when:**
- `Carousel`: browse slides with no decision per card
- `SwipeRow`: swipe actions on a list row
- `ReorderableList`: reorder items by dragging
- `StepWizard`: ordered steps

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Focuses the deck, then the Skip, Undo and Keep buttons below it |
| ArrowRight | On the deck: swipes the top card to the right, which is the `end` side in LTR and the `start` side in RTL |
| ArrowLeft | Swipes it to the left: `start` in LTR, `end` in RTL |
| Enter | Always the `end` side (Keep) |
| Ctrl+Z, Cmd+Z | Takes the last swipe back (not with Shift) |

The arrows are physical (the card flies the way the arrow points) while `start` and `end` follow the reading direction, so in RTL ArrowLeft is the `end` side (the test pins it). Keys only count when the deck itself has focus, not when focus is on an input or button inside a card, and are ignored while `disabled` or `loading`.

### Screen readers

- The focusable stage is a `group` with `aria-roledescription="card deck"`, named "Card deck" (`label`) and described by a hidden hint that lists the keys. The top card is a `group` with `aria-roledescription="card"` named "Card n of N".
- Cards behind and flying cards are `aria-hidden` and `inert`. The Skip and Keep stamps on a card are `aria-hidden`.
- A polite live region announces each swipe, for example "Keep: Invoice 12. 2 left" or "No cards left", and "Undid Skip" for an undo. `getLabel` supplies the item name; without it only the side and the count are said.
- Skip, Undo and Keep are real buttons (`startLabel` and `endLabel` rename them and the announcements). `loading` sets `aria-busy`, hides the controls and adds hidden "Loading cards…" text. The hint, "Undo" and the empty text are English and not in a prop.

### Reduced motion

The tilt, the stamps and the follow-the-finger offset are written while you drag, with no animation. The flight of a dismissed card and the fly-in of an undone one are springs that `useDrag` skips under `prefers-reduced-motion`: the card is simply replaced. The cards behind move up through a transition that the reduced-motion net ends in 1 ms.

### Server rendering

Server render: same markup as the client. The server renders the top card and the cards behind it (at most `stack` + 1), the controls and the hint, with no browser API at render. Direction, measuring and the drag are all read in handlers and effects.

### Slots

- `swipe-deck`: the root
- `swipe-deck-stage`: the focusable group that holds the cards
- `swipe-deck-card`: one card, with `data-position` of `top`, `behind` or `leaving`
- `swipe-deck-stamp`: the Skip or Keep stamp on a card (`data-side`)
- `swipe-deck-empty`: what shows when no cards are left
- `swipe-deck-actions`: the row with the Skip, Undo and Keep buttons

### Gotchas

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
