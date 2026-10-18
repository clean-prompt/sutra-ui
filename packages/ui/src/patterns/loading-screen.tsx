import * as React from "react";
import { OTPInputContext, REGEXP_ONLY_DIGITS } from "input-otp";
import { RiFingerprintLine, RiKey2Line, RiLockLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { pluralize } from "../lib/format";
import { formatClock, formatDuration } from "../lib/duration";

import { prefersReducedMotion } from "../hooks/use-media-query";
import { SutraMark } from "../assets/brand";
import { Button } from "../primitives/button";
import { Input, PasswordInput } from "../primitives/input";
import { InputOTP, InputOTPGroup } from "../primitives/input-otp";

/* ------------------------------------------------------------------ */
/* BootScreen                                                          */
/* ------------------------------------------------------------------ */

export interface BootScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Status line. Defaults to "Checking session…". */
  message?: React.ReactNode;
  /** Brand mark; defaults to the Sutra mark. Pass `null` for text only. */
  mark?: React.ReactNode;
  /** Milliseconds to wait before showing anything, so fast loads never flash. */
  delay?: number;
  /** Cover the window (`fixed`). Set false to fill the parent box instead. */
  fullscreen?: boolean;
}

/** What fills the window while an app decides who you are: a brand mark, a slow pulse and one line. */
export const BootScreen = React.forwardRef<HTMLDivElement, BootScreenProps>(
  ({ message, mark, delay = 250, fullscreen = true, className, children, ...props }, ref) => {
    const [visible, setVisible] = React.useState(delay <= 0);
    React.useEffect(() => {
      if (delay <= 0) return setVisible(true);
      const t = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(t);
    }, [delay]);
    const text = message ?? children ?? "Checking session…";
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        data-slot="boot-screen"
        data-visible={visible || undefined}
        className={cn(
          "z-50 flex flex-col items-center justify-center gap-5 bg-background text-center",
          fullscreen ? "fixed inset-0" : "absolute inset-0 h-full w-full",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "flex flex-col items-center gap-5 transition-opacity duration-500",
            visible ? "opacity-100" : "opacity-0"
          )}
        >
          {mark !== null && (
            <span aria-hidden className="animate-pulse [animation-duration:2.4s] motion-reduce:animate-none">
              {mark ?? <SutraMark size={44} />}
            </span>
          )}
          <span className="text-sm text-muted-foreground">{text}</span>
        </div>
      </div>
    );
  }
);
BootScreen.displayName = "BootScreen";

/* ------------------------------------------------------------------ */
/* LockScreen                                                          */
/* ------------------------------------------------------------------ */

export type LockScreenMode = "pin" | "password" | "passkey";

export interface LockScreenProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Primary unlock method. `passkey` shows only the passkey button. */
  mode?: LockScreenMode;
  pinLength?: number;
  /** Resolve `true` to unlock, `false` for a wrong secret. Throwing counts as wrong. */
  onUnlock?: (secret: string) => Promise<boolean> | boolean;
  /** Shows "Unlock with passkey". Resolve `false` to report a failure. */
  onPasskey?: () => Promise<boolean | void> | boolean | void;
  passkeyLabel?: React.ReactNode;
  /** Enables the "Use recovery key" secondary mode. */
  onRecover?: (recoveryKey: string) => Promise<boolean> | boolean;
  /** App identity shown above the form. */
  appName?: React.ReactNode;
  /** App icon; defaults to the Sutra mark. */
  icon?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Wrong attempts allowed before a lockout. */
  maxAttempts?: number;
  /** Lockout length in seconds, or a function of how many lockouts happened (1, 2, …). */
  lockoutSeconds?: number | ((lockouts: number) => number);
  /** Externally imposed lockout end (epoch ms). */
  lockedUntil?: number;
  /** Cover the window (`fixed`). Set false to fill the parent box. */
  fullscreen?: boolean;
  /** Extra content at the bottom (e.g. "Sign out"). */
  footer?: React.ReactNode;
}

const defaultLockout = (n: number) => [30, 60, 300, 900, 3600][Math.min(n - 1, 4)]!;

function formatWait(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  return s >= 3600 ? formatDuration(s * 1000, { round: "floor", maxUnit: "h" }) : formatClock(s);
}

function PinSlot({ index }: { index: number }) {
  const ctx = React.useContext(OTPInputContext);
  const slot = ctx?.slots?.[index];
  return (
    <div
      data-slot="lock-screen-pin-slot"
      data-active={slot?.isActive || undefined}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-control border border-input bg-background shadow-xs transition-[border-color,box-shadow] duration-150",
        slot?.isActive && "z-10 border-ring ring-[3px] ring-ring/35"
      )}
    >
      {slot?.char ? (
        <span className="size-2.5 rounded-full bg-foreground animate-in zoom-in-50 duration-150" />
      ) : slot?.hasFakeCaret ? (
        <span className="h-5 w-px animate-caret-blink bg-foreground" />
      ) : null}
    </div>
  );
}

/** Full-screen vault unlock: PIN boxes, password or passkey, with attempts, lockout and recovery-key mode. */
export const LockScreen = React.forwardRef<HTMLDivElement, LockScreenProps>(
  (
    {
      mode = "pin",
      pinLength = 6,
      onUnlock,
      onPasskey,
      passkeyLabel = "Unlock with passkey",
      onRecover,
      appName = "Sutra",
      icon,
      title = "Vault locked",
      description,
      maxAttempts = 5,
      lockoutSeconds = defaultLockout,
      lockedUntil: lockedUntilProp,
      fullscreen = true,
      footer,
      className,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = React.useState("");
    const [recovery, setRecovery] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [failures, setFailures] = React.useState(0);
    const [lockouts, setLockouts] = React.useState(0);
    const [lockedUntil, setLockedUntil] = React.useState(0);
    const [now, setNow] = React.useState(() => Date.now());
    const cardRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const lockEnd = Math.max(lockedUntil, lockedUntilProp ?? 0);
    const locked = lockEnd > now;
    const waitSeconds = (lockEnd - now) / 1000;
    // Announced once per lockout; the visible countdown ticks outside the live region.
    const lockNotice = React.useMemo(
      () => (lockEnd > Date.now() ? formatWait((lockEnd - Date.now()) / 1000) : ""),
      [lockEnd]
    );

    React.useEffect(() => {
      if (lockEnd <= Date.now()) return;
      setNow(Date.now());
      const id = setInterval(() => {
        const t = Date.now();
        setNow(t);
        if (t >= lockEnd) {
          clearInterval(id);
          setError(null);
        }
      }, 500);
      return () => clearInterval(id);
    }, [lockEnd]);

    const shake = () => {
      const el = cardRef.current;
      if (!el || prefersReducedMotion() || typeof el.animate !== "function") return;
      el.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-10px)" },
          { transform: "translateX(9px)" },
          { transform: "translateX(-6px)" },
          { transform: "translateX(4px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 420, easing: "ease-out" }
      );
    };

    const noun = recovery ? "recovery key" : mode === "pin" ? "PIN" : "password";

    const fail = (message?: string) => {
      const nextFailures = failures + 1;
      setValue("");
      shake();
      if (nextFailures >= maxAttempts) {
        const n = lockouts + 1;
        const secs = typeof lockoutSeconds === "function" ? lockoutSeconds(n) : lockoutSeconds;
        setLockouts(n);
        setFailures(0);
        const t = Date.now();
        setNow(t);
        setLockedUntil(t + secs * 1000);
        setError("Too many attempts.");
      } else {
        setFailures(nextFailures);
        const left = maxAttempts - nextFailures;
        setError(
          `${message ?? `Incorrect ${noun}.`} ${left} ${pluralize(left, "attempt")} remaining.`
        );
      }
      requestAnimationFrame(() => inputRef.current?.focus());
    };

    const submit = async (secret: string) => {
      if (busy || locked || !secret) return;
      const handler = recovery ? onRecover : onUnlock;
      if (!handler) return;
      setBusy(true);
      setError(null);
      let ok = false;
      try {
        ok = Boolean(await handler(secret));
      } catch {
        ok = false;
      }
      setBusy(false);
      if (ok) {
        setFailures(0);
        setValue("");
      } else fail();
    };

    const passkey = async () => {
      if (!onPasskey || busy || locked) return;
      setBusy(true);
      setError(null);
      try {
        const result = await onPasskey();
        if (result === false) setError("Passkey sign-in didn't complete. Try again.");
      } catch {
        setError("Passkey sign-in didn't complete. Try again.");
      } finally {
        setBusy(false);
      }
    };

    const disabled = busy || locked;
    const desc =
      description ??
      (recovery
        ? "Enter your recovery key to regain access."
        : mode === "pin"
          ? `Enter your ${pinLength}-digit PIN to unlock.`
          : mode === "password"
            ? "Enter your password to unlock."
            : "Use your passkey to unlock.");

    const showForm = recovery || mode !== "passkey";

    return (
      <div
        ref={ref}
        data-slot="lock-screen"
        className={cn(
          "z-50 flex flex-col items-center justify-center overflow-y-auto bg-background p-6 text-foreground",
          fullscreen ? "fixed inset-0" : "absolute inset-0 h-full w-full",
          className
        )}
        {...props}
      >
        <div ref={cardRef} className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <span className="relative">
              {icon ?? <SutraMark size={52} />}
              <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border">
                <RiLockLine aria-hidden className="size-3" />
              </span>
            </span>
            {appName != null && <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{appName}</p>}
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">{recovery ? "Use recovery key" : title}</h1>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          </div>

          {showForm && (
            <form
              className="flex w-full flex-col items-center gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit(value);
              }}
            >
              {recovery ? (
                <Input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  aria-label="Recovery key"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={disabled}
                  aria-invalid={error ? true : undefined}
                  className="font-mono"
                  size="lg"
                />
              ) : mode === "pin" ? (
                <InputOTP
                  ref={inputRef}
                  maxLength={pinLength}
                  pattern={REGEXP_ONLY_DIGITS}
                  inputMode="numeric"
                  value={value}
                  onChange={setValue}
                  onComplete={(v: string) => void submit(v)}
                  disabled={disabled}
                  aria-label="PIN"
                  autoFocus
                  invalid={Boolean(error)}
                  containerClassName="justify-center"
                >
                  <InputOTPGroup className="gap-2">
                    {Array.from({ length: pinLength }, (_, i) => (
                      <PinSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              ) : (
                <PasswordInput
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  aria-label="Password"
                  placeholder="Password"
                  autoFocus
                  disabled={disabled}
                  aria-invalid={error ? true : undefined}
                  size="lg"
                />
              )}
              {(recovery || mode === "password") && (
                <Button type="submit" size="lg" fullWidth loading={busy} disabled={locked || !value}>
                  {recovery ? "Unlock with recovery key" : "Unlock"}
                </Button>
              )}
            </form>
          )}

          <div role="alert" aria-live="assertive" className="min-h-5 text-sm">
            {locked ? (
              <span className="text-destructive">
                Too many attempts. Try again in{" "}
                <span aria-hidden="true" className="tabular-nums">
                  {formatWait(waitSeconds)}
                </span>
                <span className="sr-only">{lockNotice}</span>
              </span>
            ) : error ? (
              <span className="text-destructive">{error}</span>
            ) : null}
          </div>

          {onPasskey && !recovery && (
            <div className="flex w-full flex-col items-center gap-3">
              {mode !== "passkey" && (
                <div className="flex w-full items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              <Button
                variant={mode === "passkey" ? "primary" : "secondary"}
                size="lg"
                fullWidth
                leadingIcon={<RiFingerprintLine aria-hidden />}
                onClick={passkey}
                disabled={disabled}
              >
                {passkeyLabel}
              </Button>
            </div>
          )}

          {onRecover && (
            <Button
              variant="link"
              size="sm"
              leadingIcon={recovery ? undefined : <RiKey2Line aria-hidden />}
              onClick={() => {
                setRecovery((r) => !r);
                setValue("");
                setError(null);
              }}
            >
              {recovery ? (mode === "pin" ? "Use PIN instead" : mode === "password" ? "Use password instead" : "Back") : "Use recovery key"}
            </Button>
          )}

          {footer}
        </div>
      </div>
    );
  }
);
LockScreen.displayName = "LockScreen";
