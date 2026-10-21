# ContextBanner

> Banner with an icon, message, name pill, action and optional expandable command output (a compact `InlineAlert`).

- Import: `import { ContextBanner } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-transcript` (kit `agent`)
- `data-slot`: `context-banner-name`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `action` | `ContextBannerAction` |  | Call-to-action button with a label, click handler and optional loading state. |
| `defaultExpanded` | `boolean` | `false` | Whether `output` starts revealed. |
| `icon` | `React.ReactNode` |  | Replaces the default icon of the variant. |
| `name` | `string` |  | Name rendered as a mono pill after the message (worktree, branch…). |
| `nameIcon` | `React.ReactNode` | `<RiGitBranchLine aria-hidden />` | Icon inside the name pill. |
| `onDismiss` | `() => void` |  | Called when the user dismisses the banner; the close button is hidden when unset. |
| `output` | `string` |  | Command output revealed by a "Show output" toggle. |
| `outputLabel` | `string` | `"output"` | Label of the toggle that reveals `output`. |
| `variant` | `"info" \| "warning"` | `"info"` | `info` for neutral notices, `warning` for ones that need attention. |

## Example (live: `#/components/agent-sessions/context-banner` in the playground)

```tsx
import * as React from "react";
import { ContextBanner } from "@cleanprompt/sutra-ui/agent";
import { RiGitBranchLine } from "@cleanprompt/sutra-ui/icons";

function ContextBannerDemo() {
  const [checking, setChecking] = React.useState(false);
  return (
    <>
      <ContextBanner name="feat-x" nameIcon={<RiGitBranchLine aria-hidden />}>
        This session is in worktree
      </ContextBanner>
      <ContextBanner
        name="feat/dark-mode"
        action={{
          label: "Checkout",
          loading: checking,
          onClick: () => {
            setChecking(true);
            setTimeout(() => setChecking(false), 1200);
          },
        }}
      >
        This session was started on branch
      </ContextBanner>
      <ContextBanner
        variant="warning"
        name="feat/dark-mode"
        output={`error: Your local changes to the following files would be overwritten by checkout:\n\tsrc/app/layout.tsx\nPlease commit your changes or stash them before you switch branches.\nAborting`}
        action={{ label: "Retry" }}
      >
        Branch checkout failed
      </ContextBanner>
    </>
  );
}
```
