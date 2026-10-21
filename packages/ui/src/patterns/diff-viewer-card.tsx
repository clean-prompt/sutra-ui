/** DiffStat (the "+12 −3" summary) and DiffCard (compact file diff preview with expand and accept / reject). */
import * as React from "react";
import { diffLines } from "diff";
import { RiCheckLine, RiCloseLine, RiExpandUpDownLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { pluralize } from "../lib/format";
import { Button } from "../primitives/button";
import { FileFormatIcon } from "../assets/file-format";
import type { DiffSegmentType } from "./diff-viewer-model";
import { GapButton, collapseRuns } from "./diff-viewer-internal";
/** Count added and removed lines between two texts. */
export function countDiffLines(oldValue: string, newValue: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const c of diffLines(oldValue, newValue)) {
    const n = c.count ?? c.value.split("\n").length - (c.value.endsWith("\n") ? 1 : 0);
    if (c.added) additions += n;
    else if (c.removed) deletions += n;
  }
  return { additions, deletions };
}

function statBlocks(additions: number, deletions: number, blocks: number) {
  const total = additions + deletions;
  if (!total) return { add: 0, del: 0 };
  let add = Math.round((additions / total) * blocks);
  let del = Math.round((deletions / total) * blocks);
  if (additions && !add) add = 1;
  if (deletions && !del) del = 1;
  while (add + del > blocks) {
    if (add >= del) add--;
    else del--;
  }
  return { add, del };
}

export interface DiffStatProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Number of added lines. */
  additions: number;
  /** Number of removed lines. */
  deletions: number;
  /** Proportional block bar. Default true. */
  showBar?: boolean;
  /** Number of blocks in the bar. Default 5. */
  blocks?: number;
}

/** "+12 −3" change summary with a tiny proportional bar. */
export const DiffStat = React.forwardRef<HTMLSpanElement, DiffStatProps>(
  ({ additions, deletions, showBar = true, blocks = 5, className, ...props }, ref) => {
    const { add, del } = statBlocks(additions, deletions, blocks);
    const label = `${additions} ${pluralize(additions, "addition")}, ${deletions} ${pluralize(deletions, "deletion")}`;
    return (
      <span
        ref={ref}
        role="img"
        aria-label={label}
        title={label}
        data-slot="diff-stat"
        className={cn("inline-flex shrink-0 items-center gap-1.5 font-mono text-xs tabular-nums", className)}
        {...props}
      >
        <span className="text-success">+{additions}</span>
        <span className="text-destructive">−{deletions}</span>
        {showBar && (
          <span className="inline-flex gap-px">
            {Array.from({ length: blocks }, (_, i) => (
              <span
                key={i}
                data-block={i < add ? "add" : i < add + del ? "del" : "neutral"}
                className={cn(
                  "size-1.5 rounded-[1px]",
                  i < add ? "bg-success" : i < add + del ? "bg-destructive" : "bg-border-strong/60"
                )}
              />
            ))}
          </span>
        )}
      </span>
    );
  }
);
DiffStat.displayName = "DiffStat";

/* ------------------------------------------------------------------ */
/* DiffCard                                                            */
/* ------------------------------------------------------------------ */

interface UnifiedRow {
  type: DiffSegmentType;
  text: string;
  oldNo?: number;
  newNo?: number;
}

function toUnifiedRows(oldValue: string, newValue: string): UnifiedRow[] {
  const rows: UnifiedRow[] = [];
  let oldNo = 1;
  let newNo = 1;
  for (const c of diffLines(oldValue, newValue)) {
    const lines = c.value.replace(/\n$/, "").split("\n");
    for (const text of lines) {
      if (c.added) rows.push({ type: "insert", text, newNo: newNo++ });
      else if (c.removed) rows.push({ type: "delete", text, oldNo: oldNo++ });
      else rows.push({ type: "equal", text, oldNo: oldNo++, newNo: newNo++ });
    }
  }
  return rows;
}

export type DiffCardFileStatus = "modified" | "added" | "deleted";

export interface DiffCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** File path shown in the header. */
  path: string;
  /** Original file content ("before"). */
  oldValue?: string;
  /** Changed file content ("after"). */
  newValue?: string;
  /** new-file / deleted-file presentation. Inferred from empty old/new values when omitted. */
  fileStatus?: DiffCardFileStatus;
  /** Visible lines before the preview is capped. Default 12. */
  collapsedLines?: number;
  /** Unchanged lines kept around each change. Default 3. */
  context?: number;
  /** Controlled expanded state of the preview. Use with `onExpandedChange`. */
  expanded?: boolean;
  /** Initial expanded state when uncontrolled. */
  defaultExpanded?: boolean;
  /** Called when the preview is expanded or collapsed. */
  onExpandedChange?: (expanded: boolean) => void;
  /** When set, "Click to expand" calls this (e.g. open a full diff editor) instead of expanding inline. */
  onOpen?: () => void;
  /** Makes the path a link. */
  pathHref?: string;
  /** Makes the path a button (e.g. open the file). */
  onPathClick?: () => void;
  /** Called when the accept button is clicked; setting it shows the button. */
  onAccept?: () => void;
  /** Called when the reject button is clicked; setting it shows the button. */
  onReject?: () => void;
  /**
   * Text of the accept button.
   * @default "Accept"
   */
  acceptLabel?: string;
  /**
   * Text of the reject button.
   * @default "Reject"
   */
  rejectLabel?: string;
  /** Extra header content (right side, before the stat). */
  headerExtra?: React.ReactNode;
}

const ROW_PX = 20;

/** Compact diff preview card: file header with stats, capped unified diff, expand and optional accept / reject. */
export const DiffCard = React.forwardRef<HTMLDivElement, DiffCardProps>(
  (
    {
      path,
      oldValue = "",
      newValue = "",
      fileStatus,
      collapsedLines = 12,
      context = 3,
      expanded: expandedProp,
      defaultExpanded = false,
      onExpandedChange,
      onOpen,
      pathHref,
      onPathClick,
      onAccept,
      onReject,
      acceptLabel = "Accept",
      rejectLabel = "Reject",
      headerExtra,
      className,
      ...props
    },
    ref
  ) => {
    const status: DiffCardFileStatus =
      fileStatus ?? (!oldValue && newValue ? "added" : oldValue && !newValue ? "deleted" : "modified");
    const rows = React.useMemo(
      () => toUnifiedRows(status === "added" ? "" : oldValue, status === "deleted" ? "" : newValue),
      [oldValue, newValue, status]
    );
    const stat = React.useMemo(() => {
      let additions = 0;
      let deletions = 0;
      for (const r of rows) {
        if (r.type === "insert") additions++;
        else if (r.type === "delete") deletions++;
      }
      return { additions, deletions };
    }, [rows]);
    const [expandedInner, setExpandedInner] = React.useState(defaultExpanded);
    const expanded = expandedProp ?? expandedInner;
    const setExpanded = (v: boolean) => {
      if (expandedProp === undefined) setExpandedInner(v);
      onExpandedChange?.(v);
    };
    const [gaps, setGaps] = React.useState<ReadonlySet<number>>(() => new Set());
    const entries = collapseRuns(
      rows.map((r) => r.type !== "equal"),
      context,
      gaps,
      true
    );
    const overflow = entries.length > collapsedLines;
    const capped = overflow && !expanded;
    const bodyId = React.useId();
    const fileName = path.split("/").pop() ?? path;

    const pathClass = "min-w-0 truncate font-mono text-xs text-foreground";
    const pathNode = pathHref ? (
      <a href={pathHref} className={cn(pathClass, "hover:underline", focusRing)}>
        {path}
      </a>
    ) : onPathClick ? (
      <button type="button" onClick={onPathClick} className={cn(pathClass, "text-start hover:underline", focusRing)}>
        {path}
      </button>
    ) : (
      <span className={pathClass}>{path}</span>
    );

    return (
      <div
        ref={ref}
        role="group"
        aria-label={`Changes to ${path}`}
        data-slot="diff-card"
        data-file-status={status}
        className={cn("flex flex-col overflow-hidden rounded-box border border-border bg-card shadow-xs", className)}
        {...props}
      >
        <div className="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-subtle/60 px-3 py-1.5">
          <FileFormatIcon ext={fileName} size={18} />
          {pathNode}
          {status !== "modified" && (
            <span
              className={cn(
                "shrink-0 rounded-control px-1.5 py-px text-2xs font-medium",
                status === "added" ? "bg-success-soft text-success-soft-foreground" : "bg-destructive-soft text-destructive-soft-foreground"
              )}
            >
              {status === "added" ? "New file" : "Deleted"}
            </span>
          )}
          <span className="ms-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
            {headerExtra}
            <DiffStat additions={stat.additions} deletions={stat.deletions} />
          </span>
        </div>
        <div className="relative">
          <div
            id={bodyId}
            className={cn("overflow-x-auto scrollbar-thin py-1 font-mono text-xs leading-5", capped && "overflow-y-hidden")}
            style={capped ? { maxHeight: collapsedLines * ROW_PX + 8 } : undefined}
          >
            {rows.length === 0 || (rows.length === 1 && rows[0]!.text === "" && rows[0]!.type === "equal") ? (
              <div className="px-3 py-2 font-sans text-muted-foreground">Empty file</div>
            ) : (
              entries.map((e) => {
                if (e.kind === "gap")
                  return (
                    <GapButton
                      key={`gap-${e.start}`}
                      count={e.end - e.start}
                      onClick={() => setGaps((s) => new Set([...s, e.start]))}
                      className="my-0.5"
                    />
                  );
                const r = rows[e.index]!;
                return (
                  <div
                    key={e.index}
                    data-line-type={r.type}
                    className={cn(
                      "flex min-w-max",
                      r.type === "insert" && "bg-success-soft/60",
                      r.type === "delete" && "bg-destructive-soft/60"
                    )}
                  >
                    <span aria-hidden className="w-9 shrink-0 select-none pe-1 text-end text-muted-foreground/60 tabular-nums">
                      {r.oldNo}
                    </span>
                    <span aria-hidden className="w-9 shrink-0 select-none pe-1 text-end text-muted-foreground/60 tabular-nums">
                      {r.newNo}
                    </span>
                    <span
                      className={cn(
                        "w-5 shrink-0 select-none text-center",
                        r.type === "insert" && "text-success",
                        r.type === "delete" && "text-destructive"
                      )}
                    >
                      {r.type === "insert" ? (
                        <>
                          <span aria-hidden>+</span>
                          <span className="sr-only">Added: </span>
                        </>
                      ) : r.type === "delete" ? (
                        <>
                          <span aria-hidden>−</span>
                          <span className="sr-only">Removed: </span>
                        </>
                      ) : null}
                    </span>
                    <span className="whitespace-pre pe-4 text-foreground">{r.text || " "}</span>
                  </div>
                );
              })
            )}
          </div>
          {capped && (
            <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-gradient-to-t from-card via-card/80 to-transparent pb-2">
              <button
                type="button"
                aria-expanded={onOpen ? undefined : false}
                aria-controls={onOpen ? undefined : bodyId}
                onClick={() => (onOpen ? onOpen() : setExpanded(true))}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded-control border border-border bg-background px-2 text-xs text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground",
                  focusRing
                )}
              >
                <RiExpandUpDownLine aria-hidden className="size-3.5" />
                Click to expand
              </button>
            </div>
          )}
        </div>
        {(overflow && expanded && !onOpen) || onAccept || onReject ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-subtle/60 px-3 py-1.5">
            {overflow && expanded && !onOpen && (
              <Button size="xs" variant="ghost" aria-expanded aria-controls={bodyId} onClick={() => setExpanded(false)}>
                Collapse
              </Button>
            )}
            <span className="ms-auto flex flex-wrap items-center justify-end gap-1.5">
              {onReject && (
                <Button size="xs" variant="secondary" leadingIcon={<RiCloseLine aria-hidden />} onClick={onReject}>
                  {rejectLabel}
                </Button>
              )}
              {onAccept && (
                <Button size="xs" variant="primary" leadingIcon={<RiCheckLine aria-hidden />} onClick={onAccept}>
                  {acceptLabel}
                </Button>
              )}
            </span>
          </div>
        ) : null}
      </div>
    );
  }
);
DiffCard.displayName = "DiffCard";
