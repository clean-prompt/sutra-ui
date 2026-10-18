/* Back-compat module: the caret and token helpers moved to lib/ and hooks/. */
export { formatTokenCount } from "../lib/token-count";
export { getTextareaCaretRect, replaceTextRange } from "../lib/text-field";
export { useCaretAnchor } from "../hooks/use-caret-anchor";
