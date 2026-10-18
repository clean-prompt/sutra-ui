import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  RiCheckLine,
  RiCloseCircleLine,
  RiCloudOffLine,
  RiCookieLine,
  RiErrorWarningLine,
  RiHourglassLine,
  RiKey2Line,
  RiLinkM,
  RiLinkUnlinkM,
  RiLoopLeftLine,
  RiQrCodeLine,
  RiRefreshLine,
  RiShieldCheckLine,
  RiSmartphoneLine,
  RiTimeLine,
  RiUserForbidLine,
  RiUserUnfollowLine,
  RiWifiOffLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { formatCountdown } from "../../lib/duration";
import { toValidDate } from "../../lib/time";
import { capitalize } from "../../lib/text";
import { useNow } from "../../hooks/use-now";
import { useMediaQuery } from "../../hooks/use-media-query";
import { useSafeId } from "../../hooks/use-safe-id";
import { errorMessage as messageOf, useAsyncAction } from "../../hooks/use-async-action";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { Spinner } from "../../primitives/spinner";
import { QRCode } from "./qr-code";
import { OTPField } from "../../primitives/input-otp";
import { Textarea } from "../../primitives/textarea";
import { CheckboxField } from "../../primitives/checkbox";
import { Field, FieldHint, FieldLabel } from "../../primitives/field";
import { InlineAlert } from "../../primitives/inline-alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../primitives/dialog";
import { FeaturedIcon, type FeaturedIconColor, type IconComponent } from "../../assets/icons";
import {
  createRpScriptAdapter,
  formatKunjiSub,
  isKunjiAbortError,
  type KunjiClient,
  type KunjiPollResult,
  type KunjiRpOptions,
  type KunjiRpScriptAdapter,
  type KunjiRpSuccessDetail,
  type KunjiSession,
} from "./kunji-client";


/* ------------------------------------------------------------------ */
/* KunjiMark                                                           */
/* ------------------------------------------------------------------ */

export interface KunjiMarkProps extends Omit<React.SVGProps<SVGSVGElement>, "ref"> {
  /** `tile` amber tile with a light key, `glyph` the key alone in `currentColor`. */
  variant?: "tile" | "glyph";
  size?: number;
  title?: string;
}

/** An original key glyph for "Sign in with kunji": a ring bow, a diagonal shaft and stepped bit teeth. */
export const KunjiMark = React.forwardRef<SVGSVGElement, KunjiMarkProps>(
  ({ variant = "glyph", size = 20, title, className, ...props }, ref) => {
    const id = useSafeId("kunji");
    const ink = variant === "tile" ? "#fffaf0" : "currentColor";
    return (
      <svg
        ref={ref}
        viewBox="0 0 32 32"
        width={size}
        height={size}
        role={title ? "img" : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : true}
        className={cn("shrink-0", className)}
        {...props}
      >
        {variant === "tile" && (
          <>
            <defs>
              <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fbbf24" />
                <stop offset="1" stopColor="#d97706" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill={`url(#${id}-g)`} />
          </>
        )}
        <g transform={variant === "tile" ? "translate(3.2 3.2) scale(0.8)" : undefined} fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10.5" cy="10.5" r="5.5" strokeWidth="3" />
          <path d="M14.4 14.4 L26 26" strokeWidth="3" />
          <path d="M21.5 21.5 l3.2 -3.2 M18.3 18.3 l2.4 -2.4" strokeWidth="2.6" />
        </g>
      </svg>
    );
  }
);
KunjiMark.displayName = "KunjiMark";

/* ------------------------------------------------------------------ */
/* useKunjiSignIn                                                      */
/* ------------------------------------------------------------------ */

export type KunjiSignInStatus = "idle" | "loading" | "ready" | "scanned" | "success" | "expired" | "denied" | "notLinked" | "error";

export interface KunjiSignInState {
  status: KunjiSignInStatus;
  session?: KunjiSession;
  result?: KunjiPollResult;
  error?: string;
  /** True once loading or awaiting approval has taken longer than `slowAfter`. */
  slow: boolean;
  /** Short code for the typed fallback. */
  code?: string;
  codeStatus: "idle" | "loading" | "ready" | "submitting" | "error";
  codeError?: string;
}

export interface UseKunjiSignInOptions {
  client: KunjiClient;
  /** Called after the success animation with the approved poll result. */
  onSuccess?: (result: KunjiPollResult) => void;
  onError?: (error: unknown) => void;
  onStatusChange?: (status: KunjiSignInStatus) => void;
  /** Start a session on mount. Default true. */
  autoStart?: boolean;
  /** Mark the attempt `slow` after this many ms of loading or awaiting approval. Default 15000. 0 disables. */
  slowAfter?: number;
  /** Delay between the success state and `onSuccess`, for the animation. Default 900ms. */
  successDelay?: number;
  /** Override the client's poll interval. */
  pollInterval?: number;
}

export interface UseKunjiSignInReturn {
  state: KunjiSignInState;
  /** Start (or restart) a session. */
  start: () => void;
  /** Alias of `start`, for "Get a new code". */
  refresh: () => void;
  /** Alias of `start`, for "Try again". */
  retry: () => void;
  /** Abort and return to idle. */
  cancel: () => void;
  /** Reveal or lazily mint the short code. */
  requestCode: () => void;
  /** Submit a code shown by the wallet (reverse flow). */
  submitCode: (code: string) => void;
  /** Whether the client offers each code path. */
  canRequestCode: boolean;
  canSubmitCode: boolean;
}

const initialState: KunjiSignInState = { status: "idle", slow: false, codeStatus: "idle" };



/** State machine for kunji sign-in: idle → loading → ready → scanned → success | expired | denied | notLinked | error. */
export function useKunjiSignIn({
  client,
  onSuccess,
  onError,
  onStatusChange,
  autoStart = true,
  slowAfter = 15000,
  successDelay = 900,
  pollInterval,
}: UseKunjiSignInOptions): UseKunjiSignInReturn {
  const [state, setState] = React.useState<KunjiSignInState>(initialState);
  const ctrl = React.useRef<AbortController | null>(null);
  const slowTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const successTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const callbacks = React.useRef({ onSuccess, onError, onStatusChange });
  callbacks.current = { onSuccess, onError, onStatusChange };
  const sessionRef = React.useRef<KunjiSession | undefined>(undefined);

  const disarmSlow = React.useCallback(() => clearTimeout(slowTimer.current), []);
  const armSlow = React.useCallback(() => {
    clearTimeout(slowTimer.current);
    if (slowAfter > 0) slowTimer.current = setTimeout(() => setState((s) => ({ ...s, slow: true })), slowAfter);
  }, [slowAfter]);

  const finish = React.useCallback(
    (result: KunjiPollResult) => {
      disarmSlow();
      const status: KunjiSignInStatus =
        result.status === "approved"
          ? "success"
          : result.status === "denied"
            ? "denied"
            : result.status === "not_linked"
              ? "notLinked"
              : result.status === "expired"
                ? "expired"
                : "error";
      setState((s) => ({ ...s, status, result, slow: false, codeStatus: s.codeStatus === "submitting" ? "idle" : s.codeStatus }));
      if (status === "success") {
        clearTimeout(successTimer.current);
        successTimer.current = setTimeout(() => callbacks.current.onSuccess?.(result), successDelay);
      }
    },
    [disarmSlow, successDelay]
  );

  const start = React.useCallback(() => {
    ctrl.current?.abort();
    clearTimeout(successTimer.current);
    const c = new AbortController();
    ctrl.current = c;
    sessionRef.current = undefined;
    setState({ ...initialState, status: "loading" });
    armSlow();
    void (async () => {
      try {
        const session = await client.createSession(c.signal);
        if (c.signal.aborted) return;
        sessionRef.current = session;
        disarmSlow();
        setState((s) => ({
          ...s,
          status: "ready",
          slow: false,
          session,
          code: session.code,
          codeStatus: "idle",
        }));
        const result = await client.poll(session.sessionId, c.signal, {
          expiresAt: session.expiresAt,
          ...(pollInterval ? { interval: pollInterval } : {}),
          onStatus: (r) => {
            if (c.signal.aborted || r.status !== "scanned") return;
            setState((s) => (s.status === "ready" ? { ...s, status: "scanned" } : s));
            armSlow();
          },
        });
        if (c.signal.aborted) return;
        finish(result);
      } catch (e) {
        if (c.signal.aborted || isKunjiAbortError(e)) return;
        disarmSlow();
        setState((s) => ({ ...s, status: "error", error: messageOf(e, "Couldn't start sign-in."), slow: false }));
        callbacks.current.onError?.(e);
      }
    })();
  }, [client, armSlow, disarmSlow, finish, pollInterval]);

  const cancel = React.useCallback(() => {
    ctrl.current?.abort();
    disarmSlow();
    clearTimeout(successTimer.current);
    setState(initialState);
  }, [disarmSlow]);

  const requestCode = React.useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    if (session.code) {
      setState((s) => ({ ...s, code: session.code, codeStatus: "ready" }));
      return;
    }
    if (!client.requestCode) return;
    const signal = ctrl.current?.signal;
    setState((s) => ({ ...s, codeStatus: "loading", codeError: undefined }));
    client.requestCode(session.sessionId, signal).then(
      (code) => {
        if (!signal?.aborted) setState((s) => ({ ...s, code, codeStatus: "ready" }));
      },
      (e) => {
        if (!signal?.aborted && !isKunjiAbortError(e)) setState((s) => ({ ...s, codeStatus: "error", codeError: messageOf(e, "Couldn't get a code.") }));
      }
    );
  }, [client]);

  const submitCode = React.useCallback(
    (code: string) => {
      if (!client.submitCode) return;
      const c = ctrl.current;
      const signal = c?.signal;
      setState((s) => ({ ...s, codeStatus: "submitting", codeError: undefined }));
      client.submitCode(code, signal, sessionRef.current?.sessionId).then(
        (result) => {
          if (signal?.aborted) return;
          c?.abort();
          finish(result);
        },
        (e) => {
          if (!signal?.aborted && !isKunjiAbortError(e)) setState((s) => ({ ...s, codeStatus: "error", codeError: messageOf(e, "That code didn't work.") }));
        }
      );
    },
    [client, finish]
  );

  React.useEffect(() => {
    callbacks.current.onStatusChange?.(state.status);
  }, [state.status]);

  React.useEffect(() => {
    if (autoStart) start();
    return () => {
      ctrl.current?.abort();
      clearTimeout(slowTimer.current);
      clearTimeout(successTimer.current);
    };
    // Restart only when the client changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  return {
    state,
    start,
    refresh: start,
    retry: start,
    cancel,
    requestCode,
    submitCode,
    canRequestCode: Boolean(client.requestCode) || Boolean(state.session?.code),
    canSubmitCode: Boolean(client.submitCode),
  };
}

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
  state: KunjiSignInState;
  /** App name shown in the identity line. Defaults to the session's. */
  appName?: string;
  /** Domain shown in the identity line. Defaults to the session's audience. */
  audience?: string;
  variant?: KunjiSignInVariant;
  /** Heading. Pass `null` to hide the header. */
  title?: React.ReactNode;
  /** Replace the "You're signing in to … at …" line. */
  description?: React.ReactNode;
  onStart?: () => void;
  onRefresh?: () => void;
  onRetry?: () => void;
  onRequestCode?: () => void;
  onSubmitCode?: (code: string) => void;
  /** `show`: the app shows a code to type in kunji (the protocol's fallback). `enter`: type a code kunji shows. */
  codeMode?: "show" | "enter" | "none";
  /** Digits for `enter` mode. Default 8. */
  codeLength?: number;
  /** "Open kunji" same-device link: hero on small screens (`auto`), always, or never. */
  deepLink?: "auto" | "always" | "never";
  /** Show the 1-2-3 steps. Default true except for `compact`. */
  showSteps?: boolean;
  qrSize?: number;
  /** Logo on the QR plate. Defaults to the kunji mark. Pass `null` for none. */
  qrLogo?: React.ReactNode;
  /** Shown in the not-linked state. Defaults to buttons for `onLink`/`onRegister`. */
  notLinkedActions?: React.ReactNode;
  onLink?: () => void;
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

    React.useEffect(() => {
      setCodeOpen(false);
      setTyped("");
    }, [session?.sessionId]);

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
        <Button variant="ghost" size="sm" leadingIcon={<RiQrCodeLine aria-hidden />} onClick={() => setQrOpen(true)}>
          Show QR for another device
        </Button>
      ) : (
        qrBlock
      );
      body = (
        <div className={cn("flex flex-col items-center gap-4", compact && "sm:flex-row sm:items-start")}>
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
          <div className={cn("flex w-full flex-col items-center gap-3", compact && "sm:items-start")}>
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
        className={cn("flex flex-col gap-5 text-card-foreground", viewVariant[variant], className)}
        {...props}
      >
        {title !== null && (
          <div className={cn("flex flex-col gap-1.5", compact ? "items-start text-left" : "items-center text-center")}>
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

/* ------------------------------------------------------------------ */
/* KunjiButton                                                         */
/* ------------------------------------------------------------------ */

export const kunjiButtonVariants = cva(
  [
    "inline-flex select-none items-center justify-center gap-2.5 whitespace-nowrap rounded-control font-medium shadow-xs transition-[background-color,box-shadow,transform] active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50",
    focusRing,
  ],
  {
    variants: {
      theme: {
        dark: "bg-[#17130f] text-[#fffaf0] hover:bg-[#2a221b]",
        light: "border border-border-strong bg-white text-[#17130f] hover:bg-[#faf7f2]",
        amber: "bg-[#f5b031] text-[#1f1405] hover:bg-[#eaa21c]",
      },
      size: {
        sm: "h-8 px-3 text-sm [&_svg]:size-4",
        md: "h-10 px-4 text-sm [&_svg]:size-[18px]",
        lg: "h-12 px-5 text-base [&_svg]:size-5",
      },
      fullWidth: { true: "w-full" },
    },
    defaultVariants: { theme: "dark", size: "md" },
  }
);

export interface KunjiButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onError">,
    VariantProps<typeof kunjiButtonVariants> {
  client: KunjiClient;
  onSuccess?: (result: KunjiPollResult) => void;
  onError?: (error: unknown) => void;
  /** Props for the `KunjiSignIn` inside the dialog. */
  signInProps?: Partial<Omit<KunjiSignInProps, "client" | "onSuccess" | "onError">>;
  /** Controlled dialog open state. */
  open?: boolean;
  /** Initial dialog open state when uncontrolled. Default false. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Brand "Sign in with kunji" button that opens `KunjiSignIn` in a dialog. */
export const KunjiButton = React.forwardRef<HTMLButtonElement, KunjiButtonProps>(
  (
    { client, onSuccess, onError, signInProps, open: openProp, defaultOpen = false, onOpenChange, theme, size, fullWidth, className, children, ...props },
    ref
  ) => {
    const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button ref={ref} type="button" data-slot="kunji-button" className={cn(kunjiButtonVariants({ theme, size, fullWidth }), className)} {...props}>
            <KunjiMark variant={theme === "amber" ? "glyph" : "tile"} />
            {children ?? "Sign in with kunji"}
          </button>
        </DialogTrigger>
        <DialogContent size="sm">
          <DialogHeader align="center">
            <DialogTitle className="inline-flex items-center gap-2">
              <KunjiMark variant="tile" size={24} />
              Sign in with kunji
            </DialogTitle>
            <DialogDescription>
              You&apos;re signing in to <span className="font-medium text-foreground">{client.appName}</span>
              {client.audience && (
                <>
                  {" "}at <span className="font-mono text-xs font-medium text-foreground">{client.audience}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <KunjiSignIn
            client={client}
            variant="inline"
            title={null}
            onError={onError}
            onSuccess={(r) => {
              onSuccess?.(r);
              setOpen(false);
            }}
            {...signInProps}
          />
        </DialogContent>
      </Dialog>
    );
  }
);
KunjiButton.displayName = "KunjiButton";

/* ------------------------------------------------------------------ */
/* KunjiLinkedBadge / KunjiLink                                        */
/* ------------------------------------------------------------------ */

export interface KunjiLinkedBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  linked?: boolean;
  /** kunji `sub`, shortened in the tooltip. */
  sub?: string;
  size?: "sm" | "md" | "lg";
}

/** Small badge: "kunji linked" or "kunji not linked". */
export const KunjiLinkedBadge = React.forwardRef<HTMLSpanElement, KunjiLinkedBadgeProps>(
  ({ linked = true, sub, size = "md", className, children, ...props }, ref) => (
    <Badge
      ref={ref}
      color={linked ? "success" : "neutral"}
      size={size}
      leadingIcon={linked ? <RiCheckLine aria-hidden /> : <KunjiMark />}
      title={sub ? `kunji identity ${formatKunjiSub(sub, 6, 6)}` : undefined}
      data-slot="kunji-linked-badge"
      className={className}
      {...props}
    >
      {children ?? (linked ? "kunji linked" : "kunji not linked")}
    </Badge>
  )
);
KunjiLinkedBadge.displayName = "KunjiLinkedBadge";

export interface KunjiLinkProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  client: KunjiClient;
  linked?: boolean;
  defaultLinked?: boolean;
  onLinkedChange?: (linked: boolean) => void;
  /** Linked identity (`sub`). */
  sub?: string;
  /** Confirm the approved scan with the server. Throw to show an error. */
  onLink?: (result: KunjiPollResult) => unknown;
  /** Remove the link. Hidden when omitted. */
  onUnlink?: () => unknown;
  title?: React.ReactNode;
  description?: React.ReactNode;
}

/** Link a kunji wallet to the signed-in account: scan, confirm with the server, then "Linked ✓". */
export const KunjiLink = React.forwardRef<HTMLDivElement, KunjiLinkProps>(
  (
    {
      client,
      linked: linkedProp,
      defaultLinked = false,
      onLinkedChange,
      sub,
      onLink,
      onUnlink,
      title = "kunji sign-in",
      description,
      className,
      ...props
    },
    ref
  ) => {
    const [linked, setLinked] = useControllableState({ value: linkedProp, defaultValue: defaultLinked, onChange: onLinkedChange });
    const [mode, setMode] = React.useState<"idle" | "scanning" | "linking" | "unlinking">("idle");
    const [error, setError] = React.useState<string | null>(null);
    const [justLinked, setJustLinked] = React.useState(false);
    const [linkedSub, setLinkedSub] = React.useState<string | undefined>(undefined);
    const shownSub = sub ?? linkedSub;

    const confirm = async (result: KunjiPollResult) => {
      setMode("linking");
      try {
        await onLink?.(result);
        setLinkedSub(result.sub);
        setLinked(true);
        setJustLinked(true);
        setError(null);
      } catch (e) {
        setError(messageOf(e, "Couldn't link kunji."));
      } finally {
        setMode("idle");
      }
    };

    const unlink = async () => {
      setMode("unlinking");
      try {
        await onUnlink?.();
        setLinked(false);
        setJustLinked(false);
        setLinkedSub(undefined);
        setError(null);
      } catch (e) {
        setError(messageOf(e, "Couldn't unlink kunji."));
      } finally {
        setMode("idle");
      }
    };

    return (
      <div
        ref={ref}
        data-slot="kunji-link"
        data-linked={linked || undefined}
        className={cn("flex w-full flex-col gap-3 rounded-box border border-border bg-card p-4", className)}
        {...props}
      >
        <div className="flex items-center gap-3">
          <KunjiMark variant="tile" size={32} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <span className="text-xs text-muted-foreground">
              {description ?? (linked ? "Sign in by scanning with kunji." : "Optional. Lets you sign in by scanning, no password.")}
            </span>
          </div>
          <KunjiLinkedBadge linked={linked} sub={shownSub} size="sm" />
        </div>

        {error && (
          <InlineAlert variant="destructive" onDismiss={() => setError(null)}>
            {error}
          </InlineAlert>
        )}

        {mode === "scanning" ? (
          <>
            <KunjiSignIn
              client={client}
              variant="inline"
              title={null}
              successDelay={500}
              statusText={{ ready: "Waiting for you to scan with kunji to link it.", success: "Approved. Linking…" }}
              onSuccess={(r) => void confirm(r)}
            />
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </>
        ) : mode === "linking" ? (
          <p role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="xs" /> Linking…
          </p>
        ) : linked ? (
          <div className="flex flex-col gap-3">
            {justLinked && (
              <InlineAlert variant="success">Linked ✓ kunji is linked: you can sign in by scanning now.</InlineAlert>
            )}
            {shownSub && (
              <p className="text-xs text-muted-foreground">
                Identity <span className="font-mono text-foreground" title={shownSub}>{formatKunjiSub(shownSub, 6, 6)}</span>
              </p>
            )}
            {onUnlink && (
              <Button
                variant="secondary"
                size="sm"
                className="self-start"
                leadingIcon={<RiLinkUnlinkM aria-hidden />}
                loading={mode === "unlinking"}
                onClick={() => void unlink()}
              >
                Unlink
              </Button>
            )}
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            leadingIcon={<RiLinkM aria-hidden />}
            onClick={() => {
              setError(null);
              setMode("scanning");
            }}
          >
            Link kunji
          </Button>
        )}
      </div>
    );
  }
);
KunjiLink.displayName = "KunjiLink";

/* ------------------------------------------------------------------ */
/* KunjiRpSignIn (opt-in hosted widget)                                */
/* ------------------------------------------------------------------ */

export interface KunjiRpSignInProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onError"> {
  /** Adapter from `createRpScriptAdapter()`. Loading the hosted script is a third-party request. */
  adapter?: KunjiRpScriptAdapter;
  options: KunjiRpOptions;
  onSuccess?: (detail: KunjiRpSuccessDetail) => void;
  onError?: (error: unknown) => void;
}

/** Renders the official hosted rp.js button. Opt-in: Sutra's own `KunjiSignIn` makes no third-party requests. */
export const KunjiRpSignIn = React.forwardRef<HTMLDivElement, KunjiRpSignInProps>(
  ({ adapter: adapterProp, options, onSuccess, onError, className, ...props }, ref) => {
    const box = React.useRef<HTMLDivElement | null>(null);
    const [phase, setPhase] = React.useState<"loading" | "ready" | "error">("loading");
    const [message, setMessage] = React.useState("");
    const [attempt, setAttempt] = React.useState(0);
    const adapter = React.useMemo(() => adapterProp ?? createRpScriptAdapter(), [adapterProp]);
    const cbs = React.useRef({ onSuccess, onError });
    cbs.current = { onSuccess, onError };
    const key = JSON.stringify(options);

    React.useEffect(() => {
      let cleanup: (() => void) | undefined;
      let cancelled = false;
      const el = box.current;
      if (!el) return;
      setPhase("loading");
      adapter.render(el, options, (d) => cbs.current.onSuccess?.(d)).then(
        (fn) => {
          if (cancelled) fn();
          else {
            cleanup = fn;
            setPhase("ready");
          }
        },
        (e) => {
          if (cancelled) return;
          setPhase("error");
          setMessage(messageOf(e, "Could not load kunji."));
          cbs.current.onError?.(e);
        }
      );
      return () => {
        cancelled = true;
        cleanup?.();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adapter, key, attempt]);

    return (
      <div ref={ref} data-slot="kunji-rp-sign-in" className={cn("flex flex-col items-center gap-2", className)} {...props}>
        {phase === "loading" && (
          <p role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="xs" /> Loading kunji…
          </p>
        )}
        {phase === "error" && (
          <div className="flex flex-col items-center gap-2 text-center">
            <p role="alert" className="text-sm text-destructive">{message}</p>
            <Button size="sm" variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          </div>
        )}
        <div ref={box} hidden={phase !== "ready"} />
      </div>
    );
  }
);
KunjiRpSignIn.displayName = "KunjiRpSignIn";

/* ------------------------------------------------------------------ */
/* AccessGate                                                          */
/* ------------------------------------------------------------------ */

export type AccessGateStatus = "none" | "pending" | "approved" | "denied" | "delivered" | "collected";

export interface AccessGateGrant {
  /** Allowed resources (e.g. models); `null`/absent means all. */
  resources?: string[] | null;
  ttlDays?: number | null;
  canEvict?: boolean;
}

export interface AccessGateRecord {
  status: AccessGateStatus;
  createdAt?: Date | number | string;
  decidedAt?: Date | number | string;
  keyName?: string;
  grant?: AccessGateGrant;
}

export interface AccessGateScopeOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
}

export interface AccessGateAdapter {
  /** Send the request. Resolves to the new record (usually `pending`). */
  request: (input: { purpose: string; scopes: string[] }) => Promise<AccessGateRecord>;
  /** Poll for a decision while pending. */
  check?: () => Promise<AccessGateRecord>;
  /** Collect the issued key once approved. */
  claim?: () => Promise<unknown>;
}

export interface AccessGateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  adapter: AccessGateAdapter;
  record?: AccessGateRecord;
  defaultRecord?: AccessGateRecord;
  onRecordChange?: (record: AccessGateRecord) => void;
  /** What is being requested, e.g. "GPU access". */
  resourceName?: string;
  /** Who is signed in. */
  signedInAs?: React.ReactNode;
  scopes?: AccessGateScopeOption[];
  defaultScopes?: string[];
  purposePlaceholder?: string;
  /** Poll interval while pending. Default 5000ms. */
  pollInterval?: number;
  onCollected?: () => void;
  /** Escape hatch shown under the form, e.g. "Sign in with kunji instead". */
  otherWays?: React.ReactNode;
}



const fmtDate = (v: Date | number | string | undefined) => toValidDate(v)?.toLocaleString() ?? null;

/** Request-access flow for admin-approved apps: request → pending → approved (collect key) | denied. */
export const AccessGate = React.forwardRef<HTMLDivElement, AccessGateProps>(
  (
    {
      adapter,
      record: recordProp,
      defaultRecord = { status: "none" },
      onRecordChange,
      resourceName = "access",
      signedInAs,
      scopes,
      defaultScopes = [],
      purposePlaceholder = "e.g. running the benchmark suite against the new model",
      pollInterval = 5000,
      onCollected,
      otherWays,
      className,
      ...props
    },
    ref
  ) => {
    const [record, setRecord] = useControllableState<AccessGateRecord>({
      value: recordProp,
      defaultValue: defaultRecord,
      onChange: onRecordChange,
    });
    const [purpose, setPurpose] = React.useState("");
    const [picked, setPicked] = React.useState<string[]>(defaultScopes);
    const { run, busy, error } = useAsyncAction((fn: () => Promise<void>) => fn());
    const purposeId = React.useId();
    const status = record.status;
    const check = adapter.check;

    React.useEffect(() => {
      if (status !== "pending" || !check) return;
      let alive = true;
      const id = setInterval(() => {
        check().then(
          (r) => {
            if (alive && r.status !== "pending") setRecord(r);
          },
          () => {}
        );
      }, pollInterval);
      return () => {
        alive = false;
        clearInterval(id);
      };
    }, [status, check, pollInterval, setRecord]);


    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!purpose.trim()) return;
      void run(async () => setRecord(await adapter.request({ purpose: purpose.trim(), scopes: picked })));
    };

    const form = (label: string) => (
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field>
          <FieldLabel htmlFor={purposeId}>What do you need it for?</FieldLabel>
          <Textarea id={purposeId} rows={4} value={purpose} placeholder={purposePlaceholder} onChange={(e) => setPurpose(e.target.value)} />
          <FieldHint>Saying what you need makes the owner&apos;s decision easy.</FieldHint>
        </Field>
        {scopes && scopes.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-foreground">Access requested</legend>
            {scopes.map((s) => (
              <CheckboxField
                key={s.value}
                label={s.label}
                description={s.description}
                checked={picked.includes(s.value)}
                onCheckedChange={(v) => setPicked((p) => (v === true ? [...p, s.value] : p.filter((x) => x !== s.value)))}
              />
            ))}
          </fieldset>
        )}
        <Button type="submit" className="self-start" loading={busy} disabled={!purpose.trim()}>
          {label}
        </Button>
      </form>
    );

    const heading: Record<AccessGateStatus, string> = {
      none: `Request ${resourceName}`,
      pending: "Waiting for approval",
      approved: "Your access is ready",
      denied: "Request declined",
      delivered: "Your key needs replacing",
      collected: "You're all set",
    };
    const icons: Record<AccessGateStatus, [IconComponent, FeaturedIconColor]> = {
      none: [RiKey2Line, "brand"],
      pending: [RiHourglassLine, "warning"],
      approved: [RiShieldCheckLine, "success"],
      denied: [RiCloseCircleLine, "destructive"],
      delivered: [RiErrorWarningLine, "warning"],
      collected: [RiCheckLine, "success"],
    };
    const [Icon, color] = icons[status];

    return (
      <div
        ref={ref}
        data-slot="access-gate"
        data-status={status}
        className={cn("flex w-full max-w-lg flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm", className)}
        {...props}
      >
        <div className="flex items-start gap-4">
          <FeaturedIcon icon={Icon} color={color} size="md" />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{heading[status]}</h2>
            {signedInAs && (
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{signedInAs}</span>. That proves who you are but doesn&apos;t itself grant{" "}
                {resourceName}.
              </p>
            )}
          </div>
        </div>

        {error && <InlineAlert variant="destructive">{error}</InlineAlert>}

        {status === "none" && form("Send request")}

        {status === "pending" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {record.createdAt ? <>Your request was sent on {fmtDate(record.createdAt)} and is </> : "Your request is "}
              waiting for the owner to decide. You can leave this page: we&apos;ll let you know, and the decision will be here when you come back.
            </p>
            <p role="status" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner size="xs" /> Checking for a decision…
            </p>
          </div>
        )}

        {status === "approved" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              A key has been issued{record.keyName && <> as <span className="font-mono text-foreground">{record.keyName}</span></>}. Collect it to
              store it in this browser. The server erases its copy as it hands it over.
            </p>
            {record.grant && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 rounded-control border border-border bg-subtle px-4 py-3 text-sm">
                <dt className="text-muted-foreground">Allowed</dt>
                <dd className="text-foreground">{record.grant.resources?.length ? record.grant.resources.join(", ") : "everything"}</dd>
                <dt className="text-muted-foreground">Expires</dt>
                <dd className="text-foreground">{record.grant.ttlDays ? `in ${record.grant.ttlDays} days` : "never"}</dd>
                {record.grant.canEvict != null && (
                  <>
                    <dt className="text-muted-foreground">Can evict others</dt>
                    <dd className="text-foreground">{record.grant.canEvict ? "yes" : "no"}</dd>
                  </>
                )}
              </dl>
            )}
            {adapter.claim && (
              <Button
                className="self-start"
                leadingIcon={<RiKey2Line aria-hidden />}
                loading={busy}
                onClick={() =>
                  void run(async () => {
                    await adapter.claim!();
                    setRecord({ ...record, status: "collected" });
                    onCollected?.();
                  })
                }
              >
                Collect your key
              </Button>
            )}
          </div>
        )}

        {status === "collected" && (
          <InlineAlert variant="success">Key collected. This browser can use {resourceName} now.</InlineAlert>
        )}

        {status === "denied" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              This request was declined{record.decidedAt && <> on {fmtDate(record.decidedAt)}</>}. You can ask again with more context.
            </p>
            {form("Ask again")}
          </div>
        )}

        {status === "delivered" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              A key was issued to this account{record.keyName && <> (<span className="font-mono text-foreground">{record.keyName}</span>)</>}, but it
              can&apos;t be used any more: it may have been revoked or expired. Asking for a new one fixes it.
            </p>
            {form("Ask for a new key")}
          </div>
        )}

        {otherWays && <div className="border-t border-border pt-4 text-sm text-muted-foreground">{otherWays}</div>}
      </div>
    );
  }
);
AccessGate.displayName = "AccessGate";

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
