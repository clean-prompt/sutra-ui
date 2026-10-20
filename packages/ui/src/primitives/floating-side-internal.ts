import { useDirection } from "../hooks/use-direction";

/** A side of the trigger a floating layer opens on: the four physical ones, or `start` / `end` which follow the reading direction. */
export type FloatingSide = "top" | "right" | "bottom" | "left" | "start" | "end";

/** The physical sides Radix understands. */
export type PhysicalFloatingSide = "top" | "right" | "bottom" | "left";

/** Maps `start` / `end` to the physical side for a direction; the physical sides pass through. */
export function resolveFloatingSide(side: FloatingSide | undefined, dir: "ltr" | "rtl"): PhysicalFloatingSide | undefined {
  if (side === "start") return dir === "rtl" ? "right" : "left";
  if (side === "end") return dir === "rtl" ? "left" : "right";
  return side;
}

/**
 * `side` for a Radix floating content, with `start` / `end` turned into the physical side through `useDirection()` (the nearest
 * `DirectionProvider` with a `dir`, else `<html dir>`). Radix keeps flipping on collision from the physical side.
 */
export function useFloatingSide(side: FloatingSide | undefined): PhysicalFloatingSide | undefined {
  return resolveFloatingSide(side, useDirection());
}
