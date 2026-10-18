/** Small, defensive date helpers. Never throw on bad input. */

export type DateInput = Date | number | string | null | undefined;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a `Date` instance holding a real (finite) time. */
export function isValidDate(d: unknown): d is Date {
  return d instanceof Date && Number.isFinite(d.getTime());
}

/**
 * Coerces a value into a valid `Date`, or `undefined` when it can't be parsed.
 * Plain `YYYY-MM-DD` strings are read as LOCAL calendar dates (the platform parses them as UTC midnight,
 * which lands on the previous day west of UTC).
 */
export function toValidDate(v: DateInput): Date | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (v instanceof Date) return isValidDate(v) ? v : undefined;
  if (typeof v === "string") {
    const m = DATE_ONLY.exec(v.trim());
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const day = Number(m[3]);
      const d = new Date(2000, mo, day);
      d.setFullYear(y);
      // Reject overflow such as 2024-02-31.
      if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return undefined;
      return d;
    }
  }
  const d = new Date(v);
  return isValidDate(d) ? d : undefined;
}

/** `toISOString()` that returns `undefined` instead of throwing a RangeError. */
export function safeISO(v: DateInput): string | undefined {
  const d = toValidDate(v);
  if (!d) return undefined;
  try {
    return d.toISOString();
  } catch {
    return undefined;
  }
}
