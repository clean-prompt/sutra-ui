# OnboardingChecklist

> Milestone checklist with completed / next / upcoming states, "Show me" actions, progress and dismiss. Built on `Steps` and `Progress`.

- Import: `import { OnboardingChecklist } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-onboarding` (kit `agent`)
- `data-slot`: `onboarding-checklist`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `OnboardingMilestone[]` |  | Milestones in order, each with a title, description and completed state. |
| `description` | `React.ReactNode` |  | Helper text under the title. |
| `nextId` | `string` |  | Highlighted item. Defaults to the first incomplete milestone. |
| `onDismiss` | `() => void` |  | Called when the user dismisses the checklist; the close button is hidden when unset. |
| `onShowMe` | `(id: string) => void` |  | Called with the milestone id when the user presses the action of the next milestone ("Show me"). |
| `title` | `React.ReactNode` | `"Get started"` | Default "Get started". |

## Example (live: `#/components/agent-sessions/onboarding-checklist` in the playground)

```tsx
import * as React from "react";
import { OnboardingChecklist } from "@sutra/ui/agent";
import { Button } from "@sutra/ui/core";

function OnboardingDemo() {
  const [done, setDone] = React.useState<string[]>(["ask"]);
  const [dismissed, setDismissed] = React.useState(false);
  const items = [
    { id: "ask", title: "Ask about your codebase", description: "Try “How is auth wired up?”" },
    { id: "edit", title: "Make your first edit", description: "Ask for a small change and review the diff." },
    { id: "run", title: "Run a command", description: "Let the agent run your tests." },
    { id: "plan", title: "Plan a larger change", description: "Switch to plan mode before a refactor." },
  ].map((i) => ({ ...i, completed: done.includes(i.id) }));
  return (
    <>
      {dismissed ? (
        <Button variant="outline" size="sm" onClick={() => setDismissed(false)}>
          Show checklist again
        </Button>
      ) : (
        <div className="max-w-md">
          <OnboardingChecklist
            items={items}
            description="Four quick steps to learn the ropes."
            onShowMe={(id) => setDone((d) => [...d, id])}
            onDismiss={() => setDismissed(true)}
          />
        </div>
      )}
    </>
  );
}
```
