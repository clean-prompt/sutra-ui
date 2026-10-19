import * as React from "react";
import { Spinner, spinnerGlyphFrames, type SpinnerGlyphFrameSet, type SpinnerProps } from "./spinner";

/* ------------------------------------------------------------------ */
/* GlyphSpinner                                                        */
/* ------------------------------------------------------------------ */

/** Built-in frame sets for GlyphSpinner (the same object as `spinnerGlyphFrames`). */
export const glyphSpinnerFrames = spinnerGlyphFrames;

export type GlyphSpinnerVariant = SpinnerGlyphFrameSet;

export interface GlyphSpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Which glyph animation to play (a key of the spinner glyph frame sets). */
  variant?: GlyphSpinnerVariant;
  /** Custom frames (overrides `variant`). */
  frames?: readonly string[];
  /** Milliseconds per frame. Default 80. */
  interval?: number;
  /** Screen reader label. Default "Loading". */
  label?: string;
  /** Pause on the current frame. */
  paused?: boolean;
  /** Glyph size as on `Spinner`: `xs` to `xl` sets the font size. Leave it out to inherit the parent's font size. */
  size?: NonNullable<SpinnerProps["size"]>;
}

/** Text-glyph spinner (braille dots, arcs, …): a preset of `<Spinner variant="glyph">`. Holds a static frame under reduced motion. */
export const GlyphSpinner = React.forwardRef<HTMLSpanElement, GlyphSpinnerProps>(
  ({ variant = "dots", frames, ...props }, ref) => (
    <Spinner ref={ref} variant="glyph" frames={frames && frames.length > 0 ? frames : variant} {...props} />
  )
);
GlyphSpinner.displayName = "GlyphSpinner";
