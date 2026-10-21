import * as React from "react";
import { useIsoLayoutEffect, useLatestRef } from "../../hooks/use-iso-layout-effect";
import { clamp } from "../../lib/math";

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
