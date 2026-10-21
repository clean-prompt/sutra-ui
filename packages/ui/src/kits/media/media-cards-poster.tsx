import * as React from "react";
import { RiPlayLargeFill } from "@remixicon/react";
import { normalizeTone, type Tone } from "../../lib/tone";
import { cn, focusRing } from "../../lib/cn";
import { Progress } from "../../primitives/progress";
import { clamp } from "../../lib/math";
import { formatDuration } from "../../lib/duration";
import { Badge } from "../../primitives/badge";
import { Spinner } from "../../primitives/spinner";
import { ImageWithFallback } from "../../patterns/lightbox";
import type { MediaStatus, MediaCardAction, MediaBusyState } from "./media-cards-model";

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

/** Light text for the dark image scrim: the badge sits in a `dark` scope, so the soft-foreground tokens are the light ones. */
const statusTone: Record<Tone, string> = {
  neutral: "text-white/90",
  primary: "text-primary-soft-foreground",
  info: "text-info-soft-foreground",
  success: "text-success-soft-foreground",
  warning: "text-warning-soft-foreground",
  destructive: "text-destructive-soft-foreground",
};

function StatusBadge({ status }: { status: MediaStatus }) {
  return (
    <span
      data-slot="media-status"
      className={cn(
        "dark pointer-events-none absolute start-2 top-2 z-20 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-sm border border-white/10 bg-black/65 px-1.5 py-0.5 text-[10px] font-medium leading-4 backdrop-blur-sm [&_svg]:size-3 [&_svg]:shrink-0",
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
      className="absolute end-2 top-2 z-20 flex gap-1 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/media:opacity-100 [@media(hover:hover)]:group-focus-within/media:opacity-100"
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
          "absolute inset-0 size-full transition-[scale,filter] duration-300 [@media(hover:hover)]:group-hover/media:scale-[1.03]",
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
            <RiPlayLargeFill aria-hidden className="size-6 translate-x-px rtl:-translate-x-px" />
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
  /** Title of the film or show; shown under the poster and in the accessible name. */
  title: string;
  /** Poster image URL. */
  image?: string;
  /** Alt text of the poster; decorative (empty) by default, since the title is shown beside it. */
  imageAlt?: string;
  /** Release year, shown in the meta line. */
  year?: string | number;
  /** Extra meta after the year, e.g. "2h 14m" or "8 episodes". */
  meta?: React.ReactNode;
  /** Primary action (the whole poster is the hit target). */
  onPlay?: () => void;
  /** Makes the poster a link to this address instead of a button. */
  href?: string;
  /** Accessible name of the poster's main action. Default "Play {title}". */
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
  /** Disables the main action and dims the poster. */
  disabled?: boolean;
  /** Why the poster cannot be played; shown as a tooltip and read with the title. */
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
  /** Episode number, shown in the meta line and the default accessible name. */
  episode?: number | string;
  /** Season number, shown in the meta line. */
  season?: number | string;
  /** Seconds, or a preformatted string. */
  runtime?: number | string;
  /** Short synopsis under the title. */
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
              <span className="pointer-events-none absolute bottom-2 end-2 z-[6] rounded-sm bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
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


/** Format a runtime in seconds as "1h 52m" / "48m". */
export function formatRuntimeLabel(seconds: number) {
  return formatRuntime(seconds);
}
