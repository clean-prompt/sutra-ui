import * as React from "react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { SegmentedControl } from "../../primitives/segmented-control";
import { TreeView, type TreeNode } from "../../patterns/tree-view";
import { DiffStat } from "../../patterns/diff-viewer";
import { type ChangedFile, splitFilePath } from "./git-review-model";
import { GitStatusLetter } from "./git-review-changes";

/* ------------------------------------------------------------------ */
/* ReviewScopeTabs                                                     */
/* ------------------------------------------------------------------ */

export type ReviewScope = "uncommitted" | "branch" | "turn";

export interface ReviewScopeTabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "dir" | "onChange"> {
  /** Controlled review scope: `uncommitted`, `branch` or `turn`. */
  value?: ReviewScope;
  /** Initial scope when `value` is not controlled. */
  defaultValue?: ReviewScope;
  /** Called with the scope when the user switches tabs. */
  onValueChange?: (scope: ReviewScope) => void;
  /** File counts per scope. */
  counts?: Partial<Record<ReviewScope, number>>;
  /** Base branch for the "Branch vs base" label. */
  baseBranch?: string;
  /** Hide scopes, e.g. "turn" outside a session. */
  scopes?: ReviewScope[];
  /** Tab size. */
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
        className={cn("max-w-full overflow-x-auto scrollbar-none", className)}
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
  /** Changed files; shown as a folder tree built from their paths. */
  files: ChangedFile[];
  /** Selected file path. */
  selected?: string | null;
  /** Initially selected path when `selected` is not controlled. */
  defaultSelected?: string | null;
  /** Called with the file path (or `null`) when the selection changes. */
  onSelectedChange?: (path: string | null) => void;
  /** Called on click / Enter on a file. */
  onOpenFile?: (file: ChangedFile) => void;
  /** Per-file +/− counts. Default false. */
  showStats?: boolean;
  /** Row size. */
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
              <DiffStat additions={f.additions ?? 0} deletions={f.deletions ?? 0} showBar={false} className="ms-auto text-2xs" />
            )}
            <GitStatusLetter status={f.status} className={showStats ? undefined : "ms-auto"} />
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
