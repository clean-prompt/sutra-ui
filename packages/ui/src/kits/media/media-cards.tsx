import * as React from "react";
import { RiArrowLeftSLine, RiArrowRightSLine, RiInformationLine, RiPauseFill, RiPlayFill, RiPlayLargeFill } from "@remixicon/react";
import { normalizeTone, type Tone } from "../../lib/tone";
import { cn, focusRing } from "../../lib/cn";
import { Progress } from "../../primitives/progress";
import { pluralize } from "../../lib/format";
import { clamp } from "../../lib/math";
import { formatDuration } from "../../lib/duration";
import { prefersReducedMotion } from "../../hooks/use-media-query";
import { useResizeObserver } from "../../hooks/use-resize-observer";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { Spinner } from "../../primitives/spinner";
import { ImageWithFallback } from "../../patterns/lightbox";
import { NowPlayingBars } from "./media-controls";

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

/** Canonical `Tone`; `brand` is a deprecated alias of `primary`. */
export type MediaStatusTone = Tone | "brand";

export interface MediaStatus {
  label: string;
  icon?: React.ReactNode;
  tone?: MediaStatusTone;
  /** Gentle pulse for in-progress states (e.g. "Transcoding"). */
  pulse?: boolean;
}

export interface MediaCardAction {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  /** Only destructive actions turn red on hover. */
  destructive?: boolean;
  /** Pressed state (e.g. "In vault"). */
  active?: boolean;
  disabled?: boolean;
}

export interface MediaBusyState {
  /** Default "Working…". */
  label?: string;
  /** 0–100; omit for indeterminate. */
  progress?: number;
}

/** Light text for the dark image scrim (theme tokens would be too dark here). */
const statusTone: Record<Tone, string> = {
  neutral: "text-white/90",
  primary: "text-brand-300",
  info: "text-sky-300",
  success: "text-emerald-300",
  warning: "text-amber-300",
  destructive: "text-red-300",
};

function StatusBadge({ status }: { status: MediaStatus }) {
  return (
    <span
      data-slot="media-status"
      className={cn(
        "pointer-events-none absolute left-2 top-2 z-20 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-sm border border-white/10 bg-black/65 px-1.5 py-0.5 text-[10px] font-medium leading-4 backdrop-blur-sm [&_svg]:size-3 [&_svg]:shrink-0",
        statusTone[normalizeTone(status.tone)],
        status.pulse && "animate-pulse motion-reduce:animate-none"
      )}
    >
      {status.icon}
      <span className="truncate">{status.label}</span>
    </span>
  );
}

function ActionsRow({ actions }: { actions: MediaCardAction[] }) {
  return (
    <div
      data-slot="media-actions"
      className="absolute right-2 top-2 z-20 flex gap-1 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/media:opacity-100 [@media(hover:hover)]:group-focus-within/media:opacity-100"
    >
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          aria-label={a.label}
          title={a.label}
          aria-pressed={a.active === undefined ? undefined : a.active}
          disabled={a.disabled}
          onClick={(e) => {
            e.stopPropagation();
            a.onSelect();
          }}
          className={cn(
            "grid size-7 place-items-center rounded-full backdrop-blur-sm transition-colors disabled:opacity-40 [&_svg]:size-3.5",
            focusRing,
            a.active
              ? "bg-primary text-primary-foreground"
              : a.destructive
                ? "bg-black/60 text-white/75 hover:bg-destructive hover:text-white"
                : "bg-black/60 text-white/75 hover:bg-black/80 hover:text-white"
          )}
        >
          {a.icon}
        </button>
      ))}
    </div>
  );
}

function BusyOverlay({ busy }: { busy: MediaBusyState }) {
  const pct = busy.progress === undefined ? undefined : Math.round(clamp(busy.progress, 0, 100));
  const label = busy.label ?? "Working…";
  return (
    <div
      role="status"
      data-slot="media-busy"
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/75 px-3 text-center text-white"
    >
      <Spinner size="lg" className="text-white" label={label} />
      <span className="text-xs font-medium">
        {label}
        {pct !== undefined && ` ${pct}%`}
      </span>
      {pct !== undefined && (
        <Progress aria-hidden size="sm" value={pct} className="w-2/3 bg-white/20" indicatorClassName="bg-white" />
      )}
    </div>
  );
}

function ProgressStrip({ value, label = "Watched" }: { value: number; label?: string }) {
  const pct = Math.round(clamp(value, 0, 100));
  return (
    <Progress
      size="xs"
      value={pct}
      aria-label={label}
      data-slot="media-progress"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 rounded-none bg-black/45"
      indicatorClassName="rounded-none transition-none"
    />
  );
}

interface MediaFrameProps {
  title: string;
  image?: string;
  imageAlt?: string;
  ratio: number;
  onPlay?: () => void;
  href?: string;
  playLabel?: string;
  status?: MediaStatus;
  actions?: MediaCardAction[];
  progress?: number;
  busy?: MediaBusyState;
  disabled?: boolean;
  disabledReason?: string;
  overlay?: React.ReactNode;
  className?: string;
}

function MediaFrame({
  title,
  image,
  imageAlt,
  ratio,
  onPlay,
  href,
  playLabel,
  status,
  actions,
  progress,
  busy,
  disabled,
  disabledReason,
  overlay,
  className,
}: MediaFrameProps) {
  const label = playLabel ?? `Play ${title}`;
  const hitClass = cn("absolute inset-0 z-10 rounded-[inherit] disabled:cursor-not-allowed", focusRing, "focus-visible:ring-inset");
  return (
    <div
      className={cn("relative overflow-hidden rounded-box border border-border bg-muted shadow-xs", className)}
      style={{ aspectRatio: ratio }}
    >
      <ImageWithFallback
        src={image}
        alt={imageAlt ?? ""}
        className={cn(
          "absolute inset-0 size-full transition-[transform,filter] duration-300 [@media(hover:hover)]:group-hover/media:scale-[1.03]",
          disabled && "opacity-70 saturate-50"
        )}
        fallback={
          <span className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-subtle px-3 text-center text-sm font-medium text-muted-foreground">
            {title}
          </span>
        }
      />
      {overlay}
      {!disabled && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[5] grid place-items-center bg-black/0 opacity-0 transition-[opacity,background-color] duration-200 group-hover/media:bg-black/35 group-hover/media:opacity-100"
        >
          <span className="grid size-12 place-items-center rounded-full bg-white/90 text-black shadow-xl">
            <RiPlayLargeFill aria-hidden className="size-6 translate-x-px" />
          </span>
        </div>
      )}
      {href && !disabled ? (
        <a href={href} aria-label={label} className={hitClass} onClick={onPlay ? () => onPlay() : undefined} />
      ) : (
        (onPlay || disabled) && (
          <button
            type="button"
            aria-label={disabled && disabledReason ? `${title}: ${disabledReason}` : label}
            title={disabled ? disabledReason : undefined}
            disabled={disabled}
            onClick={onPlay}
            className={hitClass}
          />
        )
      )}
      {status && <StatusBadge status={status} />}
      {actions && actions.length > 0 && !busy && <ActionsRow actions={actions} />}
      {progress !== undefined && progress > 0 && <ProgressStrip value={progress} />}
      {busy && <BusyOverlay busy={busy} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PosterCard                                                          */
/* ------------------------------------------------------------------ */

export interface PosterCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: string;
  image?: string;
  imageAlt?: string;
  year?: string | number;
  /** Extra meta after the year, e.g. "2h 14m" or "8 episodes". */
  meta?: React.ReactNode;
  /** Primary action (the whole poster is the hit target). */
  onPlay?: () => void;
  href?: string;
  playLabel?: string;
  /** One status badge, top-left. */
  status?: MediaStatus;
  /** Audio/subtitle language codes shown as small badges. */
  languages?: string[];
  /** Watch progress 0–100 (strip along the bottom). */
  progress?: number;
  /** Blocking overlay, e.g. `{ label: "Moving…", progress: 42 }`. */
  busy?: MediaBusyState;
  /** Quiet icon actions revealed on hover (always visible on touch). */
  actions?: MediaCardAction[];
  disabled?: boolean;
  disabledReason?: string;
  /** Width / height. Default 2/3. */
  ratio?: number;
}

/** 2:3 poster with fallback, hover play, quiet actions, status/language badges, watch progress and busy overlay. */
export const PosterCard = React.forwardRef<HTMLDivElement, PosterCardProps>(
  (
    {
      title,
      image,
      imageAlt,
      year,
      meta,
      onPlay,
      href,
      playLabel,
      status,
      languages,
      progress,
      busy,
      actions,
      disabled,
      disabledReason,
      ratio = 2 / 3,
      className,
      ...props
    },
    ref
  ) => {
    const metaLine = [year, meta].filter((m) => m !== undefined && m !== null && m !== "");
    return (
      <div
        ref={ref}
        data-disabled={disabled ? "" : undefined}
        aria-busy={busy ? true : undefined}
        className={cn("group/media flex min-w-0 flex-col gap-2", className)}
        {...props}
      >
        <MediaFrame
          title={title}
          image={image}
          imageAlt={imageAlt}
          ratio={ratio}
          onPlay={onPlay}
          href={href}
          playLabel={playLabel}
          status={status}
          actions={actions}
          progress={progress}
          busy={busy}
          disabled={disabled}
          disabledReason={disabledReason}
        />
        <div className="min-w-0 px-0.5">
          <h3 className="truncate text-sm font-medium text-foreground" title={title}>
            {title}
          </h3>
          {(metaLine.length > 0 || languages?.length) && (
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              {metaLine.length > 0 && (
                <span className="truncate">
                  {metaLine.map((m, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span aria-hidden> · </span>}
                      {m}
                    </React.Fragment>
                  ))}
                </span>
              )}
              {languages?.slice(0, 3).map((l) => (
                <Badge key={l} size="sm" variant="outline" className="h-4 px-1 text-[9px] uppercase">
                  {l}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);
PosterCard.displayName = "PosterCard";

/* ------------------------------------------------------------------ */
/* EpisodeCard                                                         */
/* ------------------------------------------------------------------ */

export interface EpisodeCardProps extends Omit<PosterCardProps, "ratio" | "year" | "languages"> {
  episode?: number | string;
  season?: number | string;
  /** Seconds, or a preformatted string. */
  runtime?: number | string;
  description?: React.ReactNode;
  /** Thumbnail beside the text instead of above it. */
  orientation?: "vertical" | "horizontal";
}

function formatRuntime(runtime: number | string) {
  if (typeof runtime === "string") return runtime;
  return formatDuration(runtime * 1000, { minUnit: "m", maxUnit: "h" });
}

/** Landscape 16:9 episode card with episode number, runtime, description, progress and actions. */
export const EpisodeCard = React.forwardRef<HTMLDivElement, EpisodeCardProps>(
  (
    {
      title,
      image,
      imageAlt,
      episode,
      season,
      runtime,
      description,
      meta,
      onPlay,
      href,
      playLabel,
      status,
      progress,
      busy,
      actions,
      disabled,
      disabledReason,
      orientation = "vertical",
      className,
      ...props
    },
    ref
  ) => {
    const number = episode !== undefined ? `${season !== undefined ? `S${season} · ` : ""}E${episode}` : undefined;
    const horizontal = orientation === "horizontal";
    return (
      <div
        ref={ref}
        data-orientation={orientation}
        aria-busy={busy ? true : undefined}
        className={cn("group/media flex min-w-0 gap-3", horizontal ? "flex-row items-start" : "flex-col", className)}
        {...props}
      >
        <MediaFrame
          title={title}
          image={image}
          imageAlt={imageAlt}
          ratio={16 / 9}
          onPlay={onPlay}
          href={href}
          playLabel={playLabel ?? (episode !== undefined ? `Play episode ${episode}: ${title}` : undefined)}
          status={status}
          actions={actions}
          progress={progress}
          busy={busy}
          disabled={disabled}
          disabledReason={disabledReason}
          className={horizontal ? "w-36 shrink-0 sm:w-52" : "w-full"}
          overlay={
            runtime !== undefined ? (
              <span className="pointer-events-none absolute bottom-2 right-2 z-[6] rounded-sm bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
                {formatRuntime(runtime)}
              </span>
            ) : undefined
          }
        />
        <div className="min-w-0 flex-1 px-0.5">
          <div className="flex items-baseline gap-2">
            {number && <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">{number}</span>}
            <h3 className="min-w-0 truncate text-sm font-medium text-foreground" title={title}>
              {title}
            </h3>
          </div>
          {meta && <div className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</div>}
          {description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
    );
  }
);
EpisodeCard.displayName = "EpisodeCard";

/* ------------------------------------------------------------------ */
/* AlbumCard / PlaylistCard                                            */
/* ------------------------------------------------------------------ */

export interface AlbumCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: string;
  subtitle?: React.ReactNode;
  image?: string;
  /** Open the album/playlist (whole card). */
  onOpen?: () => void;
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
              "absolute bottom-2 right-2 z-20 grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-[opacity,transform,background-color] duration-200 hover:scale-105 hover:bg-primary-hover",
              focusRing,
              playing
                ? "translate-y-0 opacity-100"
                : "[@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/album:translate-y-0 [@media(hover:hover)]:group-hover/album:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
            )}
          >
            {playing ? <RiPauseFill aria-hidden className="size-5" /> : <RiPlayFill aria-hidden className="size-5 translate-x-px" />}
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

/* ------------------------------------------------------------------ */
/* MediaShelf                                                          */
/* ------------------------------------------------------------------ */

type ShelfBreakpoint = "sm" | "md" | "lg" | "xl";

const shelfGrid: Record<ShelfBreakpoint, { list: string; item: string; hide: string }> = {
  sm: {
    list: "sm:grid sm:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] sm:overflow-visible sm:[mask-image:none]",
    item: "sm:w-auto",
    hide: "sm:hidden",
  },
  md: {
    list: "md:grid md:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] md:overflow-visible md:[mask-image:none]",
    item: "md:w-auto",
    hide: "md:hidden",
  },
  lg: {
    list: "lg:grid lg:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] lg:overflow-visible lg:[mask-image:none]",
    item: "lg:w-auto",
    hide: "lg:hidden",
  },
  xl: {
    list: "xl:grid xl:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] xl:overflow-visible xl:[mask-image:none]",
    item: "xl:w-auto",
    hide: "xl:hidden",
  },
};

export interface MediaShelfProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  onSeeAll?: () => void;
  seeAllHref?: string;
  seeAllLabel?: string;
  /** Width classes for each item in the row. Default "w-36 sm:w-40 md:w-44". */
  itemClassName?: string;
  /** Switch from a scrolling row to a wrapping grid from this breakpoint. */
  gridAbove?: ShelfBreakpoint;
  /** Classes for the scrolling list (e.g. a different gap). */
  listClassName?: string;
}

/** Horizontal media shelf: title + "See all", scroll-snap row with edge fades and prev/next, optional grid from a breakpoint. */
export const MediaShelf = React.forwardRef<HTMLElement, MediaShelfProps>(
  (
    {
      title,
      description,
      onSeeAll,
      seeAllHref,
      seeAllLabel = "See all",
      itemClassName = "w-36 sm:w-40 md:w-44",
      gridAbove,
      listClassName,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const listRef = React.useRef<HTMLUListElement | null>(null);
    const [edges, setEdges] = React.useState({ start: false, end: false });
    const headingId = React.useId();

    const update = React.useCallback(() => {
      const el = listRef.current;
      if (!el) return;
      const next = { start: el.scrollLeft > 1, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 };
      setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
    }, []);

    React.useEffect(() => {
      const el = listRef.current;
      if (!el) return;
      update();
      el.addEventListener("scroll", update, { passive: true });
      return () => el.removeEventListener("scroll", update);
    }, [update]);
    useResizeObserver(listRef, update);

    const scrollByPage = (dir: 1 | -1) => {
      const el = listRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.9), behavior: prefersReducedMotion() ? "auto" : "smooth" });
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, [role="slider"]')) return;
      const items = Array.from(listRef.current?.children ?? []) as HTMLElement[];
      const at = items.findIndex((li) => li.contains(target));
      if (at < 0) return;
      const to =
        e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : clamp(at + (e.key === "ArrowRight" ? 1 : -1), 0, items.length - 1);
      if (to === at) return;
      const focusable = items[to].querySelector<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable) return;
      e.preventDefault();
      focusable.focus({ preventScroll: true });
      items[to].scrollIntoView?.({ block: "nearest", inline: "nearest" });
    };

    const fade = 32;
    const mask = `linear-gradient(to right, ${edges.start ? "transparent" : "#000"}, #000 ${fade}px, #000 calc(100% - ${fade}px), ${
      edges.end ? "transparent" : "#000"
    })`;
    const grid = gridAbove ? shelfGrid[gridAbove] : null;
    const items = React.Children.toArray(children).filter(Boolean);

    return (
      <section ref={ref} aria-labelledby={headingId} className={cn("min-w-0", className)} {...props}>
        <div className="mb-3 flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="truncate text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {description && <p className="truncate text-sm text-muted-foreground">{description}</p>}
          </div>
          {(onSeeAll || seeAllHref) &&
            (seeAllHref ? (
              <Button asChild variant="link" size="sm" className="shrink-0">
                <a href={seeAllHref} onClick={onSeeAll ? () => onSeeAll() : undefined}>
                  {seeAllLabel}
                </a>
              </Button>
            ) : (
              <Button variant="link" size="sm" className="shrink-0" onClick={onSeeAll}>
                {seeAllLabel}
              </Button>
            ))}
          <div className={cn("hidden shrink-0 gap-1 [@media(hover:hover)]:md:flex", grid?.hide)}>
            <Button variant="secondary" size="icon-sm" aria-label="Scroll back" disabled={!edges.start} onClick={() => scrollByPage(-1)}>
              <RiArrowLeftSLine aria-hidden />
            </Button>
            <Button variant="secondary" size="icon-sm" aria-label="Scroll forward" disabled={!edges.end} onClick={() => scrollByPage(1)}>
              <RiArrowRightSLine aria-hidden />
            </Button>
          </div>
        </div>
        <ul
          ref={listRef}
          onKeyDown={onKeyDown}
          style={{ maskImage: mask, WebkitMaskImage: mask }}
          className={cn(
            "-mx-1 flex snap-x snap-mandatory scroll-px-1 gap-4 overflow-x-auto px-1 pb-2 pt-1 scrollbar-none",
            grid?.list,
            listClassName
          )}
        >
          {items.map((child, i) => (
            <li key={(React.isValidElement(child) && child.key) || i} className={cn("shrink-0 snap-start", itemClassName, grid?.item)}>
              {child}
            </li>
          ))}
        </ul>
      </section>
    );
  }
);
MediaShelf.displayName = "MediaShelf";

/* ------------------------------------------------------------------ */
/* MediaHero                                                           */
/* ------------------------------------------------------------------ */

export interface MediaHeroProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: string;
  /** Title artwork (replaces the text title visually; the title stays the accessible name). */
  logo?: string;
  backdrop?: string;
  eyebrow?: React.ReactNode;
  /** Short facts shown as chips: year, rating, runtime, genres. */
  meta?: React.ReactNode[];
  synopsis?: React.ReactNode;
  onPlay?: () => void;
  playLabel?: string;
  onMoreInfo?: () => void;
  moreInfoLabel?: string;
  /** Extra buttons after Play / More info. */
  actions?: React.ReactNode;
  /** Watch progress 0–100 with an optional label ("38 min left"). */
  progress?: number;
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
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/25 to-transparent" />
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

/** Format a runtime in seconds as "1h 52m" / "48m". */
export function formatRuntimeLabel(seconds: number) {
  return formatRuntime(seconds);
}
