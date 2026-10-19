import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import {
  RiClosedCaptioningLine,
  RiPauseFill,
  RiPlayFill,
  RiRepeat2Line,
  RiRepeatOneLine,
  RiShuffleLine,
  RiTranslate2,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useIsoLayoutEffect, useLatestRef } from "../../hooks/use-iso-layout-effect";
import { formatClock } from "../../lib/duration";
import { clamp, toPercent } from "../../lib/math";
import { Spinner } from "../../primitives/spinner";
import { VolumeSlider } from "../../primitives/volume-slider";
import {
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  menuContentClass,
} from "../../primitives/dropdown-menu";

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

/** Menus rendered by media controls portal into this element (needed while a player is fullscreen). */
export function MediaPortalProvider({ container, children }: { container: HTMLElement | null; children?: React.ReactNode }) {
  return <MediaPortalContext.Provider value={container}>{children}</MediaPortalContext.Provider>;
}
MediaPortalProvider.displayName = "MediaPortalProvider";

/** The element media menus portal into, or null for `document.body`. */
export function useMediaPortalContainer() {
  return React.useContext(MediaPortalContext);
}

/* ------------------------------------------------------------------ */
/* useMediaElement                                                     */
/* ------------------------------------------------------------------ */

export interface MediaTimeRange {
  start: number;
  end: number;
}

/** The subset of `HTMLMediaElement` the hook reads and drives (lets you plug in a custom driver). */
export interface MediaElementLike extends EventTarget {
  paused: boolean;
  currentTime: number;
  readonly duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  readonly ended: boolean;
  readonly error: { code: number; message?: string } | null;
  readonly buffered?: TimeRanges;
  readonly readyState?: number;
  play(): Promise<void> | void;
  pause(): void;
  load?(): void;
}

export interface MediaElementState {
  playing: boolean;
  currentTime: number;
  duration: number;
  buffered: MediaTimeRange[];
  /** End of the buffered range containing the playhead (seconds). */
  bufferedEnd: number;
  volume: number;
  muted: boolean;
  rate: number;
  /** Waiting for data while trying to play. */
  waiting: boolean;
  /** The network stopped delivering data. */
  stalled: boolean;
  seeking: boolean;
  ended: boolean;
  error: { code: number; message?: string } | null;
  /** Autoplay was refused with sound and playback continued muted: show a "Tap to unmute" affordance. */
  autoplayMuted: boolean;
  /** Autoplay was refused even when muted; the user has to press play. */
  autoplayBlocked: boolean;
}

export interface MediaElementActions {
  /** Resolves true when playback started. Falls back to muted playback when sound is refused (unless disabled). */
  play: (options?: { mutedFallback?: boolean }) => Promise<boolean>;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  skip: (delta: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  /** Unmute and clear the autoplay-muted signal. */
  unmute: () => void;
  setRate: (rate: number) => void;
  /** Reload the source and try again after an error. */
  retry: () => void;
}

export interface UseMediaElementOptions {
  /** Start playback once the element is available (and again whenever `src` changes). */
  autoPlay?: boolean;
  /** Retry muted when the browser refuses autoplay with sound. Default true. */
  mutedFallback?: boolean;
  /** Pass the current source so `autoPlay` re-runs when it changes. */
  src?: string;
}

export type UseMediaElementResult = MediaElementState &
  MediaElementActions & {
    element: MediaElementLike | null;
  };

const initialMediaState: MediaElementState = {
  playing: false,
  currentTime: 0,
  duration: 0,
  buffered: [],
  bufferedEnd: 0,
  volume: 1,
  muted: false,
  rate: 1,
  waiting: false,
  stalled: false,
  seeking: false,
  ended: false,
  error: null,
  autoplayMuted: false,
  autoplayBlocked: false,
};

function readBuffered(el: MediaElementLike): MediaTimeRange[] {
  const b = el.buffered;
  if (!b || typeof b.length !== "number") return [];
  const out: MediaTimeRange[] = [];
  for (let i = 0; i < b.length; i++) {
    try {
      out.push({ start: b.start(i), end: b.end(i) });
    } catch {
      /* index out of range while the buffer changes */
    }
  }
  return out;
}

function bufferedEndAt(ranges: MediaTimeRange[], time: number) {
  const hit = ranges.find((r) => time >= r.start - 0.5 && time <= r.end + 0.5);
  return hit ? hit.end : 0;
}

const MEDIA_EVENTS = [
  "play",
  "playing",
  "pause",
  "timeupdate",
  "durationchange",
  "loadedmetadata",
  "loadeddata",
  "progress",
  "volumechange",
  "ratechange",
  "waiting",
  "stalled",
  "canplay",
  "canplaythrough",
  "seeking",
  "seeked",
  "ended",
  "error",
  "emptied",
] as const;

function resolveTarget(target: React.RefObject<MediaElementLike | null> | MediaElementLike | null | undefined) {
  if (!target) return null;
  if ("current" in (target as object) && !("paused" in (target as object))) {
    return (target as React.RefObject<MediaElementLike | null>).current ?? null;
  }
  return target as MediaElementLike;
}

/**
 * Subscribes to an `HTMLMediaElement` (or any `MediaElementLike`) and exposes its state plus imperative actions.
 * Autoplay refusals fall back to muted playback and raise `autoplayMuted`.
 */
export function useMediaElement(
  target: React.RefObject<MediaElementLike | null> | React.RefObject<HTMLMediaElement | null> | MediaElementLike | null,
  options: UseMediaElementOptions = {}
): UseMediaElementResult {
  const { autoPlay = false, mutedFallback = true, src } = options;
  const [el, setEl] = React.useState<MediaElementLike | null>(null);
  const elRef = React.useRef<MediaElementLike | null>(null);
  const [state, setState] = React.useState<MediaElementState>(initialMediaState);
  const fallbackRef = useLatestRef(mutedFallback);

  // Pick up the element after it mounts (refs are filled after render).
  useIsoLayoutEffect(() => {
    const next = resolveTarget(target as React.RefObject<MediaElementLike | null> | MediaElementLike | null);
    if (next !== elRef.current) {
      elRef.current = next;
      setEl(next);
    }
  });

  React.useEffect(() => {
    if (!el) return;
    const sync = (event?: Event) => {
      const type = event?.type;
      setState((prev) => {
        const buffered = readBuffered(el);
        const currentTime = el.currentTime || 0;
        let waiting = prev.waiting;
        let stalled = prev.stalled;
        if (type === "waiting") waiting = true;
        if (type && ["playing", "canplay", "canplaythrough", "pause", "ended", "error", "emptied", "seeked"].includes(type)) waiting = false;
        if (type === "stalled") stalled = true;
        if (type && ["progress", "playing", "canplay", "canplaythrough", "emptied"].includes(type)) stalled = false;
        let seeking = prev.seeking;
        if (type === "seeking") seeking = true;
        if (type === "seeked" || type === "emptied") seeking = false;
        const muted = !!el.muted;
        return {
          ...prev,
          playing: !el.paused && !el.ended,
          currentTime,
          duration: Number.isFinite(el.duration) || el.duration === Infinity ? el.duration || 0 : 0,
          buffered,
          bufferedEnd: bufferedEndAt(buffered, currentTime),
          volume: typeof el.volume === "number" ? el.volume : 1,
          muted,
          rate: el.playbackRate || 1,
          waiting,
          stalled,
          seeking,
          ended: !!el.ended,
          error:
            type === "emptied"
              ? null
              : (el.error ?? (type === "error" ? { code: 0 } : type === "playing" || type === "canplay" ? null : prev.error)),
          autoplayMuted: muted ? prev.autoplayMuted : false,
          autoplayBlocked: type === "playing" ? false : prev.autoplayBlocked,
        };
      });
    };
    sync();
    MEDIA_EVENTS.forEach((name) => el.addEventListener(name, sync));
    return () => MEDIA_EVENTS.forEach((name) => el.removeEventListener(name, sync));
  }, [el]);

  const play = React.useCallback(async (opts: { mutedFallback?: boolean } = {}) => {
    const media = elRef.current;
    if (!media) return false;
    try {
      await media.play();
      setState((s) => ({ ...s, autoplayBlocked: false }));
      return true;
    } catch (err) {
      const name = (err as { name?: string } | null)?.name;
      if (name === "AbortError") return false;
      if (name === "NotAllowedError" && (opts.mutedFallback ?? fallbackRef.current) && !media.muted) {
        media.muted = true;
        try {
          await media.play();
          setState((s) => ({ ...s, muted: true, autoplayMuted: true, autoplayBlocked: false }));
          return true;
        } catch {
          /* refused even muted */
        }
      }
      if (name === "NotAllowedError") setState((s) => ({ ...s, autoplayBlocked: true }));
      return false;
    }
  }, []);

  const pause = React.useCallback(() => elRef.current?.pause(), []);

  const toggle = React.useCallback(() => {
    const media = elRef.current;
    if (!media) return;
    if (media.paused || media.ended) void play();
    else media.pause();
  }, [play]);

  const seek = React.useCallback((time: number) => {
    const media = elRef.current;
    if (!media) return;
    const max = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : Number.MAX_SAFE_INTEGER;
    const next = clamp(time, 0, max);
    media.currentTime = next;
    setState((s) => ({ ...s, currentTime: next, ended: false }));
  }, []);

  const skip = React.useCallback((delta: number) => {
    const media = elRef.current;
    if (media) seek((media.currentTime || 0) + delta);
  }, [seek]);

  const setVolume = React.useCallback((volume: number) => {
    const media = elRef.current;
    if (!media) return;
    const v = clamp(volume, 0, 1);
    media.volume = v;
    // `muted` and `volume` are independent on a media element: raising the volume must also undo a mute.
    if (v > 0 && media.muted) media.muted = false;
    setState((s) => ({ ...s, volume: v, muted: media.muted, autoplayMuted: media.muted ? s.autoplayMuted : false }));
  }, []);

  const setMuted = React.useCallback((muted: boolean) => {
    const media = elRef.current;
    if (!media) return;
    media.muted = muted;
    if (!muted && media.volume === 0) media.volume = 0.5;
    setState((s) => ({ ...s, muted, volume: media.volume, autoplayMuted: muted ? s.autoplayMuted : false }));
  }, []);

  const toggleMute = React.useCallback(() => {
    const media = elRef.current;
    if (media) setMuted(!(media.muted || media.volume === 0));
  }, [setMuted]);

  const unmute = React.useCallback(() => setMuted(false), [setMuted]);

  const setRate = React.useCallback((rate: number) => {
    const media = elRef.current;
    if (!media) return;
    media.playbackRate = rate;
    setState((s) => ({ ...s, rate }));
  }, []);

  const retry = React.useCallback(() => {
    const media = elRef.current;
    if (!media) return;
    const at = media.currentTime || 0;
    setState((s) => ({ ...s, error: null, waiting: true }));
    media.load?.();
    if (at > 0) {
      try {
        media.currentTime = at;
      } catch {
        /* not seekable yet */
      }
    }
    void play();
  }, [play]);

  React.useEffect(() => {
    if (!el || !autoPlay) return;
    void play();
  }, [el, autoPlay, src, play]);

  return {
    ...state,
    element: el,
    play,
    pause,
    toggle,
    seek,
    skip,
    setVolume,
    setMuted,
    toggleMute,
    unmute,
    setRate,
    retry,
  };
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

type MediaButtonBaseProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue"> & {
  tone?: MediaTone;
  size?: "sm" | "md" | "lg";
};

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
      variant: {
        solid: "bg-foreground text-background shadow-sm hover:opacity-90",
        primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
        ghost: "text-foreground hover:bg-accent",
        overlay: "bg-white text-black shadow-lg hover:bg-white/90 focus-visible:ring-white/60",
        "overlay-ghost": "text-white hover:bg-white/15 focus-visible:ring-white/50",
      },
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
  playing: boolean;
  /** Show a spinner ring around the icon (buffering). */
  loading?: boolean;
  playLabel?: string;
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
          "absolute translate-x-[6%] transition-[opacity,scale,rotate] duration-200 ease-out-quart motion-reduce:transition-none",
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
/* SeekBar                                                             */
/* ------------------------------------------------------------------ */

export interface MediaChapter {
  /** Start time in seconds. */
  start: number;
  title?: string;
}

export interface SeekBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Current playback time (seconds). */
  value: number;
  duration: number;
  /** Buffered ranges, or a single buffered-until time. */
  buffered?: MediaTimeRange[] | number;
  /** Commit a seek (keyboard, click, end of drag). */
  onSeek?: (time: number) => void;
  /** Live scrub position while dragging; `null` when the drag ends. */
  onScrub?: (time: number | null) => void;
  /** Arrow-key step in seconds. Default 5. */
  step?: number;
  chapters?: MediaChapter[];
  /** Preview image for a time, shown in the hover bubble. */
  thumbnails?: (time: number) => string | null | undefined;
  /** Elapsed/total labels: beside the bar (`"inline"`), under it (`"below"`) or hidden. Default "inline". */
  showTimes?: boolean | "inline" | "below";
  /** Right-hand label shows the total or the remaining time (click toggles). */
  timeDisplay?: "total" | "remaining";
  defaultTimeDisplay?: "total" | "remaining";
  onTimeDisplayChange?: (mode: "total" | "remaining") => void;
  tone?: MediaTone;
  size?: "sm" | "md";
  disabled?: boolean;
  label?: string;
}

/** Media scrubber with buffered and played layers, hover time preview, chapters and keyboard seeking. */
export const SeekBar = React.forwardRef<HTMLDivElement, SeekBarProps>(
  (
    {
      value,
      duration,
      buffered,
      onSeek,
      onScrub,
      step = 5,
      chapters,
      thumbnails,
      showTimes = "inline",
      timeDisplay,
      defaultTimeDisplay = "total",
      onTimeDisplayChange,
      tone = "default",
      size = "md",
      disabled,
      label = "Seek",
      className,
      ...props
    },
    ref
  ) => {
    const trackRef = React.useRef<HTMLDivElement | null>(null);
    const [scrub, setScrub] = React.useState<number | null>(null);
    const [hover, setHover] = React.useState<number | null>(null);
    const draggingRef = React.useRef<number | null>(null);
    const [mode, setMode] = useControllableState({
      value: timeDisplay,
      defaultValue: defaultTimeDisplay,
      onChange: onTimeDisplayChange,
    });

    const finite = Number.isFinite(duration) && duration > 0;
    const total = finite ? duration : 0;
    const shown = scrub ?? (Number.isFinite(value) ? Math.max(0, value) : 0);
    const clampTime = (t: number) => clamp(t, 0, total);
    const pct = (t: number) => toPercent(t, total);
    const forceHours = total >= 3600;

    const ranges: MediaTimeRange[] =
      typeof buffered === "number" ? [{ start: 0, end: buffered }] : (buffered ?? []);

    const timeAt = (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return shown;
      return clampTime(((clientX - rect.left) / rect.width) * total);
    };

    const commit = (t: number) => {
      if (disabled || !finite) return;
      onSeek?.(clampTime(t));
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || !finite) return;
      const big = Math.max(step, total / 10);
      const map: Record<string, number> = {
        ArrowLeft: shown - step,
        ArrowDown: shown - step,
        ArrowRight: shown + step,
        ArrowUp: shown + step,
        PageDown: shown - big,
        PageUp: shown + big,
        Home: 0,
        End: total,
      };
      if (!(e.key in map)) return;
      e.preventDefault();
      e.stopPropagation();
      commit(map[e.key]);
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || !finite || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      e.currentTarget.focus({ preventScroll: true });
      const t = timeAt(e.clientX);
      draggingRef.current = t;
      setScrub(t);
      onScrub?.(t);
    };
    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!finite) return;
      const t = timeAt(e.clientX);
      if (draggingRef.current !== null) {
        draggingRef.current = t;
        setScrub(t);
        onScrub?.(t);
      } else if (e.pointerType !== "touch") {
        setHover(t);
      }
    };
    const endDrag = (e: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
      const t = draggingRef.current;
      if (t === null) return;
      draggingRef.current = null;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      setScrub(null);
      onScrub?.(null);
      if (!cancelled) commit(t);
    };

    const bubbleTime = scrub ?? hover;
    const chapterAt = (t: number) =>
      chapters?.length ? [...chapters].sort((a, b) => a.start - b.start).filter((c) => c.start <= t).pop() : undefined;
    const bubbleChapter = bubbleTime !== null ? chapterAt(bubbleTime) : undefined;
    const thumb = bubbleTime !== null ? thumbnails?.(bubbleTime) : undefined;
    const overlay = tone === "overlay";
    const timeText = finite ? `${formatClock(shown)} of ${formatClock(total)}` : formatClock(shown);
    const currentChapter = chapterAt(shown);

    const timeClass = cn(
      "shrink-0 font-mono text-xs tabular-nums",
      overlay ? "text-white/80" : "text-muted-foreground"
    );
    const elapsed = <span className={cn(timeClass, showTimes !== "below" && "min-w-10 text-right")}>{formatClock(shown, { forceHours })}</span>;
    const remaining = mode === "remaining";
    const totalLabel = (
      <button
        type="button"
        onClick={() => setMode(remaining ? "total" : "remaining")}
        aria-label={remaining ? "Show total time" : "Show remaining time"}
        className={cn(timeClass, "min-w-10 rounded-xs text-left hover:underline", showTimes === "below" && "text-right", focusRing)}
      >
        {remaining ? formatClock(total - shown, { forceHours, minus: true }) : formatClock(total, { forceHours })}
      </button>
    );

    const track = (
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(Math.min(shown, total || shown))}
        aria-valuetext={currentChapter?.title ? `${timeText}, ${currentChapter.title}` : timeText}
        aria-disabled={disabled || !finite || undefined}
        aria-orientation="horizontal"
        data-dragging={scrub !== null ? "" : undefined}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e)}
        onPointerCancel={(e) => endDrag(e, true)}
        onPointerLeave={() => setHover(null)}
        className={cn(
          "group/seek relative flex min-w-0 flex-1 cursor-pointer touch-none select-none items-center outline-none",
          size === "sm" ? "h-4" : "h-5",
          (disabled || !finite) && "cursor-default opacity-60"
        )}
      >
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-full transition-[height] duration-150",
            size === "sm" ? "h-[3px] group-hover/seek:h-1" : "h-1 group-hover/seek:h-1.5 group-data-[dragging]/seek:h-1.5",
            overlay ? "bg-white/25" : "bg-muted"
          )}
        >
          {ranges.map((r, i) => (
            <div
              key={i}
              data-slot="seek-buffered"
              className={cn("absolute inset-y-0", overlay ? "bg-white/40" : "bg-foreground/15")}
              style={{ left: `${pct(r.start)}%`, width: `${Math.max(0, pct(r.end) - pct(r.start))}%` }}
            />
          ))}
          <div
            data-slot="seek-played"
            className={cn("absolute inset-y-0 left-0", overlay ? "bg-primary" : "bg-primary")}
            style={{ width: `${pct(shown)}%` }}
          />
          {chapters
            ?.filter((c) => c.start > 0 && c.start < total)
            .map((c) => (
              <span
                key={c.start}
                data-slot="seek-chapter"
                className={cn("absolute inset-y-0 w-0.5 -translate-x-1/2", overlay ? "bg-black/60" : "bg-background")}
                style={{ left: `${pct(c.start)}%` }}
              />
            ))}
        </div>
        {bubbleTime !== null && hover !== null && scrub === null && (
          <div
            aria-hidden
            className={cn("pointer-events-none absolute inset-y-0 w-px", overlay ? "bg-white/50" : "bg-foreground/30")}
            style={{ left: `${pct(hover)}%` }}
          />
        )}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm ring-0 transition-transform duration-150",
            size === "sm" ? "size-3" : "size-3.5",
            "scale-0 group-hover/seek:scale-100 group-focus-visible/seek:scale-100 group-focus-visible/seek:ring-4 group-focus-visible/seek:ring-ring/35 group-data-[dragging]/seek:scale-110",
            overlay && "bg-white"
          )}
          style={{ left: `${pct(shown)}%` }}
        />
        {bubbleTime !== null && finite && (
          <div
            aria-hidden
            data-slot="seek-preview"
            className="pointer-events-none absolute bottom-full z-10 mb-2 flex -translate-x-1/2 flex-col items-center gap-1"
            style={{ left: `clamp(2.5rem, ${pct(bubbleTime)}%, calc(100% - 2.5rem))` }}
          >
            {thumb && (
              <img src={thumb} alt="" className="aspect-video w-40 rounded-md border border-white/20 bg-black object-cover shadow-lg" />
            )}
            <span className="whitespace-nowrap rounded-md bg-inverse px-1.5 py-0.5 text-xs font-medium text-inverse-foreground tabular-nums shadow-md">
              {bubbleChapter?.title && <span className="mr-1.5 opacity-75">{bubbleChapter.title}</span>}
              {formatClock(bubbleTime, { forceHours })}
            </span>
          </div>
        )}
      </div>
    );

    return (
      <div
        ref={ref}
        className={cn(
          "w-full min-w-0",
          showTimes === "below" ? "flex flex-col gap-1" : "flex items-center gap-3",
          className
        )}
        {...props}
      >
        {showTimes === "below" ? (
          <>
            {track}
            <div className="flex items-center justify-between">
              {elapsed}
              {totalLabel}
            </div>
          </>
        ) : showTimes ? (
          <>
            {elapsed}
            {track}
            {totalLabel}
          </>
        ) : (
          track
        )}
      </div>
    );
  }
);
SeekBar.displayName = "SeekBar";

/* ------------------------------------------------------------------ */
/* VolumeControl                                                       */
/* ------------------------------------------------------------------ */

export interface VolumeControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "onVolumeChange"> {
  /** 0–1. */
  volume?: number;
  defaultVolume?: number;
  onVolumeChange?: (volume: number) => void;
  muted?: boolean;
  defaultMuted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  /** Horizontal slider beside the button, or a vertical slider in a popover above it. */
  orientation?: "horizontal" | "vertical";
  /** Reveal the horizontal slider on hover/focus, or always show it. Default "hover". */
  expand?: "hover" | "always";
  /** Volume change per arrow key. Default 0.05. */
  step?: number;
  tone?: MediaTone;
  size?: "sm" | "md" | "lg";
}

/**
 * Mute toggle plus a volume slider that expands on hover/focus (or pops up vertically).
 * A preset over `VolumeSlider`: media button style, 0–1 volume, arrow keys on the toggle, and the reveal / popover layout.
 */
export const VolumeControl = React.forwardRef<HTMLDivElement, VolumeControlProps>(
  (
    {
      volume: volumeProp,
      defaultVolume = 1,
      onVolumeChange,
      muted: mutedProp,
      defaultMuted = false,
      onMutedChange,
      orientation = "horizontal",
      expand = "hover",
      step = 0.05,
      tone = "default",
      size = "md",
      className,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const [volume, setVolume] = useControllableState({ value: volumeProp, defaultValue: defaultVolume, onChange: onVolumeChange });
    const [muted, setMuted] = useControllableState({ value: mutedProp, defaultValue: defaultMuted, onChange: onMutedChange });
    const level = muted || volume <= 0 ? 0 : volume;

    const change = (v: number) => {
      const next = Math.round(clamp(v, 0, 1) * 100) / 100;
      setVolume(next);
      if (next > 0 && muted) setMuted(false);
    };

    const overlay = tone === "overlay";
    const vertical = orientation === "vertical";

    return (
      <VolumeSlider
        ref={ref}
        value={volume * 100}
        onValueChange={(v) => setVolume(v / 100)}
        muted={muted}
        onMutedChange={setMuted}
        showLevel={false}
        size="sm"
        step={Math.max(1, Math.round(step * 100))}
        orientation={orientation}
        restoreOnUnmute={50}
        zeroWhenMuted
        muteToggle="label"
        muteLabel="Mute"
        unmuteLabel="Unmute"
        accent={overlay ? "#fff" : undefined}
        muteButtonClassName={mediaButtonVariants({ tone, size })}
        sliderClassName={cn(overlay && "[&_.bg-muted]:bg-white/25", vertical && "h-24 w-auto")}
        renderSlider={(slider) =>
          vertical ? (
            <div
              data-slot="volume-popover"
              className={cn(
                "absolute bottom-full left-1/2 z-20 -translate-x-1/2 pb-2 transition-[opacity,translate] duration-150",
                "pointer-events-none translate-y-1 opacity-0",
                "group-hover/volume:pointer-events-auto group-hover/volume:translate-y-0 group-hover/volume:opacity-100",
                "group-focus-within/volume:pointer-events-auto group-focus-within/volume:translate-y-0 group-focus-within/volume:opacity-100"
              )}
            >
              <div
                className={cn(
                  "flex flex-col items-center rounded-box px-1.5 py-3 shadow-lg",
                  overlay ? "bg-black/80 backdrop-blur" : "border border-border bg-popover"
                )}
              >
                {slider}
              </div>
            </div>
          ) : (
            <div
              data-slot="volume-slider-reveal"
              className={cn(
                "flex items-center overflow-hidden transition-[width,opacity] duration-200 ease-out-quart",
                expand === "always"
                  ? "w-24 pl-1 pr-1.5 opacity-100"
                  : "w-0 opacity-0 group-hover/volume:w-24 group-hover/volume:pl-1 group-hover/volume:pr-1.5 group-hover/volume:opacity-100 group-focus-within/volume:w-24 group-focus-within/volume:pl-1 group-focus-within/volume:pr-1.5 group-focus-within/volume:opacity-100"
              )}
            >
              {slider}
            </div>
          )
        }
        className={cn("group/volume relative inline-flex w-auto min-w-0 flex-row items-center gap-0", className)}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          if ((e.target as HTMLElement).closest('[role="slider"]')) return;
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            e.stopPropagation();
            change(level + step);
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            e.stopPropagation();
            change(level - step);
          }
        }}
        {...props}
      />
    );
  }
);
VolumeControl.displayName = "VolumeControl";

/* ------------------------------------------------------------------ */
/* Menus                                                               */
/* ------------------------------------------------------------------ */

function MediaMenuContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) {
  const container = useMediaPortalContainer();
  return (
    <DropdownMenuPrimitive.Portal container={container ?? undefined}>
      <DropdownMenuPrimitive.Content
        sideOffset={6}
        align="end"
        className={cn(
          menuContentClass,
          "max-h-(--radix-dropdown-menu-content-available-height) min-w-40 origin-(--radix-dropdown-menu-content-transform-origin)",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

const chipClass = (tone: MediaTone, active: boolean) =>
  cn(
    "inline-flex h-8 shrink-0 select-none items-center gap-1.5 rounded-control border px-2.5 text-xs font-semibold uppercase tracking-wide transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
    "disabled:pointer-events-none disabled:opacity-40",
    focusRing,
    tone === "overlay"
      ? active
        ? "border-white bg-white/20 text-white"
        : "border-white/30 text-white/85 hover:border-white hover:text-white"
      : active
        ? "border-primary/50 bg-primary-soft text-primary-soft-foreground"
        : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
  );

export interface PlaybackRateMenuProps {
  rate: number;
  onRateChange: (rate: number) => void;
  rates?: number[];
  tone?: MediaTone;
  disabled?: boolean;
  className?: string;
}

/** Dropdown for playback speed (0.5× – 2×). */
export function PlaybackRateMenu({
  rate,
  onRateChange,
  rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
  tone = "default",
  disabled,
  className,
}: PlaybackRateMenuProps) {
  const fmt = (r: number) => `${r}×`;
  return (
    <DropdownMenuPrimitive.Root modal={false}>
      <DropdownMenuPrimitive.Trigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={`Playback speed: ${fmt(rate)}`}
          className={cn(chipClass(tone, rate !== 1), "min-w-12 justify-center normal-case tabular-nums", className)}
        >
          {fmt(rate)}
        </button>
      </DropdownMenuPrimitive.Trigger>
      <MediaMenuContent>
        <DropdownMenuLabel>Playback speed</DropdownMenuLabel>
        <DropdownMenuPrimitive.RadioGroup value={String(rate)} onValueChange={(v) => onRateChange(Number(v))}>
          {rates.map((r) => (
            <DropdownMenuRadioItem key={r} value={String(r)}>
              {r === 1 ? "Normal" : fmt(r)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuPrimitive.RadioGroup>
      </MediaMenuContent>
    </DropdownMenuPrimitive.Root>
  );
}
PlaybackRateMenu.displayName = "PlaybackRateMenu";

export interface MediaTrackOption {
  id: string;
  label: string;
  /** BCP 47 code; shown in the chip when present (e.g. "EN"). */
  language?: string;
}

export interface TrackCycleChipProps {
  kind: "subtitles" | "audio";
  tracks: MediaTrackOption[];
  /** Selected track id, or null for off (subtitles). Controlled. */
  value?: string | null;
  /** Initial track id when uncontrolled. Default null (off). */
  defaultValue?: string | null;
  onValueChange?: (id: string | null) => void;
  /** Click cycles through the options, or opens a menu. Default: cycle up to 3 options, menu beyond. */
  mode?: "cycle" | "menu";
  /** Include an "Off" option. Default true for subtitles. */
  allowOff?: boolean;
  offLabel?: string;
  tone?: MediaTone;
  disabled?: boolean;
  className?: string;
}

/** Chip showing the current subtitle/audio track; click cycles to the next one or opens a picker. */
export const TrackCycleChip = React.forwardRef<HTMLButtonElement, TrackCycleChipProps>(function TrackCycleChip(
  {
    kind,
    tracks,
    value: valueProp,
    defaultValue = null,
    onValueChange,
    mode,
    allowOff = kind === "subtitles",
    offLabel = "Off",
    tone = "default",
    disabled,
    className,
  },
  ref
) {
  const [value, setValue] = useControllableState<string | null>({ value: valueProp, defaultValue, onChange: onValueChange });
  const options: (string | null)[] = [...(allowOff ? [null] : []), ...tracks.map((t) => t.id)];
  const current = tracks.find((t) => t.id === value) ?? null;
  const short = current ? (current.language ? current.language.toUpperCase() : current.label) : offLabel;
  const full = current ? current.label : offLabel;
  const noun = kind === "subtitles" ? "Subtitles" : "Audio track";
  const Icon = kind === "subtitles" ? RiClosedCaptioningLine : RiTranslate2;
  const resolvedMode = mode ?? (options.length > 3 ? "menu" : "cycle");
  const active = kind === "subtitles" && current !== null;
  const content = (
    <>
      <Icon aria-hidden />
      <span className="max-w-24 truncate">{short}</span>
    </>
  );

  if (resolvedMode === "cycle") {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || options.length < 2}
        aria-label={`${noun}: ${full}. Switch to next`}
        data-kind={kind}
        onClick={() => {
          const at = options.indexOf(current ? current.id : null);
          setValue(options[(at + 1) % options.length] ?? null);
        }}
        className={cn(chipClass(tone, active), className)}
      >
        {content}
      </button>
    );
  }

  return (
    <DropdownMenuPrimitive.Root modal={false}>
      <DropdownMenuPrimitive.Trigger asChild disabled={disabled}>
        <button ref={ref} type="button" aria-label={`${noun}: ${full}`} data-kind={kind} className={cn(chipClass(tone, active), className)}>
          {content}
        </button>
      </DropdownMenuPrimitive.Trigger>
      <MediaMenuContent>
        <DropdownMenuLabel>{noun === "Subtitles" ? "Subtitles" : "Audio"}</DropdownMenuLabel>
        <DropdownMenuPrimitive.RadioGroup value={value ?? "__off"} onValueChange={(v) => setValue(v === "__off" ? null : v)}>
          {allowOff && (
            <>
              <DropdownMenuRadioItem value="__off">{offLabel}</DropdownMenuRadioItem>
              <DropdownMenuSeparator />
            </>
          )}
          {tracks.map((t) => (
            <DropdownMenuRadioItem key={t.id} value={t.id}>
              {t.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuPrimitive.RadioGroup>
      </MediaMenuContent>
    </DropdownMenuPrimitive.Root>
  );
});
TrackCycleChip.displayName = "TrackCycleChip";

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
  value?: RepeatMode;
  defaultValue?: RepeatMode;
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
        {mode !== "off" && <span aria-hidden className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current" />}
      </button>
    );
  }
);
RepeatButton.displayName = "RepeatButton";

export interface ShuffleButtonProps extends MediaButtonBaseProps {
  pressed?: boolean;
  defaultPressed?: boolean;
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
        {on && <span aria-hidden className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current" />}
      </button>
    );
  }
);
ShuffleButton.displayName = "ShuffleButton";

/* ------------------------------------------------------------------ */
/* NowPlayingBars                                                      */
/* ------------------------------------------------------------------ */

export interface NowPlayingBarsProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Animate (sounding) or hold still (current but paused). Default true. */
  playing?: boolean;
  size?: "sm" | "md" | "lg";
  /** Accessible label; defaults to "Now playing" / "Paused". Pass `null` to hide from assistive tech. */
  label?: string | null;
}

/** Three-bar equalizer marking the playing row; static when paused and under reduced motion. */
export const NowPlayingBars = React.forwardRef<HTMLSpanElement, NowPlayingBarsProps>(
  ({ playing = true, size = "sm", label, className, ...props }, ref) => {
    const text = label === undefined ? (playing ? "Now playing" : "Paused") : label;
    return (
      <span
        ref={ref}
        role={text ? "img" : undefined}
        aria-label={text ?? undefined}
        aria-hidden={text ? undefined : true}
        data-state={playing ? "playing" : "paused"}
        className={cn(
          "inline-flex shrink-0 items-end gap-[2px] text-primary",
          size === "sm" ? "size-3" : size === "md" ? "size-4" : "size-5",
          className
        )}
        {...props}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-full flex-1 origin-bottom rounded-[1px] bg-current",
              playing
                ? "animate-bar-scale [animation-duration:900ms] motion-reduce:animate-none motion-reduce:scale-y-[0.7]"
                : "scale-y-[0.55]"
            )}
            style={playing ? { animationDelay: `${i * 300}ms` } : undefined}
          />
        ))}
      </span>
    );
  }
);
NowPlayingBars.displayName = "NowPlayingBars";

/* ------------------------------------------------------------------ */
/* Buffering indicator                                                 */
/* ------------------------------------------------------------------ */

export interface MediaBufferingIndicatorProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Accessible label for the spinner. Default "Buffering". */
  label?: string;
}

/** Centered buffering spinner used by players. */
export const MediaBufferingIndicator = React.forwardRef<HTMLSpanElement, MediaBufferingIndicatorProps>(
  ({ className, label = "Buffering", ...props }, ref) => (
    <span ref={ref} className={cn("inline-flex rounded-full bg-black/45 p-3 text-white backdrop-blur-sm", className)} {...props}>
      <Spinner size="xl" className="text-white" label={label} />
    </span>
  )
);
MediaBufferingIndicator.displayName = "MediaBufferingIndicator";
