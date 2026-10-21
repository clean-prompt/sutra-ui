# WorktreeDialog

> Create a git worktree: name, base branch picker (recent / local / remote), path preview and session switch.

- Import: `import { WorktreeDialog } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/git-review-worktree` (kit `agent`)
- `data-slot`: `worktree-path`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `branches` (required) | `WorktreeBranch[]` |  | Branches the new worktree can start from. |
| `creating` | `boolean` | `false` | Shows a busy state on the create button while the worktree is being made. |
| `defaultBase` | `string` |  | Branch preselected as the base; defaults to the current branch, then the first local one. |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `defaultOpenInNewSession` | `boolean` | `true` | Initial state of the "open in a new session" checkbox. |
| `error` | `React.ReactNode` |  | Server-side error (e.g. from `git worktree add`). |
| `existingNames` | `string[]` | `[]` | Names already taken by branches or worktrees. Branch names are always included. |
| `onCreate` | `(values: WorktreeCreateValues) => void` |  | Called with the branch name, base and options when the user creates the worktree. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `open` | `boolean` |  | Controlled open state of the dialog. |
| `pathFor` | `(name: string) => string` |  | Custom path preview. |
| `worktreeRoot` | `string` | `"../worktrees"` | Folder new worktrees go in. Default "../worktrees". |

## Example (live: `#/components/browser-review/worktree-dialog` in the playground)

```tsx
import * as React from "react";
import { WorktreeDialog } from "@cleanprompt/sutra-ui/agent";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiGitForkLine } from "@cleanprompt/sutra-ui/icons";

function WorktreeDemo() {
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [last, setLast] = React.useState<string | null>(null);
  return (
    <div className="flex flex-col items-center gap-2">
      <Button leadingIcon={<RiGitForkLine />} onClick={() => setOpen(true)}>
        New worktree
      </Button>
      {last && <span className="font-mono text-xs text-muted-foreground">{last}</span>}
      <WorktreeDialog
        open={open}
        onOpenChange={setOpen}
        branches={branchList}
        worktreeRoot="~/code/.worktrees/sutra"
        creating={creating}
        onCreate={(v) => {
          setCreating(true);
          window.setTimeout(() => {
            setCreating(false);
            setOpen(false);
            setLast(`git worktree add ${v.path} -b ${v.name} ${v.base}${v.openInNewSession ? " (new session)" : ""}`);
          }, 600);
        }}
      />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): branchList.
