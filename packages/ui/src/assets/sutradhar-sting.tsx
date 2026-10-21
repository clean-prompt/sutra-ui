import * as React from "react";
import { cn } from "../lib/cn";
import { useSafeId } from "../hooks/use-safe-id";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { useIsoLayoutEffect, useLatestRef } from "../hooks/use-iso-layout-effect";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useFrameTicker } from "./mascot-driver-internal";
import { drawFrame, newDrawState, nodesToMarkup, signature } from "./mascot-kit-internal";
import { accessibleName, svgA11y } from "./svg-a11y-internal";
import { ASTRA_ENDLESS_STING, ASTRA_STING, MARK_STING, astraEndlessFrame, astraFrame, markFrame, type StingCtx } from "./sutradhar-sting-internal";

export type SutradharStingVariant = "mark" | "astra" | "astra-endless";

export interface SutradharStingProps extends Omit<React.ComponentPropsWithoutRef<"svg">, "children" | "title"> {
  /**
   * `mark` Sutradhar walks in with a bare thread, the crescent bead drops onto it and becomes the Sutra mark, he plants it and
   * smiles (about 4.6 s). `astra` he summons a hand astra (the crescent bead on a short thread), charges it until ink lightning
   * crackles round the bead, swings it into the aim and fires an ink wave out of its head into empty space (about 5.4 s). Both
   * end on a still lockup. `astra-endless` is the same astra on a wide stage that never stops once fired: the lightning keeps
   * crackling round the bead, arcs and beads flow out along the wave, and the wave streams on across the whole stage and thins
   * away at its far end (it is at full length after about 4.6 s and keeps playing while on screen).
   * @default "mark"
   */
  variant?: SutradharStingVariant;
  /**
   * The astra's aim in degrees, measured like a protractor: 90 points straight up, 180 level to the left, 270 straight down.
   * Clamped to 30 to 330; left out, `astra` aims at 150 and `astra-endless` at 172. Aimed to the right (under 90 or over
   * 270) he turns round and faces where he fires; aimed steeply up or down the view pulls back just enough to keep the whole
   * wave on the stage, and for a downward shot he rises off the ground as he swings. `mark` does not use it.
   */
  aim?: number;
  /**
   * What the astra fires (both astra variants): `wave`, the layered ink wave, or `lightning`, a forked ink bolt that strikes out
   * at once and crackles (the astra's settles to a shorter, quieter bolt on its lockup; the endless one keeps striking with
   * pulses running along it). `mark` does not use it.
   * @default "wave"
   */
  discharge?: "wave" | "lightning";
  /**
   * Play once when the sting first comes on screen. False shows the final lockup until `replayKey` changes.
   * @default true
   */
  autoPlay?: boolean;
  /**
   * Play again after a short hold on the lockup, for as long as it is on screen. `astra-endless` never stops, so it has no use
   * for it.
   * @default false
   */
  loop?: boolean;
  /** Change it to play the sting again from the start. */
  replayKey?: string | number;
  /**
   * Called when a play reaches its lockup (also at once under reduced motion, where only the lockup is shown); for
   * `astra-endless`, once its stream runs at full length (it keeps playing).
   */
  onComplete?: () => void;
  /**
   * Rendered height: a number of pixels or any CSS length; the width follows the drawing (6:5 for `mark`, 16:13 for `astra`,
   * 32:13 for `astra-endless`). Unlike `SutraMascot` and the brand marks, whose `size` is both width and height, the stings
   * are wider than tall, so `size` is the height only.
   * @default 160
   */
  size?: number | string;
  /** Freeze the animation where it is (the clock stops; resume to carry on from there). Use it for off-screen or background stings. */
  paused?: boolean;
  /**
   * Accessible name. A string names the graphic, `true` uses the label of the variant (`Sutradhar forms the Sutra mark`, ...),
   * and leaving it out keeps the sting decorative (hidden from assistive technology).
   */
  title?: string | boolean;
}

/* each sting's stage, frame function, aim (lowest, and the one used when it is left out) and whether it ever ends */
const STINGS = {
  mark: { ...MARK_STING, frame: markFrame, aim: [30, 150], endless: false },
  astra: { ...ASTRA_STING, frame: astraFrame, aim: [30, 150], endless: false },
  "astra-endless": { ...ASTRA_ENDLESS_STING, frame: astraEndlessFrame, aim: [30, 172], endless: true },
} as const;
/** The accessible name of each variant, used when `title` is `true`. */
const STING_LABELS: Record<SutradharStingVariant, string> = {
  mark: "Sutradhar forms the Sutra mark",
  astra: "Sutradhar fires a hand astra",
  "astra-endless": "Sutradhar fires an endless astra",
};
/** The same, for the astras when they fire lightning. */
const LIGHTNING_LABELS: Partial<Record<SutradharStingVariant, string>> = {
  astra: "Sutradhar fires lightning from a hand astra",
  "astra-endless": "Sutradhar fires endless lightning from a hand astra",
};
/** How long a looping sting rests on its lockup before it plays again, and how long it fades out and back in. */
const HOLD = 1.6;
const LOOP_FADE = 0.3;

/**
 * A short logo sting with Sutradhar and the Sutra mark (the crescent bead on its thread), drawn in ink like the mascot. The
 * final lockup is the markup (it renders on the server, under reduced motion and before a play starts); while it plays, the
 * shared mascot frame driver writes the frames. It pauses off screen; `astra-endless` keeps streaming for as long as it is on
 * screen. Decorative unless `title` is set. The art is direction-agnostic: it is drawn the same in left-to-right and right-to-left
 * layouts (Sutradhar walks in from the left and the astra's aim is a protractor angle, like a logo), so it is never mirrored.
 */
export const SutradharSting = React.forwardRef<SVGSVGElement, SutradharStingProps>(
  ({ variant = "mark", aim, discharge = "wave", autoPlay = true, loop = false, replayKey, onComplete, size = 160, paused = false, title, className, style, ...props }, ref) => {
    const id = useSafeId("sutradhar-sting");
    const titleId = `${id}-title`;
    const reduced = usePrefersReducedMotion();
    const def = STINGS[variant] ?? STINGS.mark;
    /* the mark does not use the aim, so a change of it must not redraw (or restart) it */
    const aimDeg = def === STINGS.mark ? 0 : Math.min(330, Math.max(def.aim[0], Number.isFinite(aim) ? (aim as number) : def.aim[1]));
    const px = typeof size === "number" ? size : 160;
    /* (the mark fires nothing, so the discharge must not redraw it either) */
    const fires = def === STINGS.mark ? "wave" : discharge === "lightning" ? "lightning" : "wave";
    const base: Omit<StingCtx, "tt" | "still"> = { size: px, ink: "currentColor", aim: aimDeg, discharge: fires };
    const lockup = React.useMemo(() => {
      const nodes = def.frame({ size: px, ink: "currentColor", aim: aimDeg, discharge: fires, tt: 99, still: true });
      return { markup: nodesToMarkup(nodes, id), sig: signature(nodes) };
    }, [def, px, aimDeg, fires, id]);
    const groupRef = React.useRef<SVGGElement>(null);
    const svgRef = React.useRef<SVGSVGElement | null>(null);
    const setRefs = useMergedRefs<SVGSVGElement>(svgRef, ref);
    /* a play: requested on mount (autoPlay) and by every new replayKey; it ends on the lockup unless it loops */
    const [play, setPlay] = React.useState(0);
    const requested = React.useRef<string | number | undefined | null>(null);
    React.useEffect(() => {
      if (requested.current === null) {
        requested.current = replayKey;
        if (autoPlay) setPlay((n) => n + 1);
        return;
      }
      if (requested.current !== replayKey) {
        requested.current = replayKey;
        setPlay((n) => n + 1);
      }
    }, [replayKey, autoPlay]);
    const done = useLatestRef(onComplete);
    const [playing, setPlaying] = React.useState(false);
    React.useEffect(() => {
      if (!play) return;
      if (reduced) {
        setPlaying(false);
        done.current?.();
        return;
      }
      setPlaying(true);
    }, [play, reduced, done]);
    const clock = React.useRef({ elapsed: 0, last: 0, ended: false, streaming: false });
    const drawn = React.useRef(newDrawState());
    /* the art's opacity, for a loop that fades through instead of cutting back to the start */
    const fade = (v: number) => {
      const g = groupRef.current;
      if (!g) return;
      if (v >= 1) g.removeAttribute("opacity");
      else g.setAttribute("opacity", String(Math.round(Math.max(0, v) * 100) / 100));
    };
    const draw = (tt: number, still: boolean) => {
      const g = groupRef.current;
      if (g) drawFrame(g, drawn.current, lockup, def.frame({ ...base, tt, still }), id);
    };
    /* the first frame goes in before paint, so a play never flashes the lockup first */
    const first = useLatestRef(() => {
      fade(1);
      draw(0, false);
    });
    /* a new variant or aim remounts the art (see its key): a play in progress starts again on the new one, from its first frame */
    useIsoLayoutEffect(() => {
      if (!playing) return;
      clock.current = { elapsed: 0, last: 0, ended: false, streaming: false };
      first.current();
    }, [playing, play, def, aimDeg, fires, first]);
    /* motion turned off (also by the in-app switch) while a frame is on screen: the lockup goes back in, as the mascot does, so
       the drawing never freezes on a frame from the middle of the play */
    useIsoLayoutEffect(() => {
      const g = groupRef.current;
      if (!reduced || !g || !drawn.current.g) return;
      g.innerHTML = lockup.markup;
      g.removeAttribute("opacity");
      drawn.current = newDrawState();
    }, [reduced, lockup.markup]);
    /* a pause stops the clock: the next frame after it carries on from where it stood, not from the time that passed */
    useIsoLayoutEffect(() => {
      if (paused) clock.current.last = 0;
    }, [paused]);
    useFrameTicker(svgRef, playing && !reduced && !paused, (now) => {
      const c = clock.current;
      if (c.ended || reduced) return; /* a frame can come before React has committed the end of the play, or the switch to reduced motion */
      c.elapsed += c.last ? Math.min(0.1, Math.max(0, now - c.last)) : 0;
      c.last = now;
      /* the endless astra never ends: it reports once its stream runs at full length and keeps drawing */
      if (def.endless) {
        if (!c.streaming && c.elapsed >= def.len) {
          c.streaming = true;
          done.current?.();
        }
        draw(c.elapsed, false);
        return;
      }
      if (loop) {
        const cycle = def.len + HOLD, at = c.elapsed % cycle;
        /* out over the end of the hold, in over the start (not the first play's) */
        fade(Math.min(1, (cycle - at) / LOOP_FADE, c.elapsed < cycle ? 1 : at / LOOP_FADE));
        draw(at, false);
        return;
      }
      fade(1);
      if (c.elapsed >= def.len) {
        c.ended = true;
        draw(99, true);
        setPlaying(false);
        done.current?.();
        return;
      }
      draw(c.elapsed, false);
    });
    const [w, h] = def.box;
    const height = size;
    const width = typeof size === "number" ? Math.round((size * w) / h) : `calc(${size} * ${w / h})`;
    const name = accessibleName(title, (fires === "lightning" && LIGHTNING_LABELS[variant]) || (STING_LABELS[variant] ?? STING_LABELS.mark));
    const named = svgA11y(name, titleId);
    return (
      <svg
        data-slot="sutradhar-sting"
        viewBox={`0 0 ${w} ${h}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        data-variant={variant}
        data-playing={playing || undefined}
        data-paused={paused || undefined}
        {...named}
        {...props}
        ref={setRefs}
        className={cn("shrink-0 overflow-hidden", className)}
        style={style}
      >
        {name ? <title id={titleId}>{name}</title> : null}
        <g ref={groupRef} data-part="art" key={`${variant}-${aimDeg}-${fires}`} dangerouslySetInnerHTML={{ __html: lockup.markup }} />
      </svg>
    );
  }
);
SutradharSting.displayName = "SutradharSting";
