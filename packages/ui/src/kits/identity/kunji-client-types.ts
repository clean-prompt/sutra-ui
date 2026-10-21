/*
 * kunji client: constants, protocol types and the error class. No runtime logic.
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
