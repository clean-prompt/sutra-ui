import * as React from "react";
import { RiArrowGoBackLine, RiFileCodeLine, RiFlagLine, RiGitBranchLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { pluralize } from "../lib/format";
import { formatDateTime, safeISO, type TimeInput } from "../lib/time";
import { useAsyncAction } from "../hooks/use-async-action";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "./button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { RadioCard, RadioGroup } from "./radio";
import { SimpleTooltip } from "./tooltip";

export type RewindScope = "both" | "code" | "conversation";

export interface RewindFileChange {
  path: string;
  additions?: number;
  deletions?: number;
  /** Shown as a tag, e.g. "created" or "deleted". */
  status?: "modified" | "created" | "deleted";
}

export interface RewindScopeOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Restores files (shows the file-change summary). */
  restoresCode?: boolean;
  /** Rewinds the conversation (shows the fork notice). */
  restoresConversation?: boolean;
  disabled?: boolean;
}

export const defaultRewindScopes: RewindScopeOption[] = [
  {
    value: "both",
    label: "Code and conversation",
    description: "Restore files and return the conversation to this message.",
    restoresCode: true,
    restoresConversation: true,
  },
  { value: "code", label: "Code only", description: "Restore files; keep the conversation as it is.", restoresCode: true },
  {
    value: "conversation",
    label: "Conversation only",
    description: "Return the conversation to this message; leave files untouched.",
    restoresConversation: true,
  },
];

export interface RewindRequest {
  scope: string;
}

function formatWhen(value: TimeInput) {
  return formatDateTime(value, { year: "never", invalid: String(value) });
}

function totals(files: RewindFileChange[]) {
  return files.reduce((acc, f) => ({ add: acc.add + (f.additions ?? 0), del: acc.del + (f.deletions ?? 0) }), { add: 0, del: 0 });
}

/** "+12 −3" change counts. */
function ChangeCounts({ additions = 0, deletions = 0 }: { additions?: number; deletions?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs tabular-nums">
      <span className="text-success">+{additions}</span>
      <span className="text-destructive">−{deletions}</span>
      <span className="sr-only">
        {additions} additions, {deletions} deletions
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* RewindDialog                                                        */
/* ------------------------------------------------------------------ */

export interface RewindDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog (rendered with `asChild`). */
  trigger?: React.ReactNode;
  /** Preview of the target message. */
  message: React.ReactNode;
  /** When the target message was sent. */
  timestamp?: TimeInput;
  /** Files that would be restored. */
  files?: RewindFileChange[];
  scopes?: RewindScopeOption[];
  scope?: string;
  defaultScope?: string;
  onScopeChange?: (scope: string) => void;
  /** Show the fork notice when the conversation is rewound. Default true. */
  fork?: boolean;
  forkNotice?: React.ReactNode;
  title?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  onRewind?: (request: RewindRequest) => void | Promise<void>;
  className?: string;
}

/** Rewind to a message/checkpoint: preview, "What to restore" choice, file summary and fork notice. */
export function RewindDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  message,
  timestamp,
  files = [],
  scopes = defaultRewindScopes,
  scope: scopeProp,
  defaultScope,
  onScopeChange,
  fork = true,
  forkNotice = "A new forked conversation will be created; the current one stays in your history.",
  title = "Rewind",
  confirmLabel = "Rewind",
  onRewind,
  className,
}: RewindDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [scope, setScope] = useControllableState({
    value: scopeProp,
    defaultValue: defaultScope ?? scopes.find((s) => !s.disabled)?.value ?? "",
    onChange: onScopeChange,
  });
  const { run, busy } = useAsyncAction(async () => {
    await onRewind?.({ scope });
    setOpen(false);
  });
  const groupLabelId = React.useId();
  const current = scopes.find((s) => s.value === scope);
  const sum = totals(files);

  // A failed rewind keeps the dialog open.
  const confirm = () => void run();

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn("sm:max-w-lg", className)} data-slot="rewind-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Go back to the state at this message.</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <figure className="rounded-box border border-border bg-subtle px-3 py-2.5" data-slot="rewind-target">
            <blockquote className="line-clamp-3 text-sm text-foreground">{message}</blockquote>
            {timestamp != null && (
              <figcaption className="mt-1 text-xs text-muted-foreground">
                <time dateTime={safeISO(timestamp)}>{formatWhen(timestamp)}</time>
              </figcaption>
            )}
          </figure>

          <div className="flex flex-col gap-2">
            <p id={groupLabelId} className="text-sm font-medium text-foreground">
              What to restore
            </p>
            <RadioGroup aria-labelledby={groupLabelId} value={scope} onValueChange={setScope} className="grid gap-2">
              {scopes.map((s) => (
                <RadioCard
                  key={s.value}
                  value={s.value}
                  disabled={s.disabled}
                  label={s.label}
                  description={
                    <>
                      {s.description}
                      {s.restoresCode && files.length > 0 && (
                        <span className="mt-0.5 block text-xs">
                          {files.length} {pluralize(files.length, "file")} · <span className="text-success">+{sum.add}</span>{" "}
                          <span className="text-destructive">−{sum.del}</span>
                        </span>
                      )}
                    </>
                  }
                  className="p-3"
                />
              ))}
            </RadioGroup>
          </div>

          {current?.restoresCode && files.length > 0 && (
            <div className="flex flex-col gap-1.5" data-slot="rewind-files">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Files to restore</p>
              <ul className="scrollbar-thin max-h-40 divide-y divide-border overflow-y-auto rounded-box border border-border">
                {files.map((f) => (
                  <li key={f.path} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <RiFileCodeLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{f.path}</span>
                    {f.status && f.status !== "modified" && (
                      <span className="rounded-xs bg-muted px-1 text-2xs text-muted-foreground">{f.status}</span>
                    )}
                    <ChangeCounts additions={f.additions} deletions={f.deletions} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {fork && current?.restoresConversation && (
            <p className="flex items-start gap-2 rounded-box bg-info-soft px-3 py-2 text-sm text-info-soft-foreground" data-slot="rewind-fork-notice">
              <RiGitBranchLine aria-hidden className="mt-0.5 size-4 shrink-0" />
              {forkNotice}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="primary" loading={busy} disabled={!current} leadingIcon={<RiArrowGoBackLine aria-hidden />} onClick={confirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
RewindDialog.displayName = "RewindDialog";

/* ------------------------------------------------------------------ */
/* RewindButton                                                        */
/* ------------------------------------------------------------------ */

export interface RewindButtonProps extends Omit<RewindDialogProps, "trigger"> {
  /** Accessible label and tooltip. Default "Rewind to here". */
  label?: string;
  buttonClassName?: string;
  disabled?: boolean;
}

/** Message-action icon button that opens a `RewindDialog`. */
export const RewindButton = React.forwardRef<HTMLButtonElement, RewindButtonProps>(function RewindButton(
  { label = "Rewind to here", buttonClassName, disabled, ...dialogProps },
  ref
) {
  return (
    <RewindDialog
      {...dialogProps}
      trigger={
        <Button
          ref={ref}
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={label}
          title={label}
          disabled={disabled}
          data-slot="rewind-button"
          className={cn("text-muted-foreground hover:text-foreground", buttonClassName)}
        >
          <RiArrowGoBackLine aria-hidden />
        </Button>
      }
    />
  );
});
RewindButton.displayName = "RewindButton";

/* ------------------------------------------------------------------ */
/* CheckpointMarker                                                    */
/* ------------------------------------------------------------------ */

export interface CheckpointMarkerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default "Checkpoint". */
  label?: React.ReactNode;
  /** Changed files (count derived) or a plain count. */
  files?: RewindFileChange[] | number;
  timestamp?: TimeInput;
  /** Rewind action (button click). */
  onRewind?: () => void;
  /** Wire the action to a `RewindDialog` instead; `files` are passed through. */
  dialog?: Omit<RewindDialogProps, "trigger" | "files">;
  rewindLabel?: string;
}

/** Thin transcript divider ("Checkpoint · 3 files changed") with a rewind action. */
export const CheckpointMarker = React.forwardRef<HTMLDivElement, CheckpointMarkerProps>(
  ({ label = "Checkpoint", files, timestamp, onRewind, dialog, rewindLabel = "Rewind", className, ...props }, ref) => {
    const count = typeof files === "number" ? files : files?.length ?? 0;
    const list = Array.isArray(files) ? files : undefined;
    const sum = list ? totals(list) : null;
    const action = (
      <button
        type="button"
        onClick={onRewind}
        data-slot="checkpoint-rewind"
        className={cn(
          "inline-flex h-6 items-center gap-1 rounded-control px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-3.5",
          focusRing
        )}
      >
        <RiArrowGoBackLine aria-hidden />
        {rewindLabel}
      </button>
    );
    const text = (
      <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
        <RiFlagLine aria-hidden className="size-3.5 shrink-0" />
        <span className="font-medium">{label}</span>
        {count > 0 && (
          <span>
            · {count} {pluralize(count, "file")} changed
          </span>
        )}
        {sum && (sum.add > 0 || sum.del > 0) && (
          <span className="font-mono tabular-nums" aria-hidden>
            <span className="text-success">+{sum.add}</span> <span className="text-destructive">−{sum.del}</span>
          </span>
        )}
        {timestamp != null && <span className="hidden sm:inline">· {formatWhen(timestamp)}</span>}
      </span>
    );
    return (
      <div
        ref={ref}
        data-slot="checkpoint-marker"
        className={cn("group/checkpoint flex items-center gap-3 py-1 text-xs text-muted-foreground", className)}
        {...props}
      >
        <span aria-hidden className="h-px flex-1 bg-border" />
        {list && list.length > 0 ? (
          <SimpleTooltip content={list.map((f) => f.path).join("\n")} contentClassName="whitespace-pre-line font-mono">
            <span tabIndex={0} className={cn("rounded-xs", focusRing)}>
              {text}
            </span>
          </SimpleTooltip>
        ) : (
          text
        )}
        {(onRewind || dialog) && (dialog ? <RewindDialog {...dialog} files={list} trigger={action} /> : action)}
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
    );
  }
);
CheckpointMarker.displayName = "CheckpointMarker";
