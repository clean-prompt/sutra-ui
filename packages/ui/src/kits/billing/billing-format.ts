/** Pure billing helpers: price formatting, yearly savings and run-out projection. */
import { formatCost } from "../../lib/format";
import { DAY_MS, isValidDate } from "../../lib/time";

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

function currencyDigits(currency: string, locale?: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/** Format an amount in minor units (cents) as currency. Whole amounts drop the decimals ("$20", "$19.99"). */
export function formatPrice(amountMinor: number, currency = "USD", locale = "en-US"): string {
  const digits = currencyDigits(currency, locale);
  const major = amountMinor / 10 ** digits;
  return formatCost(major, { currency, locale, maxFraction: digits, minFraction: Number.isInteger(major) ? 0 : digits, tiny: 0 });
}

/** Percent saved by paying `yearly` once instead of `monthly` × 12 (rounded, never negative). */
export function yearlySavings(monthly: number, yearly: number): number {
  if (!(monthly > 0) || !(yearly >= 0)) return 0;
  return Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100));
}

/** Date the balance reaches zero at `dailyBurn` per day, or null when nothing is being spent. */
export function projectRunOut(balance: number, dailyBurn: number, from: Date = new Date()): Date | null {
  if (!(dailyBurn > 0) || !Number.isFinite(balance) || !isValidDate(from)) return null;
  if (balance <= 0) return new Date(from.getTime());
  const out = new Date(from.getTime() + (balance / dailyBurn) * DAY_MS);
  return isValidDate(out) ? out : null;
}
