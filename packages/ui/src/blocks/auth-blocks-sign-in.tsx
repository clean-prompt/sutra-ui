/** LoginCard: email/password sign-in with social providers. */
import * as React from "react";
import { RiLockPasswordLine, RiMailLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Input, PasswordInput } from "../primitives/input";
import { Field, FieldError, FieldLabel, FieldGroup } from "../primitives/field";
import { CheckboxField } from "../primitives/checkbox";
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
  /** Called with the provider when a social button is clicked. A returned promise shows a spinner on that button. */
  onSocialSignIn?: (provider: SocialProvider) => unknown;
  /** OAuth providers shown above the form. Pass `[]` to hide. */
  providers?: SocialProvider[];
  /**
   * Social buttons as a row/grid (for two or three providers) or stacked full-width.
   * @default "grid"
   */
  socialLayout?: "grid" | "stack";
  /** Disables the form and shows a spinner on the submit button (use it while you sign in). */
  loading?: boolean;
  /** Error message shown above the form (e.g. a failed sign-in); also marks the form invalid. */
  error?: React.ReactNode;
  /**
   * Shows the "Remember me" checkbox.
   * @default true
   */
  showRemember?: boolean;
  /**
   * Link target of "Forgot password?".
   * @default "#forgot-password"
   */
  forgotPasswordHref?: string;
  /**
   * Link target of the "Sign up" prompt.
   * @default "#sign-up"
   */
  signUpHref?: string;
  /**
   * Initial value of the email field.
   * @default ""
   */
  defaultEmail?: string;
  /**
   * Text of the submit button.
   * @default "Sign in"
   */
  submitLabel?: React.ReactNode;
}

/** Email + password sign-in card with remember me, forgot link and SSO buttons. */
export const LoginCard = React.forwardRef<HTMLDivElement, LoginCardProps>(
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
    const action = useBlockAction(loading);
    const social = useSocial(onSocialSignIn);
    const busy = action.busy || social.pending != null;
    const failed = Boolean(error ?? action.error);

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
        ref={ref}
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
        <form noValidate onSubmit={submit}>
          <FieldGroup>
            <Field invalid={Boolean(errors.email) || failed}>
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
            <Field invalid={Boolean(errors.password) || failed}>
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
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
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
