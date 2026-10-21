/*
 * kunji client: small text helpers (ASCII folding, scope parsing, sub display, default callback).
 */

/**
 * Fold an app name to printable ASCII (dashes, smart quotes, then drop the rest).
 * rp.js base64s the name with `btoa`, which throws above U+00FF, so every kunji surface stays ASCII.
 */
export function kunjiAsciiFold(name: string | undefined, fallback = "Sign in"): string {
  const folded = String(name ?? "")
    .replace(/[‐-―]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
  return folded || fallback;
}

/** Normalize a scope prop into a clean token array. */
export function parseKunjiScope(scope: string | string[] | undefined): string[] {
  const list = Array.isArray(scope) ? scope : String(scope ?? "").split(/[\s,]+/);
  return list.map((s) => s.trim()).filter(Boolean);
}

/** Shorten a `sub` for display: `ab12…cd34`. */
export function formatKunjiSub(sub: string, head = 4, tail = 4) {
  return sub.length <= head + tail + 1 ? sub : `${sub.slice(0, head)}…${sub.slice(-tail)}`;
}

/** Default callback the wallet derives when the QR omits `callbackUrl` (§5.1). */
export function defaultKunjiCallbackUrl(audience: string) {
  return `https://${audience}/kunji/callback`;
}
