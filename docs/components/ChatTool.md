# ChatTool

> Collapsible tool-call card with state badge, input and output. Children replace the default body.

- Import: `import { ChatTool } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-tool` (kit `ai`)
- Parts: [`ChatToolApproval`](ChatToolApproval.md), [`ChatToolStateBadge`](ChatToolStateBadge.md)
- Also accepts the props of HTMLAttributes, CollapsibleProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `React.ReactNode` |  | Tool name, e.g. "web_search". |
| `duration` | `number` |  | Duration in milliseconds. |
| `errorText` | `React.ReactNode` |  | Error text shown when `state` is "failed" (or the legacy "error"). |
| `icon` | `React.ReactNode` |  | Replaces the default tool icon. |
| `input` | `unknown` |  | Arguments passed to the tool (rendered as JSON). |
| `output` | `unknown` |  | Tool result (rendered as JSON). |
| `state` | `ChatToolState` | `"completed"` | State of the tool call; shows a state badge and, while `running`, a spinner. |

## Part props

### ChatToolApproval

Human-in-the-loop prompt: shows the pending tool call with Approve / Deny buttons.

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `React.ReactNode` |  | Tool name awaiting approval. |
| `approveLabel` | `string` | `"Approve"` | Label of the approve button. Default "Approve". |
| `denyLabel` | `string` | `"Deny"` | Label of the deny button. Default "Deny". |
| `description` | `React.ReactNode` |  | Explains what approving does; replaces the default help text. |
| `icon` | `React.ReactNode` |  | Replaces the default tool icon. |
| `input` | `unknown` |  | Arguments the tool will run with. |
| `onApprove` | `() => void` |  | Called when the user approves the call. |
| `onDecision` | `(decision: PermissionDecision) => void` |  | Numbered variant: full decision payload (choice, scope, feedback). |
| `onDeny` | `() => void` |  | Called when the user denies the call. |
| `permissionProps` | `Partial<PermissionPromptProps>` |  | Numbered variant: extra props for the inner `PermissionPrompt`. |
| `status` | `ChatToolApprovalStatus` | `"pending"` | Decision state: `pending` shows the approve and deny buttons, `approved` and `denied` show the outcome. |
| `title` | `React.ReactNode` | `"Approval required"` | Heading of the card. Default "Approval required". |
| `variant` | `"default" \| "numbered"` | `"default"` | "numbered" renders a keyboard-driven `PermissionPrompt` (Yes / Always / No with feedback). Default "default". |

### ChatToolStateBadge

Status pill for a tool call (a StatusBadge preset with a per-state icon).

| Prop | Type | Default | Description |
|---|---|---|---|
| `state` (required) | `ChatToolState` |  | Tool call state (`pending`, `running`, `completed`, `error` or a `TaskStatus`); sets the badge text, icon and tone. |

## Example (live: `#/components/ai/chat-tool` in the playground)

```tsx
import * as React from "react";
import { ChatTool, ChatToolApproval } from "@sutra/ui/ai";
import { Button } from "@sutra/ui/core";
import { RiSearchLine, RiTerminalBoxLine } from "@sutra/ui/icons";

function ChatToolDemo() {
  const [approval, setApproval] = React.useState<ChatToolApprovalStatus>("pending");

  return (
    <>
      <div className="grid gap-3">
        <ChatTool name="get_weather" state="pending" input={{ city: "Lisbon", units: "metric" }} />
        <ChatTool name="web_search" state="running" icon={<RiSearchLine />} input={{ query: "best espresso machines 2026" }} />
        <ChatTool
          name="run_sql"
          state="succeeded"
          icon={<RiTerminalBoxLine />}
          duration={182}
          defaultOpen
          input={{ query: "SELECT plan, COUNT(*) FROM accounts GROUP BY plan" }}
          output={[
            { plan: "free", count: 8421 },
            { plan: "pro", count: 1290 },
            { plan: "enterprise", count: 64 },
          ]}
        />
        <ChatTool
          name="send_email"
          state="failed"
          duration={2400}
          input={{ to: "team@acme.co", subject: "Weekly report" }}
          errorText="SMTP server rejected the message: daily sending limit reached."
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          {/* Approval */}
          {approval !== "pending" && (
            <Button size="xs" variant="ghost" onClick={() => setApproval("pending")}>
              Reset
            </Button>
          )}
        </div>
        <ChatToolApproval
          name="delete_files"
          status={approval}
          description="The assistant wants to permanently delete 3 files from your Drive."
          input={{ paths: ["/drafts/old-logo.png", "/drafts/notes.txt", "/tmp/export.csv"] }}
          onApprove={() => setApproval("approved")}
          onDeny={() => setApproval("denied")}
        />
      </div>
    </>
  );
}
```
