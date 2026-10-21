/** Media cards: poster and episode cards, album and playlist cards, the shelf and the hero banner, one module per family. */
import * as React from "react";
import { RiInformationLine, RiPlayFill } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { Progress } from "../../primitives/progress";
import { clamp } from "../../lib/math";
import { Button } from "../../primitives/button";

/* ------------------------------------------------------------------ */
/* MediaHero                                                           */
/* ------------------------------------------------------------------ */

export interface MediaHeroProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Title of the film or show; the accessible name even when `logo` replaces it visually. */
  title: string;
  /** Title artwork (replaces the text title visually; the title stays the accessible name). */
  logo?: string;
  /** Full-bleed background image URL. */
  backdrop?: string;
  /** Small line above the title (for example "New episode" or "Featured"). */
  eyebrow?: React.ReactNode;
  /** Short facts shown as chips: year, rating, runtime, genres. */
  meta?: React.ReactNode[];
  /** Short description under the title. */
  synopsis?: React.ReactNode;
  /** Called when the user presses the play button; the button is hidden when unset. */
  onPlay?: () => void;
  /** Label of the play button. Default "Play". */
  playLabel?: string;
  /** Called when the user presses the more-info button; the button is hidden when unset. */
  onMoreInfo?: () => void;
  /** Label of the more-info button. Default "More info". */
  moreInfoLabel?: string;
  /** Extra buttons after Play / More info. */
  actions?: React.ReactNode;
  /** Watch progress 0–100 with an optional label ("38 min left"). */
  progress?: number;
  /** Text beside the progress bar (for example "38 min left"). */
  progressLabel?: React.ReactNode;
}

/** Featured banner: backdrop with gradients, title/logo, meta chips, clamped synopsis, Play and More info. */
export const MediaHero = React.forwardRef<HTMLElement, MediaHeroProps>(
  (
    {
      title,
      logo,
      backdrop,
      eyebrow,
      meta,
      synopsis,
      onPlay,
      playLabel = "Play",
      onMoreInfo,
      moreInfoLabel = "More info",
      actions,
      progress,
      progressLabel,
      className,
      ...props
    },
    ref
  ) => {
    const headingId = React.useId();
    return (
      <section
        ref={ref}
        aria-labelledby={headingId}
        className={cn(
          "relative isolate flex min-h-[24rem] w-full items-end overflow-hidden rounded-box bg-black text-white sm:min-h-[28rem] lg:aspect-[21/9] lg:min-h-0",
          className
        )}
        {...props}
      >
        {backdrop && <img src={backdrop} alt="" className="absolute inset-0 -z-10 size-full object-cover" />}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/45 to-black/5" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r rtl:bg-gradient-to-l from-black/80 via-black/25 to-transparent" />
        <div className="flex w-full max-w-2xl flex-col gap-3 p-5 sm:p-8 lg:p-10">
          {eyebrow && <div className="text-xs font-semibold uppercase tracking-widest text-white/75">{eyebrow}</div>}
          <h2 id={headingId} className={cn(logo ? "sr-only" : "text-display-xs font-semibold tracking-tight text-balance sm:text-display-sm lg:text-display-md")}>
            {title}
          </h2>
          {logo && <img src={logo} alt="" aria-hidden className="max-h-24 w-auto max-w-[70%] object-contain object-left drop-shadow-lg sm:max-h-32" />}
          {meta && meta.length > 0 && (
            <ul aria-label="Details" className="flex flex-wrap items-center gap-1.5">
              {meta.map((m, i) => (
                <li
                  key={i}
                  className="inline-flex h-6 items-center rounded-control border border-white/20 bg-white/10 px-2 text-xs font-medium text-white/90 backdrop-blur-sm"
                >
                  {m}
                </li>
              ))}
            </ul>
          )}
          {synopsis && <p className="line-clamp-3 max-w-xl text-sm text-white/80 sm:text-base">{synopsis}</p>}
          {progress !== undefined && progress > 0 && (
            <div className="flex max-w-sm items-center gap-3">
              <Progress
                size="xs"
                value={Math.round(progress)}
                aria-label="Watched"
                className="flex-1 bg-white/25"
                indicatorClassName="transition-none"
              />
              {progressLabel && <span className="shrink-0 text-xs text-white/75">{progressLabel}</span>}
            </div>
          )}
          {(onPlay || onMoreInfo || actions) && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {onPlay && (
                <Button size="lg" onClick={onPlay} leadingIcon={<RiPlayFill aria-hidden />} className="bg-white text-black shadow-lg hover:bg-white/90">
                  {playLabel}
                </Button>
              )}
              {onMoreInfo && (
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={onMoreInfo}
                  leadingIcon={<RiInformationLine aria-hidden />}
                  className="bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                >
                  {moreInfoLabel}
                </Button>
              )}
              {actions}
            </div>
          )}
        </div>
      </section>
    );
  }
);
MediaHero.displayName = "MediaHero";

export * from "./media-cards-model";
export * from "./media-cards-poster";
export * from "./media-cards-collection";
export * from "./media-cards-shelf";
