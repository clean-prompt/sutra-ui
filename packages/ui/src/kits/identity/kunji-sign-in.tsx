/* KunjiMark, KunjiSignInView and KunjiSignIn: the "Sign in with kunji" QR widget and its per-state views. */
import * as React from "react";
import {
  RiCheckLine,
  RiCloseCircleLine,
  RiErrorWarningLine,
  RiQrCodeLine,
  RiRefreshLine,
  RiShieldCheckLine,
  RiSmartphoneLine,
  RiTimeLine,
  RiUserUnfollowLine,
} from "@remixicon/react";
import { cn } from "../../lib/cn";
import { formatCountdown } from "../../lib/duration";
import { useNow } from "../../hooks/use-now";
import { useMediaQuery } from "../../hooks/use-media-query";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";
import { OTPField } from "../../primitives/input-otp";
import { FeaturedIcon, type FeaturedIconColor, type IconComponent } from "../../assets/icons";
import { QRCode } from "./qr-code";
import type { KunjiClient } from "./kunji-client";
import { useKunjiSignIn, type KunjiSignInState, type KunjiSignInStatus, type UseKunjiSignInOptions } from "./kunji-sign-in-state";

/* ------------------------------------------------------------------ */
/* KunjiMark                                                           */
/* ------------------------------------------------------------------ */

/**
 * The official kunji brand colours (the brand guide on kunji.cc/brand): amber, its hover shade, ink and paper.
 * Use them as they are; the guide forbids recolouring the logo or the key mark.
 */
export const kunjiBrand = {
  amber: "#f59e0b",
  amberHover: "#d97706",
  ink: "#1a1a18",
  /** The key ink on the amber logo tile. */
  keyInk: "#1c1606",
  paper: "#faf9f6",
} as const;

export interface KunjiMarkProps extends Omit<React.SVGProps<SVGSVGElement>, "ref"> {
  /** `tile` the kunji logo (the amber app icon with the ink key), `glyph` the key mark alone in `currentColor`. */
  variant?: "tile" | "glyph";
  /** Pixel size. The brand guide asks for at least 20px for the logo; 18px is what the official button uses for the key mark. */
  size?: number;
  /** Accessible name; when unset the mark is decorative and hidden from assistive tech. */
  title?: string;
}

/**
 * The kunji brand assets, as published in the kunji brand guide: `variant="tile"` is the logo (the app icon: an amber
 * rounded square with the ink key set at -40 degrees) and `variant="glyph"` is the key mark on its own, drawn in
 * `currentColor` (ink on the amber button, paper on the dark one). Do not recolour, rotate, stretch or add effects.
 */
export const KunjiMark = React.forwardRef<SVGSVGElement, KunjiMarkProps>(
  ({ variant = "glyph", size = 20, title, className, ...props }, ref) => {
    const tile = variant === "tile";
    const ink = tile ? kunjiBrand.keyInk : "currentColor";
    return (
      <svg
        ref={ref}
        viewBox="0 0 512 512"
        width={size}
        height={size}
        role={title ? "img" : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : true}
        className={cn("shrink-0", className)}
        {...props}
      >
        {tile && <rect width="512" height="512" rx="116" fill={kunjiBrand.amber} />}
        <g transform="rotate(-40 256 256)" fill="none" stroke={ink} strokeWidth="58" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="240" cy="172" r="56" fill={ink} />
          <path d="M240 172 V398" />
          <path d="M240 334 L300 314" />
          <path d="M240 334 L300 358" />
        </g>
      </svg>
    );
  }
);
KunjiMark.displayName = "KunjiMark";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */


const formatCode = (code: string) => (code.length >= 6 ? code.replace(new RegExp(`(.{${Math.ceil(code.length / 2)}})`), "$1 ") : code);

/** Default live-region text for each status. */
export const kunjiStatusText: Record<KunjiSignInStatus, string> = {
  idle: "Ready to sign in with kunji.",
  loading: "Preparing sign-in…",
  ready: "Waiting for you to scan the code with kunji.",
  scanned: "Code scanned. Approve the sign-in in kunji.",
  success: "Approved. Signing you in…",
  expired: "This sign-in code expired.",
  denied: "The sign-in was declined in kunji.",
  notLinked: "This kunji identity isn't linked to an account yet.",
  error: "Couldn't start sign-in.",
};

export const KUNJI_SLOW_TEXT = "This is taking longer than usual.";

function StatusPanel({
  icon,
  color,
  title,
  children,
  actions,
}: {
  icon: IconComponent;
  color: FeaturedIconColor;
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center animate-in fade-in-0 zoom-in-95 duration-300">
      <FeaturedIcon icon={icon} color={color} variant="outline-ring" size="lg" />
      <p className="text-base font-semibold text-foreground">{title}</p>
      {children ? <div className="max-w-xs text-pretty text-sm text-muted-foreground">{children}</div> : null}
      {actions ? <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* KunjiSignInView                                                     */
/* ------------------------------------------------------------------ */

export type KunjiSignInVariant = "card" | "inline" | "compact";

export interface KunjiSignInViewProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onError"> {
  /** Current sign-in state: status, QR payload, code and error, as returned by `useKunjiSignIn`. */
  state: KunjiSignInState;
  /** App name shown in the identity line. Defaults to the session's. */
  appName?: string;
  /** Domain shown in the identity line. Defaults to the session's audience. */
  audience?: string;
  /**
   * Layout: `card` (bordered, with heading), `inline` (no chrome) or `compact` (smaller QR, no steps). Default
   * "card".
   */
  variant?: KunjiSignInVariant;
  /** Heading. Pass `null` to hide the header. */
  title?: React.ReactNode;
  /** Replace the "You're signing in to … at …" line. */
  description?: React.ReactNode;
  /** Called when the user starts sign-in (before a session exists). */
  onStart?: () => void;
  /** Called when the user refreshes an expired QR code. */
  onRefresh?: () => void;
  /** Called when the user retries after an error. */
  onRetry?: () => void;
  /**
   * Called when the user asks for a code (`codeMode="show"`); the code option is available only when set or when the
   * session carries a code.
   */
  onRequestCode?: () => void;
  /** Called with the typed code (`codeMode="enter"`). */
  onSubmitCode?: (code: string) => void;
  /** `show`: the app shows a code to type in kunji (the protocol's fallback). `enter`: type a code kunji shows. */
  codeMode?: "show" | "enter" | "none";
  /** Digits for `enter` mode. Default 8. */
  codeLength?: number;
  /** "Open kunji" same-device link: hero on small screens (`auto`), always, or never. */
  deepLink?: "auto" | "always" | "never";
  /** Show the 1-2-3 steps. Default true except for `compact`. */
  showSteps?: boolean;
  /** QR code width and height in px. Default 196, or 148 for the compact variant. */
  qrSize?: number;
  /** Logo on the QR plate. Defaults to the kunji mark. Pass `null` for none. */
  qrLogo?: React.ReactNode;
  /** Shown in the not-linked state. Defaults to buttons for `onLink`/`onRegister`. */
  notLinkedActions?: React.ReactNode;
  /** Called when the user presses the link button in the not-linked state; the button shows when set. */
  onLink?: () => void;
  /** Called when the user presses the register button in the not-linked state; the button shows when set. */
  onRegister?: () => void;
  /** Override live-region messages. */
  statusText?: Partial<Record<KunjiSignInStatus, string>>;
  /** Extra content under the widget (e.g. "Other ways to sign in"). */
  footer?: React.ReactNode;
}

const viewVariant: Record<KunjiSignInVariant, string> = {
  card: "w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7",
  inline: "w-full",
  compact: "w-full max-w-md rounded-box border border-border bg-card p-4 shadow-xs",
};

/** Presentational kunji sign-in: QR with logo plate, countdown, steps, code fallback, deep link and per-state status. */
export const KunjiSignInView = React.forwardRef<HTMLDivElement, KunjiSignInViewProps>(
  (
    {
      state,
      appName,
      audience,
      variant = "card",
      title = "Sign in with kunji",
      description,
      onStart,
      onRefresh,
      onRetry,
      onRequestCode,
      onSubmitCode,
      codeMode = "show",
      codeLength = 8,
      deepLink = "auto",
      showSteps,
      qrSize,
      qrLogo,
      notLinkedActions,
      onLink,
      onRegister,
      statusText,
      footer,
      className,
      ...props
    },
    ref
  ) => {
    const { status, session } = state;
    const compact = variant === "compact";
    const live = status === "ready" || status === "scanned";
    const now = useNow({ active: live && session != null });
    const remaining = session ? session.expiresAt - now : null;
    const locallyExpired = live && remaining != null && remaining <= 0;
    const shown: KunjiSignInStatus = locallyExpired ? "expired" : status;
    const small = useMediaQuery("(max-width: 639px)");
    const [codeOpen, setCodeOpen] = React.useState(false);
    const [qrOpen, setQrOpen] = React.useState(false);
    const [typed, setTyped] = React.useState("");
    const size = qrSize ?? (compact ? 148 : 196);
    const name = appName ?? session?.appName;
    const domain = audience ?? session?.audience;
    const steps = showSteps ?? !compact;
    const mobileHero = deepLink === "always" || (deepLink === "auto" && small);
    const hasQr = session != null && (shown === "ready" || shown === "scanned" || shown === "expired");

    // Reset the code UI when a new session starts. Done during render, not in an effect: a deferred effect
    // could run after the user already opened the code for the new session and close it again.
    const [codeSession, setCodeSession] = React.useState(session?.sessionId);
    if (codeSession !== session?.sessionId) {
      setCodeSession(session?.sessionId);
      setCodeOpen(false);
      setTyped("");
    }

    const texts = { ...kunjiStatusText, ...statusText };
    let liveText = shown === "error" && state.error ? state.error : texts[shown];
    if (state.slow && (shown === "loading" || shown === "scanned")) liveText = `${liveText} ${KUNJI_SLOW_TEXT}`;

    const logo = qrLogo === undefined ? <KunjiMark variant="tile" size={64} /> : qrLogo;

    const qrBlock = hasQr ? (
      <div className="relative rounded-xl bg-white p-1.5 shadow-xs ring-1 ring-black/5">
        <QRCode
          value={session.qrValue}
          size={size}
          logo={logo ?? undefined}
          logoSize={0.22}
          moduleStyle="rounded"
          quietZone={2}
          title={`kunji sign-in code for ${name ?? domain ?? "this app"}`}
          className={cn("transition-[filter,opacity] duration-300", (shown === "expired" || shown === "scanned") && "opacity-30 blur-[3px]")}
        />
        {shown === "scanned" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center animate-in fade-in-0 zoom-in-95">
            <span className="flex size-11 items-center justify-center rounded-full bg-success text-success-foreground shadow-md">
              <RiSmartphoneLine aria-hidden className="size-5" />
            </span>
            <p className="text-sm font-semibold text-(--n-950)">Approve in kunji</p>
          </div>
        )}
        {shown === "expired" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center">
            <p className="text-sm font-semibold text-(--n-950)">Code expired</p>
            {(onRefresh ?? onRetry) && (
              <Button size="sm" variant="primary" leadingIcon={<RiRefreshLine aria-hidden />} onClick={onRefresh ?? onRetry}>
                Get a new code
              </Button>
            )}
          </div>
        )}
      </div>
    ) : null;

    const deepLinkButton =
      session && deepLink !== "never" && (shown === "ready" || shown === "scanned") ? (
        <Button
          asChild
          variant={mobileHero ? "primary" : "outline"}
          size={mobileHero ? "lg" : "md"}
          fullWidth
          className="h-auto min-h-10 whitespace-normal py-2 text-center"
        >
          <a href={session.deepLink} data-slot="kunji-deep-link">
            <KunjiMark />
            {mobileHero ? "Open kunji" : "On this device? Open kunji"}
          </a>
        </Button>
      ) : null;

    const canShowCode = codeMode === "show" && (onRequestCode != null || session?.code != null);
    const canEnterCode = codeMode === "enter" && onSubmitCode != null;
    const codeSection =
      shown === "ready" && (canShowCode || canEnterCode) ? (
        <div data-slot="kunji-code" className="flex w-full flex-col items-center gap-2 text-center">
          {!codeOpen ? (
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setCodeOpen(true);
                if (codeMode === "show") onRequestCode?.();
              }}
            >
              {codeMode === "show" ? "Can't scan? Use a code" : "Use a code instead"}
            </Button>
          ) : codeMode === "show" ? (
            state.codeStatus === "loading" ? (
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner size="xs" /> Getting a code…
              </p>
            ) : state.codeStatus === "error" ? (
              <p className="text-sm text-destructive">{state.codeError ?? "Couldn't get a code. Use the QR instead."}</p>
            ) : state.code ? (
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs text-muted-foreground">Enter this code in the kunji app</p>
                <p data-slot="kunji-code-value" className="font-mono text-2xl font-semibold tracking-[0.2em] text-foreground tabular-nums">
                  {formatCode(state.code)}
                </p>
              </div>
            ) : null
          ) : (
            <form
              className="flex flex-col items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (typed.length === codeLength) onSubmitCode?.(typed);
              }}
            >
              <p className="text-xs text-muted-foreground">Type the code kunji shows</p>
              <OTPField
                length={codeLength}
                groupSize={codeLength % 4 === 0 ? 4 : 3}
                size="sm"
                value={typed}
                onChange={setTyped}
                onComplete={(v: string) => onSubmitCode?.(v)}
                invalid={state.codeStatus === "error"}
                disabled={state.codeStatus === "submitting"}
                aria-label="Code from kunji"
              />
              {state.codeStatus === "error" && <p className="text-xs text-destructive">{state.codeError}</p>}
              <Button type="submit" size="sm" variant="secondary" loading={state.codeStatus === "submitting"} disabled={typed.length !== codeLength}>
                Continue
              </Button>
            </form>
          )}
        </div>
      ) : null;

    let body: React.ReactNode;
    if (shown === "idle") {
      body = (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <KunjiMark variant="tile" size={48} />
          <p className="text-sm text-muted-foreground">Sign in with the kunji app on your phone. No password needed.</p>
          {onStart && (
            <Button leadingIcon={<RiQrCodeLine aria-hidden />} onClick={onStart}>
              Show sign-in code
            </Button>
          )}
        </div>
      );
    } else if (shown === "loading") {
      body = (
        <div className="flex justify-center">
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl bg-muted/60 text-muted-foreground"
            style={{ width: size + 12, height: size + 12 }}
          >
            <Spinner size="md" />
            <span className="text-xs">Preparing sign-in…</span>
          </div>
        </div>
      );
    } else if (shown === "success") {
      body = (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span
            data-slot="kunji-success"
            className="relative flex size-16 items-center justify-center rounded-full bg-success text-success-foreground shadow-lg animate-in zoom-in-50 fade-in-0 duration-500"
          >
            <span aria-hidden className="absolute inset-0 rounded-full bg-success/40 motion-safe:animate-ping [animation-iteration-count:1]" />
            <RiCheckLine aria-hidden className="relative size-8" />
          </span>
          <p className="text-base font-semibold text-foreground">Signed in</p>
          {name && <p className="text-sm text-muted-foreground">Taking you to {name}…</p>}
        </div>
      );
    } else if (shown === "denied") {
      body = (
        <StatusPanel
          icon={RiCloseCircleLine}
          color="warning"
          title="Sign-in declined"
          actions={(onRetry ?? onStart) && <Button leadingIcon={<RiRefreshLine aria-hidden />} onClick={onRetry ?? onStart}>Try again</Button>}
        >
          The request was declined in kunji. If that wasn't you, nothing happened: no one was signed in.
        </StatusPanel>
      );
    } else if (shown === "notLinked") {
      body = (
        <StatusPanel
          icon={RiUserUnfollowLine}
          color="info"
          title="This kunji identity isn't linked yet"
          actions={
            notLinkedActions ?? (
              <>
                {onLink && <Button onClick={onLink}>Sign in another way to link</Button>}
                {onRegister && (
                  <Button variant={onLink ? "secondary" : "primary"} onClick={onRegister}>
                    Create an account
                  </Button>
                )}
                {(onRetry ?? onStart) && (
                  <Button variant="ghost" onClick={onRetry ?? onStart}>
                    Try kunji again
                  </Button>
                )}
              </>
            )
          }
        >
          {name ?? "This app"} doesn&apos;t know this kunji key. Sign in once with your username and password, then link kunji from your
          account. Your account may also still be awaiting approval.
        </StatusPanel>
      );
    } else if (shown === "error") {
      body = (
        <StatusPanel
          icon={RiErrorWarningLine}
          color="destructive"
          title="kunji sign-in is unavailable"
          actions={(onRetry ?? onStart) && <Button leadingIcon={<RiRefreshLine aria-hidden />} onClick={onRetry ?? onStart}>Try again</Button>}
        >
          {state.error ?? "Something went wrong talking to the server."}
        </StatusPanel>
      );
    } else {
      const qrArea = mobileHero && !qrOpen ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto min-h-8 max-w-full whitespace-normal py-1 text-center"
          leadingIcon={<RiQrCodeLine aria-hidden />}
          onClick={() => setQrOpen(true)}
        >
          Show QR for another device
        </Button>
      ) : (
        qrBlock
      );
      body = (
        <div className={cn("flex flex-col items-center gap-4", compact && "@sm:flex-row @sm:items-start")}>
          {mobileHero && deepLinkButton}
          <div className="flex flex-col items-center gap-2">
            {qrArea}
            {remaining != null && shown !== "expired" && (
              <p
                role="timer"
                aria-live="off"
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium tabular-nums",
                  remaining <= 15_000 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                <RiTimeLine aria-hidden className="size-3.5" />
                Expires in {formatCountdown(remaining)}
              </p>
            )}
            {shown === "expired" && <p className="max-w-[16rem] text-center text-xs text-muted-foreground">Codes are short-lived for your security.</p>}
          </div>
          <div className={cn("flex w-full min-w-0 flex-col items-center gap-3", compact && "@sm:items-start")}>
            {steps && shown !== "expired" && (
              <ol className="flex w-full flex-col gap-2 text-sm text-muted-foreground" aria-label="How to sign in">
                {[
                  <>Open <span className="font-medium text-foreground">kunji</span> on your phone</>,
                  <>Tap <span className="font-medium text-foreground">Scan</span> and point it at this code</>,
                  <>Check it says <span className="font-mono text-xs font-medium text-foreground">{domain ?? "this site"}</span>, then approve</>,
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-2xs font-semibold",
                        shown === "scanned" && i < 2 ? "bg-success text-success-foreground" : "bg-muted text-foreground"
                      )}
                    >
                      {shown === "scanned" && i < 2 ? <RiCheckLine aria-hidden className="size-3" /> : i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            )}
            {codeSection}
            {!mobileHero && deepLinkButton}
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        data-slot="kunji-sign-in"
        data-status={shown}
        data-variant={variant}
        className={cn("@container flex flex-col gap-5 text-card-foreground", viewVariant[variant], className)}
        {...props}
      >
        {title !== null && (
          <div className={cn("flex flex-col gap-1.5", compact ? "items-start text-start" : "items-center text-center")}>
            <div className="flex items-center gap-2">
              <KunjiMark variant="tile" size={compact ? 22 : 26} />
              <h2 className={cn("font-semibold tracking-tight text-foreground", compact ? "text-base" : "text-lg")}>{title}</h2>
            </div>
            {description !== undefined
              ? description
              : (name || domain) && (
                  <p data-slot="kunji-identity" className="inline-flex flex-wrap items-center justify-center gap-x-1.5 text-sm text-muted-foreground">
                    <RiShieldCheckLine aria-hidden className="size-4 text-success" />
                    <span>
                      You&apos;re signing in to {name && <span className="font-medium text-foreground">{name}</span>}
                      {domain && (
                        <>
                          {" "}at <span className="font-mono text-xs font-medium text-foreground">{domain}</span>
                        </>
                      )}
                    </span>
                  </p>
                )}
          </div>
        )}
        {body}
        <div className="flex flex-col items-center gap-2">
          <p
            role="status"
            aria-live="polite"
            data-slot="kunji-status"
            className={cn(
              "inline-flex items-center gap-2 text-center text-xs",
              shown === "error" || shown === "expired" ? "text-destructive" : "text-muted-foreground",
              (shown === "idle" || shown === "success") && "sr-only"
            )}
          >
            {(shown === "ready" || shown === "scanned" || shown === "loading") && (
              <span aria-hidden className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-primary/60 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
            )}
            {liveText}
          </p>
          {state.slow && (shown === "loading" || shown === "scanned") && (onRetry ?? onStart) && (
            <Button size="xs" variant="ghost" leadingIcon={<RiRefreshLine aria-hidden />} onClick={onRetry ?? onStart}>
              Start over
            </Button>
          )}
        </div>
        {footer}
      </div>
    );
  }
);
KunjiSignInView.displayName = "KunjiSignInView";

/* ------------------------------------------------------------------ */
/* KunjiSignIn                                                         */
/* ------------------------------------------------------------------ */

export interface KunjiSignInProps
  extends Omit<KunjiSignInViewProps, "state" | "onStart" | "onRefresh" | "onRetry" | "onRequestCode" | "onSubmitCode">,
    Omit<UseKunjiSignInOptions, "client"> {
  /** Kunji client that creates the session and polls for approval (see `createKunjiClient`). */
  client: KunjiClient;
}

/** "Sign in with kunji" widget: runs the protocol against the app's own endpoints and renders every state. */
export const KunjiSignIn = React.forwardRef<HTMLDivElement, KunjiSignInProps>(
  ({ client, onSuccess, onError, onStatusChange, autoStart, slowAfter, successDelay, pollInterval, appName, audience, ...props }, ref) => {
    const kunji = useKunjiSignIn({ client, onSuccess, onError, onStatusChange, autoStart, slowAfter, successDelay, pollInterval });
    return (
      <KunjiSignInView
        ref={ref}
        state={kunji.state}
        appName={appName ?? client.appName}
        audience={audience ?? client.audience}
        onStart={kunji.start}
        onRefresh={kunji.refresh}
        onRetry={kunji.retry}
        onRequestCode={kunji.canRequestCode ? kunji.requestCode : undefined}
        onSubmitCode={kunji.canSubmitCode ? kunji.submitCode : undefined}
        {...props}
      />
    );
  }
);
KunjiSignIn.displayName = "KunjiSignIn";
