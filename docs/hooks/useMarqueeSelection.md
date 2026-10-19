# useMarqueeSelection

> Rubber-band selection: drag on empty space inside `containerRef` to draw a rectangle and select the items it touches. Shift-drag adds to the selection, Mod-drag (⌘ / Ctrl) toggles, a plain click on empty space clears, and dragging near the edges scrolls the container. Presses on items or interactive elements are left alone, so item clicks and drag-and-drop keep working.

- Import: `import { useMarqueeSelection } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-marquee-selection`

## Signature

```ts
useMarqueeSelection(options: UseMarqueeSelectionOptions): UseMarqueeSelectionResult
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `containerRef` (required) | `React.RefObject<HTMLElement \| null>` |  | The scrollable (or static) element the marquee is drawn in. Give it `position: relative` to render `box`. |
| `autoScroll` | `boolean \| { edge?: number; speed?: number }` |  | Scroll the container while dragging near its edges. `edge` is the zone in px, `speed` the max px per frame. |
| `clearOnClick` | `boolean` |  | A plain click on empty space clears the selection. Default true. |
| `defaultValue` | `string[]` |  | Initially selected ids when uncontrolled. |
| `disabled` | `boolean` | `false` | Disables marquee selection. |
| `getItemId` | `(element: Element) => string \| null` |  | Reads an item's id. Default: its `data-selection-id`, else its `id`. |
| `getItems` | `() => Iterable<MarqueeItem>` |  | Supplies the items directly (wins over `itemSelector`), e.g. `files.map(f => ({ id, element: byId(id) }))`. |
| `ignoreSelector` | `string` |  | Extra selector for elements a drag must not start on (added to `MARQUEE_IGNORE_SELECTOR`). |
| `itemSelector` | `string` |  | CSS selector for selectable items inside the container. Default `[data-selection-id]`. |
| `mode` | `"intersect" \| "contain"` |  | Whether an item must touch (`intersect`, default) or lie fully inside (`contain`) the marquee. |
| `onValueChange` | `(value: string[]) => void` |  | Called with the selected ids as the marquee changes the selection. |
| `threshold` | `number` |  | Pointer travel in px before a press becomes a marquee (so clicks stay clicks). Default 4. |
| `touch` | `boolean` |  | Start marquees from touch too. Off by default so touch drags keep scrolling; set `touch-action: none` when on. |
| `value` | `string[]` |  | Selected ids (controlled). |
