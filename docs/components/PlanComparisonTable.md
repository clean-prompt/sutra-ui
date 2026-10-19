# PlanComparisonTable

> Feature × plan matrix with grouped sections, check/dash/value cells and a sticky header.

- Import: `import { PlanComparisonTable } from "@sutra/ui"` (or from `@sutra/ui/billing`)
- Source: `packages/ui/src/kits/billing/billing-plans` (kit `billing`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `plans` (required) | `Pick<BillingPlan, "id" \| "name" \| "recommended">[]` |  | Plans to show as columns (id, name and whether recommended). |
| `sections` (required) | `PlanComparisonSection[]` |  | Feature groups, each with a heading and rows of per-plan values. |
| `caption` | `string` | `"Plan comparison"` | Accessible table caption. |
| `maxHeight` | `number \| string` | `560` | Max height of the scroll box; the header stays sticky. |

## Example (live: `#/components/billing-marketing/plan-comparison` in the playground)

```tsx
import { PlanComparisonTable } from "@sutra/ui/billing";

<PlanComparisonTable plans={plans} sections={comparisonSections} maxHeight={420} />
```

Playground helpers in this snippet (not part of the library): comparisonSections, plans.
