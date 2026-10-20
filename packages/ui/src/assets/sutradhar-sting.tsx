import * as React from "react";
import { cn } from "../lib/cn";
import { useSafeId } from "../hooks/use-safe-id";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { useIsoLayoutEffect, useLatestRef } from "../hooks/use-iso-layout-effect";
import { useFrameTicker } from "./mascot-driver-internal";
import { drawFrame, newDrawState, nodesToMarkup, signature } from "./mascot-kit-internal";
import { ASTRA_STING, MARK_STING, astraFrame, markFrame, type StingCtx } from "./sutradhar-sting-internal";

export type SutradharStingVariant = "mark" | "astra";

export interface SutradharStingProps extends Omit<React.ComponentPropsWithoutRef<"svg">, "children" | "title"> {
  /**
   * `mark` Sutradhar walks in with a bare thread, the crescent bead drops onto it and becomes the Sutra mark, he plants it and
   * smiles (about 4.6 s). `astra` he summons a hand astra (the crescent bead on a short thread), charges it, swings it into the
   * aim and fires an ink wave out of its head into empty space (about 5.4 s). Both end on a still lockup.
   * @default "mark"
   */
  variant?: SutradharStingVariant;
  /**
   * The astra's aim in degrees, measured like a protractor: 90 points straight up, 135 up and to the left, 180 level to the
   * left. Clamped to 135 to 180. Only for `variant="astra"`.
   * @default 150
   */
  aim?: number;
  /**
   * Play once when the sting first comes on screen. False shows the final lockup until `replayKey` changes.
   * @default true
   */
  autoPlay?: boolean;
  /**
   * Play again after a short hold on the lockup, for as long as it is on screen.
   * @default false
   */
  loop?: boolean;
  /** Change it to play the sting again from the start. */
  replayKey?: string | number;
  /** Called when a play reaches its lockup (also at once under reduced motion, where only the lockup is shown). */
  onComplete?: () => void;
  /**
   * Rendered height: a number of pixels or any CSS length; the width follows the drawing (6:5 for `mark`, 16:13 for `astra`).
   * @default 160
   */
  size?: number | string;
  /** Accessible name. Leave it out to keep the sting decorative (hidden from assistive technology). */
  title?: string;
}

const STINGS = {
  mark: { ...MARK_STING, frame: markFrame },
  astra: { ...ASTRA_STING, frame: astraFrame },
} as const;
/** How long a looping sting rests on its lockup before it plays again. */
const HOLD = 1.6;

/**
 * A short logo sting with Sutradhar and the Sutra mark (the crescent bead on its thread), drawn in ink like the mascot. The
 * final lockup is the markup (it renders on the server, under reduced motion and before a play starts); while it plays, the
 * shared mascot frame driver writes the frames. It pauses off screen. Decorative unless `title` is set.
 */
export const SutradharSting = React.forwardRef<SVGSVGElement, SutradharStingProps>(
  ({ variant = "mark", aim = 150, autoPlay = true, loop = false, replayKey, onComplete, size = 160, title, className, style, ...props }, ref) => {
    const id = useSafeId("sutradhar-sting");
    const titleId = `${id}-title`;
    const reduced = usePrefersReducedMotion();
    const def = STINGS[variant] ?? STINGS.mark;
    const aimDeg = Math.min(180, Math.max(135, Number.isFinite(aim) ? aim : 150));
    const px = typeof size === "number" ? size : 160;
    const base: Omit<StingCtx, "tt" | "still"> = { size: px, ink: "currentColor", aim: aimDeg };
    const lockup = React.useMemo(() => {
      const nodes = def.frame({ size: px, ink: "currentColor", aim: aimDeg, tt: 99, still: true });
      return { markup: nodesToMarkup(nodes, id), sig: signature(nodes) };
    }, [def, px, aimDeg, id]);
    const groupRef = React.useRef<SVGGElement>(null);
    const svgRef = React.useRef<SVGSVGElement | null>(null);
    const setRefs = React.useCallback(
      (node: SVGSVGElement | null) => {
        svgRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );
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
    const clock = React.useRef({ elapsed: 0, last: 0, ended: false });
    const drawn = React.useRef(newDrawState());
    const draw = (tt: number, still: boolean) => {
      const g = groupRef.current;
      if (g) drawFrame(g, drawn.current, lockup, def.frame({ ...base, tt, still }), id);
    };
    /* the first frame goes in before paint, so a play never flashes the lockup first */
    const first = useLatestRef(() => draw(0, false));
    useIsoLayoutEffect(() => {
      if (!playing) return;
      clock.current = { elapsed: 0, last: 0, ended: false };
      first.current();
    }, [playing, play, first]);
    useFrameTicker(svgRef, playing && !reduced, (now) => {
      const c = clock.current;
      if (c.ended) return; /* a frame can come before React has committed the end of the play */
      c.elapsed += c.last ? Math.min(0.1, Math.max(0, now - c.last)) : 0;
      c.last = now;
      if (loop) {
        draw(c.elapsed % (def.len + HOLD), false);
        return;
      }
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
    const named = title ? ({ role: "img", "aria-labelledby": titleId } as const) : ({ "aria-hidden": true, focusable: "false" } as const);
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
        {...named}
        {...props}
        ref={setRefs}
        className={cn("shrink-0 overflow-hidden", className)}
        style={style}
      >
        {title ? <title id={titleId}>{title}</title> : null}
        <g ref={groupRef} data-part="art" key={`${variant}-${aimDeg}`} dangerouslySetInnerHTML={{ __html: lockup.markup }} />
      </svg>
    );
  }
);
SutradharSting.displayName = "SutradharSting";
