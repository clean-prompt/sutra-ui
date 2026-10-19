# OnboardingDialog

> Multi-step onboarding with a step indicator, content slots and Back/Next navigation.

- Import: `import { OnboardingDialog } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/modal-dialog-blocks-onboarding` (blocks)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` |  | Classes for the dialog panel. |
| `defaultOpen` | `boolean` |  | Initial open state when uncontrolled. |
| `defaultStep` | `number` | `0` | Initial step index when uncontrolled. |
| `finishLabel` | `React.ReactNode` | `"Get started"` | Text of the button on the last step. |
| `onComplete` | `() => unknown` |  | Called when the user finishes the last step. A returned promise shows a spinner; throw to show the error message. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `onStepChange` | `(step: number) => void` |  | Called with the new step index when the user moves between steps. |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
| `step` | `number` |  | Controlled index of the current step. Use with `onStepChange`. |
| `steps` | `OnboardingStep[]` |  | Custom steps. Defaults to pick apps → name workspace → preferences. |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog (rendered with `asChild`). |
