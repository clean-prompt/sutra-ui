import * as React from "react";
import { Direction as DirectionPrimitive } from "radix-ui";
import { cn } from "../lib/cn";
import type { Direction } from "../lib/direction";
import { DirectionContext, useDirection } from "../hooks/use-direction";

export interface DirectionProviderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "dir"> {
  /**
   * Force the direction of this subtree. It renders a `display: contents` element carrying `dir`, so logical utilities,
   * `rtl:` variants and Radix keyboard handling all follow it, and nests (a chart can force `ltr` inside an RTL page).
   * Omit it to follow the document (`<html dir>`) and render no element.
   */
  dir?: Direction;
  /** The subtree that reads the direction. */
  children?: React.ReactNode;
}

/**
 * Tells Sutra and its Radix primitives which way the text runs. Put one at the app root (no `dir`: it follows `<html dir>`
 * live) or wrap a subtree with a `dir` to force it; read it with `useDirection`.
 */
export function DirectionProvider({ dir, className, children, ...props }: DirectionProviderProps) {
  const resolved = useDirection();
  if (!dir) {
    return (
      <DirectionPrimitive.DirectionProvider dir={resolved}>{children}</DirectionPrimitive.DirectionProvider>
    );
  }
  return (
    <DirectionContext.Provider value={dir}>
      <DirectionPrimitive.DirectionProvider dir={dir}>
        <div data-slot="direction-provider" {...props} dir={dir} className={cn("contents", className)}>
          {children}
        </div>
      </DirectionPrimitive.DirectionProvider>
    </DirectionContext.Provider>
  );
}
