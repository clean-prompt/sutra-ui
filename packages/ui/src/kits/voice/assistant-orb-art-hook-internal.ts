// Assistant orb art: the canvas hook that runs a look (private).
import * as React from "react";
import { effectiveLevel, orbStillLevel, smoothLevel, type AssistantOrbState, type OrbArtVariant } from "../../lib/orb";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { clampLevel, createFrameLoop, type FrameLoop, type OrbVisibility } from "./assistant-orb-internal";
import { readOrbArtPalette, LevelHistory, type ArtFrame, type ArtScratch } from "./assistant-orb-art-core-internal";
import { artStillTime, drawOrbArt } from "./assistant-orb-art-draw-internal";

/* ------------------------------------------------------------------ */
/* The hook                                                            */
/* ------------------------------------------------------------------ */


/** Pixel ratio cap of the ink looks (they redraw every frame; 2 is crisp and keeps the fill cost down). */
export const ART_MAX_DPR = 2;

/**
 * Runs an ink look on a canvas: sizes it with a ResizeObserver (pixel ratio capped), re-reads the palette when the theme
 * or the state changes, keeps a short history of the smoothed level (for per-bead, per-ring and per-wave delays) and the
 * loud moments, and draws from one frame loop that runs only while the element is on screen, not paused and motion is
 * allowed. The first frame is the still pose of the state; under reduced motion that pose is all there is (no frame is
 * ever requested) and it is redrawn when the state or the theme changes.
 */
export function useOrbArtCanvas(
  rootRef: React.RefObject<HTMLElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  {
    variant,
    state,
    level,
    paused,
    reduced,
    rtl,
    visible,
  }: { variant: OrbArtVariant; state: AssistantOrbState; level: number | undefined; paused: boolean; reduced: boolean; rtl: boolean; visible: OrbVisibility }
): void {
  const target = React.useRef(0);
  const latest = useLatestRef({ state, variant });
  const loopRef = React.useRef<FrameLoop | null>(null);
  const redrawRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = { width: 0, height: 0 };
    const scratch: ArtScratch = { dpr: 1 };
    const history = new LevelHistory();
    const peaks: { t: number; id: number }[] = [];
    let peakId = 0;
    let lastPeak = -1e9;
    let palette = readOrbArtPalette(root, latest.current.state);
    let paletteState = latest.current.state;
    // The clock starts at the still time of the state, so the first frame is that pose and the motion carries on from it.
    const clock = { t: artStillTime(latest.current.variant, latest.current.state), level: 0 };
    // Until the loop has run a frame there is no live level: draw the still pose (also when paused or off screen).
    let live = false;

    const draw = (still: boolean) => {
      const { state: s, variant: v } = latest.current;
      if (s !== paletteState) {
        palette = readOrbArtPalette(root, s);
        paletteState = s;
      }
      const t = still ? artStillTime(v, s, size.width, size.height) : clock.t;
      const stillLevel = orbStillLevel(s);
      const frame: ArtFrame = {
        state: s,
        t,
        still,
        level: still ? () => stillLevel : (back = 0) => effectiveLevel(s, history.at(clock.t - back)),
        peaks: still ? (s === "speaking" ? [{ age: 0.24, id: 5 }] : []) : peaks.map((pk) => ({ age: clock.t - pk.t, id: pk.id })),
        palette,
        rtl,
      };
      ctx.setTransform(scratch.dpr, 0, 0, scratch.dpr, 0, 0);
      ctx.clearRect(0, 0, size.width, size.height);
      if (size.width < 2 || size.height < 2) return;
      drawOrbArt(ctx, v, size.width, size.height, frame, scratch);
    };
    const still = () => reduced || !live;
    redrawRef.current = () => draw(still());

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(ART_MAX_DPR, window.devicePixelRatio || 1);
      size.width = rect.width;
      size.height = rect.height;
      scratch.dpr = dpr;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      draw(still());
    };
    resize();

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize);
      ro.observe(root);
    }
    let mo: MutationObserver | undefined;
    if (typeof MutationObserver !== "undefined") {
      mo = new MutationObserver(() => {
        palette = readOrbArtPalette(root, latest.current.state);
        draw(still());
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-style", "data-theme", "data-brand", "data-neutral"] });
    }

    let loop: FrameLoop | undefined;
    if (!reduced) {
      loop = createFrameLoop(
        (dt) => {
          clock.t += dt;
          live = true;
          const before = clock.level;
          clock.level = smoothLevel(clock.level, target.current, dt);
          history.push(clock.t, clock.level);
          if (before < 0.5 && clock.level >= 0.5 && clock.t - lastPeak >= 0.42) {
            lastPeak = clock.t;
            peaks.push({ t: clock.t, id: ++peakId });
          }
          while (peaks.length && clock.t - peaks[0]!.t > 0.8) peaks.shift();
          draw(false);
          return true;
        },
        () => !paused && visible.current
      );
      loopRef.current = loop;
      const wake = () => loop!.wake();
      visible.wake.add(wake);
      loop.wake();
      return () => {
        visible.wake.delete(wake);
        loop!.stop();
        loopRef.current = null;
        ro?.disconnect();
        mo?.disconnect();
      };
    }
    return () => {
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [rootRef, canvasRef, latest, reduced, paused, rtl, visible]);

  React.useEffect(() => {
    target.current = clampLevel(level);
    loopRef.current?.wake();
    // A frozen or still look has no loop: redraw so a new state or variant shows at once.
    if (reduced || paused) redrawRef.current();
  }, [state, variant, level, paused, reduced]);
}
