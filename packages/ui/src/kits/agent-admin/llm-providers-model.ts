/** LLM provider model: auth method and status types and labels, `formatTokenExpiry` and `providerMonogram`. */
import * as React from "react";
import { formatDuration } from "../../lib/duration";
import { HOUR_MS, toMs } from "../../lib/time";
import { monogramInitials } from "../../primitives/monogram";
import { type TimeValue } from "./llm-providers-internal";

/* ------------------------------------------------------------------ */
/* Shared types + helpers                                              */
/* ------------------------------------------------------------------ */

export type ProviderAuthMethod = "oauth" | "api-key" | "local" | "custom";
export type ProviderStatus = "connected" | "expired" | "error" | "not-configured";

export const providerAuthLabels: Record<ProviderAuthMethod, string> = {
  oauth: "OAuth",
  "api-key": "API key",
  local: "Local",
  custom: "Custom endpoint",
};

export const providerStatusLabels: Record<ProviderStatus, string> = {
  connected: "Connected",
  expired: "Expired",
  error: "Error",
  "not-configured": "Not configured",
};

/** Short duration such as `12d`, `3h`, `25m`, `40s`. */
function shortDuration(ms: number) {
  return formatDuration(ms, { units: 1, maxUnit: ms < 48 * HOUR_MS ? "h" : "d" });
}

/** "expires in 12d", "expired 3h ago", or "" when there is no expiry. */
export function formatTokenExpiry(expiresAt: TimeValue | undefined, now: number = Date.now()) {
  const t = toMs(expiresAt);
  if (t == null) return "";
  const diff = t - now;
  return diff > 0 ? `expires in ${shortDuration(diff)}` : `expired ${shortDuration(-diff)} ago`;
}

/** Up to two monogram letters for a provider name: "Nimbus AI" → "NA". Same as `monogramInitials`. */
export function providerMonogram(name: string) {
  return monogramInitials(name);
}

export interface ProviderEntry {
  id: string;
  name: string;
  monogram?: string;
  color?: string;
  auth: ProviderAuthMethod;
  status: ProviderStatus;
  description?: React.ReactNode;
  /** Signed-in account or key hint, e.g. "you@example.com" or "sk-…a91f". */
  account?: string;
  tokenExpiresAt?: TimeValue;
  modelCount?: number;
  quota?: { used: number; resetsAt?: TimeValue; label?: string };
  /** Reason shown for `error` status. */
  error?: string;
}
