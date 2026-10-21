import * as React from "react";
import {
  RiArrowLeftLine,
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiHourglassLine,
  RiKey2Line,
  RiLockPasswordLine,
  RiLogoutBoxRLine,
  RiRefreshLine,
  RiShieldCheckLine,
  RiSmartphoneLine,
  RiTimeLine,
  RiUserLine,
} from "@remixicon/react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Input, PasswordInput } from "../primitives/input";
import { Field, FieldError, FieldGroup, FieldHint, FieldLabel } from "../primitives/field";
import { OTPField } from "../primitives/input-otp";
import { InlineAlert } from "../primitives/inline-alert";
import { Spinner } from "../primitives/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../primitives/tabs";
import { QRCode } from "../kits/identity/qr-code";
import { Separator } from "../primitives/separator";
import { AccountPanel, type AccountPanelProps } from "../kits/identity/device-sessions";
import { KunjiLink, KunjiLinkedBadge } from "../kits/identity/kunji-link";
import { KunjiMark, KunjiSignIn, type KunjiSignInProps } from "../kits/identity/kunji-sign-in";
import { formatKunjiSub, isKunjiAbortError, type KunjiClient, type KunjiPollResult } from "../kits/identity/kunji-client";
import type { FeaturedIconColor, IconComponent } from "../assets/icons";
import { AuthCenteredPage, type AuthPageBaseProps } from "./auth-pages";
import { AuthFrame, FormError, type AuthHeadingLevel } from "./auth-frame-internal";
import { useBlockAction } from "./block-utils";
import { useAsyncAction } from "../hooks/use-async-action";
import { useCountdown } from "../hooks/use-now";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { formatCountdown } from "../lib/duration";

/* ------------------------------------------------------------------ */
/* Password / token forms                                              */
/* ------------------------------------------------------------------ */

export interface SignInPasswordValues {
  username: string;
  password: string;
}

function PasswordForm({
  label,
  onSubmit,
  submitLabel = "Sign in",
}: {
  label: React.ReactNode;
  onSubmit?: (values: SignInPasswordValues) => unknown;
  submitLabel?: React.ReactNode;
}) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const action = useBlockAction();
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!username || !password) return;
        void action.run(onSubmit ? () => onSubmit({ username: username.trim(), password }) : undefined);
      }}
    >
      <FormError>{action.error}</FormError>
      <FieldGroup>
        <Field>
          <FieldLabel>{label}</FieldLabel>
          <Input
            size="lg"
            autoComplete="username"
            leadingIcon={<RiUserLine aria-hidden />}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={action.busy}
          />
        </Field>
        <Field>
          <FieldLabel>Password</FieldLabel>
          <PasswordInput
            size="lg"
            autoComplete="current-password"
            leadingIcon={<RiLockPasswordLine aria-hidden />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={action.busy}
          />
        </Field>
        <Button type="submit" size="lg" fullWidth loading={action.busy} disabled={!username || !password}>
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}

function TokenForm({ onSubmit, hint }: { onSubmit?: (token: string) => unknown; hint?: React.ReactNode }) {
  const [token, setToken] = React.useState("");
  const action = useBlockAction();
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!token.trim()) return;
        void action.run(onSubmit ? () => onSubmit(token.trim()) : undefined);
      }}
    >
      <FormError>{action.error}</FormError>
      <FieldGroup>
        <Field>
          <FieldLabel>Access token</FieldLabel>
          <PasswordInput
            size="lg"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            leadingIcon={<RiKey2Line aria-hidden />}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={action.busy}
          />
          <FieldHint>{hint ?? "Paste an API key or the owner token. It stays in this browser."}</FieldHint>
        </Field>
        <Button type="submit" size="lg" fullWidth loading={action.busy} disabled={!token.trim()}>
          Sign in with token
        </Button>
      </FieldGroup>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* SignInMethods                                                       */
/* ------------------------------------------------------------------ */

export type SignInMethodId = "kunji" | "password" | "token";

export interface SignInMethodsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /**
   * Element of the card title (`1` is an `h1`).
   * @default 1
   */
  headingLevel?: AuthHeadingLevel;
  /** The kunji client that issues and polls sign-in challenges (and supplies the app name). */
  client: KunjiClient;
  /** Methods to offer, in order. Default all three. */
  methods?: SignInMethodId[];
  /** Overrides for the method tab labels, keyed by method id (`kunji`, `password`, `token`). */
  labels?: Partial<Record<SignInMethodId, React.ReactNode>>;
  /** Method shown first when nothing is remembered; defaults to the first of `methods`. */
  defaultMethod?: SignInMethodId;
  /** localStorage key for the last used method. `null` disables remembering. */
  rememberKey?: string | null;
  /** Label of the username field, e.g. "Lab username". */
  usernameLabel?: React.ReactNode;
  /** Called with the poll result when a kunji sign-in is approved. */
  onKunjiSuccess?: (result: KunjiPollResult) => void;
  /** Called with the username and password when the password form is submitted. A returned promise shows a spinner; throw to show the error message. */
  onPasswordSubmit?: (values: SignInPasswordValues) => unknown;
  /** Called with the token when the token form is submitted. A returned promise shows a spinner; throw to show the error message. */
  onTokenSubmit?: (token: string) => unknown;
  /** Props passed through to the kunji widget (everything except `client`). */
  kunjiProps?: Partial<Omit<KunjiSignInProps, "client">>;
  /**
   * Heading of the card.
   * @default "Sign in"
   */
  title?: React.ReactNode;
  /** Text under the heading. */
  description?: React.ReactNode;
  /**
   * `card` draws the bordered card; `plain` drops the chrome so you can place it in your own surface.
   * @default "card"
   */
  variant?: "card" | "plain";
}

const defaultMethodLabels: Record<SignInMethodId, string> = { kunji: "kunji", password: "Password", token: "Access token" };

function readRemembered(key: string | null | undefined, methods: SignInMethodId[]) {
  if (!key || typeof localStorage === "undefined") return undefined;
  try {
    const v = localStorage.getItem(key) as SignInMethodId | null;
    return v && methods.includes(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

/** Sign-in method tabs (kunji QR, username + password, access token) that remember the last one used. */
export const SignInMethods = React.forwardRef<HTMLDivElement, SignInMethodsProps>(
  (
    {
      client,
      methods = ["kunji", "password", "token"],
      labels,
      defaultMethod,
      rememberKey = "sutra.sign-in-method",
      usernameLabel = "Username",
      onKunjiSuccess,
      onPasswordSubmit,
      onTokenSubmit,
      kunjiProps,
      title = "Sign in",
      description,
      variant = "card",
      ...props
    },
    ref
  ) => {
    const [method, setMethod] = React.useState<SignInMethodId>(
      () => readRemembered(rememberKey, methods) ?? defaultMethod ?? methods[0] ?? "kunji"
    );
    const choose = (v: string) => {
      setMethod(v as SignInMethodId);
      if (rememberKey) {
        try {
          localStorage.setItem(rememberKey, v);
        } catch {
          /* storage unavailable */
        }
      }
    };
    const names = { ...defaultMethodLabels, ...labels };
    return (
      <AuthFrame
        ref={ref}
        defaultLogo={false}
        variant={variant}
        title={title}
        description={description ?? <>Sign in to {client.appName}</>}
        data-slot="sign-in-methods"
        {...props}
      >
        <Tabs value={method} onValueChange={choose} className="gap-5">
          {methods.length > 1 && (
            <TabsList aria-label="Sign-in method" className="w-full [&>*]:flex-1">
              {methods.map((m) => (
                <TabsTrigger key={m} value={m}>
                  {names[m]}
                </TabsTrigger>
              ))}
            </TabsList>
          )}
          {methods.includes("kunji") && (
            <TabsContent value="kunji">
              <KunjiSignIn client={client} variant="inline" title={null} onSuccess={onKunjiSuccess} {...kunjiProps} />
            </TabsContent>
          )}
          {methods.includes("password") && (
            <TabsContent value="password">
              <PasswordForm label={usernameLabel} onSubmit={onPasswordSubmit} />
            </TabsContent>
          )}
          {methods.includes("token") && (
            <TabsContent value="token">
              <TokenForm onSubmit={onTokenSubmit} />
            </TabsContent>
          )}
        </Tabs>
      </AuthFrame>
    );
  }
);
SignInMethods.displayName = "SignInMethods";

/* ------------------------------------------------------------------ */
/* KunjiSignInPage                                                     */
/* ------------------------------------------------------------------ */

export interface KunjiSignInPageProps extends AuthPageBaseProps {
  /** The kunji client that issues and polls sign-in challenges (and supplies the app name). */
  client: KunjiClient;
  /** Called with the poll result when a kunji sign-in is approved. */
  onKunjiSuccess?: (result: KunjiPollResult) => void;
  /** Other ways offered under the widget. Pass `[]` to hide. */
  otherMethods?: Exclude<SignInMethodId, "kunji">[];
  /**
   * Label of the username field in the password form.
   * @default "Username"
   */
  usernameLabel?: React.ReactNode;
  /** Called with the username and password when the password form is submitted. A returned promise shows a spinner; throw to show the error message. */
  onPasswordSubmit?: (values: SignInPasswordValues) => unknown;
  /** Called with the token when the token form is submitted. A returned promise shows a spinner; throw to show the error message. */
  onTokenSubmit?: (token: string) => unknown;
  /** Props passed through to the kunji widget (everything except `client`). */
  kunjiProps?: Partial<Omit<KunjiSignInProps, "client">>;
  /** Heading above the widget; defaults to "Sign in to" plus the app name. */
  heading?: React.ReactNode;
}

/** Full-page kunji sign-in: brand, the kunji QR as the hero, "Other ways to sign in" and a footer. */
export const KunjiSignInPage = React.forwardRef<HTMLDivElement, KunjiSignInPageProps>(
  (
    {
      client,
      onKunjiSuccess,
      otherMethods = ["password", "token"],
      usernameLabel = "Username",
      onPasswordSubmit,
      onTokenSubmit,
      kunjiProps,
      heading,
      children,
      ...props
    },
    ref
  ) => {
    const [method, setMethod] = React.useState<SignInMethodId>("kunji");
    const back = (
      <Button variant="ghost" size="sm" leadingIcon={<RiArrowLeftLine className="rtl:-scale-x-100" aria-hidden />} onClick={() => setMethod("kunji")} className="mt-4 self-center">
        Back to kunji
      </Button>
    );
    return (
      <AuthCenteredPage ref={ref} {...props}>
        {children ?? (
          <div className="flex w-full max-w-[400px] flex-col">
            {method === "kunji" ? (
              <KunjiSignIn
                client={client}
                variant="card"
                title={heading ?? `Sign in to ${client.appName}`}
                onSuccess={onKunjiSuccess}
                className="max-w-none shadow-lg"
                footer={
                  otherMethods.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      <Separator label="Other ways to sign in" />
                      <div className="flex flex-col gap-2 sm:flex-row">
                        {otherMethods.includes("password") && (
                          <Button variant="secondary" className="sm:flex-1" leadingIcon={<RiLockPasswordLine aria-hidden />} onClick={() => setMethod("password")}>
                            Password
                          </Button>
                        )}
                        {otherMethods.includes("token") && (
                          <Button variant="secondary" className="sm:flex-1" leadingIcon={<RiKey2Line aria-hidden />} onClick={() => setMethod("token")}>
                            Access token
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : undefined
                }
                {...kunjiProps}
              />
            ) : (
              <AuthFrame defaultLogo={false} title={method === "password" ? "Sign in with password" : "Sign in with a token"} className="max-w-none shadow-lg">
                {method === "password" ? (
                  <PasswordForm label={usernameLabel} onSubmit={onPasswordSubmit} />
                ) : (
                  <TokenForm onSubmit={onTokenSubmit} />
                )}
                <div className="flex justify-center">{back}</div>
              </AuthFrame>
            )}
          </div>
        )}
      </AuthCenteredPage>
    );
  }
);
KunjiSignInPage.displayName = "KunjiSignInPage";

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

/* ------------------------------------------------------------------ */
/* RegisterWithKunji                                                   */
/* ------------------------------------------------------------------ */

export interface KunjiHandleRule {
  id: string;
  label: string;
  test: (handle: string, reserved: string[]) => boolean;
}

/** The handle rules shown live while typing. */
export const kunjiHandleRules: KunjiHandleRule[] = [
  { id: "length", label: "3 to 32 characters", test: (h) => h.length >= 3 && h.length <= 32 },
  { id: "chars", label: "Lowercase letters, digits, dot, dash or underscore", test: (h) => h.length > 0 && /^[a-z0-9._-]+$/.test(h) },
  { id: "start", label: "Starts with a letter or digit", test: (h) => /^[a-z0-9]/.test(h) },
  { id: "reserved", label: "Not a reserved name", test: (h, reserved) => h.length > 0 && !reserved.includes(h) },
];

/** Check a handle against `kunjiHandleRules`. Returns the ids of the rules it fails. */
export function validateKunjiHandle(handle: string, reserved: string[] = []) {
  return kunjiHandleRules.filter((r) => !r.test(handle, reserved)).map((r) => r.id);
}

export interface RegisterWithKunjiValues {
  handle: string;
  name: string;
  invite?: string;
}

export interface RegisterWithKunjiProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit" | "title"> {
  /**
   * Element of the card title (`1` is an `h1`).
   * @default 1
   */
  headingLevel?: AuthHeadingLevel;
  /** First person on the server becomes its admin. */
  firstAdmin?: boolean;
  /** How new people join. */
  joinPolicy?: "open" | "invite" | "approval";
  /**
   * Name the field starts with.
   * @default ""
   */
  suggestedName?: string;
  /**
   * Handles that cannot be taken (checked case-insensitively).
   * @default ["admin", "root", "system", "support", "kunji"]
   */
  reservedHandles?: string[];
  /** kunji identity being registered. */
  sub?: string;
  /** Create the account. Return `{ pending: true }` (or use `joinPolicy="approval"`) to show `AwaitingApproval`. */
  onSubmit?: (values: RegisterWithKunjiValues) => unknown;
  /** Props passed through to the `AwaitingApproval` screen shown when the account is pending. */
  awaitingProps?: Partial<AwaitingApprovalProps>;
  /**
   * `card` draws the bordered card; `plain` drops the chrome.
   * @default "card"
   */
  variant?: "card" | "plain";
  /** Heading of the form. */
  title?: React.ReactNode;
}

/** First-time kunji registration: handle with live rules, name, invite code, then awaiting approval if needed. */
export const RegisterWithKunji = React.forwardRef<HTMLDivElement, RegisterWithKunjiProps>(
  (
    {
      firstAdmin = false,
      joinPolicy = "open",
      suggestedName = "",
      reservedHandles = ["admin", "root", "system", "support", "kunji"],
      sub,
      onSubmit,
      awaitingProps,
      variant = "card",
      title = "Choose your handle",
      ...props
    },
    ref
  ) => {
    const [handle, setHandle] = React.useState("");
    const [name, setName] = React.useState(suggestedName);
    const [invite, setInvite] = React.useState("");
    const [touched, setTouched] = React.useState(false);
    const [pending, setPending] = React.useState(false);
    const action = useBlockAction();
    const failing = validateKunjiHandle(handle, reservedHandles);
    const needsInvite = !firstAdmin && joinPolicy === "invite";
    const valid = failing.length === 0 && (!needsInvite || invite.trim().length > 0);
    const rulesId = React.useId();

    if (pending) return <AwaitingApproval ref={ref} handle={handle} variant={variant} {...awaitingProps} />;

    return (
      <AuthFrame
        ref={ref}
        defaultLogo={false}
        variant={variant}
        logo={<KunjiMark variant="tile" size={40} />}
        title={title}
        description={
          firstAdmin
            ? "You're the first person here, so you'll be its admin. Choose the name you go by in every app."
            : "Welcome. Choose the name you go by in every app."
        }
        data-slot="register-with-kunji"
        {...props}
      >
        <FormError>{action.error}</FormError>
        {firstAdmin && (
          <InlineAlert variant="brand" className="mb-5">
            First sign-in: this account gets admin rights and approves everyone after you.
          </InlineAlert>
        )}
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!valid) return;
            void action.run(async () => {
              const values: RegisterWithKunjiValues = { handle, name: name.trim() || handle, ...(needsInvite ? { invite: invite.trim() } : {}) };
              const res = (await onSubmit?.(values)) as { pending?: boolean } | undefined;
              if ((joinPolicy === "approval" && !firstAdmin) || res?.pending) setPending(true);
            });
          }}
        >
          <FieldGroup>
            <Field invalid={touched && failing.length > 0}>
              <FieldLabel>Handle</FieldLabel>
              <Input
                size="lg"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="e.g. alice"
                value={handle}
                aria-describedby={rulesId}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                disabled={action.busy}
              />
              <ul id={rulesId} aria-label="Handle rules" className="mt-1 flex flex-col gap-1 text-xs">
                {kunjiHandleRules.map((r) => {
                  const ok = handle.length > 0 && !failing.includes(r.id);
                  return (
                    <li
                      key={r.id}
                      data-met={ok || undefined}
                      className={cn("flex items-center gap-1.5", ok ? "text-success" : "text-muted-foreground")}
                    >
                      {ok ? <RiCheckLine aria-hidden className="size-3.5" /> : <RiCloseLine aria-hidden className="size-3.5 opacity-60" />}
                      {r.label}
                      <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
                    </li>
                  );
                })}
              </ul>
              <FieldHint>It can&apos;t be changed later.</FieldHint>
            </Field>
            <Field>
              <FieldLabel>Your name</FieldLabel>
              <Input size="lg" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} disabled={action.busy} />
            </Field>
            {needsInvite && (
              <Field invalid={touched && !invite.trim()}>
                <FieldLabel>Invitation code</FieldLabel>
                <Input size="lg" className="font-mono" value={invite} onChange={(e) => setInvite(e.target.value)} disabled={action.busy} />
                <FieldHint>From an admin.</FieldHint>
                <FieldError>{touched && !invite.trim() ? "Enter the code an admin gave you." : undefined}</FieldError>
              </Field>
            )}
            {!firstAdmin && joinPolicy === "approval" && (
              <p className="text-xs text-muted-foreground">An admin approves new accounts; you can sign in once they have.</p>
            )}
            {sub && (
              <p className="text-xs text-muted-foreground">
                kunji identity <span className="font-mono text-foreground">{formatKunjiSub(sub, 6, 6)}</span>
              </p>
            )}
            <Button type="submit" size="lg" fullWidth loading={action.busy} disabled={!handle}>
              Continue
            </Button>
          </FieldGroup>
        </form>
      </AuthFrame>
    );
  }
);
RegisterWithKunji.displayName = "RegisterWithKunji";

/* ------------------------------------------------------------------ */
/* SignedInPanel                                                       */
/* ------------------------------------------------------------------ */

export interface SignedInPanelProps extends AccountPanelProps {
  /** Enables "Link kunji" when given. */
  client?: KunjiClient;
  /** Controlled linked state of the kunji identity. Use with `onLinkKunji` and `onUnlinkKunji`. */
  kunjiLinked?: boolean;
  /** Initial linked state when uncontrolled. */
  defaultKunjiLinked?: boolean;
  /** The linked kunji subject id, shown once linked. */
  kunjiSub?: string;
  /** Called with the poll result when the user links their kunji identity. */
  onLinkKunji?: (result: KunjiPollResult) => unknown;
  /** Called when the user unlinks their kunji identity. */
  onUnlinkKunji?: () => unknown;
}

/** Signed-in summary: `AccountPanel` plus kunji linking, sign out and sign out everywhere. */
export const SignedInPanel = React.forwardRef<HTMLDivElement, SignedInPanelProps>(
  ({ client, kunjiLinked, defaultKunjiLinked, kunjiSub, onLinkKunji, onUnlinkKunji, children, ...props }, ref) => (
    <AccountPanel ref={ref} data-block="signed-in-panel" {...props}>
      {client ? (
        <KunjiLink
          client={client}
          linked={kunjiLinked}
          defaultLinked={defaultKunjiLinked}
          sub={kunjiSub}
          onLink={onLinkKunji}
          onUnlink={onUnlinkKunji}
          className="bg-subtle shadow-none"
        />
      ) : kunjiLinked != null ? (
        <KunjiLinkedBadge linked={kunjiLinked} sub={kunjiSub} className="self-start" />
      ) : null}
      {children}
    </AccountPanel>
  )
);
SignedInPanel.displayName = "SignedInPanel";

/* ------------------------------------------------------------------ */
/* DevicePairingFlow                                                   */
/* ------------------------------------------------------------------ */

export interface DevicePairingSession {
  /** 8-digit code the new device types. */
  code: string;
  /** What the new device scans. */
  qrValue: string;
  /** Epoch ms. Codes live for 2 minutes. */
  expiresAt: number;
}

export interface DevicePairingPeer {
  /** Short authentication string both devices show: digits or a few words. */
  sas: string | string[];
  deviceName?: string;
}

export interface DevicePairingAdapter {
  /** Existing device: mint a pairing code. */
  createPairing: (signal: AbortSignal) => Promise<DevicePairingSession>;
  /** Existing device: wait for the new device to join. */
  waitForPeer: (code: string, signal: AbortSignal) => Promise<DevicePairingPeer>;
  /** New device: join with the typed code. */
  joinPairing?: (code: string, signal: AbortSignal) => Promise<DevicePairingPeer>;
  /** Both: report whether the strings matched. */
  confirm: (match: boolean) => Promise<void>;
}

export interface DevicePairingFlowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /**
   * Element of the card title (`1` is an `h1`).
   * @default 1
   */
  headingLevel?: AuthHeadingLevel;
  /** Adapter that performs the pairing (create, show or enter the code, confirm); the flow only drives the UI. */
  adapter: DevicePairingAdapter;
  /** `existing` shows the QR + code; `new` types the code. */
  side?: "existing" | "new";
  /** Called with the peer when pairing finishes. */
  onDone?: (peer: DevicePairingPeer) => void;
  /** Called when the user cancels the pairing. */
  onCancel?: () => void;
  /**
   * `card` draws the bordered card; `plain` drops the chrome.
   * @default "card"
   */
  variant?: "card" | "plain";
}

type PairingStep = "loading" | "code" | "expired" | "join" | "compare" | "confirming" | "done" | "mismatch" | "error";

const fmtPairCode = (c: string) => (c.length === 8 ? `${c.slice(0, 4)} ${c.slice(4)}` : c);

/** Wallet "link a new device": QR + 8-digit code with a 2-minute TTL, then a "Do these match?" SAS check on both devices. */
export const DevicePairingFlow = React.forwardRef<HTMLDivElement, DevicePairingFlowProps>(
  ({ adapter, side = "existing", onDone, onCancel, variant = "card", className, ...props }, ref) => {
    const [step, setStep] = React.useState<PairingStep>(side === "existing" ? "loading" : "join");
    const [pairing, setPairing] = React.useState<DevicePairingSession | null>(null);
    const [peer, setPeer] = React.useState<DevicePairingPeer | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [typed, setTyped] = React.useState("");
    const [pairedAt, setPairedAt] = React.useState(0);
    const ctrl = React.useRef<AbortController | null>(null);
    // Read through a ref: an inline `adapter` prop must not abort and restart pairing on every parent render.
    const adapterRef = useLatestRef(adapter);

    const fail = (e: unknown) => {
      if (isKunjiAbortError(e)) return;
      setError(e instanceof Error ? e.message : "Pairing failed.");
      setStep("error");
    };

    const startExisting = React.useCallback(() => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setStep("loading");
      setError(null);
      setPeer(null);
      void (async () => {
        try {
          const p = await adapterRef.current.createPairing(c.signal);
          if (c.signal.aborted) return;
          setPairing(p);
          setPairedAt(Date.now());
          setStep("code");
          const found = await adapterRef.current.waitForPeer(p.code, c.signal);
          if (c.signal.aborted) return;
          setPeer(found);
          setStep("compare");
        } catch (e) {
          if (!c.signal.aborted) fail(e);
        }
      })();
    }, []);

    const join = (code: string) => {
      if (!adapter.joinPairing) return;
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setStep("loading");
      setError(null);
      adapter.joinPairing(code, c.signal).then(
        (found) => {
          if (c.signal.aborted) return;
          setPeer(found);
          setStep("compare");
        },
        (e) => {
          if (c.signal.aborted) return;
          setError(e instanceof Error ? e.message : "That code didn't work.");
          setTyped("");
          setStep("join");
        }
      );
    };

    React.useEffect(() => {
      if (side === "existing") startExisting();
      else setStep("join");
      return () => ctrl.current?.abort();
    }, [side, startExisting]);

    const countdown = useCountdown(step === "code" ? pairing?.expiresAt : undefined, {
      onExpire: () => {
        ctrl.current?.abort();
        setStep("expired");
      },
    });

    const decide = async (match: boolean) => {
      setStep("confirming");
      try {
        await adapter.confirm(match);
        if (match) {
          setStep("done");
          if (peer) onDone?.(peer);
        } else setStep("mismatch");
      } catch (e) {
        fail(e);
      }
    };

    const restart = side === "existing" ? startExisting : () => (setTyped(""), setError(null), setStep("join"));
    // The countdown's clock is from before the code arrived until its first tick; cap at the TTL left on arrival.
    const remainingMs = pairing ? Math.min(countdown.remainingMs, Math.max(0, pairing.expiresAt - pairedAt)) : 0;
    const remaining = Math.ceil(remainingMs / 1000);
    const sasParts = peer ? (Array.isArray(peer.sas) ? peer.sas : peer.sas.split(/\s+/)) : [];

    let content: React.ReactNode;
    let heading: React.ReactNode = "Link a new device";
    let sub: React.ReactNode = null;
    let icon: IconComponent | undefined;
    let iconColor: FeaturedIconColor = "brand";

    if (step === "loading" || step === "confirming") {
      content = (
        <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner size="sm" /> {step === "confirming" ? "Finishing…" : side === "existing" ? "Getting a pairing code…" : "Connecting…"}
        </p>
      );
    } else if (step === "code" || step === "expired") {
      sub = "On the new device, open kunji and choose “I have another device”. Scan this code, or type the number.";
      const expired = step === "expired";
      content = (
        <div className="flex flex-col items-center gap-4">
          <div className="relative rounded-xl bg-white p-1.5 shadow-xs ring-1 ring-black/5">
            <QRCode
              value={pairing!.qrValue}
              size={176}
              quietZone={2}
              moduleStyle="rounded"
              title="Pairing QR code"
              className={cn(expired && "opacity-30 blur-[3px]")}
            />
            {expired && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                <p className="text-sm font-semibold text-[#09090b]">Code expired</p>
                <Button size="sm" leadingIcon={<RiRefreshLine aria-hidden />} onClick={startExisting}>
                  New code
                </Button>
              </div>
            )}
          </div>
          <p data-slot="pairing-code" aria-label={`Pairing code ${pairing!.code.split("").join(" ")}`} className={cn("font-mono text-3xl font-semibold tracking-[0.18em] tabular-nums", expired ? "text-muted-foreground line-through" : "text-foreground")}>
            {fmtPairCode(pairing!.code)}
          </p>
          {!expired ? (
            <p role="timer" aria-live="off" className={cn("inline-flex items-center gap-1.5 text-xs font-medium tabular-nums", remaining <= 20 ? "text-destructive" : "text-muted-foreground")}>
              <RiTimeLine aria-hidden className="size-3.5" />
              Expires in {formatCountdown(remainingMs)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Pairing codes last 2 minutes.</p>
          )}
          <p role="status" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            {expired ? "This pairing code expired." : <><Spinner size="xs" variant="pulse" /> Waiting for the new device…</>}
          </p>
        </div>
      );
    } else if (step === "join") {
      heading = "Pair with your wallet";
      sub = "On a device that already has kunji, open Settings → Devices → Link a new device, then type the 8-digit code it shows.";
      content = (
        <form
          className="flex flex-col items-center gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.length === 8) join(typed);
          }}
        >
          <OTPField
            length={8}
            groupSize={4}
            value={typed}
            onChange={setTyped}
            onComplete={(v: string) => join(v)}
            invalid={!!error}
            aria-label="Pairing code"
            containerClassName="w-full justify-center [&>[data-slot=input-otp-group]]:min-w-0 [&>[data-slot=input-otp-group]]:flex-1 [&>[data-slot=input-otp-group]]:justify-center"
            slotClassName="size-auto min-w-0 max-w-10 flex-1 aspect-square"
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" fullWidth disabled={typed.length !== 8}>
            Continue
          </Button>
        </form>
      );
    } else if (step === "compare") {
      heading = "Do these match?";
      sub = (
        <>
          Check that {peer?.deviceName ? <span className="font-medium text-foreground">{peer.deviceName}</span> : "the other device"} shows exactly the same.
        </>
      );
      content = (
        <div className="flex flex-col items-center gap-5">
          <div data-slot="pairing-sas" aria-label={`Security code: ${sasParts.join(" ")}`} role="group" className="flex flex-wrap justify-center gap-2">
            {sasParts.map((p, i) => (
              <span key={i} className="rounded-control border border-border bg-subtle px-3 py-2 font-mono text-xl font-semibold tracking-wider text-foreground">
                {p}
              </span>
            ))}
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="secondary" className="sm:flex-1" onClick={() => void decide(false)}>
              They don&apos;t match
            </Button>
            <Button className="sm:flex-1" leadingIcon={<RiCheckLine aria-hidden />} onClick={() => void decide(true)}>
              They match
            </Button>
          </div>
        </div>
      );
    } else if (step === "done") {
      icon = RiSmartphoneLine;
      iconColor = "success";
      heading = "Device linked";
      sub = <>{peer?.deviceName ?? "The new device"} now holds your kunji keys.</>;
      content = null;
    } else if (step === "mismatch") {
      icon = RiErrorWarningLine;
      iconColor = "destructive";
      heading = "Pairing canceled";
      sub = "The codes didn't match, so nothing was shared. Someone nearby may have tried to join. Start again on both devices.";
      content = (
        <Button fullWidth leadingIcon={<RiRefreshLine aria-hidden />} onClick={restart}>
          Start again
        </Button>
      );
    } else {
      icon = RiErrorWarningLine;
      iconColor = "destructive";
      heading = "Pairing failed";
      sub = error;
      content = (
        <Button fullWidth leadingIcon={<RiRefreshLine aria-hidden />} onClick={restart}>
          Try again
        </Button>
      );
    }

    return (
      <AuthFrame
        ref={ref}
        defaultLogo={false}
        variant={variant}
        icon={icon}
        iconColor={iconColor}
        logo={icon ? undefined : <KunjiMark variant="tile" size={40} />}
        title={heading}
        description={sub}
        data-slot="device-pairing-flow"
        data-step={step}
        className={className}
        {...props}
      >
        {content}
        {onCancel && step !== "done" && (
          <div className="mt-4 flex justify-center">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}
      </AuthFrame>
    );
  }
);
DevicePairingFlow.displayName = "DevicePairingFlow";

export interface MockPairingAdapterOptions {
  /** When the simulated new device joins. Default 5000ms. */
  peerAfter?: number;
  latency?: number;
  ttl?: number;
  code?: string;
  sas?: string | string[];
  deviceName?: string;
}

const abortable = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        const e = new Error("aborted");
        e.name = "AbortError";
        reject(e);
      },
      { once: true }
    );
  });

/** A fake `DevicePairingAdapter` for demos and tests. No network. */
export function createMockPairingAdapter({
  peerAfter = 5000,
  latency = 400,
  ttl = 120_000,
  code = "40718293",
  sas = ["maple", "orbit", "velvet", "comet"],
  deviceName = "Pixel 8",
}: MockPairingAdapterOptions = {}): DevicePairingAdapter {
  return {
    async createPairing(signal) {
      await abortable(latency, signal);
      return { code, qrValue: `KP:${code}`, expiresAt: Date.now() + ttl };
    },
    async waitForPeer(_code, signal) {
      await abortable(peerAfter, signal);
      return { sas, deviceName };
    },
    async joinPairing(value, signal) {
      await abortable(latency, signal);
      if (value !== code) throw new Error("That code didn't match. Check the number on your other device.");
      return { sas, deviceName: "MacBook Pro" };
    },
    async confirm() {
      await abortable(latency);
    },
  };
}
