import * as React from "react";
import {
  RiArrowDownLine,
  RiArrowDownSLine,
  RiArrowUpLine,
  RiCheckLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiFileCopyLine,
  RiFolderLine,
  RiGitBranchLine,
  RiGitCommitLine,
  RiGitForkLine,
  RiGitPullRequestLine,
  RiRobot2Line,
  RiSparkling2Line,
  RiUploadCloud2Line,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useCopy } from "../hooks/use-copy";
import { Button } from "./button";
import { Spinner } from "./spinner";
import { Textarea } from "./textarea";
import { Input } from "./input";
import { Label } from "./label";
import { Combobox, type ComboboxOption } from "./combobox";
import { SwitchField } from "./switch";
import { SegmentedControl } from "./segmented-control";
import { TreeView, type TreeNode } from "./tree-view";
import { DiffStat } from "./diff-viewer";
import { FileFormatIcon } from "../assets/file-format";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

/* ------------------------------------------------------------------ */
/* Types & helpers                                                     */
/* ------------------------------------------------------------------ */

export type ChangedFileStatus = "added" | "modified" | "deleted" | "renamed" | "untracked" | "conflicted";

export interface ChangedFile {
  path: string;
  status?: ChangedFileStatus;
  additions?: number;
  deletions?: number;
  /** Previous path for renames. */
  oldPath?: string;
}

const statusMeta: Record<ChangedFileStatus, { letter: string; label: string; className: string }> = {
  added: { letter: "A", label: "added", className: "text-success" },
  modified: { letter: "M", label: "modified", className: "text-warning" },
  deleted: { letter: "D", label: "deleted", className: "text-destructive" },
  renamed: { letter: "R", label: "renamed", className: "text-info" },
  untracked: { letter: "U", label: "untracked", className: "text-success" },
  conflicted: { letter: "!", label: "conflicted", className: "text-destructive" },
};

/** One-letter git status code (A / M / D / R / U / !). */
export function gitStatusLetter(status: ChangedFileStatus = "modified") {
  return statusMeta[status].letter;
}

/** Split a path into its directory (with trailing slash) and base name. */
export function splitFilePath(path: string): { dir: string; base: string } {
  const i = path.lastIndexOf("/");
  return i < 0 ? { dir: "", base: path } : { dir: path.slice(0, i + 1), base: path.slice(i + 1) };
}

/** Truncate a branch name from the head so the tail (the distinctive part) stays visible. */
export function truncateBranchHead(name: string, max: number): string {
  if (max <= 0) return "";
  if (name.length <= max) return name;
  if (max === 1) return "…";
  return `…${name.slice(name.length - (max - 1))}`;
}

/** Sum additions / deletions over files. */
export function sumChangedFiles(files: readonly ChangedFile[]) {
  return files.reduce(
    (acc, f) => ({ additions: acc.additions + (f.additions ?? 0), deletions: acc.deletions + (f.deletions ?? 0) }),
    { additions: 0, deletions: 0 }
  );
}

/** Colored status letter with a screen-reader label. */
export function GitStatusLetter({ status = "modified", className }: { status?: ChangedFileStatus; className?: string }) {
  const m = statusMeta[status];
  return (
    <span data-status={status} title={m.label} className={cn("inline-flex w-3 shrink-0 justify-center font-mono text-xs font-semibold", m.className, className)}>
      <span aria-hidden>{m.letter}</span>
      <span className="sr-only">{m.label}</span>
    </span>
  );
}

function FilePathLabel({ path, className }: { path: string; className?: string }) {
  const { dir, base } = splitFilePath(path);
  return (
    <span className={cn("flex min-w-0 items-baseline font-mono text-xs", className)} title={path}>
      {dir && <span className="truncate text-muted-foreground [direction:rtl]">{"‎" + dir}</span>}
      <span className="shrink-0 text-foreground">{base}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* BranchPill                                                          */
/* ------------------------------------------------------------------ */

export type BranchStatus = "clean" | "dirty" | "conflict";

export interface BranchPillProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  name: string;
  /** Max visible characters; longer names lose their head. Default 28. */
  maxLength?: number;
  status?: BranchStatus;
  /** Copy button. Default true. */
  copyable?: boolean;
  size?: "sm" | "md";
}

const branchStatusMeta: Record<BranchStatus, { label: string; dot: string }> = {
  clean: { label: "clean", dot: "bg-success" },
  dirty: { label: "uncommitted changes", dot: "bg-warning" },
  conflict: { label: "merge conflicts", dot: "bg-destructive" },
};

/** Branch name chip: icon, head-truncated name, optional status dot and copy button. */
export const BranchPill = React.forwardRef<HTMLSpanElement, BranchPillProps>(
  ({ name, maxLength = 28, status, copyable = true, size = "md", className, ...props }, ref) => {
    const { copied, copy } = useCopy();
    const shown = truncateBranchHead(name, maxLength);
    return (
      <span
        ref={ref}
        data-slot="branch-pill"
        data-status={status}
        className={cn(
          "inline-flex max-w-full min-w-0 items-center gap-1 rounded-control border border-border bg-subtle font-mono text-foreground",
          size === "sm" ? "h-6 px-1.5 text-2xs [&_svg]:size-3" : "h-7 px-2 text-xs [&_svg]:size-3.5",
          className
        )}
        {...props}
      >
        <RiGitBranchLine aria-hidden className="shrink-0 text-muted-foreground" />
        <span className="truncate" title={name}>
          <span aria-hidden>{shown}</span>
          <span className="sr-only">{name}</span>
        </span>
        {status && (
          <span className="flex shrink-0 items-center" title={branchStatusMeta[status].label}>
            <span aria-hidden className={cn("size-1.5 rounded-full", branchStatusMeta[status].dot)} />
            <span className="sr-only">, {branchStatusMeta[status].label}</span>
          </span>
        )}
        {copyable && (
          <button
            type="button"
            aria-label={copied ? "Copied branch name" : "Copy branch name"}
            onClick={() => void copy(name)}
            className={cn("-mr-1 flex shrink-0 items-center rounded-xs p-0.5 text-muted-foreground hover:text-foreground", focusRing)}
          >
            {copied ? <RiCheckLine /> : <RiFileCopyLine />}
          </button>
        )}
      </span>
    );
  }
);
BranchPill.displayName = "BranchPill";

/* ------------------------------------------------------------------ */
/* ChangedFilesCard                                                    */
/* ------------------------------------------------------------------ */

export interface ChangedFilesCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  files: ChangedFile[];
  /** Override the "N files changed" heading. */
  title?: React.ReactNode;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Files visible while collapsed. Default 4. */
  collapsedCount?: number;
  onReview?: () => void;
  reviewLabel?: string;
  onOpenFile?: (file: ChangedFile) => void;
}

/** Transcript card summarizing changed files ("N files changed +X −Y") with a Review action. */
export const ChangedFilesCard = React.forwardRef<HTMLDivElement, ChangedFilesCardProps>(
  (
    {
      files,
      title,
      expanded: expandedProp,
      defaultExpanded = false,
      onExpandedChange,
      collapsedCount = 4,
      onReview,
      reviewLabel = "Review",
      onOpenFile,
      className,
      ...props
    },
    ref
  ) => {
    const [expanded, setExpanded] = useControllableState({ value: expandedProp, defaultValue: defaultExpanded, onChange: onExpandedChange });
    const totals = sumChangedFiles(files);
    const visible = expanded ? files : files.slice(0, collapsedCount);
    const hidden = files.length - visible.length;
    const headingId = React.useId();
    const listId = React.useId();
    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={headingId}
        data-slot="changed-files-card"
        className={cn("overflow-hidden rounded-box border border-border bg-card text-card-foreground shadow-xs", className)}
        {...props}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <RiGitCommitLine className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span id={headingId} className="text-sm font-medium">
            {title ?? `${files.length} ${files.length === 1 ? "file" : "files"} changed`}
          </span>
          <DiffStat additions={totals.additions} deletions={totals.deletions} />
          {onReview && (
            <Button type="button" size="xs" variant="secondary" className="ml-auto" onClick={onReview}>
              {reviewLabel}
            </Button>
          )}
        </div>
        {files.length > 0 && (
          <ul id={listId} className="border-t border-border py-1">
            {visible.map((f) => {
              const row = (
                <>
                  <FileFormatIcon ext={f.path} size={18} />
                  <FilePathLabel path={f.path} className="flex-1" />
                  {f.status && f.status !== "modified" && <GitStatusLetter status={f.status} />}
                  <DiffStat additions={f.additions ?? 0} deletions={f.deletions ?? 0} showBar={false} />
                </>
              );
              return (
                <li key={f.path}>
                  {onOpenFile ? (
                    <button
                      type="button"
                      onClick={() => onOpenFile(f)}
                      aria-label={`Open ${f.path}`}
                      className={cn("flex w-full min-w-0 items-center gap-2 px-3 py-1 text-left hover:bg-accent", focusRing)}
                    >
                      {row}
                    </button>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2 px-3 py-1">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {(hidden > 0 || (expanded && files.length > collapsedCount)) && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "flex w-full items-center justify-center gap-1 border-t border-border py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground",
              focusRing
            )}
          >
            {expanded ? "Show less" : `Show ${hidden} more`}
            <RiArrowDownSLine aria-hidden className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>
    );
  }
);
ChangedFilesCard.displayName = "ChangedFilesCard";

/* ------------------------------------------------------------------ */
/* ReviewScopeTabs                                                     */
/* ------------------------------------------------------------------ */

export type ReviewScope = "uncommitted" | "branch" | "turn";

export interface ReviewScopeTabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "dir" | "onChange"> {
  value?: ReviewScope;
  defaultValue?: ReviewScope;
  onValueChange?: (scope: ReviewScope) => void;
  /** File counts per scope. */
  counts?: Partial<Record<ReviewScope, number>>;
  /** Base branch for the "Branch vs base" label. */
  baseBranch?: string;
  /** Hide scopes, e.g. "turn" outside a session. */
  scopes?: ReviewScope[];
  size?: "sm" | "md" | "lg";
}

/** Uncommitted / Branch vs base / Last turn scope switch with file counts. */
export const ReviewScopeTabs = React.forwardRef<HTMLDivElement, ReviewScopeTabsProps>(
  (
    { value, defaultValue = "uncommitted", onValueChange, counts = {}, baseBranch, scopes = ["uncommitted", "branch", "turn"], size = "sm", className, ...props },
    ref
  ) => {
    const [scope, setScope] = useControllableState<ReviewScope>({ value, defaultValue, onChange: onValueChange });
    const labels: Record<ReviewScope, string> = {
      uncommitted: "Uncommitted",
      branch: baseBranch ? `vs ${baseBranch}` : "Branch vs base",
      turn: "Last turn",
    };
    return (
      <SegmentedControl
        ref={ref as React.Ref<HTMLDivElement>}
        aria-label="Review scope"
        size={size}
        value={scope}
        onValueChange={(v) => v && setScope(v as ReviewScope)}
        className={className}
        options={scopes.map((s) => ({
          value: s,
          label: (
            <span className="inline-flex items-center gap-1.5">
              {labels[s]}
              {counts[s] != null && (
                <span data-slot="scope-count" className="rounded-full bg-muted px-1.5 text-2xs tabular-nums text-muted-foreground">
                  {counts[s]}
                </span>
              )}
            </span>
          ),
        }))}
        {...(props as object)}
      />
    );
  }
);
ReviewScopeTabs.displayName = "ReviewScopeTabs";

/* ------------------------------------------------------------------ */
/* ReviewFileTree                                                      */
/* ------------------------------------------------------------------ */

interface DirBuild {
  name: string;
  path: string;
  dirs: Map<string, DirBuild>;
  files: ChangedFile[];
}

/** Build a compacted directory tree (single-child folders merged, e.g. `src/components`). */
export function buildChangedFileTree(
  files: readonly ChangedFile[],
  renderFile: (file: ChangedFile) => React.ReactNode = (f) => splitFilePath(f.path).base
): TreeNode[] {
  const root: DirBuild = { name: "", path: "", dirs: new Map(), files: [] };
  for (const f of files) {
    const parts = f.path.split("/");
    let node = root;
    for (const part of parts.slice(0, -1)) {
      const p = node.path ? `${node.path}/${part}` : part;
      let next = node.dirs.get(part);
      if (!next) {
        next = { name: part, path: p, dirs: new Map(), files: [] };
        node.dirs.set(part, next);
      }
      node = next;
    }
    node.files.push(f);
  }
  const toNodes = (d: DirBuild): TreeNode[] => {
    const dirs = [...d.dirs.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((sub) => {
        let cur = sub;
        let label = sub.name;
        while (cur.files.length === 0 && cur.dirs.size === 1) {
          cur = [...cur.dirs.values()][0]!;
          label = `${label}/${cur.name}`;
        }
        return { id: `dir:${cur.path}`, label, textValue: label, children: toNodes(cur) } satisfies TreeNode;
      });
    const fls = [...d.files]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((f) => ({ id: f.path, label: renderFile(f), textValue: splitFilePath(f.path).base }) satisfies TreeNode);
    return [...dirs, ...fls];
  };
  return toNodes(root);
}

function collectDirIds(nodes: TreeNode[], out: string[] = []) {
  for (const n of nodes) {
    if (n.children?.length) {
      out.push(n.id);
      collectDirIds(n.children, out);
    }
  }
  return out;
}

export interface ReviewFileTreeProps
  extends Omit<React.HTMLAttributes<HTMLUListElement>, "onSelect" | "defaultValue" | "children" | "defaultChecked"> {
  files: ChangedFile[];
  /** Selected file path. */
  selected?: string | null;
  defaultSelected?: string | null;
  onSelectedChange?: (path: string | null) => void;
  /** Called on click / Enter on a file. */
  onOpenFile?: (file: ChangedFile) => void;
  /** Per-file +/− counts. Default false. */
  showStats?: boolean;
  size?: "sm" | "md";
}

/** Changed files as a directory tree with colored A / M / D / R status letters and single selection. */
export const ReviewFileTree = React.forwardRef<HTMLUListElement, ReviewFileTreeProps>(
  ({ files, selected, defaultSelected = null, onSelectedChange, onOpenFile, showStats = false, size = "sm", className, ...props }, ref) => {
    const [sel, setSel] = useControllableState<string | null>({ value: selected, defaultValue: defaultSelected, onChange: onSelectedChange });
    const byPath = React.useMemo(() => new Map(files.map((f) => [f.path, f])), [files]);
    const nodes = React.useMemo(
      () =>
        buildChangedFileTree(files, (f) => (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className={cn("truncate", f.status === "deleted" && "text-muted-foreground line-through")}>{splitFilePath(f.path).base}</span>
            {showStats && (f.additions != null || f.deletions != null) && (
              <DiffStat additions={f.additions ?? 0} deletions={f.deletions ?? 0} showBar={false} className="ml-auto text-2xs" />
            )}
            <GitStatusLetter status={f.status} className={showStats ? undefined : "ml-auto"} />
          </span>
        )),
      [files, showStats]
    );
    const expanded = React.useMemo(() => collectDirIds(nodes), [nodes]);
    return (
      <TreeView
        ref={ref}
        aria-label="Changed files"
        size={size}
        nodes={nodes}
        defaultExpanded={expanded}
        selectionMode="single"
        selected={sel ? [sel] : []}
        onSelectedChange={(ids) => {
          const id = ids[0];
          if (id && byPath.has(id)) setSel(id);
        }}
        onNodeAction={(n) => {
          const f = byPath.get(n.id);
          if (f) onOpenFile?.(f);
        }}
        className={className}
        {...props}
      />
    );
  }
);
ReviewFileTree.displayName = "ReviewFileTree";

/* ------------------------------------------------------------------ */
/* ShipBar                                                             */
/* ------------------------------------------------------------------ */

export type ShipAction = "commit" | "commit-push" | "pr";
export type ShipStatus = "idle" | "running" | "success" | "error";

export interface ShipState {
  changedCount: number;
  conflicts?: number;
  message: string;
  ahead?: number;
  behind?: number;
}

const shipActionMeta: Record<ShipAction, { label: string; description: string; icon: React.ReactNode }> = {
  commit: { label: "Commit", description: "Record changes locally", icon: <RiGitCommitLine /> },
  "commit-push": { label: "Commit & push", description: "Commit, then push to the remote", icon: <RiUploadCloud2Line /> },
  pr: { label: "Create PR", description: "Commit, push and open a pull request", icon: <RiGitPullRequestLine /> },
};

/** Why an action can't run right now, or null when it can. */
export function getShipDisabledReason(action: ShipAction, s: ShipState): string | null {
  const conflicts = s.conflicts ?? 0;
  if (conflicts > 0) return `Resolve ${conflicts} ${conflicts === 1 ? "conflict" : "conflicts"} first`;
  const needsCommit = s.changedCount > 0;
  if (!needsCommit) {
    if (action === "pr" && (s.ahead ?? 0) > 0) return null;
    return action === "pr" ? "No commits to open a PR with" : "Nothing to commit";
  }
  if (!s.message.trim()) return "Write a commit message";
  if (action !== "commit" && (s.behind ?? 0) > 0) return `Branch is ${s.behind} behind. Pull first`;
  return null;
}

export interface ShipBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  branch: string;
  branchStatus?: BranchStatus;
  baseBranch?: string;
  ahead?: number;
  behind?: number;
  /** Files that would be committed. */
  changedCount: number;
  conflicts?: number;
  message?: string;
  defaultMessage?: string;
  onMessageChange?: (message: string) => void;
  /** Adds a "Generate" button for the message. */
  onGenerateMessage?: () => void;
  generating?: boolean;
  /** Custom content next to the message field (e.g. a suggestion chip). */
  generateSlot?: React.ReactNode;
  /** Primary action of the split button. */
  action?: ShipAction;
  defaultAction?: ShipAction;
  onActionChange?: (action: ShipAction) => void;
  onCommit?: (message: string) => void;
  onCommitAndPush?: (message: string) => void;
  onCreatePR?: (message: string) => void;
  /** "Hand to agent": delegate committing / resolving to the agent. */
  onDelegate?: () => void;
  delegateLabel?: string;
  /** Extra per-action reasons (e.g. `{ pr: "GitHub CLI not signed in" }`). */
  actionDisabledReasons?: Partial<Record<ShipAction, string>>;
  status?: ShipStatus;
  /** Shown while running, e.g. "Pushing…". */
  progressLabel?: React.ReactNode;
  /** Shown on success, e.g. "Committed a1b2c3d". */
  result?: React.ReactNode;
  error?: React.ReactNode;
}

/** Bottom git action bar: branch, ahead/behind, commit message and a Commit / Commit & push / Create PR split button. */
export const ShipBar = React.forwardRef<HTMLDivElement, ShipBarProps>(
  (
    {
      branch,
      branchStatus,
      baseBranch,
      ahead = 0,
      behind = 0,
      changedCount,
      conflicts = 0,
      message: messageProp,
      defaultMessage = "",
      onMessageChange,
      onGenerateMessage,
      generating = false,
      generateSlot,
      action: actionProp,
      defaultAction = "commit",
      onActionChange,
      onCommit,
      onCommitAndPush,
      onCreatePR,
      onDelegate,
      delegateLabel = "Hand to agent",
      actionDisabledReasons,
      status = "idle",
      progressLabel,
      result,
      error,
      className,
      ...props
    },
    ref
  ) => {
    const [message, setMessage] = useControllableState({ value: messageProp, defaultValue: defaultMessage, onChange: onMessageChange });
    const [action, setAction] = useControllableState<ShipAction>({ value: actionProp, defaultValue: defaultAction, onChange: onActionChange });
    const reasonId = React.useId();
    const running = status === "running";
    const state: ShipState = { changedCount, conflicts, message, ahead, behind };
    const reasonFor = (a: ShipAction) => actionDisabledReasons?.[a] ?? getShipDisabledReason(a, state);
    const reason = reasonFor(action);
    const disabled = running || reason != null;

    const run = (a: ShipAction) => {
      if (running || reasonFor(a) != null) return;
      const m = message.trim();
      if (a === "commit") onCommit?.(m);
      else if (a === "commit-push") onCommitAndPush?.(m);
      else onCreatePR?.(m);
    };

    const meta = shipActionMeta[action];
    const delegateDisabled = running || (changedCount === 0 && conflicts === 0);

    return (
      <div
        ref={ref}
        role="region"
        aria-label="Commit and ship"
        data-slot="ship-bar"
        data-status={status}
        className={cn("flex flex-col gap-2 border-t border-border bg-card px-3 py-2.5", className)}
        {...props}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <BranchPill name={branch} status={branchStatus ?? (conflicts > 0 ? "conflict" : changedCount > 0 ? "dirty" : "clean")} size="sm" maxLength={32} />
          {baseBranch && <span className="truncate">into {baseBranch}</span>}
          <span className="inline-flex items-center gap-0.5 tabular-nums" aria-label={`${ahead} ahead`} title={`${ahead} commits ahead`}>
            <RiArrowUpLine className="size-3" aria-hidden />
            {ahead}
          </span>
          <span className="inline-flex items-center gap-0.5 tabular-nums" aria-label={`${behind} behind`} title={`${behind} commits behind`}>
            <RiArrowDownLine className="size-3" aria-hidden />
            {behind}
          </span>
          <span className="ml-auto tabular-nums">
            {changedCount} {changedCount === 1 ? "file" : "files"}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <Textarea
            aria-label="Commit message"
            placeholder={changedCount ? "Commit message" : "No changes"}
            autoResize
            minRows={1}
            maxRows={6}
            value={message}
            disabled={running || changedCount === 0}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                run(action);
              }
            }}
            className="min-h-9 flex-1 py-2 text-sm"
          />
          {generateSlot}
          {onGenerateMessage && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Generate commit message"
              title="Generate commit message"
              disabled={generating || running || changedCount === 0}
              onClick={onGenerateMessage}
            >
              {generating ? <Spinner size="xs" /> : <RiSparkling2Line />}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex" role="group" aria-label="Ship actions">
            <Button
              type="button"
              size="sm"
              variant="primary"
              leadingIcon={running ? undefined : meta.icon}
              loading={running}
              disabled={disabled}
              aria-describedby={reason ? reasonId : undefined}
              onClick={() => run(action)}
              className="rounded-r-none"
            >
              {meta.label}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="primary"
                  aria-label="More ship actions"
                  disabled={running}
                  className="rounded-l-none border-l border-primary-foreground/20"
                >
                  <RiArrowDownSLine />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6} className="w-64">
                {(Object.keys(shipActionMeta) as ShipAction[]).map((a) => {
                  const r = reasonFor(a);
                  return (
                    <DropdownMenuItem
                      key={a}
                      icon={shipActionMeta[a].icon}
                      description={r ?? shipActionMeta[a].description}
                      disabled={r != null}
                      onSelect={() => {
                        setAction(a);
                        run(a);
                      }}
                    >
                      {shipActionMeta[a].label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {onDelegate && (
            <Button type="button" size="sm" variant="ghost" leadingIcon={<RiRobot2Line />} disabled={delegateDisabled} onClick={onDelegate}>
              {delegateLabel}
            </Button>
          )}
          <div className="ml-auto min-w-0 text-xs" aria-live="polite">
            {running ? (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Spinner size="xs" />
                {progressLabel ?? "Working…"}
              </span>
            ) : status === "error" && error ? (
              <span role="alert" className="inline-flex items-center gap-1 text-destructive">
                <RiErrorWarningLine className="size-3.5 shrink-0" aria-hidden />
                {error}
              </span>
            ) : status === "success" && result ? (
              <span className="inline-flex items-center gap-1 text-success">
                <RiCheckboxCircleLine className="size-3.5 shrink-0" aria-hidden />
                {result}
              </span>
            ) : reason ? (
              <span id={reasonId} data-slot="ship-disabled-reason" className="text-muted-foreground">
                {reason}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
);
ShipBar.displayName = "ShipBar";

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
  if (/^[-/.]|[/.]$|\.lock$/.test(n) || n === "@") return "Not a valid git ref name";
  if (existing.includes(n)) return `“${n}” already exists`;
  return null;
}

export interface WorktreeDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  branches: WorktreeBranch[];
  defaultBase?: string;
  /** Names already taken by branches or worktrees. Branch names are always included. */
  existingNames?: string[];
  /** Folder new worktrees go in. Default "../worktrees". */
  worktreeRoot?: string;
  /** Custom path preview. */
  pathFor?: (name: string) => string;
  defaultOpenInNewSession?: boolean;
  onCreate?: (values: WorktreeCreateValues) => void;
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
      icon: <RiGitBranchLine />,
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
          <DialogHeader icon={<RiGitForkLine />}>
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
                emptyText="No branches match."
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
