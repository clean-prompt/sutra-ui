# ContextUsageBreakdown

> Context-window bar (a StackedMeter with meter semantics) with per-category rows and an optional "Compact now" action. Also the body of the ContextMeter popover.

- Import: `import { ContextUsageBreakdown } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/ai/agent-usage` (kit `ai`)
- `data-slot`: `context-usage-summary`, `context-usage-percent`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `categories` (required) | `ContextUsageCategory[]` |  | Context categories (system prompt, tools, messages and so on), each with a label and a token count; reserved ones are excluded from `used`. |
| `max` (required) | `number` |  | Context window size in tokens. |
| `actionLayout` | `"inline" \| "block"` | `"inline"` | `inline` (default): small button on the right · `block`: full-width button, as in the ContextMeter popover. |
| `canCompact` | `boolean` | `true` | Default true. |
| `caption` | `React.ReactNode` |  | Short line under the bar, e.g. "Getting full". |
| `children` | `React.ReactNode` |  | Extra content between the rows and the compact button. |
| `compacting` | `boolean` | `false` | Shows a spinner on the compact button and disables it. |
| `compactingLabel` | `string` | `"Compacting…"` | Label while `compacting`. Default "Compacting…". |
| `compactLabel` | `string` | `"Compact now"` | Label of the compact button. Default "Compact now". |
| `freeLabel` | `string` | `"Free space"` | Label of the free-space row. Default "Free space". |
| `onCompact` | `() => void` |  | Called when the user presses the compact button; the button is hidden when unset. |
| `showFree` | `boolean` | `true` | Show the free-space row and track remainder. Default true. |
| `thresholds` | `MeterThresholds` |  | Percent thresholds for the summary color. |
| `title` | `React.ReactNode` | `"Context window"` | Default "Context window". |
| `used` | `number` |  | Tokens in use. Defaults to the sum of the non-reserved categories; a larger value adds an "Other" part. |
| `valueFormatter` | `(tokens: number) => string` | `formatAgentTokens` | Token formatter for the summary and rows. Default `formatAgentTokens` ("100k"). |

## Example (live: `#/components/agent-sessions/context-usage` in the playground)

```tsx
import * as React from "react";
import { ContextUsageBreakdown } from "@cleanprompt/sutra-ui/agent";

function ContextUsageDemo() {
  const [messages, setMessages] = React.useState(96_400);
  return (
    <>
      <div className="max-w-md">
        <ContextUsageBreakdown
          max={200_000}
          categories={[
            { key: "system", label: "System prompt", tokens: 3_100, color: "var(--muted-foreground)" },
            { key: "tools", label: "Tools", tokens: 14_800, color: "info" },
            { key: "memory", label: "Memory files", tokens: 2_400, color: "warning" },
            { key: "messages", label: "Messages", tokens: messages, color: "primary" },
          ]}
          onCompact={() => setMessages(12_000)}
        />
      </div>
    </>
  );
}
```
