/** OTPVerifyCard and TwoFactorSetupCard: one-time code verification and authenticator setup. */
import * as React from "react";
import { RiDownloadLine, RiShieldCheckLine, RiShieldKeyholeLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { useCountdown } from "../hooks/use-now";
import { formatCountdown } from "../lib/duration";
import { CopyButton } from "../primitives/copy-button";
import { Button } from "../primitives/button";
import { Field, FieldError, FieldLabel } from "../primitives/field";
import { OTPField } from "../primitives/input-otp";
import { SutraMark } from "../assets/brand";
import { QRCode } from "../kits/identity/qr-code";
import { AuthFrame as BaseAuthFrame, FormError, type AuthFrameProps } from "./auth-frame-internal";
import { useBlockAction } from "./block-utils";
import type { AuthCardBaseProps } from "./auth-blocks-model";
import { BackLink, linkClass } from "./auth-blocks-internal";

/** The shared card frame with its styling slot named here, so the generated docs list it. */
const AuthFrame = React.forwardRef<HTMLDivElement, AuthFrameProps>((props, ref) => <BaseAuthFrame ref={ref} data-slot="auth-card" {...props} />);
AuthFrame.displayName = "AuthFrame";

/* ------------------------------------------------------------------ */
/* OTPVerifyCard                                                       */
/* ------------------------------------------------------------------ */

export interface OTPVerifyCardProps extends AuthCardBaseProps {
  /** Where the code was sent (shown in the description). Without it the description says "your email". */
  email?: string;
  /**
   * Number of code digits.
   * @default 6
   */
  length?: number;
  /** Called with the code once every digit is entered. A returned promise shows a spinner; throw to show the error message. */
  onVerify?: (code: string) => unknown;
  /** Called when the user asks for a new code. */
  onResend?: () => unknown;
  /** Seconds before the code can be resent. Default 30. */
  resendSeconds?: number;
  /** Submit automatically when every slot is filled. Default true. */
  autoSubmit?: boolean;
  /** Focus the first slot on mount. Default true. */
  autoFocus?: boolean;
  /** Disables the input and shows a spinner while the code is checked. */
  loading?: boolean;
  /** Error message shown under the input (e.g. a wrong code). */
  error?: React.ReactNode;
  /**
   * Link target of the "Back to sign in" link.
   * @default "#sign-in"
   */
  backHref?: string;
}

/** Six-digit verification code card with auto-submit and a resend countdown. */
export const OTPVerifyCard = React.forwardRef<HTMLDivElement, OTPVerifyCardProps>(
  (
    {
      email,
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
    const action = useBlockAction(loading);
    const resend = useBlockAction();

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
        ref={ref}
        icon={RiShieldKeyholeLine}
        title={title}
        description={
          description ?? (
            <>
              We sent a {length}-digit code to <span className="font-medium text-foreground">{email || "your email"}</span>
            </>
          )
        }
        footer={footer !== undefined ? footer : <BackLink href={backHref} label="Back to sign in" renderLink={renderLink} />}
        {...props}
      >
        <form
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
              containerClassName="w-full justify-center [&>[data-slot=input-otp-group]]:min-w-0 [&>[data-slot=input-otp-group]]:flex-1 [&>[data-slot=input-otp-group]]:justify-center"
              slotClassName="size-auto aspect-square min-w-0 max-w-12 flex-1"
            />
            <FieldError className="justify-center">{shownError}</FieldError>
          </Field>
          <Button type="submit" size="lg" fullWidth loading={action.busy} disabled={code.length < length}>
            Verify email
          </Button>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Didn&apos;t receive a code?{" "}
            {remainingMs > 0 ? (
              <>
                {/* The countdown ticks every second; keep it out of the live region. */}
                <span aria-hidden="true" className="tabular-nums">
                  Resend in {formatCountdown(remainingMs)}
                </span>
                <span className="sr-only">You can resend it shortly.</span>
              </>
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
/* TwoFactorSetupCard                                                  */
/* ------------------------------------------------------------------ */

export interface TwoFactorSetupCardProps extends AuthCardBaseProps {
  /** Base32 secret shown for manual entry (spaces are ignored when copying). */
  secret?: string;
  /** Account label shown under the QR code (an email address, say). Left out of the label and the provisioning URI when empty. */
  account?: string;
  /** Issuer (service name) shown in the authenticator app. Defaults to "Sutra". */
  issuer?: string;
  /**
   * Full `otpauth://` provisioning URI encoded in the QR code. Defaults to one built from
   * `issuer`, `account` and `secret` (TOTP). Pass your server's URI to include digits/period/algorithm.
   */
  otpauthUri?: string;
  /** Called with the code when the user submits it. A returned promise shows a spinner; throw to show the error message. */
  onVerify?: (code: string) => unknown;
  /** Called when the user cancels the setup. */
  onCancel?: () => void;
  /** Called when the user finishes the setup (after the recovery codes are shown). */
  onDone?: () => void;
  /** Recovery codes revealed after a successful verification. */
  recoveryCodes?: string[];
  /** Disables the form and shows a spinner while the code is checked. */
  loading?: boolean;
  /** Error message shown under the code input (e.g. a wrong code). */
  error?: React.ReactNode;
}

const defaultRecoveryCodes = ["7KQ2-M9XD", "P4LW-8ZRT", "Y3HN-C6VB", "2FJE-Q7SK", "W8TA-N5UG", "D9MC-R4PL"];

/** Builds a TOTP provisioning URI (Key Uri Format) for authenticator apps. Spaces in the secret are dropped. */
export function buildOtpauthUri({ issuer, account, secret }: { issuer: string; account: string; secret: string }) {
  const enc = encodeURIComponent;
  const key = secret.replace(/\s+/g, "").toUpperCase();
  const label = account ? `${enc(issuer)}:${enc(account)}` : enc(issuer);
  return `otpauth://totp/${label}?secret=${enc(key)}&issuer=${enc(issuer)}`;
}

/** Authenticator app setup: scan a QR code or copy the secret, then confirm with a 6-digit code. */
export const TwoFactorSetupCard = React.forwardRef<HTMLDivElement, TwoFactorSetupCardProps>(
  (
    {
      title = "Set up two-factor authentication",
      description = "Protect your account with an authenticator app like 1Password, Authy or Google Authenticator.",
      secret = "JBSW Y3DP EHPK 3PXP K4ZQ",
      account = "",
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
    const action = useBlockAction(loading);

    const verify = async (value: string) => {
      if (value.length < 6) return;
      const ok = await action.run(onVerify ? () => onVerify(value) : undefined);
      if (ok) setDone(true);
    };

    if (done) {
      return (
        <AuthFrame
          ref={ref}
          icon={RiShieldCheckLine}
          iconColor="success"
          title="Two-factor is on"
          description="Save these recovery codes somewhere safe. Each one can be used once if you lose your device."
          footer={null}
          variant={variant}
          className={cn(variant !== "plain" && "max-w-[440px]", className)}
          {...props}
        >
          <div className="flex flex-col gap-4">
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
        ref={ref}
        icon={RiShieldKeyholeLine}
        title={title}
        description={description}
        footer={footer}
        variant={variant}
        className={cn(variant !== "plain" && "max-w-[440px]", className)}
        {...props}
      >
        <div className="flex flex-col gap-6">
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
                  title={`QR code to add ${account ? `${issuer} (${account})` : issuer} to your authenticator app`}
                />
              </span>
              <span className="text-xs text-muted-foreground">
                {account ? `${issuer} · ${account}` : issuer}
              </span>
            </div>
          </section>
          <section className="flex flex-col gap-3">
            {step(2, "Or enter this setup key manually")}
            <div className="flex h-10 items-center gap-2 rounded-control border border-border bg-subtle ps-3 pe-1">
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
                containerClassName="w-full justify-center [&>[data-slot=input-otp-group]]:min-w-0 [&>[data-slot=input-otp-group]]:flex-1 [&>[data-slot=input-otp-group]]:justify-center"
                slotClassName="size-auto aspect-square min-w-0 max-w-10 flex-1"
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
