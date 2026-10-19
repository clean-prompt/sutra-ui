/** DeleteConfirmDialog: destructive confirmation with type-to-confirm. */
import * as React from "react";
import { RiDeleteBin6Line, RiErrorWarningLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Input } from "../primitives/input";
import { InlineAlert } from "../primitives/inline-alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../primitives/dialog";
import { FeaturedIcon } from "../assets/icons";
import { useBlockAction as useAsyncAction } from "./block-utils";
import { type BlockDialogBaseProps, useDialogOpen } from "./modal-dialog-blocks-internal";

/* ------------------------------------------------------------------ */
/* DeleteConfirmDialog                                                 */
/* ------------------------------------------------------------------ */

export interface DeleteConfirmDialogProps extends BlockDialogBaseProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Text the user must type to enable the delete button. Pass "" to skip. */
  confirmText?: string;
  confirmLabel?: React.ReactNode;
  /** Bullet points describing what will be lost. */
  consequences?: React.ReactNode[];
  onConfirm?: () => unknown;
}

/** Destructive confirmation with a featured warning icon and type-to-confirm input. */
export function DeleteConfirmDialog({
  title = "Delete workspace",
  description = "This will permanently delete the Northwind Studio workspace for everyone. This action cannot be undone.",
  confirmText = "northwind-studio",
  confirmLabel = "Delete workspace",
  consequences = ["12 projects and 348 tasks", "96 notes and their history", "2.4 GB of files"],
  onConfirm,
  trigger,
  className,
  ...openProps
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useDialogOpen(openProps);
  const [typed, setTyped] = React.useState("");
  const action = useAsyncAction();
  const matches = !confirmText || typed.trim() === confirmText;
  const inputId = React.useId();

  React.useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const confirm = async () => {
    if (!matches) return;
    const ok = await action.run(onConfirm);
    if (ok) setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !action.busy && setOpen(v)}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent size="md" className={cn("sm:max-w-md", className)}>
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <FeaturedIcon icon={RiDeleteBin6Line} color="destructive" variant="outline-ring" size="md" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </div>
        </div>
        {consequences.length > 0 && (
          <ul className="flex flex-col gap-1.5 rounded-box border border-destructive/20 bg-destructive-soft/40 px-4 py-3 text-sm text-foreground">
            {consequences.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                <RiErrorWarningLine aria-hidden className="size-4 shrink-0 text-destructive" />
                {c}
              </li>
            ))}
          </ul>
        )}
        {confirmText ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void confirm();
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor={inputId} className="text-sm text-muted-foreground">
              Type <span className="rounded-xs bg-muted px-1 py-0.5 font-mono text-[0.85em] font-medium text-foreground">{confirmText}</span>{" "}
              to confirm
            </label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={confirmText}
              disabled={action.busy}
              className="font-mono"
            />
          </form>
        ) : null}
        {action.error ? (
          <InlineAlert variant="destructive" className="border border-destructive/20">
            {action.error}
          </InlineAlert>
        ) : null}
        <AlertDialogFooter className="sm:pt-2">
          <AlertDialogCancel disabled={action.busy}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={!matches} loading={action.busy} onClick={() => void confirm()}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
DeleteConfirmDialog.displayName = "DeleteConfirmDialog";
