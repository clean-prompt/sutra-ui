import * as React from "react";
import { cn } from "../../lib/cn";
import { toneClasses, type Tone } from "../../lib/tone";
import { StatusBadge } from "../../primitives/status-badge";

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

/** Canonical model lifecycle state, shared by pickers, rows and pills. */
export type ModelState = "ready" | "starting" | "sleeping" | "stopped" | "failed" | "downloading";

/** Deprecated spellings: `asleep` (→ `sleeping`) and `loading` (→ `starting`). */
export type LegacyModelState = "asleep" | "loading";

/** What model-state props accept: the canonical states plus deprecated aliases. */
export type ModelStateInput = ModelState | LegacyModelState;

/** @deprecated Use `ModelState` (props accept `ModelStateInput`). */
export type ModelLifecycleState = ModelStateInput;

const legacyModelState: Record<LegacyModelState, ModelState> = { asleep: "sleeping", loading: "starting" };

/** Map any accepted spelling to its canonical `ModelState` (unknown or missing → `stopped`). */
export function normalizeModelState(state: ModelStateInput | string | null | undefined): ModelState {
  if (!state) return "stopped";
  if (Object.prototype.hasOwnProperty.call(modelStateTones, state)) return state as ModelState;
  return Object.prototype.hasOwnProperty.call(legacyModelState, state) ? legacyModelState[state as LegacyModelState] : "stopped";
}

/** Tone per state. Colour is secondary: the glyph shape carries the state. */
export const modelStateTones: Record<ModelState, Tone> = {
  ready: "success",
  starting: "primary",
  sleeping: "info",
  stopped: "neutral",
  failed: "destructive",
  downloading: "info",
};

/** Label per state; legacy keys resolve to their canonical label. */
export const modelStateLabels: Record<ModelStateInput, string> = {
  ready: "Ready",
  starting: "Starting",
  sleeping: "Sleeping",
  stopped: "Stopped",
  failed: "Failed",
  downloading: "Downloading",
  asleep: "Sleeping",
  loading: "Starting",
};

/** Sort order: ready first, failed last. */
export const modelStateRank: Record<ModelState, number> = { ready: 0, starting: 1, sleeping: 2, downloading: 3, stopped: 4, failed: 5 };

/* ------------------------------------------------------------------ */
/* ModelStateGlyph                                                     */
/* ------------------------------------------------------------------ */

const glyphName: Record<ModelState, string> = {
  ready: "filled-dot",
  stopped: "outline-dot",
  starting: "spinner",
  sleeping: "moon",
  failed: "warning",
  downloading: "download",
};

export interface ModelStateGlyphProps extends React.SVGAttributes<SVGSVGElement> {
  /** Model lifecycle state (for example ready, loading, cold or error); picks the glyph and its tone. */
  state: ModelStateInput;
  /** Glyph width and height in px. */
  size?: number;
}

/** Lifecycle mark: shape, not colour, carries the state (filled, outline, spinning ring, moon, warning, download). */
export const ModelStateGlyph = React.forwardRef<SVGSVGElement, ModelStateGlyphProps>(function ModelStateGlyph(
  { state: stateProp, size = 14, className, ...props },
  ref
) {
  const state = normalizeModelState(stateProp);
  const label = modelStateLabels[state];
  return (
    <svg
      ref={ref}
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox="0 0 14 14"
      data-state={stateProp}
      data-glyph={glyphName[state]}
      className={cn("shrink-0", toneClasses.text[modelStateTones[state]], state === "starting" && "motion-safe:animate-spin", className)}
      {...props}
    >
      <title>{label}</title>
      {state === "ready" ? <circle cx="7" cy="7" r="4.5" fill="currentColor" /> : null}
      {state === "stopped" ? <circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" /> : null}
      {state === "starting" ? (
        <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="7 5" strokeLinecap="round" />
      ) : null}
      {state === "sleeping" ? <path d="M9.6 9.1A4.2 4.2 0 0 1 5.2 3.6a4.5 4.5 0 1 0 5.3 5.9 4.2 4.2 0 0 1-.9-.4z" fill="currentColor" /> : null}
      {state === "failed" ? (
        <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 1.8 12.8 12H1.2z" />
          <path d="M7 6v2.4M7 10.3v.1" />
        </g>
      ) : null}
      {state === "downloading" ? (
        <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 1.8v6.6M4.2 5.8 7 8.6l2.8-2.8" />
          <path d="M2.2 9.6v2.2h9.6V9.6" />
        </g>
      ) : null}
    </svg>
  );
});
ModelStateGlyph.displayName = "ModelStateGlyph";

/* ------------------------------------------------------------------ */
/* ModelStatePill                                                      */
/* ------------------------------------------------------------------ */

export interface ModelStatePillProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Model lifecycle state (for example ready, loading, cold or error); sets the pill text, glyph and tone. */
  state: ModelStateInput;
  /** Override the visible label. */
  label?: string;
  /** Secondary text, e.g. "idle 5m" or "42%". */
  detail?: React.ReactNode;
  /** Glyph only; the label stays available to screen readers. */
  hideLabel?: boolean;
  /** Pill size. */
  size?: "sm" | "md";
}

/** Model lifecycle pill on `StatusBadge`: the state glyph, a label and optional detail text. */
export const ModelStatePill = React.forwardRef<HTMLSpanElement, ModelStatePillProps>(
  ({ className, state, label, detail, hideLabel, size = "md", ...props }, ref) => {
    const canonical = normalizeModelState(state);
    const text = label ?? modelStateLabels[canonical];
    return (
      <StatusBadge
        ref={ref}
        size={size}
        variant={hideLabel ? "plain" : "soft"}
        tone={modelStateTones[canonical]}
        data-state={state}
        title={hideLabel ? text : undefined}
        className={className}
        icon={<ModelStateGlyph state={canonical} aria-hidden="true" role="presentation" data-state={undefined} />}
        {...props}
      >
        <span className="sr-only">Model state: </span>
        <span className={cn(hideLabel && "sr-only")}>{text}</span>
        {detail != null && !hideLabel ? <span className="font-normal opacity-75">{detail}</span> : null}
      </StatusBadge>
    );
  }
);
ModelStatePill.displayName = "ModelStatePill";
