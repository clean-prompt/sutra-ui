import * as React from "react";
import { RiFolderLine, RiGitBranchLine, RiGitForkLine } from "@remixicon/react";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Input } from "../../primitives/input";
import { Label } from "../../primitives/label";
import { Combobox, type ComboboxOption } from "../../primitives/combobox";
import { SwitchField } from "../../primitives/switch";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../primitives/dialog";

/* ------------------------------------------------------------------ */
/* WorktreeDialog                                                      */
/* ------------------------------------------------------------------ */

export interface WorktreeBranch {
  name: string;
  /** Remote-tracking branch, e.g. `origin/main`. */
  remote?: boolean;
  /** Recently used: listed first. */
  recent?: boolean;
  /** Currently checked out. */
  current?: boolean;
}

export interface WorktreeCreateValues {
  name: string;
  base: string;
  path: string;
  openInNewSession: boolean;
}

/** Validate a worktree / branch name. Returns an error message or null. */
export function validateWorktreeName(name: string, existing: readonly string[] = []): string | null {
  const n = name.trim();
  if (!n) return "Name is required";
  if (/\s/.test(n)) return "No spaces allowed";
  if (/[~^:?*[\\\x00-\x1f\x7f]/.test(n)) return "Contains characters git doesn't allow";
  if (n.includes("..") || n.includes("@{") || n.includes("//")) return "Not a valid git ref name";
  if (/^[-/]|[/.]$|(^|\/)\.|\.lock(\/|$)/.test(n) || n === "@") return "Not a valid git ref name";
  if (existing.includes(n)) return `“${n}” already exists`;
  return null;
}

export interface WorktreeDialogProps {
  /** Controlled open state of the dialog. */
  open?: boolean;
  /** Initial open state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Branches the new worktree can start from. */
  branches: WorktreeBranch[];
  /** Branch preselected as the base; defaults to the current branch, then the first local one. */
  defaultBase?: string;
  /** Names already taken by branches or worktrees. Branch names are always included. */
  existingNames?: string[];
  /** Folder new worktrees go in. Default "../worktrees". */
  worktreeRoot?: string;
  /** Custom path preview. */
  pathFor?: (name: string) => string;
  /** Initial state of the "open in a new session" checkbox. */
  defaultOpenInNewSession?: boolean;
  /** Called with the branch name, base and options when the user creates the worktree. */
  onCreate?: (values: WorktreeCreateValues) => void;
  /** Shows a busy state on the create button while the worktree is being made. */
  creating?: boolean;
  /** Server-side error (e.g. from `git worktree add`). */
  error?: React.ReactNode;
}

/** Create a git worktree: name, base branch picker (recent / local / remote), path preview and session switch. */
export function WorktreeDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  branches,
  defaultBase,
  existingNames = [],
  worktreeRoot = "../worktrees",
  pathFor,
  defaultOpenInNewSession = true,
  onCreate,
  creating = false,
  error,
}: WorktreeDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const fallbackBase = defaultBase ?? branches.find((b) => b.current)?.name ?? branches.find((b) => !b.remote)?.name ?? "";
  const [name, setName] = React.useState("");
  const [base, setBase] = React.useState(fallbackBase);
  const [newSession, setNewSession] = React.useState(defaultOpenInNewSession);
  const [touched, setTouched] = React.useState(false);
  const nameId = React.useId();
  const baseLabelId = React.useId();
  const errId = React.useId();

  React.useEffect(() => {
    if (open) {
      setName("");
      setTouched(false);
      setBase(fallbackBase);
      setNewSession(defaultOpenInNewSession);
    }
    // Reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const options = React.useMemo<ComboboxOption[]>(() => {
    const opt = (b: WorktreeBranch, group: string): ComboboxOption => ({
      value: b.name,
      label: b.name,
      group,
      icon: <RiGitBranchLine aria-hidden />,
      description: b.current ? "current" : undefined,
    });
    return [
      ...branches.filter((b) => b.recent).map((b) => opt(b, "Recent")),
      ...branches.filter((b) => !b.recent && !b.remote).map((b) => opt(b, "Local branches")),
      ...branches.filter((b) => !b.recent && b.remote).map((b) => opt(b, "Remote branches")),
    ];
  }, [branches]);

  const taken = React.useMemo(() => [...existingNames, ...branches.map((b) => b.name)], [existingNames, branches]);
  const nameError = validateWorktreeName(name, taken);
  const baseError = base ? null : "Pick a base branch";
  const trimmed = name.trim();
  const path = trimmed ? (pathFor ? pathFor(trimmed) : `${worktreeRoot.replace(/\/$/, "")}/${trimmed.replace(/\//g, "-")}`) : "";
  const showNameError = touched && nameError;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (nameError || baseError || creating) return;
    onCreate?.({ name: trimmed, base, path, openInNewSession: newSession });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="contents">
          <DialogHeader icon={<RiGitForkLine aria-hidden />}>
            <DialogTitle>New worktree</DialogTitle>
            <DialogDescription>Work on a branch in its own folder without touching your current checkout.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={nameId} required>
                Branch name
              </Label>
              <Input
                id={nameId}
                value={name}
                placeholder="feat/new-idea"
                autoComplete="off"
                spellCheck={false}
                invalid={!!showNameError}
                aria-invalid={!!showNameError}
                aria-describedby={showNameError ? errId : undefined}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => name && setTouched(true)}
              />
              {showNameError && (
                <p id={errId} role="alert" className="text-xs text-destructive">
                  {nameError}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label id={baseLabelId}>Base branch</Label>
              <Combobox
                aria-labelledby={baseLabelId}
                options={options}
                value={base}
                onValueChange={(v) => setBase(v)}
                placeholder="Select a branch"
                searchPlaceholder="Search branches…"
                emptyText="No branches match"
                invalid={touched && !!baseError}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Path</span>
              <div
                data-slot="worktree-path"
                className="flex min-h-8 items-center gap-1.5 rounded-control border border-dashed border-border bg-subtle px-2.5 font-mono text-xs text-muted-foreground"
              >
                <RiFolderLine className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{path || `${worktreeRoot}/…`}</span>
              </div>
            </div>
            <SwitchField
              label="Open in new session"
              description="Start a fresh agent session inside the worktree."
              checked={newSession}
              onCheckedChange={setNewSession}
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating} disabled={creating || (touched && (!!nameError || !!baseError))}>
              Create worktree
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
