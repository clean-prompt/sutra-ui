/** SignUpCard: account creation with a password strength meter and social providers. */
import * as React from "react";
import { RiMailLine, RiUserLine } from "@remixicon/react";
import { Button } from "../primitives/button";
import { Input, PasswordInput } from "../primitives/input";
import { Field, FieldError, FieldLabel, FieldGroup, FieldHint } from "../primitives/field";
import { CheckboxField } from "../primitives/checkbox";
import { Separator } from "../primitives/separator";
import { PasswordStrength, getPasswordScore } from "../patterns/password-strength";
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
/* SignUpCard                                                          */
/* ------------------------------------------------------------------ */

export interface SignUpCardValues {
  name: string;
  email: string;
  password: string;
}

export interface SignUpCardProps extends AuthCardBaseProps {
  /** Called with the form values (name, email, password). Return a promise to show a spinner; throw to show the error message. */
  onSubmit?: (values: SignUpCardValues) => unknown;
  /** Called with the provider when a social button is clicked. A returned promise shows a spinner on that button. */
  onSocialSignIn?: (provider: SocialProvider) => unknown;
  /** OAuth providers shown above the form. Pass `[]` to hide. */
  providers?: SocialProvider[];
  /**
   * Social buttons as a row/grid (for two or three providers) or stacked full-width.
   * @default "grid"
   */
  socialLayout?: "grid" | "stack";
  /** Disables the form and shows a spinner on the submit button. */
  loading?: boolean;
  /** Error message shown above the form; also marks the form invalid. */
  error?: React.ReactNode;
  /**
   * Link target of the "Sign in" prompt.
   * @default "#sign-in"
   */
  signInHref?: string;
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
  /** Minimum strength score (1–4) required to submit. Default 2. */
  minScore?: 0 | 1 | 2 | 3 | 4;
  /**
   * Text of the submit button.
   * @default "Create account"
   */
  submitLabel?: React.ReactNode;
}

/** Account creation card: name, email, password with strength meter and terms checkbox. */
export const SignUpCard = React.forwardRef<HTMLDivElement, SignUpCardProps>(
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
    const action = useBlockAction(loading);
    const social = useSocial(onSocialSignIn);
    const busy = action.busy || social.pending != null;
    const failed = Boolean(error ?? action.error);
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
        ref={ref}
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
        <form noValidate onSubmit={submit}>
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
            <Field invalid={Boolean(errors.email) || failed}>
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
            <Field invalid={Boolean(errors.password) || failed}>
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
