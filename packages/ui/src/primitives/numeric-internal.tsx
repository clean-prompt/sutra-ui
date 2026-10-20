import * as React from "react";

const NUMERIC = /^[\s+\-−–]*[\d.,]/;

/**
 * Isolates a number, or a string that starts like one ("-3.2", "+12%", "1,204 GB"), so a sign, a unit or the neighbouring
 * text cannot reorder it in right-to-left (a bare "-3" would read "3-"). Other nodes and words pass through untouched.
 */
export function isolateNumeric(node: React.ReactNode): React.ReactNode {
  if (typeof node === "number" || (typeof node === "string" && NUMERIC.test(node))) return <bdi dir="ltr">{node}</bdi>;
  return node;
}
