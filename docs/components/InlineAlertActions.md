# InlineAlertActions

> Row of buttons/links under the description.

- Import: `import { InlineAlertActions } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/inline-alert` (primitives)
- Part of [`InlineAlert`](InlineAlert.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

## Notes

See the notes in [`InlineAlert`](InlineAlert.md#notes).

## Example

```tsx
import * as React from "react";
import { Button, InlineAlert, InlineAlertActions, InlineAlertDescription, InlineAlertTitle } from "@sutra/ui";

export function Example() {
  const [visible, setVisible] = React.useState(true);
  if (!visible) return null;
  return (
    <InlineAlert tone="warning" onDismiss={() => setVisible(false)}>
      <InlineAlertTitle>Billing address is missing</InlineAlertTitle>
      <InlineAlertDescription>Invoices are paused until you add an address to your account.</InlineAlertDescription>
      <InlineAlertActions>
        <Button size="sm">Add address</Button>
        <Button size="sm" variant="ghost" onClick={() => setVisible(false)}>
          Remind me later
        </Button>
      </InlineAlertActions>
    </InlineAlert>
  );
}
```
