import * as React from "react";
import { cn } from "../lib/cn";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { usePointerVars } from "../hooks/use-pointer-vars";
import { Card, type CardProps } from "../primitives/layout";

export interface SpotlightCardProps extends CardProps {
  /** Radius of the glow in px. Default 240 (the `--sutra-spotlight-size` token). */
  glowSize?: number;
}

/**
 * A `Card` with a soft glow that follows the mouse (the `spotlight` utility on `usePointerVars`). It also glows at the
 * centre while something inside has keyboard focus. Touch, reduced motion and no hover leave it plain. Decoration only.
 */
export const SpotlightCard = React.forwardRef<HTMLDivElement, SpotlightCardProps>(({ glowSize, className, style, ...props }, ref) => {
  const box = usePointerVars<HTMLDivElement>();
  const merged = useMergedRefs(ref, box);
  return <Card {...props} ref={merged} className={cn("spotlight", className)} style={{ ...(glowSize ? { "--sutra-spotlight-size": `${glowSize}px` } : null), ...style }} />;
});
SpotlightCard.displayName = "SpotlightCard";

export interface TiltCardProps extends CardProps {
  /** Tilt at the edge, in degrees. Default 7 (the `--sutra-tilt-max` token; paper uses 3). */
  max?: number;
  /** Add the pointer glow too. Default false. */
  spotlight?: boolean;
}

/**
 * A `Card` that tilts toward the mouse in 3D. The pointer is read on a still wrapper (`data-slot="tilt-card-field"`)
 * and the card inside tilts, so it never moves out from under the pointer. Props and the ref go to the card. Touch,
 * reduced motion and no hover leave it flat. Use it for hero, plan and entity cards, not for dense or live content.
 */
export const TiltCard = React.forwardRef<HTMLDivElement, TiltCardProps>(({ max, spotlight = false, className, style, ...props }, ref) => {
  const field = usePointerVars<HTMLDivElement>();
  return (
    <div ref={field} data-slot="tilt-card-field" className="h-full min-w-0">
      <Card
        {...props}
        ref={ref}
        className={cn("tilt h-full", spotlight && "spotlight", className)}
        style={{ ...(max !== undefined ? { "--sutra-tilt-max": `${max}deg` } : null), ...style }}
      />
    </div>
  );
});
TiltCard.displayName = "TiltCard";

export interface MagneticProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** How far past its edge the pointer starts to pull, in px. Default 80. */
  radius?: number;
  /** How much of the pointer's offset it follows, 0..1. Default 0.35 (paper scales it down). */
  strength?: number;
}

/**
 * Makes its child drift toward the mouse when the pointer comes within `radius` of it (the `magnetic` utility). The
 * wrapper stays put and measures; an inner box moves, so the hit area and the layout do not shift. Clicks, hover and
 * focus work as without it. Wrap a button, a link or an icon; not a text field. Touch and reduced motion: still.
 */
export const Magnetic = React.forwardRef<HTMLSpanElement, MagneticProps>(({ radius = 80, strength = 0.35, className, children, ...props }, ref) => {
  const field = usePointerVars<HTMLSpanElement>({ radius, strength });
  const merged = useMergedRefs(ref, field);
  return (
    <span data-slot="magnetic" {...props} ref={merged} className={cn("inline-flex", className)}>
      <span className="magnetic inline-flex min-w-0">{children}</span>
    </span>
  );
});
Magnetic.displayName = "Magnetic";
