/** Audio player: the queue model and hook, mini player, now-playing sheet, queue list and track row, one module per family. */
import * as React from "react";
import { RiArrowUpSLine, RiCloseLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { formatClock } from "../../lib/duration";
import { logicalArrow } from "../../lib/direction";
import { Progress } from "../../primitives/progress";
import { useSwipe } from "../../hooks/use-swipe";
import { mediaButtonVariants } from "./media-controls-base";
import { PlayPauseButton } from "./media-controls-playback";
import { SeekBar } from "./media-controls-seek";
import { VolumeControl } from "./media-controls-volume";
import type { PlayerTransportProps } from "./audio-player-model";
import { FavoriteButton, TrackArtwork, Transport, trackByline } from "./audio-player-internal";

/* ------------------------------------------------------------------ */
/* MiniPlayer                                                          */
/* ------------------------------------------------------------------ */

export interface MiniPlayerProps extends PlayerTransportProps, Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onVolumeChange"> {
  /** "auto" renders the compact bar below `md` and the full bar above. */
  layout?: "auto" | "compact" | "full";
  /** Opens the expanded player (row tap, swipe up, chevron). */
  onExpand?: () => void;
  /** Stops playback and dismisses the bar. */
  onClose?: () => void;
}

/** Persistent now-playing bar: compact phone layout (tap/swipe up to expand) and a full desktop transport. */
export const MiniPlayer = React.forwardRef<HTMLDivElement, MiniPlayerProps>((allProps, ref) => {
  const {
    layout = "auto",
    onExpand,
    onClose,
    className,
    track,
    playing,
    onPlayPause,
    buffering,
    currentTime = 0,
    duration = 0,
    buffered,
    onSeek,
    onNext,
    onPrevious,
    hasNext,
    hasPrevious,
    shuffle,
    onShuffleChange,
    repeat,
    onRepeatChange,
    volume,
    muted,
    onVolumeChange,
    onMutedChange,
    favorite,
    onFavoriteChange,
    queuePosition,
    context,
    ...props
  } = allProps;
  const transport: PlayerTransportProps = {
    track, playing, onPlayPause, buffering, currentTime, duration, buffered, onSeek, onNext, onPrevious, hasNext,
    hasPrevious, shuffle, onShuffleChange, repeat, onRepeatChange, volume, muted, onVolumeChange, onMutedChange,
    favorite, onFavoriteChange, queuePosition, context,
  };
  const swipe = useSwipe({ onSwipeUp: () => onExpand?.(), axis: "y", enabled: !!onExpand });
  if (!track) return null;

  // Live streams report an Infinity (or NaN) duration: no progress, no seeking.
  const total = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const pct = total > 0 ? Math.min(100, (currentTime / total) * 100) : 0;
  const identity = (
    <>
      <TrackArtwork src={track.artwork} className="size-10" />
      <span className="flex min-w-0 flex-col text-start">
        <span className="truncate text-sm font-medium text-foreground">{track.title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {trackByline(track)}
          {context && <span className="text-muted-foreground/80"> — {context}</span>}
        </span>
      </span>
    </>
  );

  const compact = (
    <div
      data-layout="compact"
      className={cn("relative touch-pan-x", layout === "auto" && "@3xl:hidden")}
      {...swipe}
    >
      {/* An LTR island like the full layout's SeekBar: the fill, the click position and the arrow keys all read left to right. */}
      <div dir="ltr" className="absolute inset-x-0 top-0">
        <Progress
          size="xs"
          value={pct}
          {...(onSeek && total > 0 ? { role: "slider", tabIndex: 0 } : null)}
          aria-label="Playback progress"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(Math.min(currentTime, total))}
          aria-valuetext={total > 0 ? `${formatClock(currentTime)} of ${formatClock(total)}` : formatClock(currentTime)}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (rect.width > 0 && total > 0) onSeek?.(Math.max(0, Math.min(total, ((e.clientX - rect.left) / rect.width) * total)));
          }}
          onKeyDown={(e) => {
            if (!onSeek || total <= 0) return;
            const big = Math.max(5, total / 10);
            const key = logicalArrow(e);
            const next =
              key === "ArrowLeft" || key === "ArrowDown" ? currentTime - 5
              : key === "ArrowRight" || key === "ArrowUp" ? currentTime + 5
              : key === "PageDown" ? currentTime - big
              : key === "PageUp" ? currentTime + big
              : key === "Home" ? 0
              : key === "End" ? total
              : null;
            if (next === null) return;
            e.preventDefault();
            onSeek(Math.max(0, Math.min(total, next)));
          }}
          className={cn("cursor-pointer rounded-none", onSeek && total > 0 && focusRing)}
          indicatorClassName="rounded-none duration-200"
        />
      </div>
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        {onExpand ? (
          <button
            type="button"
            onClick={onExpand}
            aria-label={`Open now playing: ${track.title}, ${trackByline(track)}`}
            className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-control", focusRing)}
          >
            {identity}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{identity}</div>
        )}
        <PlayPauseButton playing={playing} loading={buffering} onClick={onPlayPause} size="md" />
      </div>
    </div>
  );

  const full = (
    <div
      data-layout="full"
      className={cn(
        "mx-auto grid w-full max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] @2xl:gap-y-0",
        layout === "auto" && "@max-3xl:hidden"
      )}
    >
      <div className="order-1 flex min-w-0 items-center gap-3 @2xl:order-none">
        {identity}
        {onFavoriteChange && <FavoriteButton favorite={favorite} onFavoriteChange={onFavoriteChange} title={track.title} size="sm" />}
      </div>
      {/* Narrow bars: identity and window buttons on the first line, transport and seek bar underneath. */}
      <div className="order-3 col-span-2 flex min-w-0 flex-col items-stretch gap-0.5 @2xl:order-none @2xl:col-span-1">
        <Transport p={transport} size="sm" />
        <SeekBar size="sm" value={currentTime} duration={duration} buffered={buffered} onSeek={onSeek} />
      </div>
      <div className="order-2 flex min-w-0 items-center justify-end gap-1 @2xl:order-none">
        {queuePosition && (
          <span className="me-1 whitespace-nowrap text-xs text-muted-foreground tabular-nums @max-5xl:hidden">
            <bdi dir="ltr">{queuePosition.index + 1} of {queuePosition.total}</bdi>
          </span>
        )}
        {onVolumeChange && (
          <VolumeControl
            size="sm"
            expand="always"
            volume={volume ?? 1}
            muted={!!muted}
            onVolumeChange={onVolumeChange}
            onMutedChange={onMutedChange}
            className="@max-5xl:hidden"
          />
        )}
        {onExpand && (
          <button type="button" aria-label="Open now playing" onClick={onExpand} className={mediaButtonVariants({ size: "sm" })}>
            <RiArrowUpSLine aria-hidden />
          </button>
        )}
        {onClose && (
          <button type="button" aria-label="Close player" onClick={onClose} className={mediaButtonVariants({ size: "sm" })}>
            <RiCloseLine aria-hidden />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Now playing"
      className={cn("@container border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80", className)}
      {...props}
    >
      {layout !== "full" && compact}
      {layout !== "compact" && full}
    </div>
  );
});
MiniPlayer.displayName = "MiniPlayer";

export * from "./audio-player-model";
export * from "./audio-player-now-playing";
export * from "./audio-player-queue";
export * from "./audio-player-track-row";
