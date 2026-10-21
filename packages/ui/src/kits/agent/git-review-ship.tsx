import * as React from "react";
import { RiArrowDownLine, RiArrowDownSLine, RiArrowUpLine, RiCheckboxCircleLine, RiErrorWarningLine, RiGitCommitLine, RiGitPullRequestLine, RiRobot2Line, RiSparkling2Line, RiUploadCloud2Line } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";
import { Textarea } from "../../primitives/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../primitives/dropdown-menu";
import { type BranchStatus, BranchPill } from "./git-review-changes";

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
  commit: { label: "Commit", description: "Record changes locally", icon: <RiGitCommitLine aria-hidden /> },
  "commit-push": { label: "Commit & push", description: "Commit, then push to the remote", icon: <RiUploadCloud2Line aria-hidden /> },
  pr: { label: "Create PR", description: "Commit, push and open a pull request", icon: <RiGitPullRequestLine aria-hidden /> },
};

/** Why an action can't run right now, or null when it can. */
export function getShipDisabledReason(action: ShipAction, s: ShipState): string | null {
  const conflicts = s.conflicts ?? 0;
  if (conflicts > 0) return `Resolve ${conflicts} ${pluralize(conflicts, "conflict")} first`;
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
  /** Current branch name. */
  branch: string;
  /** Working-tree state of the branch (`clean`, `dirty` or `conflict`); adds a status dot to the branch pill. */
  branchStatus?: BranchStatus;
  /** Branch the work will be merged into, shown beside the current branch. */
  baseBranch?: string;
  /**
   * Commits the branch is ahead of its upstream; with no changed files, a non-zero value still allows the `pr`
   * action.
   */
  ahead?: number;
  /**
   * Commits the branch is behind its upstream; a non-zero value disables push and PR actions with a "Pull first"
   * reason.
   */
  behind?: number;
  /** Files that would be committed. */
  changedCount: number;
  /**
   * Number of conflicted files; a non-zero value disables every ship action with a "Resolve conflicts first" reason.
   */
  conflicts?: number;
  /** Controlled commit message. */
  message?: string;
  /** Initial commit message when `message` is not controlled. */
  defaultMessage?: string;
  /** Called with the message on every edit. */
  onMessageChange?: (message: string) => void;
  /** Adds a "Generate" button for the message. */
  onGenerateMessage?: () => void;
  /** Shows a busy state on the Generate button while a message is being written. */
  generating?: boolean;
  /** Custom content next to the message field (e.g. a suggestion chip). */
  generateSlot?: React.ReactNode;
  /** Primary action of the split button. */
  action?: ShipAction;
  /** Initial primary action when `action` is not controlled. */
  defaultAction?: ShipAction;
  /** Called with the action (`commit`, `commit-push` or `pr`) when the user picks one from the split button. */
  onActionChange?: (action: ShipAction) => void;
  /** Called with the commit message when the user runs the `commit` action. */
  onCommit?: (message: string) => void;
  /** Called with the commit message when the user runs the `commit-push` action. */
  onCommitAndPush?: (message: string) => void;
  /** Called with the commit message when the user runs the `pr` action. */
  onCreatePR?: (message: string) => void;
  /** "Hand to agent": delegate committing / resolving to the agent. */
  onDelegate?: () => void;
  /** Label of the hand-to-agent button. Default "Hand to agent". */
  delegateLabel?: string;
  /** Extra per-action reasons (e.g. `{ pr: "GitHub CLI not signed in" }`). */
  actionDisabledReasons?: Partial<Record<ShipAction, string>>;
  /** Progress of the ship action: `idle`, `running`, `success` or `error`. */
  status?: ShipStatus;
  /** Shown while running, e.g. "Pushing…". */
  progressLabel?: React.ReactNode;
  /** Shown on success, e.g. "Committed a1b2c3d". */
  result?: React.ReactNode;
  /** Failure message shown when `status` is `error`. */
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
          <span className="ms-auto tabular-nums">
            {changedCount} {pluralize(changedCount, "file")}
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
              {generating ? <Spinner size="xs" /> : <RiSparkling2Line aria-hidden />}
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
              className="rounded-e-none"
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
                  className="rounded-s-none border-s border-primary-foreground/20"
                >
                  <RiArrowDownSLine aria-hidden />
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
            <Button type="button" size="sm" variant="ghost" leadingIcon={<RiRobot2Line aria-hidden />} disabled={delegateDisabled} onClick={onDelegate}>
              {delegateLabel}
            </Button>
          )}
          <div className="ms-auto min-w-0 text-xs" aria-live="polite">
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
