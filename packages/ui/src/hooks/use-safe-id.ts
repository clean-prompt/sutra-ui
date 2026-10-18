import * as React from "react";

/** Stable unique id containing only `[A-Za-z0-9_-]`, safe in SVG `url(#id)`, CSS selectors and `href="#id"`. */
export function useSafeId(prefix = "sutra"): string {
  const raw = React.useId();
  const p = prefix.replace(/[^A-Za-z0-9_-]/g, "");
  const id = raw.replace(/[^A-Za-z0-9_-]/g, "");
  const head = /^[A-Za-z_]/.test(p) ? p : `id${p}`;
  return `${head}-${id}`;
}
