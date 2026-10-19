import * as React from "react";
import { RiErrorWarningLine, RiRefreshLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { Button } from "../../primitives/button";

/* ------------------------------------------------------------------ */
/* UndeliveredNotice                                                   */
/* ------------------------------------------------------------------ */

export interface UndeliveredNoticeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Heading of the notice. Default "Your answer couldn't be delivered". */
  title?: React.ReactNode;
  /** Explanation under the heading, for example why delivery failed. */
  description?: React.ReactNode;
  /** Called when the user presses Retry; the button is hidden when unset. */
  onRetry?: () => void;
  /** Shows a busy state on the retry button while a retry is in flight. */
  retrying?: boolean;
  /** Label of the retry button. Default "Retry". */
  retryLabel?: string;
  /** Called when the user dismisses the notice; the dismiss button is hidden when unset. */
  onDismiss?: () => void;
}

/** Inline notice when an answer or message couldn't be delivered, with Retry. */
export const UndeliveredNotice = React.forwardRef<HTMLDivElement, UndeliveredNoticeProps>(
  (
    {
      title = "Your answer couldn't be delivered",
      description,
      onRetry,
      retrying = false,
      retryLabel = "Retry",
      onDismiss,
      className,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      role="alert"
      className={cn("flex items-start gap-2.5 rounded-box border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground", className)}
      {...props}
    >
      <RiErrorWarningLine aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{title}</div>
        {description && <div className="text-xs opacity-80">{description}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onDismiss && (
          <Button size="xs" variant="ghost" onClick={onDismiss} className="h-6 text-current">
            Dismiss
          </Button>
        )}
        {onRetry && (
          <Button size="xs" variant="secondary" loading={retrying} leadingIcon={<RiRefreshLine aria-hidden />} onClick={onRetry} className="h-6">
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  )
);
UndeliveredNotice.displayName = "UndeliveredNotice";
