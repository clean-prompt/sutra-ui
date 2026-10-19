/** One cell of a formatted number: a digit that can roll, or a fixed piece of text (separator, sign, currency, unit). */
export interface NumberColumn {
  /**
   * Stable identity across values: integer digits count from the decimal point outward (`int-0` is the ones place),
   * fraction digits from the point (`frac-0`), separators by the digits to their right, other parts by type and
   * occurrence. 99 to 100 therefore keeps the two nines in their columns and adds `int-2`.
   */
  key: string;
  kind: "digit" | "static";
  text: string;
  /** 0 to 9 for a digit column. */
  digit?: number;
}

export interface NumberParts {
  /** The whole value formatted as plain text (what a screen reader should get). */
  text: string;
  columns: NumberColumn[];
  /** The ten digit glyphs of the locale's numbering system, in order 0 to 9. */
  glyphs: string[];
}

const glyphCache = new Map<string, string[]>();
const LATIN = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function localeKey(locale?: string | string[]): string {
  return Array.isArray(locale) ? locale.join(",") : (locale ?? "");
}

/** The digits 0 to 9 as the locale writes them (Latin, Arabic-Indic, Devanagari …). Falls back to Latin for a bad locale. */
export function numberDigitGlyphs(locale?: string | string[]): string[] {
  const key = localeKey(locale);
  const cached = glyphCache.get(key);
  if (cached) return cached;
  let glyphs = LATIN;
  try {
    const fmt = new Intl.NumberFormat(locale, { useGrouping: false });
    glyphs = LATIN.map((_, d) => fmt.format(d));
  } catch {
    glyphs = LATIN;
  }
  glyphCache.set(key, glyphs);
  return glyphs;
}

/**
 * Splits a number into columns for a rolling display, using `Intl.NumberFormat#formatToParts`. Never throws: an
 * unusable locale or option set falls back to the default format, and a value that is not finite becomes one static
 * column holding its text.
 */
export function splitNumberParts(value: number, options?: Intl.NumberFormatOptions, locale?: string | string[]): NumberParts {
  const glyphs = numberDigitGlyphs(locale);
  let parts: Intl.NumberFormatPart[];
  try {
    parts = new Intl.NumberFormat(locale, options).formatToParts(value);
  } catch {
    try {
      parts = new Intl.NumberFormat(undefined, options).formatToParts(value);
    } catch {
      parts = new Intl.NumberFormat().formatToParts(value);
    }
  }
  const text = parts.map((p) => p.value).join("");
  if (!Number.isFinite(value)) return { text, columns: [{ key: "text-0", kind: "static", text }], glyphs };

  // Integer digits to the right of the current position, so separators and digits are keyed from the point outward.
  let remaining = parts.reduce((n, p) => (p.type === "integer" ? n + Array.from(p.value).length : n), 0);
  let fraction = 0;
  const seen = new Map<string, number>();
  const columns: NumberColumn[] = [];
  for (const part of parts) {
    if (part.type === "integer" || part.type === "fraction") {
      for (const ch of Array.from(part.value)) {
        const key = part.type === "integer" ? `int-${--remaining}` : `frac-${fraction++}`;
        const digit = glyphs.indexOf(ch);
        columns.push(digit >= 0 ? { key, kind: "digit", text: ch, digit } : { key, kind: "static", text: ch });
      }
    } else if (part.type === "group") {
      columns.push({ key: `group-${remaining}`, kind: "static", text: part.value });
    } else {
      const n = seen.get(part.type) ?? 0;
      seen.set(part.type, n + 1);
      columns.push({ key: `${part.type}-${n}`, kind: "static", text: part.value });
    }
  }
  return { text, columns, glyphs };
}
