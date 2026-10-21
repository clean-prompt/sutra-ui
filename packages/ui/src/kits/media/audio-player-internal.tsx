import { RiHeartFill, RiHeartLine, RiMusic2Line, RiSkipBackFill, RiSkipForwardFill } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { ImageWithFallback } from "../../patterns/lightbox";
import { mediaButtonVariants } from "./media-controls-base";
import { PlayPauseButton, RepeatButton, ShuffleButton } from "./media-controls-playback";
import type { PlayerTrack, PlayerTransportProps } from "./audio-player-model";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

export function TrackArtwork({ src, className, iconClassName }: { src?: string; className?: string; iconClassName?: string }) {
  if (!src) {
    return (
      <span aria-hidden className={cn("grid aspect-square shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground", className)}>
        <RiMusic2Line aria-hidden className={cn("size-1/2 max-h-10 max-w-10", iconClassName)} />
      </span>
    );
  }
  return (
    <ImageWithFallback
      src={src}
      alt=""
      ratio={1}
      className={cn("shrink-0 overflow-hidden rounded-md bg-muted", className)}
      fallback={
        <span className="grid size-full place-items-center bg-muted text-muted-foreground">
          <RiMusic2Line aria-hidden className={cn("size-1/2 max-h-10 max-w-10", iconClassName)} />
        </span>
      }
    />
  );
}

export function trackByline(track: PlayerTrack) {
  return track.artist || "Unknown artist";
}


export function FavoriteButton({
  favorite,
  onFavoriteChange,
  title,
  size = "md",
}: {
  favorite?: boolean;
  onFavoriteChange: (v: boolean) => void;
  title: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      type="button"
      aria-pressed={!!favorite}
      aria-label={favorite ? `Remove ${title} from favorites` : `Add ${title} to favorites`}
      onClick={() => onFavoriteChange(!favorite)}
      className={mediaButtonVariants({ size, active: !!favorite })}
    >
      {favorite ? <RiHeartFill aria-hidden /> : <RiHeartLine aria-hidden />}
    </button>
  );
}

export function Transport({
  p,
  size,
  playVariant = "solid",
}: {
  p: PlayerTransportProps;
  size: "sm" | "md" | "lg";
  playVariant?: "solid" | "primary";
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      {p.onShuffleChange && <ShuffleButton size={size === "lg" ? "md" : "sm"} pressed={!!p.shuffle} onPressedChange={p.onShuffleChange} />}
      <button
        type="button"
        aria-label="Previous"
        disabled={!p.onPrevious || p.hasPrevious === false}
        onClick={p.onPrevious}
        className={mediaButtonVariants({ size: size === "lg" ? "lg" : "sm" })}
      >
        <RiSkipBackFill aria-hidden className="text-foreground" />
      </button>
      <PlayPauseButton
        playing={p.playing}
        loading={p.buffering}
        onClick={p.onPlayPause}
        variant={playVariant}
        size={size === "lg" ? "xl" : size === "md" ? "md" : "sm"}
        className={size === "lg" ? "mx-2" : "mx-1"}
      />
      <button
        type="button"
        aria-label="Next"
        disabled={!p.onNext || p.hasNext === false}
        onClick={p.onNext}
        className={mediaButtonVariants({ size: size === "lg" ? "lg" : "sm" })}
      >
        <RiSkipForwardFill aria-hidden className="text-foreground" />
      </button>
      {p.onRepeatChange && <RepeatButton size={size === "lg" ? "md" : "sm"} value={p.repeat ?? "off"} onValueChange={p.onRepeatChange} />}
    </div>
  );
}
