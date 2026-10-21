---
component: Accordion
module: primitives/accordion
covers: AccordionItem, AccordionTrigger, AccordionContent
use: A vertical stack of sections that each open and close, for FAQs, settings groups and long forms. Five looks (`variant`), a chevron or plus indicator and opt-in `keepMounted` panels.
instead: Collapsible = one standalone disclosure; Tabs = one panel visible at a time and the labels always shown; Collapse = show or hide a block you control with your own state
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves between the triggers and into open panel content |
| Enter, Space | Opens or closes the focused section (native `<button>`) |
| ArrowDown, ArrowUp | Move focus to the next or previous trigger and wrap around; disabled triggers are skipped |
| Home, End | Focus the first or last trigger |

The list is vertical, so the arrow keys do not swap in RTL. Only a root passed `orientation="horizontal"` uses ArrowLeft and ArrowRight, and those swap in RTL (the root `dir` comes from the document or the nearest `DirectionProvider`).

## Screen readers
Each `AccordionTrigger` is a `button` with `aria-expanded` inside an `<h3>`, so sections appear in the heading outline. The panel is a `region` labelled by its trigger. A closed panel is removed from the tree (or hidden with `keepMounted`). In `type="single"` without `collapsible`, the open trigger gets `aria-disabled`. The chevron and plus are `aria-hidden`; a `leadingIcon` is not, so pass an `aria-hidden` icon.

## Reduced motion
The panel animates its height and opacity (`animate-accordion-down` and `animate-accordion-up`) and the indicator turns with `chevron-turn`. The reduced-motion net sets the panel animations to 1 ms and ends the transitions, so sections still change state, only instantly.

## Server rendering
Closed sections render only their triggers; sections open through `defaultValue` or `value` render their content in the server HTML. The root `dir` is read after mount (the server writes `ltr`), so in an RTL document the first server paint has `dir="ltr"` on the accordion until hydration settles it.

## Gotchas
- `type` is required by Radix: `"single"` (add `collapsible` to allow closing the open item) or `"multiple"`. Without `collapsible`, the open item cannot be closed by clicking it.
- On `AccordionContent`, `className` lands on the inner padding div, not on the Radix panel; other props (`style`, `data-*`, `forceMount`) go to the panel.
- `keepMounted` on `Accordion` keeps every closed panel in the tree, hidden with `data-[state=closed]:hidden`, so inputs keep their state; `AccordionContent keepMounted` overrides it per panel, and `forceMount` wins over both.
- `AccordionTrigger icon` overrides the root indicator for one section, and `icon={false}` hides it. The `FAQ` export of this module defaults to `icon="plus"`, the root to `"chevron"`.

## Example
```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <Accordion type="single" collapsible defaultValue="billing" variant="bordered" className="max-w-md">
      <AccordionItem value="billing">
        <AccordionTrigger>How does billing work?</AccordionTrigger>
        <AccordionContent>You are charged once a month for the seats you use.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="cancel">
        <AccordionTrigger>Can I cancel at any time?</AccordionTrigger>
        <AccordionContent>Yes. Your plan stays active until the end of the billing period.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="export">
        <AccordionTrigger>Can I export my data?</AccordionTrigger>
        <AccordionContent>Every project exports to CSV or JSON from its settings page.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
```
