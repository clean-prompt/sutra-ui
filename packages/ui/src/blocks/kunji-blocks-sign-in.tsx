/** Sign-in blocks: `SignInMethods` (method tabs) and `KunjiSignInPage` (full-page kunji sign-in), with the private password and token forms. */
import * as React from "react";
import { RiArrowLeftLine, RiKey2Line, RiLockPasswordLine, RiUserLine } from "@remixicon/react";
import { Button } from "../primitives/button";
import { Input, PasswordInput } from "../primitives/input";
import { Field, FieldGroup, FieldHint, FieldLabel } from "../primitives/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../primitives/tabs";
import { Separator } from "../primitives/separator";
import { KunjiSignIn, type KunjiSignInProps } from "../kits/identity/kunji-sign-in";
import type { KunjiClient, KunjiPollResult } from "../kits/identity/kunji-client";
import { AuthCenteredPage, type AuthPageBaseProps } from "./auth-pages";
import { AuthFrame, FormError, type AuthHeadingLevel } from "./auth-frame-internal";
import { useBlockAction } from "./block-utils";
import type { SignInMethodId, SignInPasswordValues } from "./kunji-blocks-model";

/* ------------------------------------------------------------------ */
/* Password / token forms                                              */
/* ------------------------------------------------------------------ */


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
