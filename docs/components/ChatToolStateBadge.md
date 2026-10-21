# ChatToolStateBadge

> Status pill for a tool call (a StatusBadge preset with a per-state icon).

- Import: `import { ChatToolStateBadge } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-tool` (kit `ai`)
- Part of [`ChatTool`](ChatTool.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `state` (required) | `ChatToolState` |  | Tool call state (`pending`, `running`, `completed`, `error` or a `TaskStatus`); sets the badge text, icon and tone. |

## Example (live: `#/components/ai/chat-tool` in the playground)

```tsx
import * as React from "react";
import { ChatTool, ChatToolApproval } from "@cleanprompt/sutra-ui/ai";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiSearchLine, RiTerminalBoxLine } from "@cleanprompt/sutra-ui/icons";

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
