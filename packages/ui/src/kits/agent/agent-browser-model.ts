import { isSafeHref } from "../../lib/validate";

export type BrowserSecurity = "secure" | "insecure" | "local" | "unknown";
export type BrowserController = "agent" | "user";

/** Classify a URL for the address-bar security indicator (pure, never fetches). */
export function inferBrowserSecurity(url: string | undefined): BrowserSecurity {
  if (!url) return "unknown";
  const u = url.trim().toLowerCase();
  if (u.startsWith("file:") || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|\/|$)/.test(u)) return "local";
  if (u.startsWith("https:")) return "secure";
  if (u.startsWith("http:")) return "insecure";
  return "unknown";
}

/**
 * Turn address-bar input into a navigable URL string (adds https:// to bare hosts and `host:port`;
 * `""` for script/data URLs and for text with spaces, which isn't an address).
 */
export function normalizeBrowserInput(input: string): string {
  const v = input.trim();
  if (!v || /\s/.test(v)) return "";
  if (/^(localhost|127\.0\.0\.1)(:\d+)?([/?#]|$)/i.test(v)) return `http://${v}`;
  if (/^[a-z0-9.-]+:\d+([/?#]|$)/i.test(v)) return `https://${v}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return isSafeHref(v) || /^(file|about):/i.test(v) ? v : "";
  return `https://${v}`;
}
