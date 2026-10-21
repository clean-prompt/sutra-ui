/*
 * kunji client: status normalization and the generic poll loop.
 */

import { KunjiError } from "./kunji-client-types";
import type { KunjiPollOptions, KunjiPollResult, KunjiStatus } from "./kunji-client-types";
import { abortError, sleep } from "./kunji-client-internal";


export const isKunjiAbortError = (e: unknown) => e instanceof Error && e.name === "AbortError";

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
