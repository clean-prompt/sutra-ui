/* Compact token-count preset used by AI meters, model lists and usage summaries. Pure. */
import { formatCompact } from "./format";

/** Compact token count: 950, 1.2K, 33K, 1.1M. */
export function formatTokenCount(n: number) {
  // Whole thousands from 10K up; millions keep one decimal.
  return formatCompact(n, { suffixCase: "upper", wholeAbove: Math.abs(n) < 1_000_000 ? 10 : undefined });
}
