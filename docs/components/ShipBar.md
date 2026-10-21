# ShipBar

> Bottom git action bar: branch, ahead/behind, commit message and a Commit / Commit & push / Create PR split button.

- Import: `import { ShipBar } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/git-review-ship` (kit `agent`)
- `data-slot`: `ship-bar`, `ship-disabled-reason`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `branch` (required) | `string` |  | Current branch name. |
| `changedCount` (required) | `number` |  | Files that would be committed. |
| `action` | `ShipAction` |  | Primary action of the split button. |
| `actionDisabledReasons` | `Partial<Record<ShipAction, string>>` |  | Extra per-action reasons (e.g. `{ pr: "GitHub CLI not signed in" }`). |
| `ahead` | `number` | `0` | Commits the branch is ahead of its upstream; with no changed files, a non-zero value still allows the `pr` action. |
| `baseBranch` | `string` |  | Branch the work will be merged into, shown beside the current branch. |
| `behind` | `number` | `0` | Commits the branch is behind its upstream; a non-zero value disables push and PR actions with a "Pull first" reason. |
| `branchStatus` | `BranchStatus` |  | Working-tree state of the branch (`clean`, `dirty` or `conflict`); adds a status dot to the branch pill. |
| `conflicts` | `number` | `0` | Number of conflicted files; a non-zero value disables every ship action with a "Resolve conflicts first" reason. |
| `defaultAction` | `ShipAction` | `"commit"` | Initial primary action when `action` is not controlled. |
| `defaultMessage` | `string` | `""` | Initial commit message when `message` is not controlled. |
| `delegateLabel` | `string` | `"Hand to agent"` | Label of the hand-to-agent button. Default "Hand to agent". |
| `error` | `React.ReactNode` |  | Failure message shown when `status` is `error`. |
| `generateSlot` | `React.ReactNode` |  | Custom content next to the message field (e.g. a suggestion chip). |
| `generating` | `boolean` | `false` | Shows a busy state on the Generate button while a message is being written. |
| `message` | `string` |  | Controlled commit message. |
| `onActionChange` | `(action: ShipAction) => void` |  | Called with the action (`commit`, `commit-push` or `pr`) when the user picks one from the split button. |
| `onCommit` | `(message: string) => void` |  | Called with the commit message when the user runs the `commit` action. |
| `onCommitAndPush` | `(message: string) => void` |  | Called with the commit message when the user runs the `commit-push` action. |
| `onCreatePR` | `(message: string) => void` |  | Called with the commit message when the user runs the `pr` action. |
| `onDelegate` | `() => void` |  | "Hand to agent": delegate committing / resolving to the agent. |
| `onGenerateMessage` | `() => void` |  | Adds a "Generate" button for the message. |
| `onMessageChange` | `(message: string) => void` |  | Called with the message on every edit. |
| `progressLabel` | `React.ReactNode` |  | Shown while running, e.g. "Pushing…". |
| `result` | `React.ReactNode` |  | Shown on success, e.g. "Committed a1b2c3d". |
| `status` | `ShipStatus` | `"idle"` | Progress of the ship action: `idle`, `running`, `success` or `error`. |

## Example (live: `#/components/browser-review/ship-bar` in the playground)

```tsx
import * as React from "react";
import { ShipBar } from "@cleanprompt/sutra-ui/agent";

function ShipDemo() {
  const [message, setMessage] = React.useState("");
  const [status, setStatus] = React.useState<ShipStatus>("idle");
  const [generating, setGenerating] = React.useState(false);
  const [result, setResult] = React.useState<string>("");
  const run = (label: string) => () => {
    setStatus("running");
    window.setTimeout(() => {
      setStatus("success");
      setResult(`${label} · a1b2c3d`);
      setMessage("");
    }, 900);
  };
  return (
    <div className="w-full space-y-4">
      <div className="overflow-hidden rounded-box border border-border">
        <ShipBar
          branch="feature/agent-browser-artifacts-and-git-review"
          baseBranch="main"
          ahead={2}
          behind={0}
          changedCount={7}
          message={message}
          onMessageChange={setMessage}
          generating={generating}
          onGenerateMessage={() => {
            setGenerating(true);
            window.setTimeout(() => {
              setMessage("feat(ui): agent browser, artifacts and git review set");
              setGenerating(false);
            }, 700);
          }}
          onCommit={run("Committed")}
          onCommitAndPush={run("Pushed")}
          onCreatePR={run("Opened PR #128")}
          onDelegate={() => setResult("Handed to Sutra")}
          status={status}
          progressLabel="Committing…"
          result={result}
        />
      </div>
      <div className="overflow-hidden rounded-box border border-border">
        <ShipBar branch="fix/merge-main" changedCount={3} conflicts={2} defaultMessage="Merge main" defaultAction={"commit-push" as ShipAction} onDelegate={() => {}} />
      </div>
      <div className="overflow-hidden rounded-box border border-border">
        <ShipBar branch="main" changedCount={0} ahead={0} behind={4} />
      </div>
    </div>
  );
}
```
