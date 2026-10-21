/*
 * kunji client: `createKunjiClient`, the client for the app's own kunji endpoints.
 */

import { KunjiError } from "./kunji-client-types";
import type { KunjiClaims, KunjiClient, KunjiClientConfig, KunjiPollResult, KunjiStatus } from "./kunji-client-types";
import { CODE_RE, toEpochMs, unwrap } from "./kunji-client-internal";
import { normalizeKunjiStatus, runKunjiPoll } from "./kunji-client-poll";
import { buildKunjiSession } from "./kunji-client-session";
import type { KunjiPayloadContext } from "./kunji-client-session";
import { defaultKunjiCallbackUrl, kunjiAsciiFold, parseKunjiScope } from "./kunji-client-text";


const withQuery = (url: string, key: string, value: string) =>
  `${url}${url.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;

function resultFrom(body: Record<string, unknown>, status: KunjiStatus, raw: unknown): KunjiPollResult {
  return {
    status,
    sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
    sub: typeof body.sub === "string" ? body.sub : undefined,
    customToken: typeof body.customToken === "string" ? body.customToken : undefined,
    claims: body.claims && typeof body.claims === "object" ? (body.claims as KunjiClaims) : undefined,
    raw,
  };
}

/** Create a client for the app's own kunji endpoints. Talks to nothing else. */
export function createKunjiClient(config: KunjiClientConfig): KunjiClient {
  const doFetch: typeof fetch = (...args) => (config.fetch ?? globalThis.fetch)(...args);
  const origin = typeof location !== "undefined" ? location.origin : "";
  let resolved: Promise<KunjiPayloadContext> | null = null;

  const bodyMessage = (body: unknown, fallback: string) => {
    const j = (body ?? {}) as { error?: { message?: string } | string; message?: string };
    const msg = typeof j.error === "string" ? j.error : (j.error?.message ?? j.message);
    return typeof msg === "string" && msg ? msg : fallback;
  };

  const errorMessage = async (res: Response, fallback: string) => {
    try {
      return bodyMessage(await res.clone().json(), fallback);
    } catch {
      return fallback;
    }
  };

  const request = (url: string, init: RequestInit = {}, signal?: AbortSignal) =>
    doFetch(url, {
      credentials: config.credentials ?? "same-origin",
      ...init,
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...config.headers },
      signal,
    });

  const context = (signal?: AbortSignal): Promise<KunjiPayloadContext> => {
    if (resolved) return resolved;
    resolved = (async () => {
      let remote: Record<string, unknown> = {};
      if (config.configUrl) {
        const res = await request(config.configUrl, {}, signal);
        if (!res.ok) throw new KunjiError(await errorMessage(res, "kunji is not set up on this server"), { status: res.status, fatal: true });
        remote = unwrap(await res.json());
      }
      const audience =
        config.audience ?? (typeof remote.audience === "string" ? remote.audience : undefined) ?? (typeof location !== "undefined" ? location.hostname : "");
      if (!audience) throw new KunjiError("kunji needs an audience (the domain users sign in to).", { fatal: true });
      let callbackUrl = config.callbackUrl ?? (typeof remote.callbackUrl === "string" ? remote.callbackUrl : undefined) ?? defaultKunjiCallbackUrl(audience);
      if (callbackUrl.startsWith("/") && origin) callbackUrl = origin + callbackUrl;
      const appName = kunjiAsciiFold(config.appName ?? (typeof remote.appName === "string" ? remote.appName : undefined) ?? audience);
      const scope = parseKunjiScope(config.scope ?? (remote.scope as string | string[] | undefined));
      return {
        audience,
        appName,
        callbackUrl,
        scope,
        qrFormat: config.qrFormat,
        walletUrl: config.walletUrl,
        returnUrl: config.returnUrl ?? (typeof location !== "undefined" ? location.href : undefined),
      };
    })();
    resolved.catch(() => (resolved = null));
    return resolved;
  };

  const checkStatus = async (sessionId: string, signal?: AbortSignal): Promise<KunjiPollResult> => {
    const res = await request(withQuery(config.pollUrl, "sessionId", sessionId), {}, signal);
    if (res.status === 410 || res.status === 404) return { status: "expired", sessionId };
    if (res.status === 403) return { status: "not_linked", sessionId };
    if (!res.ok) throw new KunjiError(await errorMessage(res, `Status check failed (HTTP ${res.status})`), { status: res.status });
    const raw = await res.json().catch(() => ({}));
    const body = unwrap(raw);
    return { ...resultFrom(body, normalizeKunjiStatus(body.status), raw), sessionId };
  };

  const client: KunjiClient = {
    get appName() {
      return kunjiAsciiFold(config.appName ?? config.audience ?? "this app");
    },
    audience: config.audience,
    async createSession(signal) {
      const ctx = await context(signal);
      const res = await request(
        config.sessionUrl,
        {
          method: "POST",
          body: JSON.stringify({
            audience: ctx.audience,
            callbackUrl: ctx.callbackUrl,
            appName: ctx.appName,
            ...(ctx.scope.length ? { scope: ctx.scope } : {}),
          }),
        },
        signal
      );
      if (!res.ok) throw new KunjiError(await errorMessage(res, "Couldn't start sign-in."), { status: res.status });
      const body = unwrap(await res.json().catch(() => ({})));
      if (typeof body.sessionId !== "string" || typeof body.challenge !== "string") {
        throw new KunjiError("The server's sign-in session was malformed.", { fatal: true });
      }
      const expiresAt = toEpochMs(body.expiresAt, Date.now() + (config.ttl ?? 120_000));
      return buildKunjiSession(
        { sessionId: body.sessionId, challenge: body.challenge, expiresAt, code: typeof body.code === "string" ? body.code : undefined },
        ctx
      );
    },
    checkStatus,
    poll(sessionId, signal, options) {
      return runKunjiPoll(checkStatus, sessionId, signal, {
        interval: config.pollInterval,
        maxInterval: config.maxPollInterval,
        ...options,
      });
    },
  };

  if (config.codeUrl) {
    const codeUrl = config.codeUrl;
    client.requestCode = async (sessionId, signal) => {
      const res = await request(codeUrl, { method: "POST", body: JSON.stringify({ sessionId }) }, signal);
      const body = unwrap(await res.json().catch(() => ({})));
      if (!res.ok || typeof body.code !== "string" || !CODE_RE.test(body.code)) {
        throw new KunjiError("Couldn't get a code. Use the QR or the button instead.", { status: res.status });
      }
      return body.code;
    };
  }

  if (config.codeSubmitUrl) {
    const submitUrl = config.codeSubmitUrl;
    client.submitCode = async (code, signal, sessionId) => {
      const res = await request(submitUrl, { method: "POST", body: JSON.stringify({ code, ...(sessionId ? { sessionId } : {}) }) }, signal);
      if (res.status === 403) return { status: "not_linked" };
      if (res.status === 410) return { status: "expired" };
      const raw = await res.json().catch(() => ({}));
      const body = unwrap(raw);
      // The body was already read above, so take the message from it (res.clone() would throw now).
      if (!res.ok) throw new KunjiError(bodyMessage(raw, "That code didn't work."), { status: res.status, fatal: true });
      return resultFrom(body, body.status == null ? "approved" : normalizeKunjiStatus(body.status), raw);
    };
  }

  return client;
}
