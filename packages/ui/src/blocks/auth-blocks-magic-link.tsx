/** MagicLinkCard and SSOOnlyCard: passwordless email links and single sign-on. */
import * as React from "react";
import { RiKey2Line, RiMailLine, RiMailSendLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Input } from "../primitives/input";
import { Field, FieldError, FieldLabel, FieldGroup } from "../primitives/field";
import { Separator } from "../primitives/separator";
import { isEmail } from "../lib/validate";
import type { SocialProvider } from "../primitives/social-button";
import { AuthFrame as BaseAuthFrame, FormError, type AuthFrameProps } from "./auth-frame-internal";
import { BlockLink, useBlockAction } from "./block-utils";
import type { AuthCardBaseProps } from "./auth-blocks-model";
import { AuthSocialButtons, linkClass, useSocial } from "./auth-blocks-internal";

/** The shared card frame with its styling slot named here, so the generated docs list it. */
const AuthFrame = React.forwardRef<HTMLDivElement, AuthFrameProps>((props, ref) => <BaseAuthFrame ref={ref} data-slot="auth-card" {...props} />);
AuthFrame.displayName = "AuthFrame";

/* ------------------------------------------------------------------ */
/* MagicLinkCard                                                       */
/* ------------------------------------------------------------------ */

export interface MagicLinkCardProps extends AuthCardBaseProps {
  /** Called with the email when the user asks for a link. A returned promise shows a spinner; throw to show the error message. */
  onSubmit?: (email: string) => unknown;
  /** Called with the email when the user asks to resend the link. */
  onResend?: (email: string) => unknown;
  /** Control the "check your inbox" state. */
  sent?: boolean;
  /** Called when the card switches between the form and the "check your inbox" state. */
  onSentChange?: (sent: boolean) => void;
  /** Disables the form and shows a spinner on the submit button. */
  loading?: boolean;
  /** Error message shown above the form; also marks the form invalid. */
  error?: React.ReactNode;
  /**
   * Initial value of the email field.
   * @default ""
   */
  defaultEmail?: string;
  /** Link for the "Open mail app" button in the success state. */
  mailAppHref?: string;
  /**
   * Link target of the "Sign in with password" alternative.
   * @default "#sign-in"
   */
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
    const action = useBlockAction(loading);
    const resend = useBlockAction();
    const failed = Boolean(error ?? action.error);

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
          ref={ref}
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
          <div className="flex flex-col gap-3">
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
        ref={ref}
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
        <div>
          <FormError>{error ?? action.error}</FormError>
          <form noValidate onSubmit={submit}>
            <FieldGroup>
              <Field invalid={invalid || failed}>
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
/* SSOOnlyCard                                                         */
/* ------------------------------------------------------------------ */

export interface SSOOnlyCardProps extends AuthCardBaseProps {
  /** OAuth providers to list; defaults to Google, Microsoft, Apple, GitHub and Slack. */
  providers?: SocialProvider[];
  /** Called with the provider when a social button is clicked. A returned promise shows a spinner on that button. */
  onSocialSignIn?: (provider: SocialProvider) => unknown;
  /** Show a "Continue with SAML SSO" button. */
  onSAML?: () => unknown;
  /**
   * Shows the "Continue with SAML SSO" button (needs `onSAML`).
   * @default true
   */
  showSAML?: boolean;
  /**
   * Link target of the terms-of-service text.
   * @default "#terms"
   */
  termsHref?: string;
  /**
   * Link target of the privacy-policy text.
   * @default "#privacy"
   */
  privacyHref?: string;
  /** Error message shown above the buttons (e.g. a failed sign-in). */
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
    const saml = useBlockAction();
    return (
      <AuthFrame
        ref={ref}
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
        <div>
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
