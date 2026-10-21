# CardBrandMark

> Plain typographic brand mark (no logos).

- Import: `import { CardBrandMark } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/security`)
- Source: `packages/ui/src/kits/billing/payment-card` (kit `billing`)
- `data-slot`: `card-brand-mark`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `brand` (required) | `CardBrand` |  | Card network (for example visa, mastercard or amex) whose mark to draw. |
