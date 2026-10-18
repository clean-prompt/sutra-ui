/* Shared input validators. Pure; never throw on bad input. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCHEME = /^([a-z][a-z\d+.-]*):/i;
const HAS_AUTHORITY = /^[a-z][a-z\d+.-]*:\/\//i;
// Browsers ignore ASCII tab/newline anywhere and leading C0/space, so "java\tscript:" is still javascript:.
const IGNORED = /[\u0000-\u001F\u007F\s]+/g;

function parseUrl(s: string): URL | undefined {
  try {
    return new URL(s);
  } catch {
    return undefined;
  }
}

/** Loose email check (`a@b.c`, surrounding whitespace trimmed). */
export function isEmail(s: string | null | undefined): boolean {
  return typeof s === "string" && EMAIL.test(s.trim());
}

export interface IsHttpUrlOptions {
  /** Accept plain `http:`. Default true; `false` requires `https:`. */
  allowHttp?: boolean;
}

/** True for an absolute http(s) URL with a host (rejects `javascript:`, `data:`, bare domains…). */
export function isHttpUrl(s: string | null | undefined, options: IsHttpUrlOptions = {}): boolean {
  if (typeof s !== "string") return false;
  const url = parseUrl(s.trim());
  if (!url || !url.hostname) return false;
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && options.allowHttp !== false;
}

export interface HostnameOfOptions {
  /** Keep a non-default port (`"localhost:3000"`). Default false. */
  port?: boolean;
  /** Strip a leading `www.`. Default true. */
  stripWww?: boolean;
}

/** Display host of a URL or bare domain (`"www.github.com/x"`, `"github.com/org/repo"` → `"github.com"`; `""` if none). */
export function hostnameOf(url: string | null | undefined, options: HostnameOfOptions = {}): string {
  if (typeof url !== "string") return "";
  const raw = url.trim();
  if (!raw) return "";
  const scheme = /^[a-z][a-z\d+.-]*:(.*)$/is.exec(raw);
  // "mailto:x", "javascript:x" have no host; "localhost:3000/x" is a host with a port.
  if (scheme && !HAS_AUTHORITY.test(raw) && !/^\d+(?:[/?#]|$)/.test(scheme[1]!)) return "";
  const withScheme = HAS_AUTHORITY.test(raw) ? raw : raw.startsWith("//") ? `https:${raw}` : `https://${raw}`;
  const parsed = parseUrl(withScheme);
  if (!parsed || !parsed.hostname) return "";
  let host = parsed.hostname.toLowerCase();
  if (options.stripWww !== false) host = host.replace(/^www\./, "");
  return options.port && parsed.port ? `${host}:${parsed.port}` : host;
}

const SAFE_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

/** True for http(s), mailto, tel or relative hrefs (`/x`, `#y`, `?q`, `./z`); false for `javascript:`, `data:` etc. */
export function isSafeHref(href: string | null | undefined): boolean {
  if (typeof href !== "string") return false;
  const s = href.replace(IGNORED, "");
  if (!s) return false;
  const m = SCHEME.exec(s);
  // "./a:b" and "a/b:c" are relative paths: a scheme can't contain "/" or start with ".".
  if (!m) return true;
  return SAFE_SCHEMES.has(m[1]!.toLowerCase());
}
