import * as React from "react";
import { cn } from "../lib/cn";
import { useSafeId } from "../hooks/use-safe-id";
import { sutraAppMeta, type SutraApp } from "./brand";
import {
  BEAD_R,
  BEAD_X,
  BEAD_Y,
  MascotAccessories,
  MascotFace,
  THREAD_GAP,
  THREAD_LEFT,
  THREAD_W,
  threadRight,
} from "./mascot-art-internal";

/** What the mascot is doing: each state has its own face, extras and motion. */
export const mascotStates = ["idle", "listening", "thinking", "working", "speaking", "happy", "sleeping", "error"] as const;
export type MascotState = (typeof mascotStates)[number];

/** The accessible name of each state, used when `title` is `true` ("Sutra is listening"). */
export const mascotStateLabels: Record<MascotState, string> = {
  idle: "Sutra is ready",
  listening: "Sutra is listening",
  thinking: "Sutra is thinking",
  working: "Sutra is working",
  speaking: "Sutra is speaking",
  happy: "Sutra is happy",
  sleeping: "Sutra is asleep",
  error: "Sutra ran into a problem",
};

export type MascotShape = "bare" | "circle" | "squircle";
export type MascotTone = "mono" | "dyed";

export interface SutraMascotProps extends Omit<React.ComponentPropsWithoutRef<"svg">, "children" | "title"> {
  /**
   * What the mascot is doing. The face and the extras around it change with the state (so it reads without motion), and the
   * animation swaps in place without remounting. `happy` and `error` are one-shot reactions that play again when the state is set again.
   * @default "idle"
   */
  state?: MascotState;
  /**
   * Rendered width and height: a number of pixels or any CSS length.
   * @default 64
   */
  size?: number | string;
  /**
   * `bare` the character alone in `currentColor` (follows the text colour), `circle` or `squircle` on a paper tile with a hairline,
   * the form for a chat or agent avatar next to `Avatar`.
   * @default "bare"
   */
  shape?: MascotShape;
  /**
   * `mono` ink on paper, `dyed` puts the dye of `app` in the bead. Without an `app`, `dyed` stays ink.
   * @default "mono"
   */
  tone?: MascotTone;
  /** The Sutra app whose dye colours the bead when `tone` is `dyed` (see `sutraAppMeta`). */
  app?: SutraApp;
  /**
   * Accessible name. A string names the graphic, `true` uses the label of the current state (`mascotStateLabels`), and leaving it out
   * makes the mascot decorative (hidden from assistive technology): pair it with live text that says what Sutra is doing.
   */
  title?: string | boolean;
  /** Freeze the animation where it is (the expression stays). Use it for off-screen or background mascots. */
  paused?: boolean;
  /** Change it to play a one-shot reaction (`happy`, `error`) again while the state stays the same. */
  replayKey?: string | number;
}

/** The two inks of the brand (as in `SutraAppIcon`): the tile forms use them literally so the artwork never shifts with a theme. */
const INK = "#1c1915";
const PAPER = "#f7f5f0";
const TILE_RX = { circle: 32, squircle: 19 } as const;

/**
 * The Sutra mascot: a friendly bead on a thread, with a face that follows `state` (idle, listening, thinking, working, speaking,
 * happy, sleeping, error). Flat shapes, ink on paper; the motion is CSS keyframes that stand still under reduced motion while
 * the expression stays. Decorative unless `title` is set.
 */
export const SutraMascot = React.forwardRef<SVGSVGElement, SutraMascotProps>(
  (
    {
      state = "idle",
      size = 64,
      shape = "bare",
      tone = "mono",
      app,
      title,
      paused = false,
      replayKey,
      className,
      ...props
    },
    ref
  ) => {
    const id = useSafeId("sutra-mascot");
    const current: MascotState = mascotStates.includes(state) ? state : "idle";
    const tile = shape === "circle" || shape === "squircle";
    const ink = tile ? INK : "currentColor";
    const bead = tone === "dyed" && app && sutraAppMeta[app] ? sutraAppMeta[app].dye : ink;
    const name = typeof title === "string" ? title : title === true ? mascotStateLabels[current] : undefined;
    const titleId = `${id}-title`;
    const beadMask = `${id}-bead`;
    const threadMask = `${id}-thread`;
    const clip = `${id}-clip`;
    const labelled = name ? ({ role: "img", "aria-labelledby": titleId } as const) : ({ "aria-hidden": true, focusable: "false" } as const);
    const art = (
      <g key={replayKey} data-part="stage">
        <g data-part="body">
          <g data-part="thread-r" mask={`url(#${threadMask})`}>
            <path d={threadRight(tile ? 76 : 57.5)} stroke={ink} strokeWidth={THREAD_W} strokeLinecap="round" />
          </g>
          <circle data-part="bead" cx={BEAD_X} cy={BEAD_Y} r={BEAD_R} fill={bead} mask={`url(#${beadMask})`} />
          <path data-part="thread-l" d={THREAD_LEFT} fill="none" stroke={ink} strokeWidth={THREAD_W} strokeLinecap="round" />
        </g>
        <MascotAccessories state={current} ink={ink} />
      </g>
    );
    return (
      <svg
        data-slot="sutra-mascot"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        data-shape={shape}
        data-paused={paused || undefined}
        {...labelled}
        {...props}
        ref={ref}
        data-state={current}
        className={cn("sutra-mascot shrink-0", className)}
      >
        {name ? <title id={titleId}>{name}</title> : null}
        <defs>
          <mask id={beadMask} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
            <rect width="64" height="64" fill="white" />
            <MascotFace state={current} />
            <path
              data-part="thread-l-gap"
              d={THREAD_LEFT}
              fill="none"
              stroke="black"
              strokeWidth={Number((THREAD_W + THREAD_GAP * 2).toFixed(2))}
              strokeLinecap="round"
            />
          </mask>
          <mask id={threadMask} maskUnits="userSpaceOnUse" x="-8" y="0" width="96" height="64">
            <rect x="-8" width="96" height="64" fill="white" />
            <circle cx={BEAD_X} cy={BEAD_Y} r={BEAD_R + THREAD_GAP} fill="black" />
          </mask>
          {tile ? (
            <clipPath id={clip}>
              <rect width="64" height="64" rx={TILE_RX[shape]} />
            </clipPath>
          ) : null}
        </defs>
        {tile ? (
          <>
            <rect width="64" height="64" rx={TILE_RX[shape]} fill={PAPER} />
            <rect x="0.5" y="0.5" width="63" height="63" rx={TILE_RX[shape] - 0.5} stroke={INK} strokeOpacity="0.14" />
            <g clipPath={`url(#${clip})`}>
              <g transform="translate(32 32) scale(0.9) translate(-32 -32)">{art}</g>
            </g>
          </>
        ) : (
          art
        )}
      </svg>
    );
  }
);
SutraMascot.displayName = "SutraMascot";
