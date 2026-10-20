import * as React from "react";
import {
  assistantOrbLabels,
  normalizeOrbState,
  orbParams,
  resolveOrbState,
  type AssistantOrbFlags,
  type AssistantOrbState,
} from "../../lib/orb";
import { useDirection } from "../../hooks/use-direction";
import { usePrefersReducedMotion } from "../../hooks/use-media-query";
import { useMergedRefs } from "../../hooks/use-merged-refs";
import { useWaveformCanvas } from "./assistant-orb-canvas-internal";
import { useOrbLevel, useOrbVisible } from "./assistant-orb-internal";

export { assistantOrbStates, assistantOrbLabels, type AssistantOrbFlags, type AssistantOrbState } from "../../lib/orb";

/** Props of `AssistantOrb`. */
export interface AssistantOrbProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * What the assistant is doing: `idle` (breathing, muted colour), `listening` (swells with `level`, ripples on loud input),
   * `thinking` (faster swirl, an orbiting arc, a travelling pulse in the waveform), `speaking` (a rhythmic pulse and expanding
   * rings), `error` or `muted`. Each has its own shape as well as its own motion, so the state reads under reduced motion.
   * Default "idle".
   */
  state?: AssistantOrbState;
  /**
   * The live amplitude, 0 to 1: the microphone while listening, the audio output while speaking. It is smoothed inside (fast
   * attack, slow release) and written to a CSS variable, so feeding it every frame does not render the orb's parts again.
   * States that do not follow the level (idle, error, muted) ignore it. Default 0.
   */
  level?: number;
  /** `orb` is a radial glass orb of blurred colour layers; `waveform` is a canvas of layered sine waves. Default "orb". */
  variant?: "orb" | "waveform";
  /**
   * Size in px (a number) or any CSS length. For the orb it is the width and height. For the waveform it is the height; the
   * width is three times that, and `className="w-full"` stretches it (the canvas follows its box). Default 128 (orb) or 64
   * (waveform).
   */
  size?: number | string;
  /**
   * Accessible name. By default it says what the state is ("Assistant is listening"). Pass your own to name the assistant, or
   * `""` to make the orb decorative (`aria-hidden`) when text beside it already says what is going on. The name is not a live
   * region: announce state changes in a status text of your own.
   */
  label?: string;
  /** Freezes the animation where it is: no frame loop, ambient motion held. The state and size still apply. Default false. */
  paused?: boolean;
}

/** Inline custom properties shared by both variants: the size and the targets of the state (`orbParams`). */
function orbStyle(state: AssistantOrbState, size: number | string, style: React.CSSProperties | undefined): React.CSSProperties {
  const p = orbParams(state);
  return {
    "--orb-size": typeof size === "number" ? `${size}px` : size,
    "--orb-scale": p.scale,
    "--orb-swell": p.swell,
    "--orb-sat": p.saturation,
    "--orb-speed": p.speed,
    "--orb-ring": `${p.ringRate || 1.5}s`,
    "--orb-glow": p.glow,
    ...style,
  } as React.CSSProperties;
}

const rootAria = (label: string) => (label ? ({ role: "img", "aria-label": label } as const) : ({ "aria-hidden": true } as const));

const BLOBS = [1, 2, 3, 4] as const;

const OrbView = React.forwardRef<HTMLDivElement, AssistantOrbProps>(
  ({ state: stateProp, level, size = 128, label, paused = false, className, style, ...props }, ref) => {
    const state = normalizeOrbState(stateProp);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const setRef = useMergedRefs<HTMLDivElement>(ref, rootRef);
    const reduced = usePrefersReducedMotion();
    const visible = useOrbVisible(rootRef);
    useOrbLevel(rootRef, { state, level, paused, reduced, visible });
    return (
      <div
        data-slot="assistant-orb"
        data-variant="orb"
        {...rootAria(label ?? assistantOrbLabels[state])}
        data-paused={paused ? "" : undefined}
        {...props}
        ref={setRef}
        data-state={state}
        className={className}
        style={orbStyle(state, size, style)}
      >
        <span data-part="halo" aria-hidden="true" />
        <span data-part="ripple" aria-hidden="true" />
        <span data-part="ripple" aria-hidden="true" />
        <span data-part="ripple" aria-hidden="true" />
        <span data-part="ring" data-i="1" aria-hidden="true" />
        <span data-part="ring" data-i="2" aria-hidden="true" />
        <span data-part="pose" aria-hidden="true">
          <span data-part="body">
            <span data-part="blobs">
              {BLOBS.map((n) => (
                <span key={n} data-part="blob" data-blob={n}>
                  <i />
                </span>
              ))}
            </span>
            <span data-part="shine" />
          </span>
        </span>
        <svg data-part="arc" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <circle cx="50" cy="50" r="47" pathLength="100" />
        </svg>
      </div>
    );
  }
);
OrbView.displayName = "OrbView";

const WaveformView = React.forwardRef<HTMLDivElement, AssistantOrbProps>(
  ({ state: stateProp, level, size = 64, label, paused = false, className, style, ...props }, ref) => {
    const state = normalizeOrbState(stateProp);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const setRef = useMergedRefs<HTMLDivElement>(ref, rootRef);
    const reduced = usePrefersReducedMotion();
    const rtl = useDirection(rootRef) === "rtl";
    const visible = useOrbVisible(rootRef);
    useWaveformCanvas(rootRef, canvasRef, { state, level, paused, reduced, rtl, layerCount: 5, visible });
    return (
      <div
        data-slot="assistant-orb"
        data-variant="waveform"
        {...rootAria(label ?? assistantOrbLabels[state])}
        data-paused={paused ? "" : undefined}
        {...props}
        ref={setRef}
        data-state={state}
        className={className}
        style={orbStyle(state, size, style)}
      >
        <canvas ref={canvasRef} data-part="canvas" aria-hidden="true" />
      </div>
    );
  }
);
WaveformView.displayName = "WaveformView";

/**
 * The voice assistant's face: a radial glass orb or a layered waveform that shows what the assistant is doing (idle, listening,
 * thinking, speaking) and follows a live `level`. Colours come from the theme (primary and chart hues, ink in the paper style).
 */
export const AssistantOrb = React.forwardRef<HTMLDivElement, AssistantOrbProps>(({ variant = "orb", ...props }, ref) =>
  variant === "waveform" ? <WaveformView ref={ref} {...props} /> : <OrbView ref={ref} {...props} />
);
AssistantOrb.displayName = "AssistantOrb";

/**
 * The orb state for what a voice session is doing, by priority: error, speaking, thinking, listening, muted, idle. The
 * assistant's own activity outranks the user's, so a barge-in shows `listening` only once the assistant stops. The result is
 * stable between renders for the same flags.
 */
export function useAssistantOrbState(flags: AssistantOrbFlags): AssistantOrbState {
  const { listening, thinking, speaking, error, muted } = flags;
  return React.useMemo(
    () => resolveOrbState({ listening, thinking, speaking, error, muted }),
    [listening, thinking, speaking, error, muted]
  );
}
