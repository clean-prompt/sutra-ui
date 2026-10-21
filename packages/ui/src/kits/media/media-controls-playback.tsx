import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  RiPauseFill,
  RiPlayFill,
  RiRepeat2Line,
  RiRepeatOneLine,
  RiShuffleLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { mediaButtonVariants } from "./media-controls-base";
import type { MediaButtonBaseProps } from "./media-controls-internal";

/* ------------------------------------------------------------------ */
/* PlayPauseButton                                                     */
/* ------------------------------------------------------------------ */

const playPauseVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center rounded-full transition-[color,background-color,scale,opacity] duration-150 active:scale-95",
    "disabled:pointer-events-none disabled:opacity-40",
    focusRing,
  ],
  {
    variants: {
      /**
       * Look: `solid` (filled), `primary`, `ghost`, `overlay` (white, for video) or `overlay-ghost`.
       * @default "solid"
       */
      variant: {
        solid: "bg-foreground text-background shadow-sm hover:opacity-90",
        primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
        ghost: "text-foreground hover:bg-accent",
        overlay: "bg-white text-black shadow-lg hover:bg-white/90 focus-visible:ring-white/60",
        "overlay-ghost": "text-white hover:bg-white/15 focus-visible:ring-white/50",
      },
      /**
       * Button diameter: `sm` 32px, `md` 40px, `lg` 48px or `xl` 64px.
       * @default "md"
       */
      size: {
        sm: "size-8 [&_svg]:size-4",
        md: "size-10 [&_svg]:size-5",
        lg: "size-12 [&_svg]:size-6",
        xl: "size-16 [&_svg]:size-8",
      },
    },
    defaultVariants: { variant: "solid", size: "md" },
  }
);

export interface PlayPauseButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof playPauseVariants> {
  /** Whether media is playing; shows the pause icon when true and the play icon when false. */
  playing: boolean;
  /** Show a spinner ring around the icon (buffering). */
  loading?: boolean;
  /** Accessible name while paused. Default "Play". */
  playLabel?: string;
  /** Accessible name while playing. Default "Pause". */
  pauseLabel?: string;
}

/** Round play/pause toggle whose icon morphs between the two states. */
export const PlayPauseButton = React.forwardRef<HTMLButtonElement, PlayPauseButtonProps>(
  ({ playing, loading, playLabel = "Play", pauseLabel = "Pause", variant, size, className, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={playing ? pauseLabel : playLabel}
      data-state={playing ? "playing" : "paused"}
      className={cn(playPauseVariants({ variant, size }), className)}
      {...props}
    >
      <RiPlayFill
        aria-hidden
        className={cn(
          "absolute translate-x-[6%] rtl:-translate-x-[6%] transition-[opacity,scale,rotate] duration-200 ease-out-quart motion-reduce:transition-none",
          playing ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
        )}
      />
      <RiPauseFill
        aria-hidden
        className={cn(
          "absolute transition-[opacity,scale,rotate] duration-200 ease-out-quart motion-reduce:transition-none",
          playing ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
        )}
      />
      {loading && (
        <span aria-hidden className="pointer-events-none absolute -inset-1 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60 motion-reduce:animate-none" />
      )}
    </button>
  )
);
PlayPauseButton.displayName = "PlayPauseButton";

/* ------------------------------------------------------------------ */
/* SkipButton                                                          */
/* ------------------------------------------------------------------ */

function SkipGlyph({ seconds, direction }: { seconds: number; direction: "back" | "forward" }) {
  const back = direction === "back";
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-full">
      <path
        d={back ? "M12 5A7.5 7.5 0 1 1 5.5 8.75" : "M12 5A7.5 7.5 0 1 0 18.5 8.75"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d={back ? "M14.2 2.8 12 5l2.2 2.2" : "M9.8 2.8 12 5 9.8 7.2"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="12"
        y="15.4"
        textAnchor="middle"
        fontSize={seconds >= 100 ? 5.5 : 7}
        fontWeight={700}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fill="currentColor"
      >
        {seconds}
      </text>
    </svg>
  );
}

export interface SkipButtonProps extends MediaButtonBaseProps {
  /** `back` skips backwards, `forward` skips ahead. Default "forward". */
  direction?: "back" | "forward";
  /** Seconds to skip (drawn inside the glyph). Default 10. */
  seconds?: number;
  /** Called with the signed delta, e.g. `-10`. */
  onSkip?: (delta: number) => void;
}

/** Circular-arrow button that skips back or forward a number of seconds. */
export const SkipButton = React.forwardRef<HTMLButtonElement, SkipButtonProps>(
  ({ direction = "forward", seconds = 10, onSkip, onClick, tone, size, className, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={direction === "back" ? `Back ${seconds} seconds` : `Forward ${seconds} seconds`}
      className={cn(mediaButtonVariants({ tone, size }), "[&>svg]:size-[60%]", className)}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onSkip?.(direction === "back" ? -seconds : seconds);
      }}
      {...props}
    >
      <SkipGlyph seconds={seconds} direction={direction} />
    </button>
  )
);
SkipButton.displayName = "SkipButton";


/* ------------------------------------------------------------------ */
/* Repeat / Shuffle                                                    */
/* ------------------------------------------------------------------ */

export type RepeatMode = "off" | "all" | "one";

/** off → all → one → off. */
export function nextRepeatMode(mode: RepeatMode): RepeatMode {
  return mode === "off" ? "all" : mode === "all" ? "one" : "off";
}

const repeatLabels: Record<RepeatMode, string> = { off: "Repeat off", all: "Repeat all", one: "Repeat one" };

export interface RepeatButtonProps extends MediaButtonBaseProps {
  /** Controlled repeat mode: `off`, `all` or `one`. */
  value?: RepeatMode;
  /** Initial mode when `value` is not controlled. Default "off". */
  defaultValue?: RepeatMode;
  /** Called with the next mode when the user presses the button, which cycles off, all and one. */
  onValueChange?: (mode: RepeatMode) => void;
}

/** Tri-state repeat toggle cycling off → all → one. */
export const RepeatButton = React.forwardRef<HTMLButtonElement, RepeatButtonProps>(
  ({ value, defaultValue = "off", onValueChange, onClick, tone, size, className, type, ...props }, ref) => {
    const [mode, setMode] = useControllableState<RepeatMode>({ value, defaultValue, onChange: onValueChange });
    const Icon = mode === "one" ? RiRepeatOneLine : RiRepeat2Line;
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        aria-label={repeatLabels[mode]}
        aria-pressed={mode !== "off"}
        data-state={mode}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) setMode(nextRepeatMode(mode));
        }}
        className={cn(mediaButtonVariants({ tone, size, active: mode !== "off" }), className)}
        {...props}
      >
        <Icon aria-hidden />
        {mode !== "off" && <span aria-hidden className="absolute bottom-1 start-1/2 size-1 -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-current" />}
      </button>
    );
  }
);
RepeatButton.displayName = "RepeatButton";

export interface ShuffleButtonProps extends MediaButtonBaseProps {
  /** Controlled shuffle state. */
  pressed?: boolean;
  /** Initial state when `pressed` is not controlled. */
  defaultPressed?: boolean;
  /** Called with the new state when the user presses the button. */
  onPressedChange?: (pressed: boolean) => void;
}

/** Shuffle on/off toggle. */
export const ShuffleButton = React.forwardRef<HTMLButtonElement, ShuffleButtonProps>(
  ({ pressed, defaultPressed = false, onPressedChange, onClick, tone, size, className, type, ...props }, ref) => {
    const [on, setOn] = useControllableState({ value: pressed, defaultValue: defaultPressed, onChange: onPressedChange });
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        aria-label="Shuffle"
        aria-pressed={on}
        data-state={on ? "on" : "off"}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) setOn(!on);
        }}
        className={cn(mediaButtonVariants({ tone, size, active: on }), className)}
        {...props}
      >
        <RiShuffleLine aria-hidden />
        {on && <span aria-hidden className="absolute bottom-1 start-1/2 size-1 -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-current" />}
      </button>
    );
  }
);
ShuffleButton.displayName = "ShuffleButton";
