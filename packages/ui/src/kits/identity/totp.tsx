import * as React from "react";
import { cn } from "../../lib/cn";
import { base32Decode as decodeBase32 } from "../../lib/encoding";
import { pluralize } from "../../lib/format";
import { useNow } from "../../hooks/use-now";
import { CopyButton } from "../../primitives/copy-button";
import { Favicon } from "../../primitives/favicon";

/* ------------------------------------------------------------------ */
/* RFC 4648 base32 + RFC 6238 TOTP                                     */
/* ------------------------------------------------------------------ */

/** Decode an RFC 4648 base32 string (case-insensitive; spaces, dashes and `=` padding ignored). Throws on a bad character. */
export function base32Decode(input: string): Uint8Array {
  const bytes = decodeBase32(input);
  if (!bytes) throw new Error("Invalid base32 string");
  return bytes;
}

export type TOTPAlgorithm = "SHA1" | "SHA256" | "SHA512";

export interface GenerateTOTPOptions {
  /** Step in seconds. Default 30. */
  period?: number;
  /** Code length. Default 6. */
  digits?: number;
  /** HMAC hash. Default SHA1. */
  algorithm?: TOTPAlgorithm;
  /** Unix time in milliseconds. Default `Date.now()`. */
  timestamp?: number;
}

const subtleHash: Record<TOTPAlgorithm, string> = { SHA1: "SHA-1", SHA256: "SHA-256", SHA512: "SHA-512" };

function normalizeAlgorithm(value?: string): TOTPAlgorithm {
  const v = (value ?? "SHA1").toUpperCase().replace("-", "");
  return v === "SHA256" || v === "SHA512" ? v : "SHA1";
}

/** Generate an RFC 6238 TOTP code with Web Crypto HMAC. `secret` is base32 or raw key bytes. */
export async function generateTOTP(secret: string | Uint8Array, options: GenerateTOTPOptions = {}): Promise<string> {
  const { period = 30, digits = 6, timestamp = Date.now() } = options;
  const algorithm = normalizeAlgorithm(options.algorithm);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto (crypto.subtle) is not available");
  const keyBytes = typeof secret === "string" ? base32Decode(secret) : secret;
  const counter = Math.floor(timestamp / 1000 / period);
  const message = new ArrayBuffer(8);
  const view = new DataView(message);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const raw = new Uint8Array(keyBytes.length);
  raw.set(keyBytes);
  const key = await subtle.importKey("raw", raw, { name: "HMAC", hash: subtleHash[algorithm] }, false, ["sign"]);
  const sig = new Uint8Array(await subtle.sign("HMAC", key, message));
  const offset = sig[sig.length - 1] & 0x0f;
  const binary =
    ((sig[offset] & 0x7f) << 24) | ((sig[offset + 1] & 0xff) << 16) | ((sig[offset + 2] & 0xff) << 8) | (sig[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

/** Group a code for reading: "123456" → "123 456", "12345678" → "1234 5678". */
export function formatOtpCode(code: string, groupSize?: number) {
  const size = groupSize ?? (code.length % 3 === 0 ? 3 : 4);
  const groups: string[] = [];
  for (let i = 0; i < code.length; i += size) groups.push(code.slice(i, i + size));
  return groups.join(" ");
}

export interface OtpauthParams {
  type: "totp" | "hotp";
  /** Raw label (e.g. "GitHub:vyom@sutra.app"). */
  label: string;
  issuer?: string;
  account: string;
  /** Base32 secret, uppercased without padding. */
  secret: string;
  algorithm: TOTPAlgorithm;
  digits: number;
  period: number;
  /** HOTP counter. */
  counter?: number;
}

/** Parse an `otpauth://totp/Issuer:account?secret=…` URI. Returns null when it isn't valid. */
export function parseOtpauthUri(uri: string): OtpauthParams | null {
  const match = /^otpauth:\/\/(totp|hotp)\/([^?]*)(?:\?(.*))?$/i.exec(uri.trim());
  if (!match) return null;
  const type = match[1].toLowerCase() as "totp" | "hotp";
  let label: string;
  try {
    label = decodeURIComponent(match[2]);
  } catch {
    return null;
  }
  const params = new URLSearchParams(match[3] ?? "");
  const secret = (params.get("secret") ?? "").toUpperCase().replace(/[\s=]/g, "");
  if (!secret) return null;
  if (!decodeBase32(secret)) return null;
  const colon = label.indexOf(":");
  const labelIssuer = colon >= 0 ? label.slice(0, colon).trim() : undefined;
  const account = (colon >= 0 ? label.slice(colon + 1) : label).trim();
  const digits = Number(params.get("digits") ?? 6);
  const period = Number(params.get("period") ?? 30);
  const counter = params.get("counter");
  return {
    type,
    label,
    issuer: params.get("issuer")?.trim() || labelIssuer || undefined,
    account,
    secret,
    algorithm: normalizeAlgorithm(params.get("algorithm") ?? undefined),
    digits: Number.isFinite(digits) && digits > 0 ? digits : 6,
    period: Number.isFinite(period) && period > 0 ? period : 30,
    counter: type === "hotp" && counter != null ? Number(counter) : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* TOTPCode                                                            */
/* ------------------------------------------------------------------ */

const codeSize = { sm: "text-lg", md: "text-2xl", lg: "text-display-xs" } as const;
const ringSize = { sm: 22, md: 28, lg: 34 } as const;

export interface TOTPCodeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onCopy"> {
  /** Base32 secret; codes are generated in the browser. */
  secret?: string;
  /** Server-provided current code (overrides `secret`). */
  code?: string;
  /** Server-provided next code, shown near the end of the period. */
  nextCode?: string;
  /** Resolve a code for a timestamp (ms), e.g. from a server. */
  getCode?: (timestamp: number) => string | Promise<string>;
  period?: number;
  digits?: number;
  algorithm?: TOTPAlgorithm;
  countdown?: "circular" | "linear" | "none";
  size?: "sm" | "md" | "lg";
  /** Show the copy button. Default true. */
  copyable?: boolean;
  onCopy?: (code: string) => void;
  /** Preview the next code when fewer than `nextThreshold` seconds remain. Default true. */
  showNext?: boolean;
  /** Seconds left at which the countdown turns red and the next code appears. Default 5. */
  nextThreshold?: number;
  /** Accessible name prefix, e.g. "GitHub". */
  label?: string;
  /** Called when the period rolls over. */
  onRollover?: (counter: number) => void;
}

/** Live one-time code with grouped digits, a countdown, copy and a next-code preview. */
export const TOTPCode = React.forwardRef<HTMLDivElement, TOTPCodeProps>(
  (
    {
      secret,
      code: codeProp,
      nextCode: nextCodeProp,
      getCode,
      period = 30,
      digits = 6,
      algorithm = "SHA1",
      countdown = "circular",
      size = "md",
      copyable = true,
      onCopy,
      showNext = true,
      nextThreshold = 5,
      label,
      onRollover,
      className,
      ...props
    },
    ref
  ) => {
    const now = useNow({ interval: 500 });
    const counter = Math.floor(now / 1000 / period);
    const elapsed = (now / 1000) % period;
    const remaining = Math.max(1, Math.ceil(period - elapsed));
    const nearEnd = remaining <= nextThreshold;
    const [codes, setCodes] = React.useState<{ counter: number; current?: string; next?: string }>({ counter: -1 });

    const getCodeRef = React.useRef(getCode);
    getCodeRef.current = getCode;
    const rolloverRef = React.useRef(onRollover);
    rolloverRef.current = onRollover;

    const prevCounter = React.useRef(counter);
    React.useEffect(() => {
      if (prevCounter.current !== counter) {
        prevCounter.current = counter;
        rolloverRef.current?.(counter);
      }
    }, [counter]);

    const resolve = React.useCallback(
      async (ts: number): Promise<string | undefined> => {
        if (getCodeRef.current) return getCodeRef.current(ts);
        if (secret) return generateTOTP(secret, { period, digits, algorithm, timestamp: ts });
        return undefined;
      },
      [secret, period, digits, algorithm]
    );

    React.useEffect(() => {
      if (codeProp !== undefined) return;
      let cancelled = false;
      const ts = counter * period * 1000;
      resolve(ts)
        .then((current) => {
          if (!cancelled) setCodes((prev) => ({ counter, current, next: prev.counter === counter ? prev.next : undefined }));
        })
        .catch(() => {
          if (!cancelled) setCodes({ counter, current: undefined });
        });
      return () => {
        cancelled = true;
      };
    }, [counter, period, resolve, codeProp]);

    const wantNext = showNext && nearEnd && codeProp === undefined;
    React.useEffect(() => {
      if (!wantNext) return;
      let cancelled = false;
      resolve((counter + 1) * period * 1000)
        .then((next) => {
          if (!cancelled) setCodes((prev) => (prev.counter === counter ? { ...prev, next } : prev));
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, [wantNext, counter, period, resolve]);

    const current = codeProp ?? (codes.counter === counter ? codes.current : undefined);
    const next = codeProp !== undefined ? nextCodeProp : codes.counter === counter ? codes.next : undefined;
    const groupSize = digits % 3 === 0 ? 3 : 4;
    const placeholder = formatOtpCode("•".repeat(digits), groupSize);
    const display = current ? formatOtpCode(current, groupSize) : placeholder;

    const timerLabel = `Code refreshes in ${remaining} ${pluralize(remaining, "second")}`;
    const pct = (remaining / period) * 100;
    const tone = nearEnd ? "text-destructive" : "text-primary";

    const ring = countdown === "circular" && (
      <span
        role="timer"
        aria-live="off"
        aria-label={timerLabel}
        data-slot="totp-countdown"
        data-remaining={remaining}
        className={cn("relative inline-flex shrink-0 items-center justify-center", tone)}
        style={{ width: ringSize[size], height: ringSize[size] }}
      >
        <svg viewBox="0 0 36 36" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-muted" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            strokeWidth="3"
            stroke="currentColor"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${pct} 100`}
            className="transition-[stroke-dasharray] duration-500 ease-linear motion-reduce:transition-none"
          />
        </svg>
        <span aria-hidden className="relative text-2xs font-semibold tabular-nums">
          {remaining}
        </span>
      </span>
    );

    return (
      <div
        ref={ref}
        data-slot="totp-code"
        data-near-end={nearEnd || undefined}
        className={cn("flex min-w-0 flex-col gap-1.5", className)}
        {...props}
      >
        <div className="flex items-center gap-3">
          <span className="sr-only">
            {current ? `${label ? `${label} code` : "Code"} ${current.split("").join(" ")}` : "Loading code"}
          </span>
          <span
            data-slot="totp-value"
            aria-hidden
            className={cn(
              "font-mono font-semibold tabular-nums tracking-wider transition-colors",
              codeSize[size],
              current ? "text-foreground" : "text-muted-foreground",
              nearEnd && current && "text-destructive"
            )}
          >
            {display}
          </span>
          {ring}
          {copyable && (
            <CopyButton
              value={current ?? ""}
              size={size === "sm" ? "sm" : "md"}
              label={label ? `Copy ${label} code` : "Copy code"}
              disabled={!current}
              onCopied={onCopy}
              className="ml-auto"
            />
          )}
        </div>
        {countdown === "linear" && (
          <span
            role="timer"
            aria-live="off"
            aria-label={timerLabel}
            data-slot="totp-countdown"
            data-remaining={remaining}
            className="relative block h-1 w-full overflow-hidden rounded-full bg-muted"
          >
            <span
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-linear motion-reduce:transition-none",
                nearEnd ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${pct}%` }}
            />
          </span>
        )}
        {showNext && nearEnd && next && (
          <span data-slot="totp-next" className="text-xs text-muted-foreground animate-in fade-in-0">
            Next: <span className="font-mono tabular-nums text-foreground">{formatOtpCode(next, groupSize)}</span>
          </span>
        )}
      </div>
    );
  }
);
TOTPCode.displayName = "TOTPCode";

/* ------------------------------------------------------------------ */
/* TOTPCard                                                            */
/* ------------------------------------------------------------------ */

export interface TOTPCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onCopy">,
    Pick<
      TOTPCodeProps,
      | "secret"
      | "code"
      | "nextCode"
      | "getCode"
      | "period"
      | "digits"
      | "algorithm"
      | "countdown"
      | "copyable"
      | "onCopy"
      | "showNext"
      | "nextThreshold"
      | "onRollover"
    > {
  issuer: string;
  account?: string;
  /** Domain for the favicon (defaults to the issuer name, which renders a monogram). */
  domain?: string;
  /** Explicit icon URL for the issuer. */
  iconSrc?: string;
  /** Custom icon node; replaces the favicon. */
  icon?: React.ReactNode;
  /** Slot for an overflow menu (e.g. a DropdownMenu trigger). */
  menu?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

/** Authenticator entry: issuer icon, account label, live code and a menu slot. */
export const TOTPCard = React.forwardRef<HTMLDivElement, TOTPCardProps>(
  (
    {
      issuer,
      account,
      domain,
      iconSrc,
      icon,
      menu,
      size = "md",
      secret,
      code,
      nextCode,
      getCode,
      period,
      digits,
      algorithm,
      countdown,
      copyable,
      onCopy,
      showNext,
      nextThreshold,
      onRollover,
      className,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      data-slot="totp-card"
      className={cn("flex flex-col gap-3 rounded-box border border-border bg-card p-4 text-card-foreground shadow-xs", className)}
      {...props}
    >
      <div className="flex items-center gap-3">
        {icon ?? <Favicon domain={domain ?? issuer} src={iconSrc} shape="square" className="size-9 rounded-md" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{issuer}</p>
          {account && <p className="truncate text-xs text-muted-foreground">{account}</p>}
        </div>
        {menu}
      </div>
      <TOTPCode
        label={issuer}
        size={size}
        secret={secret}
        code={code}
        nextCode={nextCode}
        getCode={getCode}
        period={period}
        digits={digits}
        algorithm={algorithm}
        countdown={countdown}
        copyable={copyable}
        onCopy={onCopy}
        showNext={showNext}
        nextThreshold={nextThreshold}
        onRollover={onRollover}
      />
    </div>
  )
);
TOTPCard.displayName = "TOTPCard";
