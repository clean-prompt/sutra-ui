import * as React from "react";
import {
  RiArrowLeftLine,
  RiDownloadLine,
  RiKey2Line,
  RiLockPasswordLine,
  RiMailLine,
  RiMailSendLine,
  RiShieldCheckLine,
  RiShieldKeyholeLine,
  RiUserLine,
} from "@remixicon/react";
import { cn } from "../lib/cn";
import { useAsyncAction as useSharedAsyncAction } from "../hooks/use-async-action";
import { useCountdown } from "../hooks/use-now";
import { formatCountdown } from "../lib/duration";
import { CopyButton } from "../components/copy-button";
import { Button } from "../components/button";
import { SocialButton, socialProviders, type SocialProvider } from "../components/social-button";
import { Input, PasswordInput } from "../components/input";
import { Field, FieldError, FieldLabel, FieldGroup, FieldHint } from "../components/field";
import { CheckboxField } from "../components/checkbox";
import { OTPField } from "../components/input-otp";
import { Separator } from "../components/separator";
import { PasswordStrength, getPasswordScore } from "../components/password-strength";
import { InlineAlert } from "../components/inline-alert";
import { textLinkVariants } from "../components/text-link";
import { SutraMark } from "../assets/brand";
import { FeaturedIcon, type IconComponent, type FeaturedIconColor } from "../assets/icons";
import { QRCode } from "../components/qr-code";
import { BlockLink, useBlockAction as useAsyncAction, type BlockLinkRenderer } from "./block-utils";
import { isEmail } from "../lib/validate";

/* ------------------------------------------------------------------ */
/* Shared frame                                                        */
/* ------------------------------------------------------------------ */

/** Props shared by every auth card. */
export interface AuthCardBaseProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onSubmit"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** `card` renders a bordered surface; `plain` renders only the content (for full-page layouts). */
  variant?: "card" | "plain";
  /** Show the Sutra mark above the title, or pass a custom logo. Default: true for `card`. */
  logo?: boolean | React.ReactNode;
  /** Router link renderer for the footer and inline links. */
  renderLink?: BlockLinkRenderer;
  /** Replace the default footer (e.g. "Don't have an account? Sign up"). Pass `null` to hide it. */
  footer?: React.ReactNode;
}

const linkClass = textLinkVariants({ variant: "default", underline: "hover" });

interface AuthFrameProps extends Omit<AuthCardBaseProps, "renderLink"> {
  icon?: IconComponent;
  iconColor?: FeaturedIconColor;
  defaultLogo?: boolean;
}

function AuthFrame({
  variant = "card",
  logo,
  defaultLogo,
  icon,
  iconColor = "brand",
  title,
  description,
  footer,
  className,
  children,
  ...props
}: AuthFrameProps) {
  const card = variant === "card";
  const showLogo = logo ?? (icon ? false : defaultLogo ?? card);
  const logoNode = showLogo === true ? <SutraMark size={40} title="Sutra" /> : showLogo || null;
  return (
    <div
      data-slot="auth-card"
      className={cn(
        "w-full max-w-[400px] text-card-foreground",
        card && "rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8",
        className
      )}
      {...props}
    >
      <div className="mb-6 flex flex-col items-center gap-2 text-center sm:mb-8">
        {logoNode ? <div className="mb-2">{logoNode}</div> : null}
        {icon ? (
          <FeaturedIcon icon={icon} color={iconColor} variant="outline-ring" size="lg" className="mb-2" />
        ) : null}
        {title ? <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1> : null}
        {description ? <p className="text-pretty text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
      {footer != null && footer !== false ? (
        <div
          className={cn(
            "text-center text-sm text-muted-foreground",
            card
              ? "-mx-6 -mb-6 mt-6 rounded-b-2xl border-t border-border bg-subtle px-6 py-4 sm:-mx-8 sm:-mb-8 sm:mt-8 sm:px-8"
              : "mt-6"
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function FormError({ children }: { children?: React.ReactNode }) {
  if (children == null || children === false || children === "") return null;
  return (
    <InlineAlert variant="destructive" className="mb-5 border border-destructive/20 bg-destructive-soft/50" role="alert">
      {children}
    </InlineAlert>
  );
}

interface AuthSocialButtonsProps {
  providers: SocialProvider[];
  layout: "grid" | "stack";
  pending: SocialProvider | null;
  disabled?: boolean;
  onSelect: (provider: SocialProvider) => void;
}

function AuthSocialButtons({ providers, layout, pending, disabled, onSelect }: AuthSocialButtonsProps) {
  if (providers.length === 0) return null;
  const grid = layout === "grid" && providers.length > 1 && providers.length <= 3;
  return (
    <div className={cn(grid ? cn("grid gap-2", providers.length === 2 ? "grid-cols-2" : "grid-cols-3") : "flex flex-col gap-2.5")}>
      {providers.map((p) => (
        <SocialButton
          key={p}
          provider={p}
          fullWidth
          size="lg"
          loading={pending === p}
          disabled={disabled || (pending != null && pending !== p)}
          onClick={() => onSelect(p)}
          aria-label={grid ? `Continue with ${socialProviders[p].name}` : undefined}
        >
          {grid ? <span className="hidden min-[400px]:inline">{socialProviders[p].name}</span> : undefined}
        </SocialButton>
      ))}
    </div>
  );
}

function useSocial(onSocial?: (provider: SocialProvider) => unknown) {
  const [provider, setProvider] = React.useState<SocialProvider | null>(null);
  const action = useSharedAsyncAction((p: SocialProvider) => onSocial?.(p));
  const select = (p: SocialProvider) => {
    if (!onSocial) return;
    setProvider(p);
    void action.run(p);
  };
  return { pending: action.busy ? provider : null, error: action.error, select };
}

function BackLink({ href, label, renderLink }: { href: string; label: React.ReactNode; renderLink?: BlockLinkRenderer }) {
  return (
    <BlockLink
      href={href}
      renderLink={renderLink}
      className={cn(textLinkVariants({ variant: "muted", underline: "none" }), "gap-1.5 text-sm")}
    >
      <RiArrowLeftLine className="size-4" aria-hidden />
      {label}
    </BlockLink>
  );
}

/* ------------------------------------------------------------------ */
/* LoginCard                                                           */
/* ------------------------------------------------------------------ */

export interface LoginCardValues {
  email: string;
  password: string;
  remember: boolean;
}

export interface LoginCardProps extends AuthCardBaseProps {
  /** Called with the form values. Return a promise to show a spinner; throw to show the error message. */
  onSubmit?: (values: LoginCardValues) => unknown;
  onSocialSignIn?: (provider: SocialProvider) => unknown;
  /** OAuth providers shown above the form. Pass `[]` to hide. */
  providers?: SocialProvider[];
  socialLayout?: "grid" | "stack";
  loading?: boolean;
  error?: React.ReactNode;
  showRemember?: boolean;
  forgotPasswordHref?: string;
  signUpHref?: string;
  defaultEmail?: string;
  submitLabel?: React.ReactNode;
}

/** Email + password sign-in card with remember me, forgot link and SSO buttons. */
export const LoginCard = React.forwardRef<HTMLFormElement, LoginCardProps>(
  (
    {
      title = "Welcome back",
      description = "Sign in to your Sutra workspace",
      onSubmit,
      onSocialSignIn,
      providers = ["google", "apple", "github"],
      socialLayout = "grid",
      loading,
      error,
      showRemember = true,
      forgotPasswordHref = "#forgot-password",
      signUpHref = "#sign-up",
      defaultEmail = "",
      submitLabel = "Sign in",
      renderLink,
      footer,
      ...props
    },
    ref
  ) => {
    const [email, setEmail] = React.useState(defaultEmail);
    const [password, setPassword] = React.useState("");
    const [remember, setRemember] = React.useState(true);
    const [errors, setErrors] = React.useState<{ email?: string; password?: string }>({});
    const action = useAsyncAction(loading);
    const social = useSocial(onSocialSignIn);
    const busy = action.busy || social.pending != null;

    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      const next: typeof errors = {};
      if (!isEmail(email)) next.email = "Enter a valid email address.";
      if (!password) next.password = "Enter your password.";
      setErrors(next);
      if (next.email || next.password) return;
      void action.run(onSubmit ? () => onSubmit({ email: email.trim(), password, remember }) : undefined);
    };

    return (
      <AuthFrame
        title={title}
        description={description}
        footer={
          footer !== undefined ? (
            footer
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <BlockLink href={signUpHref} renderLink={renderLink} className={linkClass}>
                Sign up
              </BlockLink>
            </>
          )
        }
        {...props}
      >
        <FormError>{error ?? action.error ?? social.error}</FormError>
        {providers.length > 0 && (
          <>
            <AuthSocialButtons
              providers={providers}
              layout={socialLayout}
              pending={social.pending}
              disabled={action.busy}
              onSelect={social.select}
            />
            <Separator label="or" className="my-6" />
          </>
        )}
        <form ref={ref} noValidate onSubmit={submit}>
          <FieldGroup>
            <Field invalid={Boolean(errors.email)}>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                size="lg"
                autoComplete="email"
                placeholder="you@example.com"
                leadingIcon={<RiMailLine aria-hidden />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
              <FieldError>{errors.email}</FieldError>
            </Field>
            <Field invalid={Boolean(errors.password)}>
              <div className="flex items-center justify-between">
                <FieldLabel>Password</FieldLabel>
                {!showRemember && (
                  <BlockLink href={forgotPasswordHref} renderLink={renderLink} className={cn(linkClass, "text-sm")}>
                    Forgot password?
                  </BlockLink>
                )}
              </div>
              <PasswordInput
                size="lg"
                placeholder="••••••••"
                leadingIcon={<RiLockPasswordLine aria-hidden />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
              <FieldError>{errors.password}</FieldError>
            </Field>
            {showRemember && (
              <div className="flex items-center justify-between gap-3">
                <CheckboxField
                  label="Remember for 30 days"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                  disabled={busy}
                  labelClassName="font-normal text-muted-foreground"
                />
                <BlockLink href={forgotPasswordHref} renderLink={renderLink} className={cn(linkClass, "shrink-0 text-sm")}>
                  Forgot password?
                </BlockLink>
              </div>
            )}
            <Button type="submit" size="lg" fullWidth loading={action.busy} disabled={social.pending != null}>
              {submitLabel}
            </Button>
          </FieldGroup>
        </form>
      </AuthFrame>
    );
  }
);
LoginCard.displayName = "LoginCard";

/* ------------------------------------------------------------------ */
/* SignUpCard                                                          */
/* ------------------------------------------------------------------ */

export interface SignUpCardValues {
  name: string;
  email: string;
  password: string;
}

export interface SignUpCardProps extends AuthCardBaseProps {
  onSubmit?: (values: SignUpCardValues) => unknown;
  onSocialSignIn?: (provider: SocialProvider) => unknown;
  providers?: SocialProvider[];
  socialLayout?: "grid" | "stack";
  loading?: boolean;
  error?: React.ReactNode;
  signInHref?: string;
  termsHref?: string;
  privacyHref?: string;
  /** Minimum strength score (1–4) required to submit. Default 2. */
  minScore?: 0 | 1 | 2 | 3 | 4;
  submitLabel?: React.ReactNode;
}

/** Account creation card: name, email, password with strength meter and terms checkbox. */
export const SignUpCard = React.forwardRef<HTMLFormElement, SignUpCardProps>(
  (
    {
      title = "Create your account",
      description = "Start your free 14-day trial. No credit card required.",
      onSubmit,
      onSocialSignIn,
      providers = ["google", "apple"],
      socialLayout = "grid",
      loading,
      error,
      signInHref = "#sign-in",
      termsHref = "#terms",
      privacyHref = "#privacy",
      minScore = 2,
      submitLabel = "Create account",
      renderLink,
      footer,
      ...props
    },
    ref
  ) => {
    const [values, setValues] = React.useState<SignUpCardValues>({ name: "", email: "", password: "" });
    const [terms, setTerms] = React.useState(false);
    const [errors, setErrors] = React.useState<Partial<Record<keyof SignUpCardValues | "terms", string>>>({});
    const action = useAsyncAction(loading);
    const social = useSocial(onSocialSignIn);
    const busy = action.busy || social.pending != null;
    const set = (key: keyof SignUpCardValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      const next: typeof errors = {};
      if (!values.name.trim()) next.name = "Tell us your name.";
      if (!isEmail(values.email)) next.email = "Enter a valid email address.";
      if (getPasswordScore(values.password) < minScore) next.password = "Choose a stronger password.";
      if (!terms) next.terms = "Please accept the terms to continue.";
      setErrors(next);
      if (Object.keys(next).length > 0) return;
      void action.run(onSubmit ? () => onSubmit({ ...values, name: values.name.trim(), email: values.email.trim() }) : undefined);
    };

    return (
      <AuthFrame
        title={title}
        description={description}
        footer={
          footer !== undefined ? (
            footer
          ) : (
            <>
              Already have an account?{" "}
              <BlockLink href={signInHref} renderLink={renderLink} className={linkClass}>
                Sign in
              </BlockLink>
            </>
          )
        }
        {...props}
      >
        <FormError>{error ?? action.error ?? social.error}</FormError>
        {providers.length > 0 && (
          <>
            <AuthSocialButtons
              providers={providers}
              layout={socialLayout}
              pending={social.pending}
              disabled={action.busy}
              onSelect={social.select}
            />
            <Separator label="or sign up with email" className="my-6" />
          </>
        )}
        <form ref={ref} noValidate onSubmit={submit}>
          <FieldGroup>
            <Field invalid={Boolean(errors.name)}>
              <FieldLabel>Full name</FieldLabel>
              <Input
                size="lg"
                autoComplete="name"
                placeholder="Maya Patel"
                leadingIcon={<RiUserLine aria-hidden />}
                value={values.name}
                onChange={set("name")}
                disabled={busy}
              />
              <FieldError>{errors.name}</FieldError>
            </Field>
            <Field invalid={Boolean(errors.email)}>
              <FieldLabel>Work email</FieldLabel>
              <Input
                type="email"
                size="lg"
                autoComplete="email"
                placeholder="you@example.com"
                leadingIcon={<RiMailLine aria-hidden />}
                value={values.email}
                onChange={set("email")}
                disabled={busy}
              />
              <FieldError>{errors.email}</FieldError>
            </Field>
            <Field invalid={Boolean(errors.password)}>
              <FieldLabel>Password</FieldLabel>
              <PasswordInput
                size="lg"
                autoComplete="new-password"
                placeholder="Create a password"
                value={values.password}
                onChange={set("password")}
                disabled={busy}
              />
              {values.password ? (
                <PasswordStrength password={values.password} className="pt-1" />
              ) : (
                <FieldHint>Use 8+ characters with a mix of letters, numbers and symbols.</FieldHint>
              )}
              <FieldError>{errors.password}</FieldError>
            </Field>
            <div className="flex flex-col gap-2">
              <CheckboxField
                checked={terms}
                onCheckedChange={(v) => setTerms(v === true)}
                invalid={Boolean(errors.terms)}
                disabled={busy}
                labelClassName="font-normal text-muted-foreground"
                label={
                  <>
                    I agree to the{" "}
                    <BlockLink href={termsHref} renderLink={renderLink} className={linkClass}>
                      Terms of Service
                    </BlockLink>{" "}
                    and{" "}
                    <BlockLink href={privacyHref} renderLink={renderLink} className={linkClass}>
                      Privacy Policy
                    </BlockLink>
                  </>
                }
              />
              {errors.terms ? <p className="text-sm text-destructive" role="alert">{errors.terms}</p> : null}
            </div>
            <Button type="submit" size="lg" fullWidth loading={action.busy} disabled={social.pending != null}>
              {submitLabel}
            </Button>
          </FieldGroup>
        </form>
      </AuthFrame>
    );
  }
);
SignUpCard.displayName = "SignUpCard";

/* ------------------------------------------------------------------ */
/* MagicLinkCard                                                       */
/* ------------------------------------------------------------------ */

export interface MagicLinkCardProps extends AuthCardBaseProps {
  onSubmit?: (email: string) => unknown;
  onResend?: (email: string) => unknown;
  /** Control the "check your inbox" state. */
  sent?: boolean;
  onSentChange?: (sent: boolean) => void;
  loading?: boolean;
  error?: React.ReactNode;
  defaultEmail?: string;
  /** Link for the "Open mail app" button in the success state. */
  mailAppHref?: string;
  passwordSignInHref?: string;
}

/** Passwordless sign-in: email only, then a "check your inbox" confirmation. */
export const MagicLinkCard = React.forwardRef<HTMLDivElement, MagicLinkCardProps>(
  (
    {
      title = "Sign in with email",
      description = "We'll email you a magic link for a password-free sign in.",
      onSubmit,
      onResend,
      sent: sentProp,
      onSentChange,
      loading,
      error,
      defaultEmail = "",
      mailAppHref = "mailto:",
      passwordSignInHref = "#sign-in",
      renderLink,
      footer,
      ...props
    },
    ref
  ) => {
    const [email, setEmail] = React.useState(defaultEmail);
    const [invalid, setInvalid] = React.useState(false);
    const [sentState, setSentState] = React.useState(false);
    const sent = sentProp ?? sentState;
    const setSent = (v: boolean) => {
      if (sentProp === undefined) setSentState(v);
      onSentChange?.(v);
    };
    const action = useAsyncAction(loading);
    const resend = useAsyncAction();

    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isEmail(email)) return setInvalid(true);
      setInvalid(false);
      const ok = await action.run(onSubmit ? () => onSubmit(email.trim()) : undefined);
      if (ok) setSent(true);
    };

    if (sent) {
      return (
        <AuthFrame
          icon={RiMailSendLine}
          title="Check your inbox"
          description={
            <>
              We sent a sign-in link to <span className="font-medium text-foreground">{email || "your email"}</span>. The link
              expires in 15 minutes.
            </>
          }
          footer={
            footer !== undefined ? (
              footer
            ) : (
              <>
                Didn&apos;t get it?{" "}
                <button
                  type="button"
                  className={cn(linkClass, "disabled:opacity-50")}
                  disabled={resend.busy}
                  onClick={() => void resend.run(onResend ? () => onResend(email.trim()) : undefined)}
                >
                  {resend.busy ? "Sending…" : "Resend link"}
                </button>
              </>
            )
          }
          {...props}
        >
          <div ref={ref} className="flex flex-col gap-3">
            <Button asChild size="lg" fullWidth>
              <a href={mailAppHref}>
                <RiMailLine aria-hidden />
                Open mail app
              </a>
            </Button>
            <Button variant="ghost" size="lg" fullWidth onClick={() => setSent(false)}>
              Use a different email
            </Button>
          </div>
        </AuthFrame>
      );
    }

    return (
      <AuthFrame
        title={title}
        description={description}
        footer={
          footer !== undefined ? (
            footer
          ) : (
            <>
              Prefer a password?{" "}
              <BlockLink href={passwordSignInHref} renderLink={renderLink} className={linkClass}>
                Sign in with password
              </BlockLink>
            </>
          )
        }
        {...props}
      >
        <div ref={ref}>
          <FormError>{error ?? action.error}</FormError>
          <form noValidate onSubmit={submit}>
            <FieldGroup>
              <Field invalid={invalid}>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  size="lg"
                  autoComplete="email"
                  placeholder="you@example.com"
                  leadingIcon={<RiMailLine aria-hidden />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={action.busy}
                />
                <FieldError>{invalid ? "Enter a valid email address." : null}</FieldError>
              </Field>
              <Button type="submit" size="lg" fullWidth loading={action.busy} trailingIcon={<RiMailSendLine aria-hidden />}>
                Send magic link
              </Button>
            </FieldGroup>
          </form>
        </div>
      </AuthFrame>
    );
  }
);
MagicLinkCard.displayName = "MagicLinkCard";

/* ------------------------------------------------------------------ */
/* OTPVerifyCard                                                       */
/* ------------------------------------------------------------------ */

export interface OTPVerifyCardProps extends AuthCardBaseProps {
  /** Where the code was sent (shown in the description). */
  email?: string;
  length?: number;
  onVerify?: (code: string) => unknown;
  onResend?: () => unknown;
  /** Seconds before the code can be resent. Default 30. */
  resendSeconds?: number;
  /** Submit automatically when every slot is filled. Default true. */
  autoSubmit?: boolean;
  /** Focus the first slot on mount. Default true. */
  autoFocus?: boolean;
  loading?: boolean;
  error?: React.ReactNode;
  backHref?: string;
}

/** Six-digit verification code card with auto-submit and a resend countdown. */
export const OTPVerifyCard = React.forwardRef<HTMLFormElement, OTPVerifyCardProps>(
  (
    {
      email = "maya@sutra.app",
      title = "Check your email",
      description,
      length = 6,
      onVerify,
      onResend,
      resendSeconds = 30,
      autoSubmit = true,
      autoFocus = true,
      loading,
      error,
      backHref = "#sign-in",
      renderLink,
      footer,
      ...props
    },
    ref
  ) => {
    const [code, setCode] = React.useState("");
    const [resendAt, setResendAt] = React.useState(() => Date.now() + resendSeconds * 1000);
    // Capped: right after a resend the countdown still holds its clock from the previous expiry.
    const remainingMs = Math.min(useCountdown(resendAt).remainingMs, resendSeconds * 1000);
    const action = useAsyncAction(loading);
    const resend = useAsyncAction();

    const verify = (value: string) => {
      if (value.length < length) return;
      void action.run(onVerify ? () => onVerify(value) : undefined);
    };

    const doResend = async () => {
      const ok = await resend.run(onResend);
      if (ok) {
        setCode("");
        setResendAt(Date.now() + resendSeconds * 1000);
      }
    };

    const shownError = error ?? action.error;

    return (
      <AuthFrame
        icon={RiShieldKeyholeLine}
        title={title}
        description={
          description ?? (
            <>
              We sent a {length}-digit code to <span className="font-medium text-foreground">{email}</span>
            </>
          )
        }
        footer={footer !== undefined ? footer : <BackLink href={backHref} label="Back to sign in" renderLink={renderLink} />}
        {...props}
      >
        <form
          ref={ref}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            verify(code);
          }}
          className="flex flex-col items-center gap-6"
        >
          <Field invalid={Boolean(shownError)} className="items-center">
            <FieldLabel className="sr-only">Verification code</FieldLabel>
            <OTPField
              length={length}
              groupSize={length === 6 ? 3 : undefined}
              size="lg"
              value={code}
              onChange={setCode}
              onComplete={autoSubmit ? verify : undefined}
              disabled={action.busy}
              autoFocus={autoFocus}
            />
            <FieldError className="justify-center">{shownError}</FieldError>
          </Field>
          <Button type="submit" size="lg" fullWidth loading={action.busy} disabled={code.length < length}>
            Verify email
          </Button>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Didn&apos;t receive a code?{" "}
            {remainingMs > 0 ? (
              <span className="tabular-nums">
                Resend in {formatCountdown(remainingMs)}
              </span>
            ) : (
              <button
                type="button"
                className={cn(linkClass, "disabled:opacity-50")}
                disabled={resend.busy}
                onClick={() => void doResend()}
              >
                {resend.busy ? "Sending…" : "Resend code"}
              </button>
            )}
          </p>
        </form>
      </AuthFrame>
    );
  }
);
OTPVerifyCard.displayName = "OTPVerifyCard";

/* ------------------------------------------------------------------ */
/* ForgotPasswordCard                                                  */
/* ------------------------------------------------------------------ */

export interface ForgotPasswordCardProps extends AuthCardBaseProps {
  onSubmit?: (email: string) => unknown;
  sent?: boolean;
  onSentChange?: (sent: boolean) => void;
  loading?: boolean;
  error?: React.ReactNode;
  defaultEmail?: string;
  backHref?: string;
}

/** Request a password reset link; shows a confirmation once sent. */
export const ForgotPasswordCard = React.forwardRef<HTMLFormElement, ForgotPasswordCardProps>(
  (
    {
      title = "Forgot your password?",
      description = "No worries. Enter your email and we'll send you reset instructions.",
      onSubmit,
      sent: sentProp,
      onSentChange,
      loading,
      error,
      defaultEmail = "",
      backHref = "#sign-in",
      renderLink,
      footer,
      ...props
    },
    ref
  ) => {
    const [email, setEmail] = React.useState(defaultEmail);
    const [invalid, setInvalid] = React.useState(false);
    const [sentState, setSentState] = React.useState(false);
    const sent = sentProp ?? sentState;
    const setSent = (v: boolean) => {
      if (sentProp === undefined) setSentState(v);
      onSentChange?.(v);
    };
    const action = useAsyncAction(loading);
    const back = footer !== undefined ? footer : <BackLink href={backHref} label="Back to sign in" renderLink={renderLink} />;

    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isEmail(email)) return setInvalid(true);
      setInvalid(false);
      const ok = await action.run(onSubmit ? () => onSubmit(email.trim()) : undefined);
      if (ok) setSent(true);
    };

    if (sent) {
      return (
        <AuthFrame
          icon={RiMailSendLine}
          iconColor="success"
          title="Check your email"
          description={
            <>
              If an account exists for <span className="font-medium text-foreground">{email}</span>, you&apos;ll receive a
              password reset link shortly.
            </>
          }
          footer={back}
          {...props}
        >
          <Button variant="secondary" size="lg" fullWidth onClick={() => setSent(false)}>
            Try another email
          </Button>
        </AuthFrame>
      );
    }

    return (
      <AuthFrame icon={RiKey2Line} title={title} description={description} footer={back} {...props}>
        <FormError>{error ?? action.error}</FormError>
        <form ref={ref} noValidate onSubmit={submit}>
          <FieldGroup>
            <Field invalid={invalid}>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                size="lg"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={action.busy}
              />
              <FieldError>{invalid ? "Enter a valid email address." : null}</FieldError>
            </Field>
            <Button type="submit" size="lg" fullWidth loading={action.busy}>
              Send reset link
            </Button>
          </FieldGroup>
        </form>
      </AuthFrame>
    );
  }
);
ForgotPasswordCard.displayName = "ForgotPasswordCard";

/* ------------------------------------------------------------------ */
/* ResetPasswordCard                                                   */
/* ------------------------------------------------------------------ */

export interface ResetPasswordCardProps extends AuthCardBaseProps {
  onSubmit?: (password: string) => unknown;
  /** Called from the success state's "Continue" button. */
  onContinue?: () => void;
  continueHref?: string;
  loading?: boolean;
  error?: React.ReactNode;
  minScore?: 0 | 1 | 2 | 3 | 4;
  backHref?: string;
}

/** Set a new password with strength meter and confirmation; success state afterwards. */
export const ResetPasswordCard = React.forwardRef<HTMLFormElement, ResetPasswordCardProps>(
  (
    {
      title = "Set a new password",
      description = "Your new password must be different from previously used passwords.",
      onSubmit,
      onContinue,
      continueHref,
      loading,
      error,
      minScore = 2,
      backHref = "#sign-in",
      renderLink,
      footer,
      ...props
    },
    ref
  ) => {
    const [password, setPassword] = React.useState("");
    const [confirm, setConfirm] = React.useState("");
    const [errors, setErrors] = React.useState<{ password?: string; confirm?: string }>({});
    const [done, setDone] = React.useState(false);
    const action = useAsyncAction(loading);

    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      const next: typeof errors = {};
      if (getPasswordScore(password) < minScore) next.password = "Choose a stronger password.";
      if (confirm !== password) next.confirm = "Passwords don't match.";
      setErrors(next);
      if (next.password || next.confirm) return;
      const ok = await action.run(onSubmit ? () => onSubmit(password) : undefined);
      if (ok) setDone(true);
    };

    if (done) {
      return (
        <AuthFrame
          icon={RiShieldCheckLine}
          iconColor="success"
          title="Password reset"
          description="Your password has been updated. You can now sign in with your new password."
          footer={null}
          {...props}
        >
          {continueHref ? (
            <Button asChild size="lg" fullWidth>
              <a href={continueHref} onClick={onContinue}>
                Continue to sign in
              </a>
            </Button>
          ) : (
            <Button size="lg" fullWidth onClick={onContinue}>
              Continue to sign in
            </Button>
          )}
        </AuthFrame>
      );
    }

    return (
      <AuthFrame
        icon={RiLockPasswordLine}
        title={title}
        description={description}
        footer={footer !== undefined ? footer : <BackLink href={backHref} label="Back to sign in" renderLink={renderLink} />}
        {...props}
      >
        <FormError>{error ?? action.error}</FormError>
        <form ref={ref} noValidate onSubmit={submit}>
          <FieldGroup>
            <Field invalid={Boolean(errors.password)}>
              <FieldLabel>New password</FieldLabel>
              <PasswordInput
                size="lg"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={action.busy}
              />
              <PasswordStrength password={password} className="pt-1" />
              <FieldError>{errors.password}</FieldError>
            </Field>
            <Field invalid={Boolean(errors.confirm)}>
              <FieldLabel>Confirm password</FieldLabel>
              <PasswordInput
                size="lg"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={action.busy}
              />
              <FieldError>{errors.confirm}</FieldError>
            </Field>
            <Button type="submit" size="lg" fullWidth loading={action.busy}>
              Reset password
            </Button>
          </FieldGroup>
        </form>
      </AuthFrame>
    );
  }
);
ResetPasswordCard.displayName = "ResetPasswordCard";

/* ------------------------------------------------------------------ */
/* SSOOnlyCard                                                         */
/* ------------------------------------------------------------------ */

export interface SSOOnlyCardProps extends AuthCardBaseProps {
  providers?: SocialProvider[];
  onSocialSignIn?: (provider: SocialProvider) => unknown;
  /** Show a "Continue with SAML SSO" button. */
  onSAML?: () => unknown;
  showSAML?: boolean;
  termsHref?: string;
  privacyHref?: string;
  error?: React.ReactNode;
}

/** Stack of OAuth buttons (plus optional SAML SSO) for SSO-only sign in. */
export const SSOOnlyCard = React.forwardRef<HTMLDivElement, SSOOnlyCardProps>(
  (
    {
      title = "Sign in to Sutra",
      description = "Use your work account to continue.",
      providers = ["google", "microsoft", "apple", "github", "slack"],
      onSocialSignIn,
      onSAML,
      showSAML = true,
      termsHref = "#terms",
      privacyHref = "#privacy",
      error,
      renderLink,
      footer,
      ...props
    },
    ref
  ) => {
    const social = useSocial(onSocialSignIn);
    const saml = useAsyncAction();
    return (
      <AuthFrame
        title={title}
        description={description}
        footer={
          footer !== undefined ? (
            footer
          ) : (
            <span className="text-xs">
              By continuing you agree to our{" "}
              <BlockLink href={termsHref} renderLink={renderLink} className={linkClass}>
                Terms
              </BlockLink>{" "}
              and{" "}
              <BlockLink href={privacyHref} renderLink={renderLink} className={linkClass}>
                Privacy Policy
              </BlockLink>
              .
            </span>
          )
        }
        {...props}
      >
        <div ref={ref}>
          <FormError>{error ?? saml.error ?? social.error}</FormError>
          <AuthSocialButtons
            providers={providers}
            layout="stack"
            pending={social.pending}
            disabled={saml.busy}
            onSelect={social.select}
          />
          {showSAML && (
            <>
              <Separator label="or" className="my-5" />
              <Button
                variant="tertiary"
                size="lg"
                fullWidth
                loading={saml.busy}
                disabled={social.pending != null}
                leadingIcon={<RiKey2Line aria-hidden />}
                onClick={() => void saml.run(onSAML)}
              >
                Continue with SAML SSO
              </Button>
            </>
          )}
        </div>
      </AuthFrame>
    );
  }
);
SSOOnlyCard.displayName = "SSOOnlyCard";

/* ------------------------------------------------------------------ */
/* TwoFactorSetupCard                                                  */
/* ------------------------------------------------------------------ */

export interface TwoFactorSetupCardProps extends AuthCardBaseProps {
  /** Base32 secret shown for manual entry (spaces are ignored when copying). */
  secret?: string;
  /** Account label shown under the QR code. */
  account?: string;
  /** Issuer (service name) shown in the authenticator app. Defaults to "Sutra". */
  issuer?: string;
  /**
   * Full `otpauth://` provisioning URI encoded in the QR code. Defaults to one built from
   * `issuer`, `account` and `secret` (TOTP). Pass your server's URI to include digits/period/algorithm.
   */
  otpauthUri?: string;
  onVerify?: (code: string) => unknown;
  onCancel?: () => void;
  onDone?: () => void;
  /** Recovery codes revealed after a successful verification. */
  recoveryCodes?: string[];
  loading?: boolean;
  error?: React.ReactNode;
}

const defaultRecoveryCodes = ["7KQ2-M9XD", "P4LW-8ZRT", "Y3HN-C6VB", "2FJE-Q7SK", "W8TA-N5UG", "D9MC-R4PL"];

/** Builds a TOTP provisioning URI (Key Uri Format) for authenticator apps. Spaces in the secret are dropped. */
export function buildOtpauthUri({ issuer, account, secret }: { issuer: string; account: string; secret: string }) {
  const enc = encodeURIComponent;
  const key = secret.replace(/\s+/g, "").toUpperCase();
  return `otpauth://totp/${enc(issuer)}:${enc(account)}?secret=${enc(key)}&issuer=${enc(issuer)}`;
}

/** Authenticator app setup: scan a QR code or copy the secret, then confirm with a 6-digit code. */
export const TwoFactorSetupCard = React.forwardRef<HTMLDivElement, TwoFactorSetupCardProps>(
  (
    {
      title = "Set up two-factor authentication",
      description = "Protect your account with an authenticator app like 1Password, Authy or Google Authenticator.",
      secret = "JBSW Y3DP EHPK 3PXP K4ZQ",
      account = "maya@sutra.app",
      issuer = "Sutra",
      otpauthUri,
      onVerify,
      onCancel,
      onDone,
      recoveryCodes = defaultRecoveryCodes,
      loading,
      error,
      footer,
      renderLink: _renderLink,
      className,
      variant,
      ...props
    },
    ref
  ) => {
    const [code, setCode] = React.useState("");
    const [done, setDone] = React.useState(false);
    const action = useAsyncAction(loading);

    const verify = async (value: string) => {
      if (value.length < 6) return;
      const ok = await action.run(onVerify ? () => onVerify(value) : undefined);
      if (ok) setDone(true);
    };

    if (done) {
      return (
        <AuthFrame
          icon={RiShieldCheckLine}
          iconColor="success"
          title="Two-factor is on"
          description="Save these recovery codes somewhere safe. Each one can be used once if you lose your device."
          footer={null}
          variant={variant}
          className={cn(variant !== "plain" && "max-w-[440px]", className)}
          {...props}
        >
          <div ref={ref} className="flex flex-col gap-4">
            <ul className="grid grid-cols-2 gap-2 rounded-box border border-border bg-subtle p-4 font-mono text-sm tabular-nums text-foreground">
              {recoveryCodes.map((c) => (
                <li key={c} className="text-center">
                  {c}
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2">
              <CopyButton variant="button" size="md" value={recoveryCodes.join("\n")} label="Copy codes" />
              <Button
                variant="secondary"
                leadingIcon={<RiDownloadLine aria-hidden />}
                onClick={() => {
                  const blob = new Blob([recoveryCodes.join("\n")], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "sutra-recovery-codes.txt";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download
              </Button>
            </div>
            <Button size="lg" fullWidth onClick={onDone}>
              Done
            </Button>
          </div>
        </AuthFrame>
      );
    }

    const step = (n: number, label: React.ReactNode) => (
      <p className="flex items-center gap-2.5 text-sm font-medium text-foreground">
        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-2xs font-semibold text-primary-soft-foreground">
          {n}
        </span>
        {label}
      </p>
    );

    return (
      <AuthFrame
        icon={RiShieldKeyholeLine}
        title={title}
        description={description}
        footer={footer}
        variant={variant}
        className={cn(variant !== "plain" && "max-w-[440px]", className)}
        {...props}
      >
        <div ref={ref} className="flex flex-col gap-6">
          <FormError>{error ?? action.error}</FormError>
          <section className="flex flex-col gap-3">
            {step(1, "Scan this QR code with your authenticator app")}
            <div className="flex flex-col items-center gap-2 rounded-box border border-border bg-subtle py-5">
              <span className="rounded-box border border-border bg-white p-3 shadow-xs">
                <QRCode
                  value={otpauthUri ?? buildOtpauthUri({ issuer, account, secret })}
                  size={156}
                  quietZone={0}
                  logo={<SutraMark size={30} />}
                  title={`QR code to add ${issuer} (${account}) to your authenticator app`}
                />
              </span>
              <span className="text-xs text-muted-foreground">
                {issuer} · {account}
              </span>
            </div>
          </section>
          <section className="flex flex-col gap-3">
            {step(2, "Or enter this setup key manually")}
            <div className="flex h-10 items-center gap-2 rounded-control border border-border bg-subtle pl-3 pr-1">
              <code className="min-w-0 flex-1 truncate font-mono text-sm tracking-wider text-foreground">{secret}</code>
              <CopyButton size="md" value={secret.replace(/\s+/g, "")} label="Copy setup key" />
            </div>
          </section>
          <section className="flex flex-col gap-3">
            {step(3, "Enter the 6-digit code from the app")}
            <Field invalid={Boolean(error ?? action.error)}>
              <FieldLabel className="sr-only">Authentication code</FieldLabel>
              <OTPField
                length={6}
                groupSize={3}
                value={code}
                onChange={setCode}
                onComplete={(v) => void verify(v)}
                disabled={action.busy}
                containerClassName="justify-center"
              />
            </Field>
          </section>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" onClick={onCancel} disabled={action.busy}>
              Cancel
            </Button>
            <Button size="lg" loading={action.busy} disabled={code.length < 6} onClick={() => void verify(code)}>
              Verify &amp; enable
            </Button>
          </div>
        </div>
      </AuthFrame>
    );
  }
);
TwoFactorSetupCard.displayName = "TwoFactorSetupCard";
