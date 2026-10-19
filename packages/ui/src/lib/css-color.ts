/**
 * Resolve a colour that may be a CSS variable reference (`var(--chart-1, #615fff)`) to a concrete colour, for
 * places that cannot use `var()` (canvas `fillStyle`). Looks the variable up on `style` (a computed style) and
 * falls back to the `var()` fallback, resolving nested references. Anything else is returned unchanged.
 */
export function resolveCssColor(value: string, style: Pick<CSSStyleDeclaration, "getPropertyValue">, depth = 0): string {
  const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/.exec(value.trim());
  if (!m || depth > 4) return value;
  const found = style.getPropertyValue(m[1]!).trim();
  if (found) return resolveCssColor(found, style, depth + 1);
  return m[2] === undefined ? value : resolveCssColor(m[2].trim(), style, depth + 1);
}
