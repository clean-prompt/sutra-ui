import * as React from "react";
import { cva } from "class-variance-authority";
import { focusRing } from "../../lib/cn";
import { formatClock } from "../../lib/duration";

/* ------------------------------------------------------------------ */
/* Time formatting                                                     */
/* ------------------------------------------------------------------ */

export interface FormatMediaTimeOptions {
  /** Always include the hour field (`0:01:05`). Useful to keep labels the same width on long media. */
  forceHours?: boolean;
  /** Prefix with a minus sign (remaining time). */
  negative?: boolean;
}

/**
 * Format seconds as `m:ss` or `h:mm:ss`. Non-finite or negative input renders `0:00`.
 * @deprecated Use `formatClock(seconds, { forceHours, minus: negative })` from lib/duration.
 */
export function formatMediaTime(seconds: number, options: FormatMediaTimeOptions = {}): string {
  return formatClock(seconds, { forceHours: options.forceHours, minus: options.negative });
}

/* ------------------------------------------------------------------ */
/* Portal container (menus inside a fullscreen player)                 */
/* ------------------------------------------------------------------ */

const MediaPortalContext = React.createContext<HTMLElement | null>(null);

export interface MediaPortalProviderProps {
  /** The element the media menus portal into (the player root, so they stay visible in fullscreen); `null` uses `document.body`. */
  container: HTMLElement | null;
  /** The media controls that read the container. */
  children?: React.ReactNode;
}

/** Menus rendered by media controls portal into this element (needed while a player is fullscreen). */
export function MediaPortalProvider({ container, children }: MediaPortalProviderProps) {
  return <MediaPortalContext.Provider value={container}>{children}</MediaPortalContext.Provider>;
}
MediaPortalProvider.displayName = "MediaPortalProvider";

/** The element media menus portal into, or null for `document.body`. */
export function useMediaPortalContainer() {
  return React.useContext(MediaPortalContext);
}


/* ------------------------------------------------------------------ */
/* Shared button styling                                               */
/* ------------------------------------------------------------------ */

export type MediaTone = "default" | "overlay";

export const mediaButtonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center rounded-full transition-[color,background-color,scale] duration-150 active:scale-95",
    "disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    focusRing,
  ],
  {
    variants: {
      tone: {
        default: "text-muted-foreground hover:bg-accent hover:text-foreground",
        overlay: "text-white/85 hover:bg-white/15 hover:text-white focus-visible:ring-white/50",
      },
      size: {
        sm: "size-8 [&_svg]:size-4",
        md: "size-9 [&_svg]:size-[18px]",
        lg: "size-11 [&_svg]:size-6",
      },
      active: { true: "", false: "" },
    },
    compoundVariants: [
      { tone: "default", active: true, className: "text-primary hover:text-primary" },
      { tone: "overlay", active: true, className: "bg-white/15 text-white" },
    ],
    defaultVariants: { tone: "default", size: "md", active: false },
  }
);
