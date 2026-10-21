# UpgradeDialog

> Plan comparison dialog with a monthly/yearly toggle and feature checklists.

- Import: `import { UpgradeDialog } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/modal-dialog-blocks-upgrade` (blocks)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `billing` | `"monthly" \| "yearly"` |  | Controlled billing period. Use with `onBillingChange`. |
| `className` | `string` |  | Classes for the dialog panel. |
| `currency` | `string` | `"$"` | Currency symbol shown before prices. |
| `currentPlan` | `string` | `"free"` | Id of the plan the user is on; its button reads "Current plan". |
| `defaultBilling` | `"monthly" \| "yearly"` | `"yearly"` | Initial billing period when uncontrolled. |
| `defaultOpen` | `boolean` |  | Initial open state when uncontrolled. |
| `onBillingChange` | `(billing: "monthly" \| "yearly") => void` |  | Called with the billing period the user picked. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `onSelectPlan` | `(planId: string, billing: "monthly" \| "yearly") => unknown` |  | Called with the plan id and the billing period when a plan is chosen. A returned promise shows a spinner on that plan. |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
| `plans` | `UpgradePlan[]` | `defaultPlans` | Plans to compare; each has an `id`, a `name`, monthly and yearly prices and a feature list. The default is demo data. |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog (rendered with `asChild`). |
