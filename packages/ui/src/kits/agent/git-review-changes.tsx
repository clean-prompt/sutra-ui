import * as React from "react";
import { RiArrowDownSLine, RiGitBranchLine, RiGitCommitLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { CopyButton } from "../../primitives/copy-button";
import { DiffStat } from "../../patterns/diff-viewer";
import { FileFormatIcon } from "../../assets/file-format";
import { type ChangedFileStatus, type ChangedFile, splitFilePath, truncateBranchHead, sumChangedFiles } from "./git-review-model";
import { statusMeta } from "./git-review-internal";

export interface GitStatusLetterProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Default `modified`. */
  status?: ChangedFileStatus;
}

/** Colored status letter with a screen-reader label. */
export const GitStatusLetter = React.forwardRef<HTMLSpanElement, GitStatusLetterProps>(
  ({ status = "modified", className, ...props }, ref) => {
    const m = statusMeta[status];
    return (
      <span
        ref={ref}
        data-status={status}
        title={m.label}
        className={cn("inline-flex w-3 shrink-0 justify-center font-mono text-xs font-semibold", m.className, className)}
        {...props}
      >
        <span aria-hidden>{m.letter}</span>
        <span className="sr-only">{m.label}</span>
      </span>
    );
  }
);
GitStatusLetter.displayName = "GitStatusLetter";

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
  /** Branch name, shown in mono and copied by the copy button. */
  name: string;
  /** Max visible characters; longer names lose their head. Default 28. */
  maxLength?: number;
  /** Working-tree state of the branch (`clean`, `dirty` or `conflict`); adds a status dot. */
  status?: BranchStatus;
  /** Copy button. Default true. */
  copyable?: boolean;
  /** Pill size. */
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
          <CopyButton
            value={name}
            size="xs"
            label="Copy branch name"
            copiedLabel="Copied branch name"
            className="-me-1 size-auto rounded-xs p-0.5 hover:bg-transparent"
          />
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
  /** Changed files with their path, change kind and +/- counts. */
  files: ChangedFile[];
  /** Override the "N files changed" heading. */
  title?: React.ReactNode;
  /** Controlled expanded state of the file list. */
  expanded?: boolean;
  /** Initial expanded state when `expanded` is not controlled. */
  defaultExpanded?: boolean;
  /** Called with the new state when the user expands or collapses the list. */
  onExpandedChange?: (expanded: boolean) => void;
  /** Files visible while collapsed. Default 4. */
  collapsedCount?: number;
  /** Called when the user presses the review button; the button is hidden when unset. */
  onReview?: () => void;
  /** Label of the review button. Default "Review". */
  reviewLabel?: string;
  /** Called with the file when the user opens a row. */
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
            {title ?? `${files.length} ${pluralize(files.length, "file")} changed`}
          </span>
          <DiffStat additions={totals.additions} deletions={totals.deletions} />
          {onReview && (
            <Button type="button" size="xs" variant="secondary" className="ms-auto" onClick={onReview}>
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
                      className={cn("flex w-full min-w-0 items-center gap-2 px-3 py-1 text-start hover:bg-accent", focusRing)}
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
            <RiArrowDownSLine aria-hidden className={cn("size-3.5 chevron-turn", expanded && "rotate-180")} />
          </button>
        )}
      </div>
    );
  }
);
ChangedFilesCard.displayName = "ChangedFilesCard";
