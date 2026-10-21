import * as React from "react";
import { RiLockLine, RiPauseFill, RiPlayFill } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { formatClock } from "../../lib/duration";
import { NowPlayingBars } from "./media-controls-indicators";
import type { PlayerTrack } from "./audio-player-model";
import { FavoriteButton, TrackArtwork, trackByline } from "./audio-player-internal";

/* ------------------------------------------------------------------ */
/* TrackRow                                                            */
/* ------------------------------------------------------------------ */

export interface TrackRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onPlay" | "onPause"> {
  /** The track to show (title, artist, album, artwork, duration). */
  track: PlayerTrack;
  /** 1-based number shown in the lead column. */
  index?: number;
  /** This row is the queue's current track. */
  current?: boolean;
  /** Whether this row's track is playing; shows the pause icon and the now-playing bars. */
  playing?: boolean;
  /** Called with the track when the user presses the row's play button. */
  onPlay?: (track: PlayerTrack) => void;
  /** Pause when this is the current playing row (falls back to `onPlay`). */
  onPause?: (track: PlayerTrack) => void;
  /** Shows the artwork thumbnail. Default true. */
  showArtwork?: boolean;
  /** Shows the album column. Default true. */
  showAlbum?: boolean;
  /** Whether the track is a favourite; fills the heart button. */
  favorite?: boolean;
  /** Called with the new state when the user toggles the heart; the button is hidden when unset. */
  onFavoriteChange?: (favorite: boolean) => void;
  /** Extra inline actions shown on hover. */
  actions?: React.ReactNode;
  /** Trailing menu (e.g. a DropdownMenu trigger). */
  menu?: React.ReactNode;
}

/** Track list row: number/now-playing bars, hover play, artwork, title/artist, album, duration and menu slot. */
export const TrackRow = React.forwardRef<HTMLDivElement, TrackRowProps>(
  (
    {
      track,
      index,
      current = false,
      playing = false,
      onPlay,
      onPause,
      showArtwork = true,
      showAlbum = true,
      favorite,
      onFavoriteChange,
      actions,
      menu,
      className,
      onDoubleClick,
      ...props
    },
    ref
  ) => {
    const unavailable = !!track.unavailable;
    const isPlaying = current && playing;
    const activate = () => {
      if (unavailable) return;
      if (isPlaying) (onPause ?? onPlay)?.(track);
      else onPlay?.(track);
    };
    return (
      <div
        ref={ref}
        data-current={current ? "" : undefined}
        data-unavailable={unavailable ? "" : undefined}
        aria-disabled={unavailable || undefined}
        onDoubleClick={(e) => {
          onDoubleClick?.(e);
          if (!(e.target as HTMLElement).closest("button, a")) activate();
        }}
        className={cn(
          "group/track flex h-14 items-center gap-3 rounded-control px-2 text-sm transition-colors",
          current ? "bg-primary-soft/50" : "hover:bg-accent",
          unavailable && "opacity-55 hover:bg-transparent",
          className
        )}
        {...props}
      >
        <div className="relative grid w-8 shrink-0 place-items-center">
          {unavailable ? (
            <RiLockLine aria-hidden className="size-4 text-muted-foreground" />
          ) : (
            <>
              <span
                aria-hidden
                className={cn(
                  "text-sm text-muted-foreground tabular-nums transition-opacity",
                  onPlay && "group-hover/track:opacity-0 group-focus-within/track:opacity-0"
                )}
              >
                {current ? <NowPlayingBars playing={playing} label={null} size="md" /> : (index ?? "")}
              </span>
              {onPlay && (
                <button
                  type="button"
                  aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                  onClick={activate}
                  className={cn(
                    "absolute inset-0 m-auto grid size-8 place-items-center rounded-full text-foreground opacity-0 transition-opacity",
                    "group-hover/track:opacity-100 focus-visible:opacity-100",
                    focusRing
                  )}
                >
                  {isPlaying ? <RiPauseFill aria-hidden className="size-4" /> : <RiPlayFill aria-hidden className="size-4" />}
                </button>
              )}
            </>
          )}
        </div>
        {showArtwork && <TrackArtwork src={track.artwork} className="size-10" />}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={cn("truncate font-medium", current ? "text-primary" : "text-foreground", unavailable && "italic")} title={track.title}>
              {track.title}
            </span>
            {current && <span className="sr-only">{playing ? "(now playing)" : "(paused)"}</span>}
            {track.explicit && (
              <span
                role="img"
                aria-label="Explicit"
                title="Explicit"
                className="inline-grid size-4 shrink-0 place-items-center rounded-xs bg-muted-foreground/75 text-[9px] font-bold leading-none text-background"
              >
                E
              </span>
            )}
          </span>
          <span className="truncate text-xs text-muted-foreground">{unavailable ? "Unavailable" : trackByline(track)}</span>
        </div>
        {showAlbum && (
          <span className="w-1/4 min-w-0 truncate text-sm text-muted-foreground max-md:hidden">{track.album ?? ""}</span>
        )}
        {(actions || onFavoriteChange) && (
          <div className="flex shrink-0 items-center gap-0.5">
            {onFavoriteChange && !unavailable && (
              <span className={cn(!favorite && "[@media(hover:hover)]:opacity-0 group-hover/track:opacity-100 group-focus-within/track:opacity-100")}>
                <FavoriteButton favorite={favorite} onFavoriteChange={onFavoriteChange} title={track.title} size="sm" />
              </span>
            )}
            {actions && (
              <span className="flex items-center gap-0.5 [@media(hover:hover)]:opacity-0 group-hover/track:opacity-100 group-focus-within/track:opacity-100">
                {actions}
              </span>
            )}
          </div>
        )}
        <span className="w-12 shrink-0 text-end font-mono text-xs text-muted-foreground tabular-nums">
          {track.duration !== undefined ? formatClock(track.duration) : "—"}
        </span>
        {menu && <div className="shrink-0">{menu}</div>}
      </div>
    );
  }
);
TrackRow.displayName = "TrackRow";
