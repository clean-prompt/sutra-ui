import * as fs from "node:fs";
import * as path from "node:path";
import { render } from "@testing-library/react";
import { ChainOfThoughtSearchResult, ChainOfThoughtSearchResults } from "../src/kits/ai/chain-of-thought";
import { ChatSource, ChatSourceList } from "../src/kits/ai/chat-source";
import { Favicon, FaviconProvider, googleFaviconResolver } from "../src/primitives/favicon";
import { blockRegistry } from "../src/blocks/registry";
import { renderBlock } from "./blocks-helpers";

/**
 * Sutra must make zero network requests by default. These tests guard that
 * statically (no hard-coded remote URLs in the source) and at runtime (no
 * remote fetch / XHR / image / iframe / script is attempted on render).
 */

const SRC = path.resolve(__dirname, "../src");

/** Every remote URL that may appear in src/, with the reason it is safe. */
const URL_ALLOWLIST: { file: string; url: string; reason: string }[] = [
  { file: "primitives/favicon.tsx", url: "https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain", reason: "googleFaviconResolver: opt-in only, never used unless passed to FaviconProvider" },
  { file: "primitives/input.tsx", url: "https://", reason: "JSDoc example for the `prefix` addon" },
  { file: "primitives/input-group.tsx", url: "https://", reason: "JSDoc example for InputGroupText" },
  { file: "blocks/header-navigation-blocks.tsx", url: "https://github.com", reason: "default <a href> for the DocsHeader GitHub link (navigation, not a request)" },
  { file: "blocks/modal-dialog-blocks-invite.tsx", url: "https://sutra.app/join/northwind-7f3k2q", reason: "demo invite link text shown in an input" },
  { file: "blocks/modal-dialog-blocks-share.tsx", url: "https://sutra.app/n/q4-launch-plan-8d2f", reason: "demo share link text shown in an input" },
  { file: "kits/identity/kunji-client.ts", url: "https://kunji.cc/rp.js", reason: "KUNJI_RP_SCRIPT_URL: only loaded by the opt-in createRpScriptAdapter().load(); never used by KunjiSignIn" },
  { file: "kits/identity/kunji-client.ts", url: "https://app.kunji.cc", reason: "KUNJI_WALLET_URL: <a href> target of the same-device \"Open kunji\" deep link (navigation, not a request)" },
  { file: "kits/identity/kunji-client.ts", url: "https://${audience}/kunji/callback", reason: "protocol-derived default callback URL the wallet POSTs to; compared, never fetched by the browser" },
  { file: "kits/editor/rich-text-editor.tsx", url: "https://${url}", reason: "adds a scheme to a link the user typed (href normalization); never fetched" },
  { file: "kits/agent-admin/agent-jobs-delivery.tsx", url: "https://example.com/hook", reason: "placeholder text for the webhook delivery URL input" },
  { file: "kits/agent-admin/channels.tsx", url: "http://127.0.0.1:8080", reason: "placeholder text for the signal-cli REST URL input" },
  { file: "kits/agent-admin/channels.tsx", url: "https://matrix.org", reason: "placeholder text for the Matrix homeserver input" },
  { file: "kits/agent-admin/channels.tsx", url: "http://", reason: "URL validation message / scheme check" },
  { file: "kits/agent-admin/channels.tsx", url: "https://.", reason: "URL validation message (\"…http:// or https://.\")" },
  { file: "kits/agent-admin/extensions-catalog.tsx", url: "https://github.com/org/plugin.git", reason: "placeholder text for the git URL install input" },
  { file: "kits/agent-admin/extensions-catalog.tsx", url: "https://", reason: "URL validation message (\"Enter an https:// or git@ URL\")" },
  { file: "kits/agent-admin/mcp.tsx", url: "http://", reason: "URL validation message / scheme check" },
  { file: "kits/agent-admin/mcp.tsx", url: "https://", reason: "URL validation message / scheme check" },
  { file: "kits/agent-admin/mcp.tsx", url: "https://example.com/sse", reason: "placeholder text for the SSE server URL input" },
  { file: "kits/agent-admin/mcp.tsx", url: "https://example.com/mcp", reason: "placeholder text for the HTTP server URL input" },
  { file: "kits/agent-admin/llm-providers.tsx", url: "https://llm.example.internal/v1", reason: "placeholder text for the custom endpoint base URL input" },
  { file: "kits/agent/agent-browser.tsx", url: "https://", reason: "doc comment for normalizeBrowserInput" },
  { file: "kits/agent/agent-browser.tsx", url: "http://${v}", reason: "normalizes a typed localhost address for display; AgentBrowserPane never loads URLs itself" },
  { file: "kits/agent/agent-browser.tsx", url: "https://${v}", reason: "normalizes a typed bare host for display; AgentBrowserPane never loads URLs itself" },
  { file: "primitives/port-badge.tsx", url: "http://${host}:${String(port", reason: "portHref builds a localhost link for a dev-server port; only followed when the user clicks it" },
  { file: "lib/validate.ts", url: "https://${raw}", reason: "hostnameOf: adds a scheme to a bare host so URL can parse it; never fetched" },
  { file: "kits/workspace/workspace-switcher.tsx", url: "https://gw.example.com", reason: "JSDoc example of a gateway URL" },
  { file: "kits/workspace/workspace-switcher.tsx", url: "https://gateway.example.com", reason: "placeholder text for the gateway URL input" },
  { file: "kits/ai/embeds.tsx", url: "https://www.youtube-nocookie.com/embed/", reason: "embedProviders: iframe src template, only rendered inside SandboxedFrame after the user consents via EmbedConsent" },
  { file: "kits/ai/embeds.tsx", url: "https://player.vimeo.com/video/", reason: "embedProviders: iframe src template, only rendered inside SandboxedFrame after the user consents via EmbedConsent" },
  { file: "kits/ai/embeds.tsx", url: "https://open.spotify.com/embed/", reason: "embedProviders: iframe src template, only rendered inside SandboxedFrame after the user consents via EmbedConsent" },
  { file: "kits/ai/embeds.tsx", url: "https://w.soundcloud.com/player/?url=", reason: "embedProviders: iframe src template, only rendered inside SandboxedFrame after the user consents via EmbedConsent" },
  { file: "kits/ai/embeds.tsx", url: "https://platform.twitter.com/embed/Tweet.html?dnt=true&id=", reason: "embedProviders: iframe src template, only rendered inside SandboxedFrame after the user consents via EmbedConsent" },
  { file: "kits/ai/embeds.tsx", url: "https://gist.github.com/", reason: "embedProviders: iframe src template, only rendered inside SandboxedFrame after the user consents via EmbedConsent" },
  { file: "kits/ai/embeds.tsx", url: "https://www.figma.com/embed?embed_host=sutra&url=", reason: "embedProviders: iframe src template, only rendered inside SandboxedFrame after the user consents via EmbedConsent" },
  { file: "kits/ai/embeds.tsx", url: "https://codepen.io/", reason: "embedProviders: iframe src template, only rendered inside SandboxedFrame after the user consents via EmbedConsent" },
];

/** SVG namespace identifiers are not fetched. */
const isXmlns = (url: string) => /^http:\/\/www\.w3\.org\/(2000\/svg|1999\/xlink)$/.test(url);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.test\.[tj]sx?$/.test(entry.name) ? [] : [full];
  });
}

describe("privacy: static scan of src/", () => {
  const files = walk(SRC);

  it("finds source files to scan", () => {
    expect(files.some((f) => f.endsWith("favicon.tsx"))).toBe(true);
    expect(files.some((f) => f.endsWith("sutra.css"))).toBe(true);
  });

  it("contains no remote URLs outside the allowlist", () => {
    const offenders: string[] = [];
    const used = new Set<number>();
    for (const file of files) {
      const rel = path.relative(SRC, file).split(path.sep).join("/");
      const text = fs.readFileSync(file, "utf8");
      for (const match of text.matchAll(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'`)<>]*|https?:\/\/[^\s"'`)<>]*/gi)) {
        const url = match[0];
        if (!/^https?:/i.test(url)) {
          // Protocol-relative URLs ("//cdn.example.com") are remote too; ignore plain comments like "// foo.bar".
          const before = text.slice(Math.max(0, match.index! - 1), match.index!);
          if (!/["'`(=]/.test(before)) continue;
        }
        if (isXmlns(url)) continue;
        const allowed = URL_ALLOWLIST.findIndex((a) => a.file === rel && url === a.url);
        if (allowed === -1) offenders.push(`${rel}: ${url}`);
        else used.add(allowed);
      }
    }
    expect(offenders).toEqual([]);
    // Keep the allowlist honest: every entry must still be needed.
    const stale = URL_ALLOWLIST.filter((_, i) => !used.has(i)).map((a) => `${a.file}: ${a.url}`);
    expect(stale).toEqual([]);
  });

  it("does not import remote stylesheets or fonts", () => {
    const css = files.filter((f) => f.endsWith(".css"));
    for (const file of css) {
      const text = fs.readFileSync(file, "utf8");
      expect(text).not.toMatch(/@import\s+(url\()?["']?(https?:)?\/\//i);
      expect(text).not.toMatch(/url\(\s*["']?(https?:)?\/\//i);
    }
  });
});

/* ------------------------------------------------------------------------ */

const isRemote = (url: string | null | undefined) => !!url && /^(https?:)?\/\//i.test(url.trim());

interface NetworkSpy {
  attempts: string[];
  restore: () => void;
}

/** Record every remote request the DOM could trigger: fetch, XHR, sendBeacon, src/href setters. */
function spyOnNetwork(): NetworkSpy {
  const attempts: string[] = [];
  const restorers: (() => void)[] = [];
  const record = (kind: string, url: unknown) => {
    const value = url instanceof URL ? url.href : url instanceof Request ? url.url : String(url);
    if (isRemote(value)) attempts.push(`${kind}: ${value}`);
  };

  const fetchSpy = vi.fn((input: unknown) => {
    record("fetch", input);
    return Promise.reject(new Error("network disabled in tests"));
  });
  vi.stubGlobal("fetch", fetchSpy);

  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, _method: string, url: string | URL) {
    record("xhr", url);
    // eslint-disable-next-line prefer-rest-params
    return (open as (...args: unknown[]) => void).apply(this, arguments as unknown as unknown[]);
  } as typeof open;
  restorers.push(() => (XMLHttpRequest.prototype.open = open));

  if (navigator.sendBeacon) {
    const beacon = navigator.sendBeacon;
    navigator.sendBeacon = (url: string | URL) => (record("beacon", url), false);
    restorers.push(() => (navigator.sendBeacon = beacon));
  }

  const watchProp = (proto: object, prop: string, kind: string) => {
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (!desc?.set) return;
    Object.defineProperty(proto, prop, {
      ...desc,
      set(value: string) {
        record(kind, value);
        desc.set!.call(this, value);
      },
    });
    restorers.push(() => Object.defineProperty(proto, prop, desc));
  };
  watchProp(HTMLImageElement.prototype, "src", "img.src");
  watchProp(HTMLImageElement.prototype, "srcset", "img.srcset");
  watchProp(HTMLIFrameElement.prototype, "src", "iframe.src");
  watchProp(HTMLScriptElement.prototype, "src", "script.src");
  watchProp(HTMLSourceElement.prototype, "src", "source.src");
  watchProp(HTMLMediaElement.prototype, "src", "media.src");
  watchProp(HTMLLinkElement.prototype, "href", "link.href");

  // React sets most attributes via setAttribute.
  const setAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (this: Element, name: string, value: string) {
    const tag = this.tagName.toLowerCase();
    const lower = name.toLowerCase();
    const fetches =
      ((lower === "src" || lower === "srcset") && ["img", "iframe", "script", "source", "video", "audio", "embed", "input"].includes(tag)) ||
      (lower === "poster" && tag === "video") ||
      (lower === "data" && tag === "object") ||
      (lower === "href" && tag === "link") ||
      ((lower === "href" || lower === "xlink:href") && tag === "image");
    if (fetches) record(`${tag}[${lower}]`, value);
    if (lower === "style" && /url\(\s*["']?(https?:)?\/\//i.test(value)) record(`${tag}[style]`, value);
    return setAttribute.call(this, name, value);
  };
  restorers.push(() => (Element.prototype.setAttribute = setAttribute));

  return {
    attempts,
    restore: () => {
      restorers.reverse().forEach((r) => r());
      vi.unstubAllGlobals();
    },
  };
}

/** Belt and braces: scan the rendered DOM for resource-loading elements pointing off-site. */
function remoteResourcesIn(root: ParentNode) {
  const found: string[] = [];
  root.querySelectorAll<HTMLElement>("img, iframe, script, source, video, audio, embed, object, link, image").forEach((el) => {
    for (const attr of ["src", "srcset", "poster", "data", "href", "xlink:href"]) {
      const value = el.getAttribute(attr);
      if (el.tagName.toLowerCase() !== "link" && el.tagName.toLowerCase() !== "image" && attr === "href") continue;
      if (isRemote(value)) found.push(`<${el.tagName.toLowerCase()} ${attr}="${value}">`);
    }
  });
  root.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    const style = el.getAttribute("style") ?? "";
    if (/url\(\s*["']?(https?:)?\/\//i.test(style)) found.push(`<${el.tagName.toLowerCase()} style="${style}">`);
  });
  return found;
}

const sources = [
  { href: "https://www.nytimes.com/2025/01/01/tech/article.html", title: "NYT article", snippet: "Snippet" },
  { href: "https://en.wikipedia.org/wiki/Privacy", title: "Wikipedia" },
  { href: "https://github.com/sutra/ui" },
];

describe("privacy: runtime", () => {
  let spy: NetworkSpy;
  beforeEach(() => {
    spy = spyOnNetwork();
  });
  afterEach(() => spy.restore());

  it("the spy itself detects a remote image (sanity check)", () => {
    render(<img src="https://example.com/x.png" alt="" />);
    expect(spy.attempts.length).toBeGreaterThan(0);
  });

  it("ChatSource, ChatSourceList and ChainOfThoughtSearchResults render monograms, not remote favicons", () => {
    const { container } = render(
      <div>
        {sources.map((s, i) => (
          <ChatSource key={s.href} {...s} index={i === 2 ? 3 : undefined} />
        ))}
        <ChatSourceList sources={sources} defaultOpen />
        <ChainOfThoughtSearchResults results={sources} />
        <ChainOfThoughtSearchResult href="https://example.org/page" />
        <Favicon domain="example.com" />
      </div>
    );
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(remoteResourcesIn(document)).toEqual([]);
    expect(spy.attempts).toEqual([]);
  });

  it.each(blockRegistry.map((b) => [b.id, b] as const))("block %s makes no remote requests (dialogs/menus opened)", async (_id, entry) => {
    await renderBlock(entry);
    expect(remoteResourcesIn(document)).toEqual([]);
    expect(spy.attempts).toEqual([]);
  });
});

describe("privacy: FaviconProvider opt-in", () => {
  it("renders a decorative monogram by default", () => {
    const { container } = render(<Favicon domain="example.com" data-testid="fav" />);
    const fav = container.querySelector("[data-testid=fav]")!;
    expect(fav).toHaveAttribute("aria-hidden", "true");
    expect(fav).toHaveTextContent("E");
    expect(container.querySelector("img")).toBeNull();
  });

  it("uses the resolver from FaviconProvider to render an <img>", () => {
    const resolve = vi.fn((domain: string) => `/icons/${domain}.png`);
    const { container } = render(
      <FaviconProvider resolve={resolve}>
        <ChatSource href="https://www.example.com/a" title="Example" disablePreview />
      </FaviconProvider>
    );
    expect(resolve).toHaveBeenCalledWith("example.com");
    expect(container.querySelector("img")).toHaveAttribute("src", "/icons/example.com.png");
  });

  it("falls back to the monogram when the resolver returns undefined", () => {
    const { container } = render(
      <FaviconProvider resolve={() => undefined}>
        <Favicon domain="example.com" />
      </FaviconProvider>
    );
    expect(container.querySelector("img")).toBeNull();
  });

  it("googleFaviconResolver is opt-in and encodes the domain", () => {
    expect(googleFaviconResolver("a b.com")).toBe("https://www.google.com/s2/favicons?domain=a%20b.com&sz=64");
  });
});
