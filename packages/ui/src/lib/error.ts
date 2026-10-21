/* Readable messages for thrown values. Pure; safe on the server. */

const DEFAULT_ERROR = "Something went wrong. Please try again.";

/** Readable message for a thrown value (Error message, non-empty string, or `fallback`; an empty message falls back too). */
export function errorMessage(error: unknown, fallback = DEFAULT_ERROR): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}
