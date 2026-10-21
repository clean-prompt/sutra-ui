/*
 * kunji client: opt-in adapter for the hosted rp.js widget.
 */

import { KUNJI_RP_SCRIPT_URL, KunjiError } from "./kunji-client-types";
import type { KunjiClaims } from "./kunji-client-types";
import { kunjiAsciiFold } from "./kunji-client-text";


export interface KunjiRpOptions {
  appName?: string;
  audience?: string;
  sessionUrl: string;
  callbackUrl: string;
  pollUrl: string;
  codeUrl?: string;
  scope?: string;
  redirect?: string;
  theme?: "light" | "dark";
  label?: string;
  qr?: "code";
  appUrl?: string;
}

export interface KunjiRpSuccessDetail {
  sub?: string;
  customToken?: string;
  sessionId?: string;
  audience?: string;
  claims?: KunjiClaims;
  [key: string]: unknown;
}

/** Shape of `window.kunji` once rp.js has loaded. */
export interface KunjiRpGlobal {
  render(el: Element | string, opts?: Partial<KunjiRpOptions>): void;
  signIn(opts: Partial<KunjiRpOptions>): void;
  init(): void;
  handle?(sub: string): { name: string; avatarSvg: string; avatarDataUri: string };
}

export interface KunjiRpScriptAdapterOptions {
  /** Script URL. Defaults to the hosted widget (a third-party request). Self-host it to avoid that. */
  src?: string;
  /** SRI hash; pin an immutable `rp-<version>.js` when using it. */
  integrity?: string;
  crossOrigin?: "anonymous" | "use-credentials";
}

export interface KunjiRpScriptAdapter {
  readonly src: string;
  /** Inject the script once and resolve `window.kunji`. Nothing is loaded before this is called. */
  load(): Promise<KunjiRpGlobal>;
  /** Render the official button into `el`. Resolves to a cleanup function. */
  render(el: HTMLElement, opts: KunjiRpOptions, onSuccess?: (detail: KunjiRpSuccessDetail) => void): Promise<() => void>;
  /** Open the widget's modal directly. Resolves to a cleanup function for the success listener. */
  signIn(opts: KunjiRpOptions, onSuccess?: (detail: KunjiRpSuccessDetail) => void): Promise<() => void>;
}

const rpLoads = new Map<string, Promise<KunjiRpGlobal>>();
const rpGlobal = () => (globalThis as unknown as { kunji?: KunjiRpGlobal }).kunji;

/** Opt-in wrapper around the hosted `rp.js` widget, for parity with apps already using it. Lazy: no request until used. */
export function createRpScriptAdapter({ src = KUNJI_RP_SCRIPT_URL, integrity, crossOrigin }: KunjiRpScriptAdapterOptions = {}): KunjiRpScriptAdapter {
  const load = () => {
    const existing = rpGlobal();
    if (existing) return Promise.resolve(existing);
    const cached = rpLoads.get(src);
    if (cached) return cached;
    const promise = new Promise<KunjiRpGlobal>((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      if (integrity) {
        script.integrity = integrity;
        script.crossOrigin = crossOrigin ?? "anonymous";
      } else if (crossOrigin) script.crossOrigin = crossOrigin;
      script.dataset.kunjiRp = "";
      script.onload = () => {
        const k = rpGlobal();
        if (k) resolve(k);
        else {
          rpLoads.delete(src);
          reject(new KunjiError("kunji's widget loaded but did not start."));
        }
      };
      script.onerror = () => {
        rpLoads.delete(src);
        script.remove();
        reject(new KunjiError(`Could not load kunji (${src}).`));
      };
      script.src = src;
      document.head.appendChild(script);
    });
    rpLoads.set(src, promise);
    return promise;
  };

  const fold = (opts: KunjiRpOptions): KunjiRpOptions => ({ ...opts, appName: kunjiAsciiFold(opts.appName, "this app") });

  return {
    src,
    load,
    async render(el, opts, onSuccess) {
      const k = await load();
      const handler = (e: Event) => onSuccess?.((e as CustomEvent<KunjiRpSuccessDetail>).detail);
      el.addEventListener("kunji:success", handler);
      k.render(el, fold(opts));
      return () => {
        el.removeEventListener("kunji:success", handler);
        el.replaceChildren();
      };
    },
    async signIn(opts, onSuccess) {
      const k = await load();
      const handler = (e: Event) => onSuccess?.((e as CustomEvent<KunjiRpSuccessDetail>).detail);
      document.addEventListener("kunji:success", handler);
      k.signIn(fold(opts));
      return () => document.removeEventListener("kunji:success", handler);
    },
  };
}
