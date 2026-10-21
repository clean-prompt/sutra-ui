/*
 * kunji client: private helpers shared by the kunji-client-* pieces (abort error, sleep, epoch and body parsing).
 * Not public API.
 */

export const abortError = () => {
  const e = new Error("The operation was aborted.");
  e.name = "AbortError";
  return e;
};

export function sleep(ms: number, signal?: AbortSignal) {
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

export function toEpochMs(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v < 1e12 ? v * 1000 : v;
  if (typeof v === "string" && v) {
    const n = Number(v);
    if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
    const t = Date.parse(v);
    if (Number.isFinite(t)) return t;
  }
  return fallback;
}

export const unwrap = (json: unknown): Record<string, unknown> => {
  if (!json || typeof json !== "object") return {};
  const obj = json as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object" && !("status" in obj) && !("sessionId" in obj)) {
    return obj.data as Record<string, unknown>;
  }
  return obj;
};

export const CODE_RE = /^\d{4,10}$/;
