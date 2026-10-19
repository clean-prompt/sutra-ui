/* AuthProblem: full-panel auth error states (not owner, SSO down, cookie conflict, sign-in loop, expired, offline). */
import * as React from "react";
import { RiCloudOffLine, RiCookieLine, RiLoopLeftLine, RiRefreshLine, RiTimeLine, RiUserForbidLine, RiWifiOffLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { capitalize } from "../../lib/text";
import { Button } from "../../primitives/button";
import { FeaturedIcon, type FeaturedIconColor, type IconComponent } from "../../assets/icons";

/* ------------------------------------------------------------------ */
/* AuthProblem                                                         */
/* ------------------------------------------------------------------ */

export type AuthProblemVariant = "not-owner" | "sso-down" | "cookie-conflict" | "sign-in-loop" | "expired-session" | "offline";

export interface AuthProblemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  variant: AuthProblemVariant;
  /** Who is signed in (not-owner). */
  accountName?: string;
  accountHandle?: string;
  /** Name of the app or the suite's sign-in. */
  appName?: string;
  /** Where the shared sign-in lives, e.g. "the suite". */
  providerName?: string;
  onRetry?: () => void;
  onSignIn?: () => void;
  /** Link to switch account at the provider. */
  switchAccountHref?: string;
  /** Link to open the provider's sign-in. */
  providerHref?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Replace the default actions. */
  actions?: React.ReactNode;
  /** Center in a full-height page. */
  fullPage?: boolean;
  /** Extra content, e.g. a break-glass token form. */
  children?: React.ReactNode;
}

/** Full-panel auth error state with a plain explanation and recovery actions. */
export const AuthProblem = React.forwardRef<HTMLDivElement, AuthProblemProps>(
  (
    {
      variant,
      accountName,
      accountHandle,
      appName = "this app",
      providerName = "the suite",
      onRetry,
      onSignIn,
      switchAccountHref,
      providerHref,
      title,
      description,
      actions,
      fullPage,
      className,
      children,
      ...props
    },
    ref
  ) => {
    React.useEffect(() => {
      if (variant !== "offline" || !onRetry || typeof window === "undefined") return;
      window.addEventListener("online", onRetry);
      return () => window.removeEventListener("online", onRetry);
    }, [variant, onRetry]);

    const retry = onRetry && (
      <Button variant="secondary" leadingIcon={<RiRefreshLine aria-hidden />} onClick={onRetry}>
        Try again
      </Button>
    );
    const signIn = onSignIn && <Button onClick={onSignIn}>Sign in again</Button>;

    const content: Record<AuthProblemVariant, { icon: IconComponent; color: FeaturedIconColor; title: string; body: React.ReactNode; actions: React.ReactNode }> = {
      "not-owner": {
        icon: RiUserForbidLine,
        color: "warning",
        title: `Not an owner of ${appName}`,
        body: (
          <>
            You&apos;re signed in{accountName && <> as <strong className="font-medium text-foreground">{accountName}</strong></>}
            {accountHandle && <> (<span className="font-mono text-xs">{accountHandle}</span>)</>}. Only {providerName}&apos;s admins own {appName}. If
            you were just made an admin, this page notices within half a minute.
          </>
        ),
        actions: (
          <>
            {switchAccountHref && (
              <Button asChild variant="secondary">
                <a href={switchAccountHref}>Use another account</a>
              </Button>
            )}
            {retry}
          </>
        ),
      },
      "sso-down": {
        icon: RiCloudOffLine,
        color: "destructive",
        title: `${capitalize(providerName)}'s sign-in is not answering`,
        body: <>{appName} asked {providerName} who you are and got no answer. Nothing else is affected. This page tries again every few seconds.</>,
        actions: onRetry && (
          <Button variant="secondary" leadingIcon={<RiRefreshLine aria-hidden />} onClick={onRetry}>
            Try again now
          </Button>
        ),
      },
      "cookie-conflict": {
        icon: RiCookieLine,
        color: "warning",
        title: "Two sign-ins for this site",
        body: (
          <>
            This browser holds two sign-in cookies for this site, and {appName} won&apos;t guess which one is you. Clear this site&apos;s cookies in your
            browser settings, then sign in again.
          </>
        ),
        actions: signIn,
      },
      "sign-in-loop": {
        icon: RiLoopLeftLine,
        color: "warning",
        title: `Signed in at ${providerName}, but not here`,
        body: (
          <>
            {capitalize(providerName)} sent you straight back, yet {appName} still doesn&apos;t see a sign-in. Its
            connection to {providerName} may be misconfigured; the server log says more.
          </>
        ),
        actions: (
          <>
            {retry}
            {providerHref && (
              <Button asChild variant="secondary">
                <a href={providerHref}>Open {providerName}</a>
              </Button>
            )}
          </>
        ),
      },
      "expired-session": {
        icon: RiTimeLine,
        color: "info",
        title: "Your session expired",
        body: <>For your security, sessions end after a while. Sign in again to pick up where you left off. Nothing you saved is lost.</>,
        actions: signIn ?? retry,
      },
      offline: {
        icon: RiWifiOffLine,
        color: "neutral",
        title: "You're offline",
        body: <>Sign-in needs a connection. Check your network; this page continues on its own once you&apos;re back online.</>,
        actions: retry,
      },
    };
    const c = content[variant];

    const panel = (
      <div
        ref={fullPage ? undefined : ref}
        data-slot="auth-problem"
        data-variant={variant}
        className={cn("flex w-full max-w-[400px] flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8", !fullPage && className)}
        {...(fullPage ? {} : props)}
      >
        <FeaturedIcon icon={c.icon} color={c.color} variant="outline-ring" size="lg" />
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title ?? c.title}</h2>
        <div className="text-pretty text-sm leading-relaxed text-muted-foreground">{description ?? c.body}</div>
        {(actions ?? c.actions) && <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center [&>*]:sm:flex-1">{actions ?? c.actions}</div>}
        {children && <div className="w-full border-t border-border pt-4 text-left">{children}</div>}
      </div>
    );

    if (!fullPage) return panel;
    return (
      <div ref={ref} className={cn("flex min-h-svh w-full items-center justify-center bg-subtle px-4 py-10", className)} {...props}>
        {panel}
      </div>
    );
  }
);
AuthProblem.displayName = "AuthProblem";
