import * as React from "react";
import {
  RiAirplayLine,
  RiArrowLeftLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiFullscreenExitLine,
  RiFullscreenLine,
  RiPictureInPicture2Line,
  RiPictureInPictureExitLine,
  RiPlayFill,
  RiRefreshLine,
  RiSkipForwardFill,
  RiVolumeMuteLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { isEditableTarget } from "../../patterns/shortcuts";
import {
  MediaBufferingIndicator,
  MediaPortalProvider,
  PlayPauseButton,
  PlaybackRateMenu,
  SeekBar,
  SkipButton,
  TrackCycleChip,
  VolumeControl,
  formatMediaTime,
  mediaButtonVariants,
  useMediaElement,
  type MediaChapter,
  type MediaTrackOption,
} from "./media-controls";

export interface VideoTextTrack {
  id: string;
  label: string;
  /** Language code, e.g. "en". */
  srcLang?: string;
  /** WebVTT URL. */
  src: string;
  kind?: "subtitles" | "captions";
}

export interface VideoUpNext {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  image?: string;
}

export interface VideoPlayerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onError"> {
  src?: string;
  poster?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Try to start playing; falls back to muted playback and shows a "tap to unmute" pill. */
  autoPlay?: boolean;
  /** Start muted. */
  muted?: boolean;
  loop?: boolean;
  crossOrigin?: "anonymous" | "use-credentials";
  /** Side-loaded WebVTT tracks. Without this, the element's own text tracks are offered. */
  tracks?: VideoTextTrack[];
  subtitleTrack?: string | null;
  defaultSubtitleTrack?: string | null;
  onSubtitleTrackChange?: (id: string | null) => void;
  /** Server-side audio tracks (you reload the stream in `onAudioTrackChange`). Without this, native `audioTracks` are used. */
  audioTracks?: MediaTrackOption[];
  audioTrack?: string;
  defaultAudioTrack?: string;
  onAudioTrackChange?: (id: string) => void;
  chapters?: MediaChapter[];
  thumbnails?: (time: number) => string | null | undefined;
  /** Shows a back button in the top bar (also fired by Escape). */
  onBack?: () => void;
  backLabel?: string;
  /** Shows a "next" button and enables the up-next countdown. */
  onNext?: () => void;
  nextLabel?: string;
  /** When set (with `onNext`), ending playback shows an "Up next in 5…" card. */
  upNext?: VideoUpNext;
  /** Countdown seconds for the up-next card. Default 5. */
  upNextCountdown?: number;
  onEnded?: () => void;
  /** Offer to resume from this position (seconds). Ignored under 5s. */
  resumeAt?: number;
  onResume?: (time: number) => void;
  /** Hide the chrome after this much inactivity while playing. Default 3000ms. */
  autoHideMs?: number;
  /** Skip button distance. Default 10s. */
  skipSeconds?: number;
  rates?: number[];
  onError?: (error: { code: number; message?: string }) => void;
  errorMessage?: React.ReactNode;
  /** Extra controls in the top bar (e.g. a CastPicker). */
  topActions?: React.ReactNode;
  fit?: "contain" | "cover";
  videoRef?: React.Ref<HTMLVideoElement>;
  videoClassName?: string;
}

type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
  webkitShowPlaybackTargetPicker?: () => void;
  audioTracks?: ArrayLike<{ id: string; label: string; language: string; enabled: boolean }>;
};

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
  webkitFullscreenEnabled?: boolean;
};

type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void };

function assignRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.MutableRefObject<T>).current = value;
}

const INTERACTIVE = 'button, a[href], input, select, textarea, [role="slider"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]';

/**
 * Custom `<video>` player: auto-hiding gradient chrome, seek bar with previews, volume, subtitle/audio chips,
 * speed, PiP/AirPlay/fullscreen, scoped keyboard shortcuts, autoplay-muted fallback, resume and up-next.
 */
export const VideoPlayer = React.forwardRef<HTMLDivElement, VideoPlayerProps>(
  (
    {
      src,
      poster,
      title,
      subtitle,
      autoPlay = false,
      muted: initialMuted = false,
      loop,
      crossOrigin,
      tracks,
      subtitleTrack,
      defaultSubtitleTrack = null,
      onSubtitleTrackChange,
      audioTracks,
      audioTrack,
      defaultAudioTrack,
      onAudioTrackChange,
      chapters,
      thumbnails,
      onBack,
      backLabel = "Back",
      onNext,
      nextLabel = "Next episode",
      upNext,
      upNextCountdown = 5,
      onEnded,
      resumeAt,
      onResume,
      autoHideMs = 3000,
      skipSeconds = 10,
      rates,
      onError,
      errorMessage,
      topActions,
      fit = "contain",
      videoRef,
      videoClassName,
      className,
      onKeyDown,
      onPointerMove,
      onPointerLeave,
      ...props
    },
    ref
  ) => {
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const [root, setRoot] = React.useState<HTMLDivElement | null>(null);
    const localVideo = React.useRef<HTMLVideoElement | null>(null);
    const media = useMediaElement(localVideo, { autoPlay, src });

    const setRootRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;
        setRoot(node);
        assignRef(ref, node);
      },
      [ref]
    );
    const setVideoRef = React.useCallback(
      (node: HTMLVideoElement | null) => {
        localVideo.current = node;
        assignRef(videoRef, node);
      },
      [videoRef]
    );

    React.useEffect(() => {
      if (localVideo.current && initialMuted) localVideo.current.muted = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ---------------- chrome visibility ---------------- */
    const [active, setActive] = React.useState(true);
    const [chromeFocus, setChromeFocus] = React.useState(false);
    const [chromeHover, setChromeHover] = React.useState(false);
    const hideTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const poke = React.useCallback(() => {
      setActive(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setActive(false), autoHideMs);
    }, [autoHideMs]);
    React.useEffect(() => {
      poke();
      return () => clearTimeout(hideTimer.current);
    }, [poke]);
    const chromeVisible = !media.playing || active || chromeFocus || chromeHover;

    /* ---------------- features ---------------- */
    const [features, setFeatures] = React.useState({ fullscreen: false, pip: false, airplay: false });
    const [fullscreen, setFullscreen] = React.useState(false);
    const [pip, setPip] = React.useState(false);
    React.useEffect(() => {
      const video = localVideo.current as WebkitVideo | null;
      const doc = document as WebkitDocument;
      if (!video) return;
      setFeatures({
        fullscreen: !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled || typeof video.webkitEnterFullscreen === "function"),
        pip:
          !!(document as Document & { pictureInPictureEnabled?: boolean }).pictureInPictureEnabled &&
          typeof video.requestPictureInPicture === "function" &&
          !(video as HTMLVideoElement & { disablePictureInPicture?: boolean }).disablePictureInPicture,
        airplay: typeof video.webkitShowPlaybackTargetPicker === "function",
      });
      const syncFs = () =>
        setFullscreen(
          !!((doc.fullscreenElement ?? doc.webkitFullscreenElement) === rootRef.current || video.webkitDisplayingFullscreen)
        );
      const enterPip = () => setPip(true);
      const leavePip = () => setPip(false);
      const airplayAvailability = (e: Event) => {
        const availability = (e as Event & { availability?: string }).availability;
        setFeatures((f) => ({ ...f, airplay: availability === "available" }));
      };
      document.addEventListener("fullscreenchange", syncFs);
      document.addEventListener("webkitfullscreenchange", syncFs);
      video.addEventListener("webkitbeginfullscreen", syncFs);
      video.addEventListener("webkitendfullscreen", syncFs);
      video.addEventListener("enterpictureinpicture", enterPip);
      video.addEventListener("leavepictureinpicture", leavePip);
      video.addEventListener("webkitplaybacktargetavailabilitychanged", airplayAvailability);
      return () => {
        document.removeEventListener("fullscreenchange", syncFs);
        document.removeEventListener("webkitfullscreenchange", syncFs);
        video.removeEventListener("webkitbeginfullscreen", syncFs);
        video.removeEventListener("webkitendfullscreen", syncFs);
        video.removeEventListener("enterpictureinpicture", enterPip);
        video.removeEventListener("leavepictureinpicture", leavePip);
        video.removeEventListener("webkitplaybacktargetavailabilitychanged", airplayAvailability);
      };
    }, []);

    const toggleFullscreen = React.useCallback(() => {
      const container = rootRef.current as WebkitElement | null;
      const video = localVideo.current as WebkitVideo | null;
      const doc = document as WebkitDocument;
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc);
        return;
      }
      if (video?.webkitDisplayingFullscreen) {
        video.webkitExitFullscreen?.();
        return;
      }
      if (container?.requestFullscreen) {
        container.requestFullscreen().catch(() => video?.webkitEnterFullscreen?.());
      } else if (container?.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else {
        video?.webkitEnterFullscreen?.();
      }
    }, []);

    const togglePip = React.useCallback(() => {
      const video = localVideo.current;
      const doc = document as Document & { pictureInPictureElement?: Element | null; exitPictureInPicture?: () => Promise<void> };
      if (!video) return;
      if (doc.pictureInPictureElement) void doc.exitPictureInPicture?.().catch(() => {});
      else void video.requestPictureInPicture?.().catch(() => {});
    }, []);

    /* ---------------- tracks ---------------- */
    const [nativeSubs, setNativeSubs] = React.useState<MediaTrackOption[]>([]);
    const [nativeAudio, setNativeAudio] = React.useState<MediaTrackOption[]>([]);
    const subtitleOptions: MediaTrackOption[] = tracks
      ? tracks.map((t) => ({ id: t.id, label: t.label, language: t.srcLang }))
      : nativeSubs;
    const audioOptions: MediaTrackOption[] = audioTracks ?? nativeAudio;
    const [subtitle_, setSubtitle] = useControllableState<string | null>({
      value: subtitleTrack,
      defaultValue: defaultSubtitleTrack,
      onChange: onSubtitleTrackChange,
    });
    const [audio, setAudio] = useControllableState<string | undefined>({
      value: audioTrack,
      defaultValue: defaultAudioTrack ?? audioTracks?.[0]?.id,
      onChange: onAudioTrackChange as ((id: string | undefined) => void) | undefined,
    });

    React.useEffect(() => {
      const video = localVideo.current as WebkitVideo | null;
      if (!video) return;
      const read = () => {
        const tt = video.textTracks;
        if (!tracks && tt) {
          const list: MediaTrackOption[] = [];
          for (let i = 0; i < tt.length; i++) {
            const t = tt[i];
            if (t.kind === "subtitles" || t.kind === "captions") {
              list.push({ id: `native-${i}`, label: t.label || t.language || `Track ${i + 1}`, language: t.language || undefined });
            }
          }
          setNativeSubs(list);
        }
        const at = video.audioTracks;
        if (!audioTracks && at && at.length > 1) {
          const list: MediaTrackOption[] = [];
          for (let i = 0; i < at.length; i++) {
            list.push({ id: at[i].id || `audio-${i}`, label: at[i].label || at[i].language || `Track ${i + 1}`, language: at[i].language || undefined });
          }
          setNativeAudio(list);
        }
      };
      read();
      video.addEventListener("loadedmetadata", read);
      const tt = video.textTracks as (TextTrackList & EventTarget) | undefined;
      tt?.addEventListener?.("addtrack", read);
      return () => {
        video.removeEventListener("loadedmetadata", read);
        tt?.removeEventListener?.("removetrack", read);
        tt?.removeEventListener?.("addtrack", read);
      };
    }, [tracks, audioTracks, src]);

    // Apply the subtitle selection to the element's text tracks.
    React.useEffect(() => {
      const tt = localVideo.current?.textTracks;
      if (!tt) return;
      for (let i = 0; i < tt.length; i++) {
        const t = tt[i];
        if (t.kind !== "subtitles" && t.kind !== "captions") continue;
        const id = tracks
          ? (tracks.find((p) => p.label === t.label && (p.srcLang ?? "") === (t.language ?? ""))?.id ?? tracks[i]?.id)
          : `native-${i}`;
        t.mode = id !== undefined && id === subtitle_ ? "showing" : "disabled";
      }
    }, [subtitle_, tracks, nativeSubs]);

    // Native audio track switching (Safari); server-side tracks are the caller's job.
    React.useEffect(() => {
      if (audioTracks) return;
      const at = (localVideo.current as WebkitVideo | null)?.audioTracks;
      if (!at || !audio) return;
      for (let i = 0; i < at.length; i++) at[i].enabled = (at[i].id || `audio-${i}`) === audio;
    }, [audio, audioTracks]);

    const cycleSubtitles = () => {
      const options: (string | null)[] = [null, ...subtitleOptions.map((t) => t.id)];
      if (options.length < 2) return;
      setSubtitle(options[(options.indexOf(subtitle_) + 1) % options.length] ?? null);
    };

    /* ---------------- resume / up next / errors ---------------- */
    const [resumeOffer, setResumeOffer] = React.useState<number | null>(resumeAt && resumeAt >= 5 ? resumeAt : null);
    React.useEffect(() => {
      setResumeOffer(resumeAt && resumeAt >= 5 ? resumeAt : null);
    }, [resumeAt, src]);
    React.useEffect(() => {
      if (resumeOffer === null) return;
      const t = setTimeout(() => setResumeOffer(null), 12000);
      return () => clearTimeout(t);
    }, [resumeOffer]);

    const [countdown, setCountdown] = React.useState<number | null>(null);
    const latest = React.useRef({ onEnded, onNext, upNext, upNextCountdown });
    latest.current = { onEnded, onNext, upNext, upNextCountdown };
    React.useEffect(() => {
      const video = localVideo.current;
      if (!video) return;
      const ended = () => {
        const l = latest.current;
        l.onEnded?.();
        if (l.upNext && l.onNext) setCountdown(Math.max(0, l.upNextCountdown));
      };
      video.addEventListener("ended", ended);
      return () => video.removeEventListener("ended", ended);
    }, []);
    React.useEffect(() => {
      if (countdown === null) return;
      if (countdown <= 0) {
        setCountdown(null);
        latest.current.onNext?.();
        return;
      }
      const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
      return () => clearTimeout(t);
    }, [countdown]);
    React.useEffect(() => setCountdown(null), [src]);

    const error = media.error;
    React.useEffect(() => {
      if (error) onError?.(error);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error]);

    /* ---------------- interaction ---------------- */
    const lastPointer = React.useRef<string>("mouse");
    const handleSurfaceClick = () => {
      if (lastPointer.current === "touch") {
        if (chromeVisible && media.playing) {
          clearTimeout(hideTimer.current);
          setActive(false);
        } else poke();
        return;
      }
      media.toggle();
      poke();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement;
      if (isEditableTarget(target) || target.closest('[role="menu"]')) return;
      const onControl = target !== rootRef.current && !!target.closest(INTERACTIVE);
      let handled = true;
      switch (e.key) {
        case " ":
        case "Enter":
          if (onControl || e.key === "Enter") {
            handled = false;
            break;
          }
          media.toggle();
          break;
        case "k":
        case "K":
          media.toggle();
          break;
        case "ArrowLeft":
          media.skip(-5);
          break;
        case "ArrowRight":
          media.skip(5);
          break;
        case "j":
        case "J":
          media.skip(-skipSeconds);
          break;
        case "l":
        case "L":
          media.skip(skipSeconds);
          break;
        case "ArrowUp":
          media.setVolume((media.muted ? 0 : media.volume) + 0.1);
          break;
        case "ArrowDown":
          media.setVolume((media.muted ? 0 : media.volume) - 0.1);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "m":
        case "M":
          media.toggleMute();
          break;
        case "c":
        case "C":
          cycleSubtitles();
          break;
        case "Escape":
          if (countdown !== null) setCountdown(null);
          else if (fullscreen) toggleFullscreen();
          else if (onBack) onBack();
          else handled = false;
          break;
        default:
          handled = false;
      }
      if (handled) {
        e.preventDefault();
        poke();
      }
    };

    const titleText = typeof title === "string" ? title : undefined;
    const showCenterPlay = !media.playing && !error && countdown === null && !media.waiting;
    const pillClass =
      "pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/75 px-3.5 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm";

    return (
      <MediaPortalProvider container={root}>
        <div
          ref={setRootRef}
          role="region"
          aria-label={titleText ?? "Video player"}
          aria-roledescription="video player"
          tabIndex={0}
          data-chrome={chromeVisible ? "visible" : "hidden"}
          data-state={media.playing ? "playing" : "paused"}
          className={cn(
            "group/player relative isolate aspect-video w-full overflow-hidden rounded-box bg-black text-white",
            "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            fullscreen && "rounded-none",
            !chromeVisible && "cursor-none",
            className
          )}
          onKeyDown={handleKeyDown}
          onPointerMove={(e) => {
            onPointerMove?.(e);
            if (e.pointerType === "mouse") poke();
          }}
          onPointerDown={(e) => {
            lastPointer.current = e.pointerType || "mouse";
          }}
          onPointerLeave={(e) => {
            onPointerLeave?.(e);
            if (e.pointerType === "mouse" && media.playing) {
              clearTimeout(hideTimer.current);
              setActive(false);
            }
          }}
          onFocus={(e) => {
            const target = e.target as HTMLElement;
            if (target === rootRef.current || (target as Element) === localVideo.current) return;
            // Keyboard focus (or an open menu) pins the chrome; a mouse click on a button does not.
            let visible = false;
            try {
              visible = target.matches(":focus-visible");
            } catch {
              visible = true;
            }
            if (visible || target.closest('[role="menu"]')) setChromeFocus(true);
          }}
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null;
            if (!next || !rootRef.current?.contains(next) || next === rootRef.current) setChromeFocus(false);
          }}
          {...props}
        >
          <video
            ref={setVideoRef}
            src={src}
            poster={poster}
            loop={loop}
            playsInline
            preload="metadata"
            crossOrigin={crossOrigin}
            className={cn("absolute inset-0 size-full", fit === "cover" ? "object-cover" : "object-contain", videoClassName)}
          >
            {tracks?.map((t) => (
              <track key={t.id} kind={t.kind ?? "subtitles"} src={t.src} srcLang={t.srcLang} label={t.label} />
            ))}
          </video>

          <div
            aria-hidden
            data-slot="video-surface"
            className="absolute inset-0"
            onClick={handleSurfaceClick}
            onDoubleClick={() => features.fullscreen && toggleFullscreen()}
          />

          {showCenterPlay && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
              <PlayPauseButton
                playing={false}
                variant="overlay"
                size="xl"
                playLabel={titleText ? `Play ${titleText}` : "Play video"}
                onClick={() => {
                  void media.play();
                  poke();
                }}
                className="pointer-events-auto bg-black/55 text-white backdrop-blur-sm hover:bg-black/70"
              />
            </div>
          )}

          {media.waiting && !error && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
              <MediaBufferingIndicator />
            </div>
          )}

          {error && (
            <div role="alert" className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
              <RiErrorWarningLine aria-hidden className="size-8 text-white/80" />
              <p className="max-w-sm text-sm text-white/90">{errorMessage ?? "This video can't be played right now."}</p>
              <button
                type="button"
                onClick={() => media.retry()}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-control bg-white px-3.5 text-sm font-medium text-black hover:bg-white/90",
                  focusRing
                )}
              >
                <RiRefreshLine aria-hidden className="size-4" /> Retry
              </button>
            </div>
          )}

          {/* Top chrome */}
          <div
            data-slot="video-top"
            onPointerEnter={(e) => e.pointerType === "mouse" && setChromeHover(true)}
            onPointerLeave={() => setChromeHover(false)}
            className={cn(
              "absolute inset-x-0 top-0 z-20 flex items-start gap-3 bg-gradient-to-b from-black/75 via-black/30 to-transparent px-3 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))] transition-opacity duration-300 sm:px-4",
              chromeVisible ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            {onBack && (
              <button type="button" onClick={onBack} aria-label={backLabel} className={mediaButtonVariants({ tone: "overlay", size: "md" })}>
                <RiArrowLeftLine aria-hidden />
              </button>
            )}
            {(title || subtitle) && (
              <div className="min-w-0 flex-1 pt-1.5">
                {title && <div className="truncate text-sm font-semibold sm:text-base">{title}</div>}
                {subtitle && <div className="truncate text-xs text-white/70">{subtitle}</div>}
              </div>
            )}
            {!title && !subtitle && <div className="flex-1" />}
            {topActions && <div className="flex shrink-0 items-center gap-1">{topActions}</div>}
          </div>

          {/* Pills */}
          <div className="pointer-events-none absolute inset-x-0 top-14 z-30 flex justify-center px-4">
            {media.autoplayMuted && (
              <button
                type="button"
                onClick={() => media.unmute()}
                className={cn(pillClass, "animate-in fade-in-0 slide-in-from-top-2", focusRing)}
              >
                <RiVolumeMuteLine aria-hidden className="size-4" /> Muted — tap to unmute
              </button>
            )}
          </div>

          {resumeOffer !== null && countdown === null && (
            <div className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex justify-start px-4">
              <div role="status" className={cn(pillClass, "py-1.5 pl-3.5 pr-1.5 animate-in fade-in-0 slide-in-from-bottom-2")}>
                <span>Resume from {formatMediaTime(resumeOffer)}?</span>
                <button
                  type="button"
                  onClick={() => {
                    media.seek(resumeOffer);
                    onResume?.(resumeOffer);
                    setResumeOffer(null);
                    if (!media.playing) void media.play();
                  }}
                  className={cn("h-7 rounded-full bg-white px-3 text-xs font-semibold text-black hover:bg-white/90", focusRing)}
                >
                  Resume
                </button>
                <button
                  type="button"
                  aria-label="Dismiss resume"
                  onClick={() => setResumeOffer(null)}
                  className={mediaButtonVariants({ tone: "overlay", size: "sm" })}
                >
                  <RiCloseLine aria-hidden />
                </button>
              </div>
            </div>
          )}

          {countdown !== null && upNext && (
            <div className="absolute inset-0 z-30 flex items-end justify-end bg-black/40 p-4 sm:p-6">
              <div
                role="group"
                aria-label="Up next"
                className="flex w-full max-w-sm gap-3 rounded-box border border-white/10 bg-black/85 p-3 text-white shadow-2xl backdrop-blur animate-in fade-in-0 slide-in-from-bottom-4"
              >
                {upNext.image && <img src={upNext.image} alt="" className="aspect-video w-28 shrink-0 rounded-md object-cover" />}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-xs font-medium text-white/70">
                    Up next in <span className="tabular-nums">{countdown}</span>…
                  </p>
                  <p aria-live="polite" className="truncate text-sm font-semibold">
                    {upNext.title}
                  </p>
                  {upNext.subtitle && <p className="truncate text-xs text-white/70">{upNext.subtitle}</p>}
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCountdown(null);
                        onNext?.();
                      }}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-control bg-white px-3 text-xs font-semibold text-black hover:bg-white/90",
                        focusRing
                      )}
                    >
                      <RiPlayFill aria-hidden className="size-4" /> Play now
                    </button>
                    <button
                      type="button"
                      onClick={() => setCountdown(null)}
                      className={cn(
                        "inline-flex h-8 items-center rounded-control border border-white/25 px-3 text-xs font-medium text-white hover:bg-white/10",
                        focusRing
                      )}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom chrome */}
          <div
            data-slot="video-controls"
            onPointerEnter={(e) => e.pointerType === "mouse" && setChromeHover(true)}
            onPointerLeave={() => setChromeHover(false)}
            className={cn(
              "absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-12 transition-opacity duration-300 sm:px-4 sm:pb-3",
              chromeVisible ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            <SeekBar
              tone="overlay"
              value={media.currentTime}
              duration={media.duration}
              buffered={media.buffered}
              onSeek={(t) => {
                media.seek(t);
                poke();
              }}
              chapters={chapters}
              thumbnails={thumbnails}
            />
            <div className="flex items-center gap-0.5 sm:gap-1">
              <PlayPauseButton
                playing={media.playing}
                variant="overlay-ghost"
                size="md"
                onClick={() => {
                  media.toggle();
                  poke();
                }}
              />
              <SkipButton tone="overlay" direction="back" seconds={skipSeconds} onSkip={(d) => media.skip(d)} />
              <SkipButton tone="overlay" direction="forward" seconds={skipSeconds} onSkip={(d) => media.skip(d)} />
              {onNext && (
                <button type="button" aria-label={nextLabel} onClick={onNext} className={mediaButtonVariants({ tone: "overlay" })}>
                  <RiSkipForwardFill aria-hidden />
                </button>
              )}
              <VolumeControl
                tone="overlay"
                volume={media.volume}
                muted={media.muted}
                onVolumeChange={media.setVolume}
                onMutedChange={media.setMuted}
                className="max-sm:hidden"
              />
              <div className="flex-1" />
              {subtitleOptions.length > 0 && (
                <TrackCycleChip tone="overlay" kind="subtitles" tracks={subtitleOptions} value={subtitle_} onValueChange={setSubtitle} />
              )}
              {audioOptions.length > 1 && (
                <TrackCycleChip
                  tone="overlay"
                  kind="audio"
                  tracks={audioOptions}
                  value={audio ?? audioOptions[0]?.id ?? null}
                  onValueChange={(id) => id && setAudio(id)}
                  className="max-sm:hidden"
                />
              )}
              <PlaybackRateMenu tone="overlay" rate={media.rate} onRateChange={media.setRate} rates={rates} className="max-sm:hidden" />
              {features.pip && (
                <button
                  type="button"
                  aria-label={pip ? "Exit picture in picture" : "Picture in picture"}
                  onClick={togglePip}
                  className={cn(mediaButtonVariants({ tone: "overlay" }), "max-sm:hidden")}
                >
                  {pip ? <RiPictureInPictureExitLine aria-hidden /> : <RiPictureInPicture2Line aria-hidden />}
                </button>
              )}
              {features.airplay && (
                <button
                  type="button"
                  aria-label="AirPlay"
                  onClick={() => (localVideo.current as WebkitVideo | null)?.webkitShowPlaybackTargetPicker?.()}
                  className={mediaButtonVariants({ tone: "overlay" })}
                >
                  <RiAirplayLine aria-hidden />
                </button>
              )}
              {features.fullscreen && (
                <button
                  type="button"
                  aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                  onClick={toggleFullscreen}
                  className={mediaButtonVariants({ tone: "overlay" })}
                >
                  {fullscreen ? <RiFullscreenExitLine aria-hidden /> : <RiFullscreenLine aria-hidden />}
                </button>
              )}
            </div>
          </div>
        </div>
      </MediaPortalProvider>
    );
  }
);
VideoPlayer.displayName = "VideoPlayer";
