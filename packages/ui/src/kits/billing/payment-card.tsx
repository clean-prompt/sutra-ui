import * as React from "react";
import { RiBankCardLine, RiEyeLine, RiEyeOffLine, RiLoopLeftLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useIsoLayoutEffect } from "../../hooks/use-iso-layout-effect";
import { Input } from "../../primitives/input";

/* ------------------------------------------------------------------ */
/* Brand detection, Luhn, formatting                                   */
/* ------------------------------------------------------------------ */

export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "jcb" | "unionpay" | "rupay" | "unknown";

export interface CardBrandInfo {
  label: string;
  /** Valid card number lengths. */
  lengths: number[];
  /** Positions where a space is inserted. */
  gaps: number[];
  cvcLength: number;
  /** Default card gradient. */
  gradient: string;
}

const gaps16 = [4, 8, 12, 16];

/** Metadata per brand. */
export const cardBrands: Record<CardBrand, CardBrandInfo> = {
  visa: { label: "Visa", lengths: [13, 16, 19], gaps: gaps16, cvcLength: 3, gradient: "linear-gradient(135deg, #1e40af, #0f172a)" },
  mastercard: { label: "Mastercard", lengths: [16], gaps: gaps16, cvcLength: 3, gradient: "linear-gradient(135deg, #44403c, #0c0a09)" },
  amex: { label: "American Express", lengths: [15], gaps: [4, 10], cvcLength: 4, gradient: "linear-gradient(135deg, #0e7490, #083344)" },
  discover: { label: "Discover", lengths: [16, 17, 18, 19], gaps: gaps16, cvcLength: 3, gradient: "linear-gradient(135deg, #ea580c, #431407)" },
  jcb: { label: "JCB", lengths: [16, 17, 18, 19], gaps: gaps16, cvcLength: 3, gradient: "linear-gradient(135deg, #15803d, #052e16)" },
  unionpay: { label: "UnionPay", lengths: [16, 17, 18, 19], gaps: gaps16, cvcLength: 3, gradient: "linear-gradient(135deg, #b91c1c, #172554)" },
  rupay: { label: "RuPay", lengths: [16], gaps: gaps16, cvcLength: 3, gradient: "linear-gradient(135deg, #0f766e, #1e1b4b)" },
  unknown: { label: "Card", lengths: [16, 19], gaps: gaps16, cvcLength: 3, gradient: "linear-gradient(135deg, #475569, #0f172a)" },
};

const digitsOf = (v: string) => v.replace(/\D/g, "");

function inRange(d: string, len: number, lo: number, hi: number) {
  if (d.length < len) return false;
  const n = Number(d.slice(0, len));
  return n >= lo && n <= hi;
}

/** Detect the card network from the number's prefix (IIN ranges). */
export function detectCardBrand(number: string): CardBrand {
  const d = digitsOf(number);
  if (!d) return "unknown";
  if (/^3[47]/.test(d)) return "amex";
  if (
    inRange(d, 6, 508500, 508999) ||
    inRange(d, 6, 606985, 607984) ||
    inRange(d, 6, 608001, 608500) ||
    inRange(d, 6, 652150, 653149) ||
    inRange(d, 6, 817200, 820199)
  )
    return "rupay";
  if (/^4/.test(d)) return "visa";
  if (/^5[1-5]/.test(d) || inRange(d, 4, 2221, 2720)) return "mastercard";
  if (/^6011/.test(d) || /^64[4-9]/.test(d) || /^65/.test(d) || inRange(d, 6, 622126, 622925)) return "discover";
  if (/^62/.test(d)) return "unionpay";
  if (inRange(d, 4, 3528, 3589)) return "jcb";
  return "unknown";
}

/** Luhn (mod 10) checksum. */
export function luhnCheck(number: string) {
  const d = digitsOf(number);
  if (d.length < 2) return false;
  let sum = 0;
  let double = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Group digits by brand: Amex 4-6-5, others 4-4-4-4(-3). Extra digits are dropped. */
export function formatCardNumber(number: string, brand: CardBrand = detectCardBrand(number)) {
  const info = cardBrands[brand];
  const d = digitsOf(number).slice(0, Math.max(...info.lengths));
  let out = "";
  for (let i = 0; i < d.length; i++) {
    if (i > 0 && info.gaps.includes(i)) out += " ";
    out += d[i];
  }
  return out;
}

export interface CardNumberValidation {
  brand: CardBrand;
  /** Length is valid for the brand. */
  complete: boolean;
  /** Complete and passes Luhn. */
  valid: boolean;
}

/** Diners Club IIN ranges (300–305, 3095, 36, 38–39): no brand of their own, but 14-digit numbers are valid. */
const DINERS = /^3(?:0[0-5]|095|[689])/;

/** Brand + length + Luhn check. */
export function validateCardNumber(number: string): CardNumberValidation {
  const d = digitsOf(number);
  const brand = detectCardBrand(d);
  const lengths = brand === "unknown" && DINERS.test(d) ? [14, 16, 19] : cardBrands[brand].lengths;
  const complete = lengths.includes(d.length);
  return { brand, complete, valid: complete && luhnCheck(d) };
}

/* ------------------------------------------------------------------ */
/* CardBrandMark                                                       */
/* ------------------------------------------------------------------ */

export interface CardBrandMarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  brand: CardBrand;
}

/** Plain typographic brand mark (no logos). */
export const CardBrandMark = React.forwardRef<HTMLSpanElement, CardBrandMarkProps>(({ brand, className, ...props }, ref) => {
  const label = cardBrands[brand].label;
  const style: Record<CardBrand, string> = {
    visa: "italic font-extrabold tracking-tight text-[1.15em]",
    mastercard: "font-semibold lowercase tracking-tight",
    amex: "rounded-[3px] border border-current px-1 text-[0.8em] font-bold tracking-widest",
    discover: "font-bold uppercase tracking-[0.12em] text-[0.85em]",
    jcb: "font-black tracking-tight",
    unionpay: "italic font-bold tracking-tight",
    rupay: "italic font-extrabold tracking-tight",
    unknown: "",
  };
  const text: Record<CardBrand, string> = {
    visa: "VISA",
    mastercard: "mastercard",
    amex: "AMEX",
    discover: "Discover",
    jcb: "JCB",
    unionpay: "UnionPay",
    rupay: "RuPay",
    unknown: "",
  };
  return (
    <span
      ref={ref}
      role="img"
      aria-label={label}
      data-slot="card-brand-mark"
      data-brand={brand}
      className={cn("inline-flex select-none items-center leading-none", style[brand], className)}
      {...props}
    >
      {brand === "unknown" ? <RiBankCardLine aria-hidden className="size-[1.25em]" /> : <span aria-hidden>{text[brand]}</span>}
    </span>
  );
});
CardBrandMark.displayName = "CardBrandMark";

/* ------------------------------------------------------------------ */
/* PaymentCard                                                         */
/* ------------------------------------------------------------------ */

/**
 * Card faces are laid out at their design width and shrink with their container: every size below is a multiple of
 * `--pc-u` (1px at the design width, less when the card is narrower), so a card never overflows a phone-width column.
 */
const cardSize = {
  sm: { width: "w-64", unit: "min(1px,0.390625cqw)", box: "p-[calc(16*var(--pc-u))] gap-[calc(8*var(--pc-u))]", number: "text-[length:calc(16*var(--pc-u))]", meta: "text-[length:calc(11*var(--pc-u))]", brand: "text-[length:calc(14*var(--pc-u))]" },
  md: { width: "w-80", unit: "min(1px,0.3125cqw)", box: "p-[calc(20*var(--pc-u))] gap-[calc(12*var(--pc-u))]", number: "text-[length:calc(18*var(--pc-u))]", meta: "text-[length:calc(12*var(--pc-u))]", brand: "text-[length:calc(16*var(--pc-u))]" },
  lg: { width: "w-96", unit: "min(1px,0.260417cqw)", box: "p-[calc(24*var(--pc-u))] gap-[calc(16*var(--pc-u))]", number: "text-[length:calc(20*var(--pc-u))]", meta: "text-[length:calc(12*var(--pc-u))]", brand: "text-[length:calc(18*var(--pc-u))]" },
} as const;

export interface PaymentCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Full number, or just the last 4 digits. */
  number: string;
  holder?: string;
  /** "MM/YY". */
  expiry?: string;
  cvv?: string;
  /** Overrides detection. */
  brand?: CardBrand;
  /** Issuer / bank name or card nickname shown top-left. */
  issuer?: React.ReactNode;
  /** Base color for a custom gradient. */
  color?: string;
  /** Full CSS background override. */
  background?: string;
  size?: "sm" | "md" | "lg";
  /** Allow revealing the full number. Default true when the full number is known. */
  revealable?: boolean;
  revealed?: boolean;
  defaultRevealed?: boolean;
  onRevealedChange?: (revealed: boolean) => void;
  /** Allow flipping to the back (default true when `cvv` is set). */
  flippable?: boolean;
  flipped?: boolean;
  defaultFlipped?: boolean;
  onFlippedChange?: (flipped: boolean) => void;
}

/** Card visual with brand detection, masked/revealable number, and a flip to the CVV side. */
export const PaymentCard = React.forwardRef<HTMLDivElement, PaymentCardProps>(
  (
    {
      number,
      holder,
      expiry,
      cvv,
      brand: brandProp,
      issuer,
      color,
      background,
      size = "md",
      revealable: revealableProp,
      revealed: revealedProp,
      defaultRevealed = false,
      onRevealedChange,
      flippable: flippableProp,
      flipped: flippedProp,
      defaultFlipped = false,
      onFlippedChange,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const digits = digitsOf(number);
    const partial = digits.length <= 4;
    const brand = brandProp ?? (partial ? "unknown" : detectCardBrand(digits));
    const info = cardBrands[brand];
    const revealable = (revealableProp ?? true) && !partial;
    const flippable = flippableProp ?? !!cvv;
    const [revealed, setRevealed] = useControllableState({ value: revealedProp, defaultValue: defaultRevealed, onChange: onRevealedChange });
    const [flipped, setFlipped] = useControllableState({ value: flippedProp, defaultValue: defaultFlipped, onChange: onFlippedChange });
    const [cvvShown, setCvvShown] = React.useState(false);
    React.useEffect(() => {
      if (!flipped) setCvvShown(false);
    }, [flipped]);
    const s = cardSize[size];
    const last4 = digits.slice(-4);

    const shownNumber = (() => {
      const mask = (formatted: string, keep: number) => {
        const total = digitsOf(formatted).length;
        let seen = 0;
        return formatted.replace(/\d/g, (ch) => (++seen > total - keep ? ch : "•"));
      };
      if (partial) return mask(formatCardNumber("0".repeat(Math.max(0, info.lengths[0] - last4.length)) + last4, brand), last4.length);
      const formatted = formatCardNumber(digits, brand);
      return revealed && revealable ? formatted : mask(formatted, 4);
    })();

    const bg = background ?? (color ? `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 45%, black))` : info.gradient);
    const iconBtn = cn(
      "inline-flex size-7 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 [&_svg]:size-4",
      focusRing,
      "focus-visible:ring-white/60"
    );
    const face = cn("absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl text-white shadow-xl", s.box);

    return (
      <div
        ref={ref}
        data-slot="payment-card"
        data-brand={brand}
        data-flipped={flipped || undefined}
        className={cn("@container relative aspect-[1.586] max-w-full shrink-0", s.width, className)}
        style={{ perspective: 1200, "--pc-u": s.unit, ...style } as React.CSSProperties}
        {...props}
      >
        <div
          className="relative size-full transition-transform duration-500 ease-out-quart motion-reduce:transition-none"
          style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : undefined }}
        >
          {/* Front */}
          <div
            className={face}
            style={{ background: bg, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            aria-hidden={flipped || undefined}
            inert={flipped || undefined}
          >
            <span aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-60 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-2">
              <span className={cn("truncate font-medium text-white/85", s.meta)}>{issuer}</span>
              <CardBrandMark brand={brand} className={s.brand} />
            </div>
            <div className="relative flex items-center gap-[calc(12*var(--pc-u))]">
              <span aria-hidden className="h-[calc(28*var(--pc-u))] w-[calc(36*var(--pc-u))] shrink-0 rounded-md bg-gradient-to-br from-amber-200 to-amber-500 opacity-90 shadow-inner" />
              <span className="sr-only">
                {revealed && revealable ? `Card number ${digits}` : `Card ending in ${last4}`}
              </span>
              <span aria-hidden data-slot="payment-card-number" className={cn("font-mono font-medium tabular-nums tracking-[0.08em]", s.number)}>
                {shownNumber}
              </span>
            </div>
            <div className="relative flex items-end justify-between gap-3">
              <div className={cn("flex min-w-0 gap-[calc(20*var(--pc-u))]", s.meta)}>
                {holder && (
                  <span className="grid min-w-0">
                    <span className="text-[0.85em] uppercase tracking-wider text-white/60">Card holder</span>
                    <span className="truncate font-medium uppercase tracking-wide">{holder}</span>
                  </span>
                )}
                {expiry && (
                  <span className="grid">
                    <span className="text-[0.85em] uppercase tracking-wider text-white/60">Expires</span>
                    <span className="font-mono font-medium">{expiry}</span>
                  </span>
                )}
              </div>
              <div className="flex shrink-0 gap-1.5">
                {revealable && (
                  <button
                    type="button"
                    className={iconBtn}
                    aria-label={revealed ? "Hide card number" : "Show card number"}
                    aria-pressed={revealed}
                    onClick={() => setRevealed(!revealed)}
                  >
                    {revealed ? <RiEyeOffLine aria-hidden /> : <RiEyeLine aria-hidden />}
                  </button>
                )}
                {flippable && (
                  <button type="button" className={iconBtn} aria-label="Show card back" onClick={() => setFlipped(true)}>
                    <RiLoopLeftLine aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Back */}
          {flippable && (
            <div
              className={cn(face, "px-0")}
              style={{ background: bg, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              aria-hidden={!flipped || undefined}
              inert={!flipped || undefined}
            >
              <span aria-hidden className="mt-1 block h-10 w-full bg-black/70" />
              <div className="flex items-center gap-2 px-[inherit]" style={{ paddingInline: "1.25rem" }}>
                <span aria-hidden className="h-8 flex-1 rounded-sm bg-[repeating-linear-gradient(45deg,#f5f5f4_0_6px,#e7e5e4_6px_12px)]" />
                <span className="flex h-8 min-w-14 items-center justify-center rounded-sm bg-white px-2 font-mono text-sm font-semibold italic tracking-widest text-neutral-900">
                  <span className="sr-only">Security code </span>
                  <span data-slot="payment-card-cvv">{cvvShown ? cvv : "•".repeat(cvv?.length ?? info.cvcLength)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2" style={{ paddingInline: "1.25rem" }}>
                <CardBrandMark brand={brand} className={s.brand} />
                <div className="flex gap-1.5">
                  {cvv && (
                    <button
                      type="button"
                      className={iconBtn}
                      aria-label={cvvShown ? "Hide security code" : "Show security code"}
                      aria-pressed={cvvShown}
                      onClick={() => setCvvShown((v) => !v)}
                    >
                      {cvvShown ? <RiEyeOffLine aria-hidden /> : <RiEyeLine aria-hidden />}
                    </button>
                  )}
                  <button type="button" className={iconBtn} aria-label="Show card front" onClick={() => setFlipped(false)}>
                    <RiLoopLeftLine aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);
PaymentCard.displayName = "PaymentCard";

/* ------------------------------------------------------------------ */
/* PaymentCardInput                                                    */
/* ------------------------------------------------------------------ */

export interface PaymentCardValue {
  /** Digits only. */
  number: string;
  /** "MM/YY". */
  expiry: string;
  /** Digits only. */
  cvc: string;
}

export interface PaymentCardInputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  value?: PaymentCardValue;
  defaultValue?: PaymentCardValue;
  onValueChange?: (value: PaymentCardValue, meta: { brand: CardBrand; valid: boolean }) => void;
  /** Called when every field is complete and valid. */
  onComplete?: (value: PaymentCardValue, brand: CardBrand) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  /** Reference date for expiry validation. */
  now?: Date;
  labels?: { number?: string; expiry?: string; cvc?: string };
}

function caretAfterDigits(formatted: string, digitCount: number) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]) && ++seen === digitCount) return i + 1;
  }
  return formatted.length;
}

function formatExpiry(digits: string) {
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
}

/** Validate "MM/YY" against `now`. */
export function validateCardExpiry(expiry: string, now: Date = new Date()): { complete: boolean; valid: boolean; error?: string } {
  const d = digitsOf(expiry);
  if (d.length < 4) return { complete: false, valid: false };
  const month = Number(d.slice(0, 2));
  const year = 2000 + Number(d.slice(2, 4));
  if (month < 1 || month > 12) return { complete: true, valid: false, error: "Invalid month" };
  const endOfMonth = new Date(year, month, 1).getTime();
  if (endOfMonth <= now.getTime()) return { complete: true, valid: false, error: "Card has expired" };
  return { complete: true, valid: true };
}

const emptyCard: PaymentCardValue = { number: "", expiry: "", cvc: "" };

/** Card number / expiry / CVC fields with auto-formatting, brand mark, validation and auto-advance. */
export const PaymentCardInput = React.forwardRef<HTMLDivElement, PaymentCardInputProps>(
  (
    { value: valueProp, defaultValue = emptyCard, onValueChange, onComplete, size = "md", disabled, now, labels = {}, className, ...props },
    ref
  ) => {
    const [value, setValueRaw] = useControllableState<PaymentCardValue>({ value: valueProp, defaultValue });
    const id = React.useId();
    const numberRef = React.useRef<HTMLInputElement>(null);
    const expiryRef = React.useRef<HTMLInputElement>(null);
    const cvcRef = React.useRef<HTMLInputElement>(null);
    const caret = React.useRef<{ el: HTMLInputElement; pos: number } | null>(null);

    const num = validateCardNumber(value.number);
    const exp = validateCardExpiry(value.expiry, now);
    const cvcLen = cardBrands[num.brand].cvcLength;
    const cvcValid = value.cvc.length === cvcLen;
    const allValid = num.valid && exp.valid && cvcValid;

    const update = (patch: Partial<PaymentCardValue>) => {
      const next = { ...value, ...patch };
      setValueRaw(next);
      const n = validateCardNumber(next.number);
      const valid = n.valid && validateCardExpiry(next.expiry, now).valid && next.cvc.length === cardBrands[n.brand].cvcLength;
      onValueChange?.(next, { brand: n.brand, valid });
      if (valid && !allValid) onComplete?.(next, n.brand);
    };

    useIsoLayoutEffect(() => {
      if (caret.current && document.activeElement === caret.current.el) {
        caret.current.el.setSelectionRange(caret.current.pos, caret.current.pos);
      }
      caret.current = null;
    });

    const numberError = num.complete && !num.valid ? "Card number is invalid" : undefined;
    const expiryError = exp.error;
    const errors = [numberError, expiryError].filter(Boolean);

    return (
      <div ref={ref} data-slot="payment-card-input" className={cn("grid gap-3", className)} {...props}>
        <div className="grid gap-1.5">
          <label htmlFor={`${id}-number`} className="text-sm font-medium text-foreground">
            {labels.number ?? "Card number"}
          </label>
          <Input
            ref={numberRef}
            id={`${id}-number`}
            size={size}
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 1234 1234 1234"
            disabled={disabled}
            value={formatCardNumber(value.number, num.brand)}
            invalid={!!numberError}
            aria-describedby={numberError ? `${id}-error` : undefined}
            className="font-mono tabular-nums"
            trailingIcon={<CardBrandMark brand={num.brand} className="text-xs text-muted-foreground" />}
            onChange={(e) => {
              const el = e.target;
              const before = digitsOf(el.value.slice(0, el.selectionStart ?? el.value.length)).length;
              const brand = detectCardBrand(el.value);
              const digits = digitsOf(el.value).slice(0, Math.max(...cardBrands[brand].lengths));
              caret.current = { el, pos: caretAfterDigits(formatCardNumber(digits, brand), Math.min(before, digits.length)) };
              update({ number: digits, cvc: value.cvc.slice(0, cardBrands[brand].cvcLength) });
              const v = validateCardNumber(digits);
              if (v.valid && digits.length >= (brand === "visa" ? 16 : Math.min(...cardBrands[brand].lengths))) expiryRef.current?.focus();
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <label htmlFor={`${id}-expiry`} className="text-sm font-medium text-foreground">
              {labels.expiry ?? "Expiry"}
            </label>
            <Input
              ref={expiryRef}
              id={`${id}-expiry`}
              size={size}
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              disabled={disabled}
              value={value.expiry}
              invalid={!!expiryError}
              aria-describedby={expiryError ? `${id}-error` : undefined}
              className="font-mono tabular-nums"
              onChange={(e) => {
                // A pasted or autofilled "12/2028" or "1/28" keeps its month and the year's last two digits.
                const full = /^\s*(\d{1,2})\s*[/.-]\s*(\d{4}|\d{2})\s*$/.exec(e.target.value);
                let d = full ? `${full[1]!.padStart(2, "0")}${full[2]!.slice(-2)}` : digitsOf(e.target.value).slice(0, 4);
                const prev = digitsOf(value.expiry);
                if (e.target.value.length < value.expiry.length && d === prev) d = d.slice(0, -1);
                if (d.length === 1 && Number(d) > 1) d = `0${d}`;
                const formatted = formatExpiry(d);
                update({ expiry: formatted });
                if (validateCardExpiry(formatted, now).valid) cvcRef.current?.focus();
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor={`${id}-cvc`} className="text-sm font-medium text-foreground">
              {labels.cvc ?? "CVC"}
            </label>
            <Input
              ref={cvcRef}
              id={`${id}-cvc`}
              size={size}
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder={"•".repeat(cvcLen)}
              disabled={disabled}
              value={value.cvc}
              className="font-mono tabular-nums"
              onChange={(e) => update({ cvc: digitsOf(e.target.value).slice(0, cvcLen) })}
            />
          </div>
        </div>
        {errors.length > 0 && (
          <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
            {errors.join(". ")}
          </p>
        )}
      </div>
    );
  }
);
PaymentCardInput.displayName = "PaymentCardInput";
