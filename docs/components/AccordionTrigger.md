# AccordionTrigger

> Clickable header that toggles its section.

- Import: `import { AccordionTrigger } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/accordion` (primitives)
- Part of [`Accordion`](Accordion.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `AccordionIcon \| false` |  | Override the indicator for this trigger, or `false` to hide it. |
| `leadingIcon` | `React.ReactNode` |  | Icon shown before the title. |

## Notes

See the notes in [`Accordion`](Accordion.md#notes).

## Example

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@sutra/ui";

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
