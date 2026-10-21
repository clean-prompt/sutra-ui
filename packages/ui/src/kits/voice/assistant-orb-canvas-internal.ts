import * as React from "react";
import { resolveCssColor } from "../../lib/css-color";
import {
  orbStillLevel,
  smoothLevel,
  waveFrame,
  waveLayers,
  waveSpeed,
  waveY,
  type AssistantOrbState,
  type WaveLayer,
  type WavePulse,
} from "../../lib/orb";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { clampLevel, createFrameLoop, type FrameLoop, type OrbVisibility } from "./assistant-orb-internal";

/** Colours of the wave layers, resolved from the theme tokens. */
export interface WavePalette {
  /** One concrete CSS colour per layer (cycled). */
  colors: string[];
  /** A dark surface: layers add up (`lighter`) instead of covering each other. */
  dark: boolean;
}

const STOCK_TOKENS = ["--primary", "--chart-2", "--chart-6", "--chart-4", "--chart-3"] as const;
const FALLBACK = "gray";

/**
 * Reads the layer colours for a state from the theme: `--primary` and the chart hues in the stock look, `--foreground` ink in the
 * paper style (monochrome, the layers differ by opacity), `--destructive` for an error, `--muted-foreground` when muted.
 * Canvas cannot use `var()`, so each token is resolved against the element's computed style.
 */
export function readWavePalette(el: Element, state: AssistantOrbState): WavePalette {
  const style = getComputedStyle(el);
  const token = (name: string) => {
    const value = resolveCssColor(`var(${name})`, style);
    return value.startsWith("var(") || !value ? FALLBACK : value;
  };
  const paper = el.closest("[data-style]")?.getAttribute("data-style") === "paper";
  const dark = Boolean(el.closest('.dark, [data-theme="dark"]'));
  let colors: string[];
  if (state === "error") colors = [token("--destructive")];
  else if (state === "muted") colors = [token("--muted-foreground")];
  else if (paper) colors = [token("--foreground")];
  else colors = STOCK_TOKENS.map(token);
  return { colors, dark };
}

/** What `drawWave` needs: the size in css px, the device pixel ratio and where the wave is in time. */
export interface WaveDrawInput {
  width: number;
  height: number;
  dpr: number;
  layers: readonly WaveLayer[];
  /** Phase clock (seconds, already scaled by the state's wave speed). */
  phase: number;
  amplitude: number;
  pulse: WavePulse | null;
  palette: WavePalette;
  /** Mirror x for right-to-left, so a travelling pulse follows the reading direction. */
  rtl: boolean;
}

/** Draws one frame: every layer as a soft wide stroke plus a crisp thin one, added together, faded out at both ends. */
export function drawWave(ctx: CanvasRenderingContext2D, { width, height, dpr, layers, phase, amplitude, pulse, palette, rtl }: WaveDrawInput): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (width < 2 || height < 2) return;
  const mid = height / 2;
  const half = Math.max(1, mid - 3);
  const steps = Math.min(320, Math.max(24, Math.ceil(width / 2.5)));
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalCompositeOperation = palette.dark ? "lighter" : "source-over";
  layers.forEach((layer, i) => {
    ctx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const y = mid - waveY(rtl ? 1 - u : u, phase, layer, amplitude, pulse) * half;
      if (s === 0) ctx.moveTo(u * width, y);
      else ctx.lineTo(u * width, y);
    }
    ctx.strokeStyle = palette.colors[i % palette.colors.length] ?? FALLBACK;
    ctx.lineWidth = layer.width * 3.4;
    ctx.globalAlpha = layer.opacity * 0.16;
    ctx.stroke();
    ctx.lineWidth = layer.width;
    ctx.globalAlpha = layer.opacity;
    ctx.stroke();
  });
  // Fade the ends: keep the drawing where the mask is opaque.
  ctx.globalCompositeOperation = "destination-in";
  ctx.globalAlpha = 1;
  const mask = ctx.createLinearGradient(0, 0, width, 0);
  mask.addColorStop(0, "transparent");
  mask.addColorStop(0.14, "black");
  mask.addColorStop(0.86, "black");
  mask.addColorStop(1, "transparent");
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
}

/** The clock a still frame is drawn at: the thinking pulse sits in the middle and the layers are spread out. */
const STILL_CLOCK = 0.95;

/**
 * Runs the waveform on a canvas: sizes it with a ResizeObserver (DPR-aware), re-reads the palette when the theme changes
 * (`<html>` class, `data-style`, `data-theme`, `data-brand`, `data-neutral`) or the state changes, and draws from one frame
 * loop that runs only while the element is on screen, not paused and motion is allowed. Under reduced motion (and while
 * paused) it draws a still frame and no frame is ever requested.
 */
export function useWaveformCanvas(
  rootRef: React.RefObject<HTMLElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  {
    state,
    level,
    paused,
    reduced,
    rtl,
    layerCount,
    visible,
  }: { state: AssistantOrbState; level: number | undefined; paused: boolean; reduced: boolean; rtl: boolean; layerCount: number; visible: OrbVisibility }
): void {
  const target = React.useRef(0);
  const latest = useLatestRef({ state, level });
  const loopRef = React.useRef<FrameLoop | null>(null);
  const redrawRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const layers = waveLayers(layerCount);
    const size = { width: 0, height: 0, dpr: 1 };
    let palette = readWavePalette(root, latest.current.state);
    let paletteState = latest.current.state;
    // What is on screen: time, smoothed level, smoothed amplitude and how much of the thinking pulse shows. A frozen (paused)
    // wave keeps drawing these on resize.
    const clock = { t: 0, phase: 0, level: 0, amp: 0, pulse: 0, center: 0.5 };
    /** Moves the clock to the state's frame: eased by `dt` seconds, or snapped when `dt` is null (still frames). */
    const step = (dt: number | null) => {
      const s = latest.current.state;
      const frame = waveFrame(s, clock.level, clock.t);
      const mix = frame.pulse ? 1 : 0;
      if (frame.pulse) clock.center = frame.pulse.center;
      if (dt === null) {
        clock.amp = frame.amplitude;
        clock.pulse = mix;
      } else {
        clock.amp = smoothLevel(clock.amp, frame.amplitude, dt, 0.08, 0.22);
        clock.pulse = smoothLevel(clock.pulse, mix, dt, 0.25, 0.25);
      }
    };
    const still = () => {
      clock.t = STILL_CLOCK;
      clock.phase = STILL_CLOCK;
      clock.level = orbStillLevel(latest.current.state);
      step(null);
    };

    const draw = () => {
      const s = latest.current.state;
      if (s !== paletteState) {
        palette = readWavePalette(root, s);
        paletteState = s;
      }
      const pulse = clock.pulse > 0.01 ? { center: clock.center, width: 0.15 + (1 - clock.pulse) * 0.9 } : null;
      drawWave(ctx, { ...size, layers, phase: clock.phase, amplitude: clock.amp, pulse, palette, rtl });
    };
    redrawRef.current = () => {
      if (reduced) still();
      else step(null);
      draw();
    };
    // The first frame already shows the state's pose (a wave that starts off screen or paused is not a flat line).
    if (reduced) still();
    else step(null);

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      size.width = rect.width;
      size.height = rect.height;
      size.dpr = dpr;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      draw();
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
        palette = readWavePalette(root, latest.current.state);
        draw();
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-style", "data-theme", "data-brand", "data-neutral"] });
    }

    let loop: FrameLoop | undefined;
    if (!reduced) {
      loop = createFrameLoop(
        (dt) => {
          const s = latest.current.state;
          clock.t += dt;
          clock.phase += dt * waveSpeed(s);
          clock.level = smoothLevel(clock.level, target.current, dt);
          step(dt);
          draw();
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
  }, [rootRef, canvasRef, latest, reduced, paused, rtl, layerCount, visible]);

  React.useEffect(() => {
    target.current = clampLevel(level);
    loopRef.current?.wake();
    // A frozen or still wave has no loop: redraw so the new state shows at once.
    if (reduced || paused) redrawRef.current();
  }, [state, level, paused, reduced]);
}
