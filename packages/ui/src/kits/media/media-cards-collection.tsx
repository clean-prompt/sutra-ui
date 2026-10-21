import * as React from "react";
import { RiPauseFill, RiPlayFill } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { ImageWithFallback } from "../../patterns/lightbox";
import { NowPlayingBars } from "./media-controls-indicators";

/* ------------------------------------------------------------------ */
/* AlbumCard / PlaylistCard                                            */
/* ------------------------------------------------------------------ */

export interface AlbumCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Album, playlist or artist name, shown under the artwork. */
  title: string;
  /** Line under the title (for example the artist or the track count). */
  subtitle?: React.ReactNode;
  /** Artwork image URL. */
  image?: string;
  /** Open the album/playlist (whole card). */
  onOpen?: () => void;
  /** Makes the card a link to this address instead of a button. */
  href?: string;
  /** Floating play button on the artwork. */
  onPlay?: () => void;
  /** This collection is what is playing (FAB shows pause and stays visible). */
  playing?: boolean;
  /** Circle for artists. Default "square". */
  shape?: "square" | "circle";
}

function CollectionArt({ images, title, shape }: { images: (string | undefined)[]; title: string; shape: "square" | "circle" }) {
  const mosaic = images.filter(Boolean).length >= 4;
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden border border-border bg-muted shadow-xs",
        shape === "circle" ? "rounded-full" : "rounded-box"
      )}
    >
      {mosaic ? (
        <div className="grid size-full grid-cols-2 grid-rows-2">
          {images.slice(0, 4).map((src, i) => (
            <ImageWithFallback key={i} src={src} alt="" className="size-full" />
          ))}
        </div>
      ) : (
        <ImageWithFallback
          src={images[0]}
          alt=""
          className="absolute inset-0 size-full transition-transform duration-300 [@media(hover:hover)]:group-hover/album:scale-[1.03]"
          fallback={
            <span className="flex size-full items-center justify-center bg-gradient-to-br from-primary-soft to-muted px-3 text-center text-sm font-medium text-primary-soft-foreground">
              {title}
            </span>
          }
        />
      )}
    </div>
  );
}

function CollectionCard({
  title,
  subtitle,
  images,
  onOpen,
  href,
  onPlay,
  playing,
  shape = "square",
  className,
  forwardedRef,
  ...props
}: Omit<AlbumCardProps, "image"> & { images: (string | undefined)[]; forwardedRef: React.Ref<HTMLDivElement> }) {
  const hit = cn("absolute inset-0 z-10", shape === "circle" ? "rounded-full" : "rounded-box", focusRing);
  return (
    <div ref={forwardedRef} className={cn("group/album flex min-w-0 flex-col gap-2", className)} {...props}>
      <div className="relative">
        <CollectionArt images={images} title={title} shape={shape} />
        {href ? (
          <a href={href} aria-label={`Open ${title}`} className={hit} onClick={onOpen ? () => onOpen() : undefined} />
        ) : (
          onOpen && <button type="button" aria-label={`Open ${title}`} onClick={onOpen} className={hit} />
        )}
        {onPlay && (
          <button
            type="button"
            aria-label={playing ? `Pause ${title}` : `Play ${title}`}
            onClick={onPlay}
            className={cn(
              "absolute bottom-2 end-2 z-20 grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-[opacity,scale,background-color] duration-200 hover:scale-105 hover:bg-primary-hover",
              focusRing,
              playing
                ? "translate-y-0 opacity-100"
                : "[@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/album:translate-y-0 [@media(hover:hover)]:group-hover/album:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
            )}
          >
            {playing ? <RiPauseFill aria-hidden className="size-5" /> : <RiPlayFill aria-hidden className="size-5 translate-x-px rtl:-translate-x-px" />}
          </button>
        )}
      </div>
      <div className={cn("min-w-0 px-0.5", shape === "circle" && "text-center")}>
        <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
          {playing && <NowPlayingBars playing label={null} />}
          <span className="truncate" title={title}>
            {title}
          </span>
        </h3>
        {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

/** Square album art with a hover play FAB, title and subtitle. */
export const AlbumCard = React.forwardRef<HTMLDivElement, AlbumCardProps>(({ image, ...props }, ref) => (
  <CollectionCard {...props} images={[image]} forwardedRef={ref} />
));
AlbumCard.displayName = "AlbumCard";

export interface PlaylistCardProps extends AlbumCardProps {
  /** Up to four covers, shown as a 2×2 mosaic when there is no single image. */
  artworks?: string[];
  /** Track count; used for the default subtitle ("12 tracks"). */
  count?: number;
}

/** Playlist variant of AlbumCard: optional 2×2 cover mosaic and a track-count subtitle. */
export const PlaylistCard = React.forwardRef<HTMLDivElement, PlaylistCardProps>(({ image, artworks, count, subtitle, ...props }, ref) => (
  <CollectionCard
    {...props}
    subtitle={subtitle ?? (count !== undefined ? `${count} ${pluralize(count, "track")}` : undefined)}
    images={image ? [image] : (artworks ?? [])}
    forwardedRef={ref}
  />
));
PlaylistCard.displayName = "PlaylistCard";
