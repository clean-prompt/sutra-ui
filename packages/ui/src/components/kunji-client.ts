/*
 * Browser side of the kunji discoverable-login protocol (v2), implemented natively.
 *
 * Sutra draws the QR itself and talks only to the relying app's own endpoints
 * (usually relative URLs). Nothing here contacts a kunji server. The hosted
 * `rp.js` widget is available through `createRpScriptAdapter`, which is opt-in
 * and never loads anything until one of its methods is called.
 */

/**
 * The official hosted widget. THIRD-PARTY REQUEST: only fetched when an app
 * calls `createRpScriptAdapter().load()` / `.render()` / `.signIn()`.
 */
export const KUNJI_RP_SCRIPT_URL = "https://kunji.cc/rp.js";

/** Wallet origin used for the same-device `?approve=` deep link (a navigation, not a request). */
export const KUNJI_WALLET_URL = "https://app.kunji.cc";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type KunjiQrFormat = "k1" | "json" | "code";

/** Normalized session status reported by the app's poll endpoint. */
export type KunjiStatus = "pending" | "scanned" | "approved" | "denied" | "expired" | "not_linked";

/** QR payload exactly as defined in discoverable-login §5.1 (lean form). */
export interface KunjiQrPayload {
  kunjiAuth: "v2";
  sessionId: string;
  challenge: string;
  audience: string;
  expiresAt: number;
  appName?: string;
  callbackUrl?: string;
  scope?: string[];
}

/** Full same-device deep-link payload (adds `mode`, `callbackUrl`, `returnUrl`). */
export interface KunjiDeepLinkPayload extends KunjiQrPayload {
  mode: "discoverable";
  callbackUrl: string;
  returnUrl?: string;
}

export interface KunjiSession {
  sessionId: string;
  challenge: string;
  /** Epoch milliseconds. */
  expiresAt: number;
  /** Eagerly minted short code, when the app returned one from `/session`. */
  code?: string;
  audience: string;
  appName: string;
  callbackUrl: string;
  scope: string[];
  /** Lean payload encoded in the QR. */
  payload: KunjiQrPayload;
  /** The string drawn as a QR (`K1:…`, `KC:…` or JSON). */
  qrValue: string;
  qrFormat: KunjiQrFormat;
  /** Same-device "Open kunji" link. */
  deepLink: string;
}

export interface KunjiClaims {
  name?: string;
  picture?: string;
}

export interface KunjiPollResult {
  status: KunjiStatus;
  sessionId?: string;
  sub?: string;
  customToken?: string;
  /** Self-asserted profile (untrusted; display only). */
  claims?: KunjiClaims;
  /** Response body as received. */
  raw?: unknown;
}

export interface KunjiPollOptions {
  /** Stop with `expired` once this passes (epoch ms). */
  expiresAt?: number;
  /** Base interval between polls. Default 2000ms. */
  interval?: number;
  /** Ceiling for the error backoff. Default 10000ms. */
  maxInterval?: number;
  /** Consecutive failures tolerated before rejecting. Default 6. */
  maxErrors?: number;
  /** Called when a non-terminal status changes (e.g. `scanned`). */
  onStatus?: (result: KunjiPollResult) => void;
  /** Skip polls while the tab is hidden. Default true. */
  pauseWhenHidden?: boolean;
}

/** What the sign-in widgets need from a client. Implemented by `createKunjiClient` and `createMockKunjiClient`. */
export interface KunjiClient {
  readonly appName: string;
  readonly audience?: string;
  createSession(signal?: AbortSignal): Promise<KunjiSession>;
  /** One status request. */
  checkStatus(sessionId: string, signal?: AbortSignal): Promise<KunjiPollResult>;
  /** Poll until a terminal status (approved, denied, expired, not_linked). Rejects with `AbortError` when aborted. */
  poll(sessionId: string, signal?: AbortSignal, options?: KunjiPollOptions): Promise<KunjiPollResult>;
  /** Lazily mint the short code shown beside the QR (§5.1.2). Absent when the app has no code endpoint. */
  requestCode?: (sessionId: string, signal?: AbortSignal) => Promise<string>;
  /** Reverse flow: submit a code the wallet displayed. Absent unless the app supports it. */
  submitCode?: (code: string, signal?: AbortSignal, sessionId?: string) => Promise<KunjiPollResult>;
}

export interface KunjiClientConfig {
  /** Optional `GET` returning `{ appName?, audience?, callbackUrl?, scope? }` (or `{ data: {…} }`). */
  configUrl?: string;
  /** `POST` → `{ sessionId, challenge, expiresAt, code? }`. */
  sessionUrl: string;
  /** `GET ?sessionId=` → `{ status, sub?, customToken?, claims? }`. */
  pollUrl: string;
  /** `POST { sessionId }` → `{ code }`, minted lazily for the typed fallback. */
  codeUrl?: string;
  /** `POST { code, sessionId? }` for apps where the wallet shows a code the user types here. */
  codeSubmitUrl?: string;
  /** Shown in the wallet. Folded to printable ASCII. */
  appName?: string;
  /** Domain the user signs in to. Defaults to `location.hostname`. */
  audience?: string;
  /** Wallet POST target. Defaults to the audience's `/kunji/callback` over https (then omitted from the QR). Relative paths resolve against this origin. */
  callbackUrl?: string;
  /** Requested scopes, e.g. `"profile"` or `["profile"]`. */
  scope?: string | string[];
  /** QR encoding. `k1` (default, compact alphanumeric), `json`, or `code` (KC pointer, needs an eager code). */
  qrFormat?: KunjiQrFormat;
  /** https origin for the same-device deep link. */
  walletUrl?: string;
  /** Where the wallet returns after a same-device approval. Defaults to `location.href`. */
  returnUrl?: string;
  /** Fallback session lifetime when the app omits `expiresAt`. Default 120000ms. */
  ttl?: number;
  pollInterval?: number;
  maxPollInterval?: number;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  /** Injected fetch (tests, custom transports). */
  fetch?: typeof fetch;
}

/** Error raised by the client. `fatal` errors stop polling immediately. */
export class KunjiError extends Error {
  readonly status?: number;
  readonly fatal: boolean;
  readonly code?: string;
  constructor(message: string, options: { status?: number; fatal?: boolean; code?: string } = {}) {
    super(message);
    this.name = "KunjiError";
    this.status = options.status;
    this.fatal = options.fatal ?? false;
    this.code = options.code;
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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

const abortError = () => {
  const e = new Error("The operation was aborted.");
  e.name = "AbortError";
  return e;
};

export const isKunjiAbortError = (e: unknown) => e instanceof Error && e.name === "AbortError";

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const id = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, Math.max(0, ms));
    const onAbort = () => {
      clearTimeout(id);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function toEpochMs(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v < 1e12 ? v * 1000 : v;
  if (typeof v === "string" && v) {
    const n = Number(v);
    if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
    const t = Date.parse(v);
    if (Number.isFinite(t)) return t;
  }
  return fallback;
}

const unwrap = (json: unknown): Record<string, unknown> => {
  if (!json || typeof json !== "object") return {};
  const obj = json as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object" && !("status" in obj) && !("sessionId" in obj)) {
    return obj.data as Record<string, unknown>;
  }
  return obj;
};

const STATUS_ALIASES: Record<string, KunjiStatus> = {
  approved: "approved",
  ok: "approved",
  success: "approved",
  complete: "approved",
  completed: "approved",
  pending: "pending",
  waiting: "pending",
  created: "pending",
  scanned: "scanned",
  claimed: "scanned",
  opened: "scanned",
  awaiting_approval: "scanned",
  denied: "denied",
  rejected: "denied",
  declined: "denied",
  cancelled: "denied",
  canceled: "denied",
  expired: "expired",
  consumed: "expired",
  gone: "expired",
  not_linked: "not_linked",
  notlinked: "not_linked",
  unlinked: "not_linked",
  unknown_user: "not_linked",
  no_account: "not_linked",
};

/** Map an app's status string to the protocol's normalized status. Unknown values count as `pending`. */
export function normalizeKunjiStatus(status: unknown): KunjiStatus {
  const key = String(status ?? "").toLowerCase().replace(/[\s-]/g, "_");
  return STATUS_ALIASES[key] ?? STATUS_ALIASES[key.replace(/_/g, "")] ?? "pending";
}

const TERMINAL = new Set<KunjiStatus>(["approved", "denied", "expired", "not_linked"]);

/** Generic poll loop with error backoff, expiry, hidden-tab pause and abort. Used by every client. */
export async function runKunjiPoll(
  check: (sessionId: string, signal?: AbortSignal) => Promise<KunjiPollResult>,
  sessionId: string,
  signal: AbortSignal | undefined,
  { expiresAt, interval = 2000, maxInterval = 10000, maxErrors = 6, onStatus, pauseWhenHidden = true }: KunjiPollOptions = {}
): Promise<KunjiPollResult> {
  let delay = interval;
  let errors = 0;
  let last: KunjiStatus | null = null;
  for (;;) {
    if (signal?.aborted) throw abortError();
    if (expiresAt != null && Date.now() >= expiresAt) return { status: "expired", sessionId };
    const wait = expiresAt != null ? Math.min(delay, Math.max(0, expiresAt - Date.now())) : delay;
    await sleep(wait, signal);
    if (expiresAt != null && Date.now() >= expiresAt) return { status: "expired", sessionId };
    if (pauseWhenHidden && typeof document !== "undefined" && document.hidden) continue;
    try {
      const result = await check(sessionId, signal);
      errors = 0;
      delay = interval;
      if (TERMINAL.has(result.status)) return { sessionId, ...result };
      if (result.status !== last) {
        last = result.status;
        onStatus?.({ sessionId, ...result });
      }
    } catch (e) {
      if (signal?.aborted || isKunjiAbortError(e)) throw abortError();
      if (e instanceof KunjiError && e.fatal) throw e;
      errors += 1;
      if (errors >= maxErrors) throw e;
      delay = Math.min(maxInterval, delay * 2);
    }
  }
}

/* ------------------------------------------------------------------ */
/* QR codecs (K1 / KC), byte-compatible with kunji's src/lib/qrCodec.js */
/* ------------------------------------------------------------------ */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const F_S_RAW = 1;
const F_C_RAW = 2;
const F_HAS_N = 4;
const F_HAS_K = 8;
const F_HAS_P = 16;

function base32Encode(bytes: Uint8Array) {
  let out = "";
  let bits = 0;
  let value = 0;
  for (let i = 0; i < bytes.length; i++) {
    value = ((value << 8) | bytes[i]) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str: string) {
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of str) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error("bad_base32");
    value = ((value << 5) | idx) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

function bytesToBase64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64urlToBytes(str: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(str)) return null;
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

const bytesToB64url = (bytes: Uint8Array) => bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** base64url of a UTF-8 string (safe for any characters). */
export function kunjiBase64Url(text: string) {
  return bytesToB64url(new TextEncoder().encode(text));
}

function packStruct(flags: number, fields: Uint8Array[]) {
  const total = 2 + fields.reduce((n, f) => n + 2 + f.length, 0);
  const buf = new Uint8Array(total);
  const dv = new DataView(buf.buffer);
  let o = 0;
  buf[o++] = 1;
  buf[o++] = flags;
  for (const f of fields) {
    if (f.length > 0xffff) throw new Error("field_too_long");
    dv.setUint16(o, f.length);
    o += 2;
    buf.set(f, o);
    o += f.length;
  }
  return base32Encode(buf);
}

/** Encode a lean login payload as a compact `K1:` string (QR alphanumeric mode). */
export function encodeKunjiCompactQr(payload: Omit<KunjiQrPayload, "kunjiAuth">): string {
  const enc = new TextEncoder();
  let flags = 0;
  const packToken = (str: string, bit: number) => {
    const bytes = b64urlToBytes(str);
    if (bytes && bytesToB64url(bytes) === str) {
      flags |= bit;
      return bytes;
    }
    return enc.encode(str);
  };
  const fields = [
    packToken(String(payload.sessionId), F_S_RAW),
    packToken(String(payload.challenge), F_C_RAW),
    enc.encode(String(payload.audience)),
    enc.encode(String(payload.expiresAt)),
  ];
  if (payload.appName) {
    flags |= F_HAS_N;
    fields.push(enc.encode(payload.appName));
  }
  if (payload.callbackUrl) {
    flags |= F_HAS_K;
    fields.push(enc.encode(payload.callbackUrl));
  }
  if (payload.scope && payload.scope.length) {
    flags |= F_HAS_P;
    fields.push(enc.encode(JSON.stringify(payload.scope)));
  }
  return "K1:" + packStruct(flags, fields);
}

/** Decode a `K1:` string back to the lean payload. Throws on malformed input. */
export function decodeKunjiCompactQr(str: string): KunjiQrPayload {
  if (!str.startsWith("K1:")) throw new Error("not_compact_qr");
  const buf = base32Decode(str.slice(3));
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const dec = new TextDecoder();
  let o = 0;
  if (buf[o++] !== 1) throw new Error("bad_version");
  const flags = buf[o++];
  const read = () => {
    const len = dv.getUint16(o);
    o += 2;
    if (o + len > buf.length) throw new Error("truncated");
    const bytes = buf.subarray(o, o + len);
    o += len;
    return bytes;
  };
  const s = read();
  const c = read();
  const a = read();
  const e = read();
  const out: KunjiQrPayload = {
    kunjiAuth: "v2",
    sessionId: flags & F_S_RAW ? bytesToB64url(s) : dec.decode(s),
    challenge: flags & F_C_RAW ? bytesToB64url(c) : dec.decode(c),
    audience: dec.decode(a),
    expiresAt: Number(dec.decode(e)),
  };
  if (flags & F_HAS_N) out.appName = dec.decode(read());
  if (flags & F_HAS_K) out.callbackUrl = dec.decode(read());
  if (flags & F_HAS_P) out.scope = JSON.parse(dec.decode(read())) as string[];
  return out;
}

/** Encode the `KC:` code-reference pointer `{ domain, code }` (§5.1.3). */
export function encodeKunjiCodeQr({ domain, code }: { domain: string; code: string }): string {
  const enc = new TextEncoder();
  return "KC:" + packStruct(0, [enc.encode(code), enc.encode(domain)]);
}

/* ------------------------------------------------------------------ */
/* Payload builders                                                    */
/* ------------------------------------------------------------------ */

export interface KunjiSessionInput {
  sessionId: string;
  challenge: string;
  expiresAt: number;
  code?: string;
}

export interface KunjiPayloadContext {
  audience: string;
  appName: string;
  callbackUrl: string;
  scope: string[];
  qrFormat?: KunjiQrFormat;
  walletUrl?: string;
  returnUrl?: string;
}

const CODE_RE = /^\d{4,10}$/;

/** Build the lean QR payload, QR string and deep link for a session (discoverable-login §5.1). */
export function buildKunjiSession(input: KunjiSessionInput, ctx: KunjiPayloadContext): KunjiSession {
  const payload: KunjiQrPayload = {
    kunjiAuth: "v2",
    sessionId: input.sessionId,
    challenge: input.challenge,
    audience: ctx.audience,
    appName: ctx.appName,
    expiresAt: input.expiresAt,
  };
  if (ctx.scope.length) payload.scope = ctx.scope;
  if (ctx.callbackUrl !== defaultKunjiCallbackUrl(ctx.audience)) payload.callbackUrl = ctx.callbackUrl;

  const eagerCode = input.code && CODE_RE.test(input.code) ? input.code : undefined;
  let format: KunjiQrFormat = ctx.qrFormat ?? "k1";
  if (format === "code" && !eagerCode) format = "k1";
  const qrValue =
    format === "code"
      ? encodeKunjiCodeQr({ domain: ctx.audience, code: eagerCode! })
      : format === "json"
        ? JSON.stringify(payload)
        : encodeKunjiCompactQr(payload);

  const full: KunjiDeepLinkPayload = {
    kunjiAuth: "v2",
    mode: "discoverable",
    sessionId: input.sessionId,
    challenge: input.challenge,
    audience: ctx.audience,
    callbackUrl: ctx.callbackUrl,
    appName: ctx.appName,
    expiresAt: input.expiresAt,
  };
  if (ctx.returnUrl) full.returnUrl = ctx.returnUrl;
  if (ctx.scope.length) full.scope = ctx.scope;
  const wallet = ctx.walletUrl && /^https:\/\//i.test(ctx.walletUrl) ? ctx.walletUrl.replace(/\/$/, "") : KUNJI_WALLET_URL;

  return {
    sessionId: input.sessionId,
    challenge: input.challenge,
    expiresAt: input.expiresAt,
    code: eagerCode,
    audience: ctx.audience,
    appName: ctx.appName,
    callbackUrl: ctx.callbackUrl,
    scope: ctx.scope,
    payload,
    qrValue,
    qrFormat: format,
    deepLink: `${wallet}/?approve=${kunjiBase64Url(JSON.stringify(full))}`,
  };
}

/* ------------------------------------------------------------------ */
/* createKunjiClient                                                   */
/* ------------------------------------------------------------------ */

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

  const errorMessage = async (res: Response, fallback: string) => {
    try {
      const j = (await res.clone().json()) as { error?: { message?: string } | string; message?: string };
      const msg = typeof j.error === "string" ? j.error : (j.error?.message ?? j.message);
      return msg || fallback;
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
      if (!res.ok) throw new KunjiError(await errorMessage(res, "That code didn't work."), { status: res.status, fatal: true });
      return resultFrom(body, body.status == null ? "approved" : normalizeKunjiStatus(body.status), raw);
    };
  }

  return client;
}

/* ------------------------------------------------------------------ */
/* Mock client (demos, tests): simulates the protocol with timers      */
/* ------------------------------------------------------------------ */

export type KunjiMockOutcome = "approved" | "denied" | "notLinked" | "expired" | "error" | "never";

export interface KunjiMockClientOptions {
  appName?: string;
  audience?: string;
  /** Session lifetime. Default 120000ms. */
  ttl?: number;
  /** Latency of each request. Default 450ms. */
  latency?: number;
  /** When the simulated wallet scans. Default 3500ms after the session starts. */
  scanAfter?: number;
  /** Time between scan and decision. Default 2500ms. */
  decideAfter?: number;
  outcome?: KunjiMockOutcome;
  /** Fail `createSession`. */
  failSession?: boolean;
  /** Short code (minted lazily via `requestCode`, accepted by `submitCode`). */
  code?: string;
  pollInterval?: number;
  sub?: string;
  claims?: KunjiClaims;
}

/** A fake `KunjiClient` that walks pending → scanned → outcome on timers. No network. */
export function createMockKunjiClient(options: KunjiMockClientOptions = {}): KunjiClient {
  const {
    appName = "Sutra",
    audience = "sutra.app",
    ttl = 120_000,
    latency = 450,
    scanAfter = 3500,
    decideAfter = 2500,
    outcome = "approved",
    failSession = false,
    code = "482913",
    pollInterval = 1000,
    sub = "9f2c41d07be35a18c6e04f9d2b7a13c58e6f0d4a91b2c3d4e5f60718293a4b5c",
    claims,
  } = options;
  const started = new Map<string, number>();
  let n = 0;

  const checkStatus = async (sessionId: string, signal?: AbortSignal): Promise<KunjiPollResult> => {
    await sleep(Math.min(latency, 150), signal);
    const t0 = started.get(sessionId);
    if (t0 == null) return { status: "expired", sessionId };
    const elapsed = Date.now() - t0;
    if (elapsed < scanAfter) return { status: "pending", sessionId };
    if (elapsed < scanAfter + decideAfter || outcome === "never") return { status: "scanned", sessionId };
    if (outcome === "error") throw new KunjiError("The server couldn't verify the approval.", { fatal: true, status: 500 });
    if (outcome === "notLinked") return { status: "not_linked", sessionId };
    if (outcome === "denied") return { status: "denied", sessionId };
    if (outcome === "expired") return { status: "expired", sessionId };
    return { status: "approved", sessionId, sub, claims };
  };

  return {
    appName: kunjiAsciiFold(appName),
    audience,
    async createSession(signal) {
      await sleep(latency, signal);
      if (failSession) throw new KunjiError("Couldn't start sign-in. The server didn't answer.");
      n += 1;
      const sessionId = `mock-${n}-${Math.random().toString(36).slice(2, 10)}`;
      started.set(sessionId, Date.now());
      return buildKunjiSession(
        { sessionId, challenge: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2), expiresAt: Date.now() + ttl },
        { audience, appName: kunjiAsciiFold(appName), callbackUrl: defaultKunjiCallbackUrl(audience), scope: [] }
      );
    },
    checkStatus,
    poll(sessionId, signal, opts) {
      return runKunjiPoll(checkStatus, sessionId, signal, { interval: pollInterval, ...opts });
    },
    async requestCode(_sessionId, signal) {
      await sleep(latency, signal);
      return code;
    },
    async submitCode(value, signal, sessionId) {
      await sleep(latency, signal);
      if (value.replace(/\D/g, "") !== code.replace(/\D/g, "")) {
        throw new KunjiError("That code didn't match. Check the number in kunji and try again.", { fatal: true });
      }
      if (outcome === "notLinked") return { status: "not_linked", sessionId };
      if (outcome === "denied") return { status: "denied", sessionId };
      return { status: "approved", sessionId, sub, claims };
    },
  };
}

/* ------------------------------------------------------------------ */
/* Opt-in rp.js adapter                                                */
/* ------------------------------------------------------------------ */

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
