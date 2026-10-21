/** ForgotPasswordCard and ResetPasswordCard: request a reset link and choose a new password. */
import * as React from "react";
import {
  RiKey2Line,
  RiLockPasswordLine,
  RiMailSendLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import { Button } from "../primitives/button";
import { Input, PasswordInput } from "../primitives/input";
import { Field, FieldError, FieldLabel, FieldGroup } from "../primitives/field";
import { PasswordStrength, getPasswordScore } from "../patterns/password-strength";
import { isEmail } from "../lib/validate";
import { AuthFrame as BaseAuthFrame, FormError, type AuthFrameProps } from "./auth-frame-internal";
import { useBlockAction } from "./block-utils";
import type { AuthCardBaseProps } from "./auth-blocks-model";
import { BackLink } from "./auth-blocks-internal";

/** The shared card frame with its styling slot named here, so the generated docs list it. */
const AuthFrame = React.forwardRef<HTMLDivElement, AuthFrameProps>((props, ref) => <BaseAuthFrame ref={ref} data-slot="auth-card" {...props} />);
AuthFrame.displayName = "AuthFrame";

/* ------------------------------------------------------------------ */
/* ForgotPasswordCard                                                  */
/* ------------------------------------------------------------------ */

export interface ForgotPasswordCardProps extends AuthCardBaseProps {
  /** Called with the email when the form is submitted. A returned promise shows a spinner; throw to show the error message. */
  onSubmit?: (email: string) => unknown;
  /** Controls the success state ("check your inbox"). Use with `onSentChange`. */
  sent?: boolean;
  /** Called when the card switches between the form and the success state. */
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
  /**
   * Link target of the "Back to sign in" link.
   * @default "#sign-in"
   */
  backHref?: string;
}

/** Request a password reset link; shows a confirmation once sent. */
export const ForgotPasswordCard = React.forwardRef<HTMLDivElement, ForgotPasswordCardProps>(
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
    const action = useBlockAction(loading);
    const failed = Boolean(error ?? action.error);
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
          ref={ref}
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
      <AuthFrame ref={ref} icon={RiKey2Line} title={title} description={description} footer={back} {...props}>
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
  /** Called with the new password when the form is submitted. A returned promise shows a spinner; throw to show the error message. */
  onSubmit?: (password: string) => unknown;
  /** Called from the success state's "Continue" button. */
  onContinue?: () => void;
  /** Makes the success state's "Continue" button a link to this URL (alternative to `onContinue`). */
  continueHref?: string;
  /** Disables the form and shows a spinner on the submit button. */
  loading?: boolean;
  /** Error message shown above the form; also marks the form invalid. */
  error?: React.ReactNode;
  /**
   * Minimum strength score (1 to 4) required to submit.
   * @default 2
   */
  minScore?: 0 | 1 | 2 | 3 | 4;
  /**
   * Link target of the "Back to sign in" link.
   * @default "#sign-in"
   */
  backHref?: string;
}

/** Set a new password with strength meter and confirmation; success state afterwards. */
export const ResetPasswordCard = React.forwardRef<HTMLDivElement, ResetPasswordCardProps>(
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
    const action = useBlockAction(loading);
    const failed = Boolean(error ?? action.error);

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
          ref={ref}
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
        ref={ref}
        icon={RiLockPasswordLine}
        title={title}
        description={description}
        footer={footer !== undefined ? footer : <BackLink href={backHref} label="Back to sign in" renderLink={renderLink} />}
        {...props}
      >
        <FormError>{error ?? action.error}</FormError>
        <form noValidate onSubmit={submit}>
          <FieldGroup>
            <Field invalid={Boolean(errors.password) || failed}>
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
            <Field invalid={Boolean(errors.confirm) || failed}>
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
