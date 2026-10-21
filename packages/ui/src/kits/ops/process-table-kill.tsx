import * as React from "react";
import { RiCloseCircleLine, RiSkullLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useAsyncAction } from "../../hooks/use-async-action";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";
import { SimpleTooltip } from "../../primitives/tooltip";
import type { KillSignal } from "./process-table-model";

/* ------------------------------------------------------------------ */
/* KillButton                                                          */
/* ------------------------------------------------------------------ */

export interface KillButtonProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Process id, shown in the confirm step and used in labels. */
  pid: number;
  /** Process name, used in labels. */
  name?: string;
  /**
   * Called with the chosen signal after the user confirms; may return a promise, and the button shows "Killing…"
   * until it settles.
   */
  onKill: (signal: KillSignal) => void | Promise<unknown>;
  /** External loading state (e.g. waiting for the process to exit). Shows "Killing…". */
  loading?: boolean;
  /** External busy state; shows "Killing…" while true. @deprecated Use `loading`. */
  pending?: boolean;
  /** Disables the button. */
  disabled?: boolean;
  /** Called when the confirm step opens / closes. */
  onConfirmingChange?: (signal: KillSignal | null) => void;
}

/** Two-mode kill control (SIGTERM / SIGKILL) with an inline "Kill 1234? Confirm / Cancel" step. */
export const KillButton = React.forwardRef<HTMLDivElement, KillButtonProps>(
  ({ className, pid, name, onKill, loading: loadingProp, pending: pendingProp, disabled, onConfirmingChange, ...props }, ref) => {
    const [confirming, setConfirmingState] = React.useState<KillSignal | null>(null);
    const kill = useAsyncAction((result: PromiseLike<unknown>) => result);
    const confirmRef = React.useRef<HTMLButtonElement>(null);
    const termRef = React.useRef<HTMLButtonElement>(null);
    const pending = (loadingProp ?? pendingProp) || kill.busy;

    const setConfirming = (s: KillSignal | null) => {
      setConfirmingState(s);
      onConfirmingChange?.(s);
    };

    React.useEffect(() => {
      if (confirming) confirmRef.current?.focus();
    }, [confirming]);

    const confirm = () => {
      if (!confirming) return;
      const signal = confirming;
      setConfirming(null);
      // Only an async kill shows "Killing…"; a synchronous one returns straight to the buttons.
      const result = onKill(signal);
      if (result && typeof (result as PromiseLike<unknown>).then === "function") void kill.run(result as PromiseLike<unknown>);
    };

    const cancel = () => {
      setConfirming(null);
      requestAnimationFrame(() => termRef.current?.focus());
    };

    const who = name ? `${name} (${pid})` : String(pid);

    if (pending) {
      return (
        <div ref={ref} role="status" className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)} data-slot="kill-button" {...props}>
          <Spinner size="xs" aria-hidden />
          <span>Killing…</span>
        </div>
      );
    }

    if (confirming) {
      return (
        <div
          ref={ref}
          role="group"
          aria-label={`Confirm kill ${who}`}
          className={cn("inline-flex items-center gap-1", className)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              cancel();
            }
          }}
          data-slot="kill-button"
          {...props}
        >
          <span className="whitespace-nowrap text-xs font-medium text-foreground">
            {confirming === "SIGKILL" ? "Force kill" : "Kill"} {pid}?
          </span>
          <Button ref={confirmRef} size="xs" variant={confirming === "SIGKILL" ? "destructive" : "destructive-soft"} onClick={confirm}>
            Confirm
          </Button>
          <Button size="xs" variant="ghost" onClick={cancel}>
            Cancel
          </Button>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("inline-flex items-center gap-1", className)} data-slot="kill-button" {...props}>
        <SimpleTooltip content="Terminate (SIGTERM)">
          <button
            ref={termRef}
            type="button"
            disabled={disabled}
            onClick={() => setConfirming("SIGTERM")}
            aria-label={`Terminate ${who} (SIGTERM)`}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-control border border-warning/30 bg-warning-soft text-warning-soft-foreground transition-colors hover:bg-warning/25 disabled:pointer-events-none disabled:opacity-50",
              focusRing
            )}
          >
            <RiCloseCircleLine aria-hidden className="size-3.5" />
          </button>
        </SimpleTooltip>
        <SimpleTooltip content="Force kill (SIGKILL)">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setConfirming("SIGKILL")}
            aria-label={`Force kill ${who} (SIGKILL)`}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-control border border-destructive/30 bg-destructive-soft text-destructive-soft-foreground transition-colors hover:bg-destructive/20 disabled:pointer-events-none disabled:opacity-50",
              focusRing
            )}
          >
            <RiSkullLine aria-hidden className="size-3.5" />
          </button>
        </SimpleTooltip>
      </div>
    );
  }
);
KillButton.displayName = "KillButton";
