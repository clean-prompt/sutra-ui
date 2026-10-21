import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** Static scans over `src` used by `conventions.test.ts` (no parser: regular expressions plus a small JSX opening-tag reader). */

export const SRC = path.resolve(__dirname, "../../src");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

/** Source files as `[path relative to src, text without comments]`. Comments are blanked, so line numbers survive. */
export function sourceFiles(ext: RegExp = /\.tsx?$/): [string, string][] {
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  return walk(SRC)
    .filter((f) => ext.test(f))
    .sort()
    .map((f) => [path.relative(SRC, f).split(path.sep).join("/"), readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:"'`\\])\/\/.*$/gm, (m, p: string) => p + blank(m.slice(p.length)))] as [string, string]);
}

/** Raw colour literals: `#rrggbb`, `#rgb` in a value position, and `rgb(`, `hsl(`, `oklch(` … calls. */
export const COLOR_LITERAL =
  /(?<![\w&}\]()])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6})(?![\w-])|(?<=["'`\s:,])#[0-9a-fA-F]{3,4}(?=["'`\s,;)\]}])|(?<![\w-])(?:rgba?|hsla?|oklch|oklab|hwb|lab|lch)\(/g;

const PALETTES = "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone";
const COLOR_UTILS = "bg|text|border|ring|fill|stroke|from|to|via|divide|outline|shadow|decoration|accent|caret";
/** Tailwind's own palette classes (`bg-red-500`, `hover:text-zinc-700`) instead of Sutra's tokens. */
export const PALETTE_CLASS = new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*-?(?:${COLOR_UTILS})-(?:${PALETTES})-\\d{2,3}\\b`, "g");

/** `dark:` variants: the tokens carry dark mode. */
export const DARK_VARIANT = /(?<![\w-])dark:[^\s"'`]+/g;

/** `tone="brand"`, `tone={"warn"}` or `tone: "danger"` with one of the deprecated spellings from `lib/tone`. */
export const LEGACY_TONE = /(?<![\w-])tone(?:=\{?|:\s*)["'`](?:brand|default|muted|warn|danger|error|critical|failure)["'`]/g;

export const count = (text: string, re: RegExp) => text.match(re)?.length ?? 0;

/** Index of the `>` that closes the JSX opening tag starting at `start` (a `<`), skipping `{…}` and quoted attribute values. */
function openingTagEnd(s: string, start: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start + 1; i < s.length; i++) {
    const c = s[i]!;
    if (quote) {
      if (c === quote && s[i - 1] !== "\\") quote = null;
    } else if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0 && s[i - 1] !== "=") return i;
  }
  return -1;
}

const BUTTONS = /<(Button|IconButton|ToggleButton|button)(?![\w.-])/g;
const ICON_ONLY_BODY = /<(?:Ri\w+|svg|\w*Icon\w*)(?![\w.-])[^>]*\/>/g;

/** Icon-only buttons (an `icon*` size, or children that are only icons) with no accessible name a static scan can see: `file:line tag`. */
export function unlabelledIconButtons(file: string, s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(BUTTONS)) {
    const end = openingTagEnd(s, m.index!);
    if (end < 0) continue;
    const tag = s.slice(m.index!, end + 1);
    const selfClosing = tag.endsWith("/>");
    const size = /\bsize=(?:"([^"]*)"|\{([^}]*)\})/.exec(tag);
    const iconSize = /icon/.test(size?.[1] ?? size?.[2] ?? "");
    const closeAt = selfClosing ? -1 : s.indexOf(`</${m[1]}>`, end);
    const body = selfClosing ? "" : s.slice(end + 1, closeAt < 0 ? end + 1 : closeAt);
    const iconOnly = iconSize || (body.trim() !== "" && body.replace(ICON_ONLY_BODY, "").replace(/<\/?>/g, "").trim() === "");
    if (!iconOnly) continue;
    const named = /\baria-label(?:ledby)?=|\btitle=/.test(tag) || /aria-hidden(?![\w-])(?!=\{?false)/.test(tag) || /\{\.\.\.\w+\}/.test(tag);
    const childNamed = /sr-only|VisuallyHidden|\baria-label=|\btitle=/.test(body);
    if (!named && !childNamed) out.push(`${file}:${s.slice(0, m.index!).split("\n").length} <${m[1]}>`);
  }
  return out;
}

/** Attribute names of a JSX opening tag in source order (`"..."` marks the consumer's `{...props}` / `{...rest}`, `"{...other}"` any other spread). */
export function tagAttributes(tag: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = "";
  const flush = () => {
    const t = cur.trim();
    if (t) out.push(t.startsWith("{...") ? (/^\{\.\.\.(props|rest|restProps)\}$/.test(t) ? "..." : "{...other}") : (/^([\w:.-]+)/.exec(t)?.[1] ?? t));
    cur = "";
  };
  const first = tag.search(/\s/);
  if (first < 0) return out;
  for (let i = first; i < tag.length; i++) {
    const c = tag[i]!;
    if (quote) {
      cur += c;
      if (c === quote && tag[i - 1] !== "\\") quote = null;
    } else if (c === '"' || c === "'" || c === "`") {
      quote = c;
      cur += c;
    } else if (c === "{") {
      depth++;
      cur += c;
    } else if (c === "}") {
      depth--;
      cur += c;
    } else if (depth === 0 && /\s/.test(c)) flush();
    else cur += c;
  }
  flush();
  return out.filter((a) => a !== "/" && a !== "/>");
}

/** Attributes a component may set after the consumer's spread: they are merged or composed with the consumer's value, or must not be replaced. */
export const OWNED_AFTER_SPREAD = /^(ref|className|style|key|children|data-slot|data-state|data-disabled|on[A-Z]\w*)$/;

/**
 * Elements that spread rest props and then set other attributes: `file Tag attr,attr` (attributes in OWNED_AFTER_SPREAD are fine).
 * Those later attributes win over the consumer's props, so each one must be a deliberate, documented choice.
 */
export function attributesAfterSpread(file: string, s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(/<([A-Za-z][\w.]*)(?=[\s/>])/g)) {
    const end = openingTagEnd(s, m.index!);
    if (end < 0) continue;
    const attrs = tagAttributes(s.slice(m.index!, end));
    const last = attrs.lastIndexOf("...");
    if (last < 0) continue;
    const owned = attrs.slice(last + 1).filter((a) => a !== "..." && a !== "{...other}" && !OWNED_AFTER_SPREAD.test(a));
    if (owned.length) out.push(`${file} ${m[1]} ${owned.join(",")}`);
  }
  return out;
}
