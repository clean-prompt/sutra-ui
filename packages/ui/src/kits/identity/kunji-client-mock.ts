/*
 * kunji client: mock client (demos, tests) that simulates the protocol with timers.
 */

import { KunjiError } from "./kunji-client-types";
import type { KunjiClaims, KunjiClient, KunjiPollResult } from "./kunji-client-types";
import { sleep } from "./kunji-client-internal";
import { runKunjiPoll } from "./kunji-client-poll";
import { buildKunjiSession } from "./kunji-client-session";
import { defaultKunjiCallbackUrl, kunjiAsciiFold } from "./kunji-client-text";


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
