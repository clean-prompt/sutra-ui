import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { RiArrowDownSLine, RiPlayListAddLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useSwipe } from "../../hooks/use-swipe";
import { mediaButtonVariants } from "./media-controls-base";
import { SeekBar } from "./media-controls-seek";
import { VolumeControl } from "./media-controls-volume";
import type { PlayerTransportProps } from "./audio-player-model";
import { FavoriteButton, TrackArtwork, Transport } from "./audio-player-internal";

/* ------------------------------------------------------------------ */
/* NowPlaying                                                          */
/* ------------------------------------------------------------------ */

export interface NowPlayingProps extends PlayerTransportProps {
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. Default false. */
  defaultOpen?: boolean;
  /** Called when the full-screen player opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Replaces the artwork (e.g. a `<video>`). */
  media?: React.ReactNode;
  /** Called when the user presses Add to playlist; the button is hidden when unset. */
  onAddToPlaylist?: () => void;
  /** Extra action buttons next to favorite / add (e.g. a "More" menu). */
  actions?: React.ReactNode;
  /** Centered header content, e.g. "Playing from Road trip". */
  header?: React.ReactNode;
  /** Queue rendered under "Up next" (e.g. a `QueueList`). */
  queue?: React.ReactNode;
  /** Heading above the queue. Default "Up next". */
  queueTitle?: React.ReactNode;
  /** Extra classes for the full-screen player. */
  className?: string;
}

/** Full-screen expanded player sheet: slides up, swipe down (from the top of its scroll) to dismiss. */
export function NowPlaying({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  media,
  onAddToPlaylist,
  actions,
  header,
  queue,
  queueTitle = "Up next",
  className,
  ...transport
}: NowPlayingProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const swipe = useSwipe({
    axis: "y",
    onSwipeDown: () => setOpen(false),
    allow: (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('input[type="range"], [role="slider"]')) return false;
      return (scrollRef.current?.scrollTop ?? 0) <= 0;
    },
  });
  const { track } = transport;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-background text-foreground outline-none",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom duration-300 motion-reduce:animate-none",
            className
          )}
          {...swipe}
        >
          <DialogPrimitive.Title className="sr-only">Now playing{track ? `: ${track.title}` : ""}</DialogPrimitive.Title>
          <header className="flex shrink-0 touch-none items-center gap-2 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <DialogPrimitive.Close aria-label="Close now playing" className={mediaButtonVariants({ size: "md" })}>
              <RiArrowDownSLine aria-hidden className="size-6!" />
            </DialogPrimitive.Close>
            <div className="min-w-0 flex-1 truncate text-center text-xs font-medium text-muted-foreground">{header}</div>
            <span aria-hidden className="size-9" />
          </header>
          <div ref={scrollRef} data-slot="now-playing-scroll" className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12 lg:pt-6">
              <div className="mx-auto flex w-full max-w-md flex-col">
                <div className="overflow-hidden rounded-box bg-muted shadow-xl">
                  {media ?? <TrackArtwork src={track?.artwork} className="w-full rounded-none" iconClassName="max-h-20 max-w-20" />}
                </div>
                {track && (
                  <div className="mt-6 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-xl font-semibold tracking-tight" title={track.title}>
                        {track.title}
                      </h2>
                      <p className="truncate text-sm text-muted-foreground">
                        {[track.artist || "Unknown artist", track.album].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      {transport.onFavoriteChange && (
                        <FavoriteButton favorite={transport.favorite} onFavoriteChange={transport.onFavoriteChange} title={track.title} />
                      )}
                      {onAddToPlaylist && (
                        <button type="button" aria-label="Add to playlist" onClick={onAddToPlaylist} className={mediaButtonVariants({})}>
                          <RiPlayListAddLine aria-hidden />
                        </button>
                      )}
                      {actions}
                    </div>
                  </div>
                )}
                <SeekBar
                  className="mt-4"
                  showTimes="below"
                  value={transport.currentTime ?? 0}
                  duration={transport.duration ?? 0}
                  buffered={transport.buffered}
                  onSeek={transport.onSeek}
                />
                <div className="mt-3">
                  <Transport p={transport} size="lg" />
                </div>
                {transport.onVolumeChange && (
                  <VolumeControl
                    expand="always"
                    volume={transport.volume ?? 1}
                    muted={!!transport.muted}
                    onVolumeChange={transport.onVolumeChange}
                    onMutedChange={transport.onMutedChange}
                    className="mx-auto mt-4 max-md:hidden [&_[data-slot=volume-slider]]:w-48"
                  />
                )}
              </div>
              {queue && (
                <section aria-label="Up next" className="min-w-0">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{queueTitle}</h3>
                  {queue}
                </section>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
NowPlaying.displayName = "NowPlaying";
