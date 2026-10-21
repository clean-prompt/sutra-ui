/** `AwaitingApproval`: the "waiting for an admin" screen that checks in the background. */
import * as React from "react";
import { RiHourglassLine, RiLogoutBoxRLine, RiRefreshLine, RiShieldCheckLine } from "@remixicon/react";
import { Button } from "../primitives/button";
import { Spinner } from "../primitives/spinner";
import { AuthFrame, type AuthHeadingLevel } from "./auth-frame-internal";
import { useAsyncAction } from "../hooks/use-async-action";
import { useLatestRef } from "../hooks/use-iso-layout-effect";

/* ------------------------------------------------------------------ */
/* AwaitingApproval                                                    */
/* ------------------------------------------------------------------ */

export interface AwaitingApprovalProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /**
   * Element of the card title (`1` is an `h1`).
   * @default 1
   */
  headingLevel?: AuthHeadingLevel;
  /** Heading; defaults to a waiting-for-approval message. */
  title?: React.ReactNode;
  /** Text under the heading. */
  description?: React.ReactNode;
  /** The handle that is waiting. */
  handle?: string;
  /** Resolve `true` once approved. Polled every `pollInterval`. */
  onCheck?: () => boolean | Promise<boolean>;
  /**
   * Milliseconds between `onCheck` calls.
   * @default 15000
   */
  pollInterval?: number;
  /** Called once `onCheck` resolves `true`. */
  onApproved?: () => void;
  /** Called when "Sign out" is clicked; setting it shows the button. */
  onSignOut?: () => void;
  /**
   * `card` draws the bordered card; `plain` drops the chrome.
   * @default "card"
   */
  variant?: "card" | "plain";
}

/** "Waiting for an admin" screen that checks in the background and says so. */
export const AwaitingApproval = React.forwardRef<HTMLDivElement, AwaitingApprovalProps>(
  (
    {
      title = "Waiting for approval",
      description,
      handle,
      onCheck,
      pollInterval = 15000,
      onApproved,
      onSignOut,
      variant = "card",
      ...props
    },
    ref
  ) => {
    const [approved, setApproved] = React.useState(false);
    // Errors keep waiting; a newer check supersedes a pending one.
    const poll = useAsyncAction(async () => (onCheck ? onCheck() : false), {
      onSuccess: (ok) => {
        if (!ok) return;
        setApproved(true);
        onApproved?.();
      },
    });
    const checking = poll.busy;
    const check = poll.run;
    const checkingRef = useLatestRef(checking);

    // `poll.run` always calls the latest `onCheck`, so an inline callback must not restart the interval.
    const polling = Boolean(onCheck);
    React.useEffect(() => {
      if (!polling || approved) return;
      // Skip a tick while a check is still in flight, so slow checks don't pile up.
      let inFlight = false;
      const id = setInterval(() => {
        if (inFlight || checkingRef.current) return;
        inFlight = true;
        void check().finally(() => {
          inFlight = false;
        });
      }, pollInterval);
      return () => clearInterval(id);
    }, [polling, approved, pollInterval, check, checkingRef]);

    if (approved) {
      return (
        <AuthFrame ref={ref} defaultLogo={false} variant={variant} icon={RiShieldCheckLine} iconColor="success" title="You're approved" description="Your account is ready." {...props} />
      );
    }

    return (
      <AuthFrame
        ref={ref}
        defaultLogo={false}
        variant={variant}
        icon={RiHourglassLine}
        iconColor="warning"
        title={title}
        description={
          description ?? (
            <>
              Thanks{handle && (
                <>
                  , <span className="font-mono text-foreground">{handle}</span>
                </>
              )}
              . Your account is waiting for an admin to approve it. We&apos;ll let you know: you can close this page and sign in again once they have.
            </>
          )
        }
        data-slot="awaiting-approval"
        {...props}
      >
        <div className="flex flex-col items-center gap-4">
          {onCheck && (
            <p role="status" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner size="xs" variant="pulse" />
              {checking ? "Checking…" : `Checking every ${Math.round(pollInterval / 1000)} seconds`}
            </p>
          )}
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            {onCheck && (
              <Button variant="secondary" className="sm:flex-1" leadingIcon={<RiRefreshLine aria-hidden />} loading={checking} onClick={() => void check()}>
                Check now
              </Button>
            )}
            {onSignOut && (
              <Button variant="ghost" className="sm:flex-1" leadingIcon={<RiLogoutBoxRLine className="rtl:-scale-x-100" aria-hidden />} onClick={onSignOut}>
                Sign out
              </Button>
            )}
          </div>
        </div>
      </AuthFrame>
    );
  }
);
AwaitingApproval.displayName = "AwaitingApproval";
