import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCloseLine,
  RiDraggable,
  RiHeartFill,
  RiHeartLine,
  RiLockLine,
  RiMusic2Line,
  RiPauseFill,
  RiPlayFill,
  RiPlayListAddLine,
  RiSkipBackFill,
  RiSkipForwardFill,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { formatClock } from "../../lib/duration";
import { reorderArray } from "../../lib/reorder";
import { Progress } from "../../primitives/progress";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useSwipe } from "../../hooks/use-swipe";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { ImageWithFallback } from "../../patterns/lightbox";
import {
  NowPlayingBars,
  PlayPauseButton,
  RepeatButton,
  SeekBar,
  ShuffleButton,
  VolumeControl,
  mediaButtonVariants,
  type MediaTimeRange,
  type RepeatMode,
} from "./media-controls";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface PlayerTrack {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  artwork?: string;
  /** Seconds. */
  duration?: number;
  explicit?: boolean;
  /** Can no longer be played (removed, private, offline storage). */
  unavailable?: boolean;
}

/* ------------------------------------------------------------------ */
/* usePlayerQueue (pure reducer + hook)                                */
/* ------------------------------------------------------------------ */

export interface PlayerQueueItem {
  id: string;
}

export interface PlayerQueueState<T extends PlayerQueueItem = PlayerQueueItem> {
  /** Items in their natural (unshuffled) order. */
  items: T[];
  currentId: string | null;
  /** Play order as ids (equals `items` order unless shuffled). */
  order: string[];
  repeat: RepeatMode;
  shuffle: boolean;
  /** `next` ran past the end with repeat off. */
  ended: boolean;
}

export type PlayerQueueAction<T extends PlayerQueueItem = PlayerQueueItem> =
  | { type: "next"; /** Track finished on its own (repeat-one replays instead of advancing). */ auto?: boolean }
  | { type: "previous" }
  | { type: "jump"; id: string }
  | { type: "setShuffle"; shuffle: boolean; rng?: () => number }
  | { type: "setRepeat"; repeat: RepeatMode }
  | { type: "setItems"; items: T[]; currentId?: string | null; rng?: () => number }
  | { type: "add"; items: T[]; /** Insert right after the current item instead of appending. */ next?: boolean }
  | { type: "remove"; id: string }
  /** Reorder the play order (`from`/`to` are play-order positions). */
  | { type: "move"; from: number; to: number };

/** Fisher–Yates using an injectable random source. The current id (if any) stays first. */
export function shufflePlayOrder(ids: string[], currentId: string | null, rng: () => number = Math.random): string[] {
  const rest = ids.filter((id) => id !== currentId);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return currentId !== null && ids.includes(currentId) ? [currentId, ...rest] : rest;
}


export interface CreatePlayerQueueOptions {
  currentId?: string | null;
  /** Start index in `items` (ignored when `currentId` is set). Default 0. */
  index?: number;
  repeat?: RepeatMode;
  shuffle?: boolean;
  rng?: () => number;
}

/** Build an initial queue state. */
export function createPlayerQueue<T extends PlayerQueueItem>(items: T[], options: CreatePlayerQueueOptions = {}): PlayerQueueState<T> {
  const ids = items.map((i) => i.id);
  const currentId = options.currentId !== undefined ? options.currentId : (ids[options.index ?? 0] ?? null);
  const shuffle = options.shuffle ?? false;
  return {
    items,
    currentId,
    order: shuffle ? shufflePlayOrder(ids, currentId, options.rng) : ids,
    repeat: options.repeat ?? "off",
    shuffle,
    ended: false,
  };
}

/** Pure queue transitions: next/previous with repeat & shuffle semantics, jump, add, remove, reorder. */
export function playerQueueReducer<T extends PlayerQueueItem>(state: PlayerQueueState<T>, action: PlayerQueueAction<T>): PlayerQueueState<T> {
  const { order, currentId } = state;
  const pos = currentId === null ? -1 : order.indexOf(currentId);
  switch (action.type) {
    case "next": {
      if (!order.length) return state;
      if (action.auto && state.repeat === "one" && currentId !== null) return { ...state, ended: false };
      if (pos < order.length - 1) return { ...state, currentId: order[pos + 1], ended: false };
      if (state.repeat !== "off") return { ...state, currentId: order[0], ended: false };
      return { ...state, ended: true };
    }
    case "previous": {
      if (!order.length) return state;
      if (pos > 0) return { ...state, currentId: order[pos - 1], ended: false };
      if (state.repeat === "all") return { ...state, currentId: order[order.length - 1], ended: false };
      return { ...state, ended: false };
    }
    case "jump":
      return order.includes(action.id) ? { ...state, currentId: action.id, ended: false } : state;
    case "setShuffle": {
      const ids = state.items.map((i) => i.id);
      return {
        ...state,
        shuffle: action.shuffle,
        order: action.shuffle ? shufflePlayOrder(ids, currentId, action.rng) : ids,
      };
    }
    case "setRepeat":
      return { ...state, repeat: action.repeat };
    case "setItems": {
      const ids = action.items.map((i) => i.id);
      const nextCurrent = action.currentId !== undefined ? action.currentId : (ids[0] ?? null);
      return {
        ...state,
        items: action.items,
        currentId: nextCurrent,
        order: state.shuffle ? shufflePlayOrder(ids, nextCurrent, action.rng) : ids,
        ended: false,
      };
    }
    case "add": {
      const fresh = action.items.filter((i) => !state.items.some((x) => x.id === i.id));
      if (!fresh.length) return state;
      const freshIds = fresh.map((i) => i.id);
      if (action.next && currentId !== null) {
        const at = state.items.findIndex((i) => i.id === currentId);
        const items = [...state.items.slice(0, at + 1), ...fresh, ...state.items.slice(at + 1)];
        const order = [...state.order.slice(0, pos + 1), ...freshIds, ...state.order.slice(pos + 1)];
        return { ...state, items, order, currentId };
      }
      return {
        ...state,
        items: [...state.items, ...fresh],
        order: [...state.order, ...freshIds],
        currentId: currentId ?? freshIds[0],
      };
    }
    case "remove": {
      if (!state.items.some((i) => i.id === action.id)) return state;
      const items = state.items.filter((i) => i.id !== action.id);
      const nextOrder = order.filter((id) => id !== action.id);
      let nextCurrent = currentId;
      if (currentId === action.id) {
        nextCurrent = nextOrder[pos] ?? (state.repeat === "all" ? (nextOrder[0] ?? null) : (nextOrder[pos - 1] ?? null));
      }
      return { ...state, items, order: nextOrder, currentId: nextCurrent };
    }
    case "move": {
      const { from, to } = action;
      if (from === to || from < 0 || from >= order.length || to < 0 || to >= order.length) return state;
      const nextOrder = reorderArray(order, from, to);
      if (state.shuffle) return { ...state, order: nextOrder };
      const byId = new Map(state.items.map((i) => [i.id, i]));
      return { ...state, order: nextOrder, items: nextOrder.map((id) => byId.get(id)!) };
    }
    default:
      return state;
  }
}

export interface UsePlayerQueueOptions<T extends PlayerQueueItem> extends CreatePlayerQueueOptions {
  items?: T[];
  /** Random source for shuffling (inject for deterministic tests). Default Math.random. */
  rng?: () => number;
  /** Called with the next queue state after every change. */
  onValueChange?: (state: PlayerQueueState<T>) => void;
  /** @deprecated Use `onValueChange`. */
  onChange?: (state: PlayerQueueState<T>) => void;
}

/** Queue state for a player: current item, play order and next/previous with repeat & shuffle semantics. */
export function usePlayerQueue<T extends PlayerQueueItem>(options: UsePlayerQueueOptions<T> = {}) {
  const rngRef = useLatestRef(options.rng ?? Math.random);
  const onChangeRef = useLatestRef(options.onValueChange ?? options.onChange);
  const [state, setState] = React.useState<PlayerQueueState<T>>(() =>
    createPlayerQueue(options.items ?? [], { ...options, rng: rngRef.current })
  );
  const stateRef = React.useRef(state);

  const dispatch = React.useCallback((action: PlayerQueueAction<T>) => {
    const next = playerQueueReducer(stateRef.current, action);
    if (next !== stateRef.current) {
      stateRef.current = next;
      setState(next);
      onChangeRef.current?.(next);
    }
    return next;
  }, []);

  const currentOf = (s: PlayerQueueState<T>) => s.items.find((i) => i.id === s.currentId) ?? null;

  const actions = React.useMemo(
    () => ({
      /** Advance; returns the new current item, or null when the queue ran out (repeat off). */
      next: (opts: { auto?: boolean } = {}) => {
        const s = dispatch({ type: "next", auto: opts.auto });
        return s.ended ? null : currentOf(s);
      },
      /**
       * Go back; past `restartAfter` seconds (default 3) into the track it restarts instead.
       * Returns the item to play: when it is the current one, seek it to 0.
       */
      previous: (opts: { currentTime?: number; restartAfter?: number } = {}) => {
        if ((opts.currentTime ?? 0) > (opts.restartAfter ?? 3)) return currentOf(stateRef.current);
        return currentOf(dispatch({ type: "previous" }));
      },
      jumpTo: (id: string) => currentOf(dispatch({ type: "jump", id })),
      setShuffle: (shuffle: boolean) => dispatch({ type: "setShuffle", shuffle, rng: rngRef.current }),
      toggleShuffle: () => dispatch({ type: "setShuffle", shuffle: !stateRef.current.shuffle, rng: rngRef.current }),
      setRepeat: (repeat: RepeatMode) => dispatch({ type: "setRepeat", repeat }),
      setItems: (items: T[], currentId?: string | null) => dispatch({ type: "setItems", items, currentId, rng: rngRef.current }),
      add: (items: T[]) => dispatch({ type: "add", items }),
      playNext: (items: T[]) => dispatch({ type: "add", items, next: true }),
      remove: (id: string) => dispatch({ type: "remove", id }),
      move: (from: number, to: number) => dispatch({ type: "move", from, to }),
    }),
    [dispatch]
  );

  const byId = new Map(state.items.map((i) => [i.id, i]));
  const ordered = state.order.map((id) => byId.get(id)).filter(Boolean) as T[];
  const position = state.currentId === null ? -1 : state.order.indexOf(state.currentId);
  return {
    ...state,
    ...actions,
    dispatch,
    current: currentOf(state),
    /** Items in play order. */
    ordered,
    /** Position of the current item in play order. */
    position,
    upNext: ordered.slice(position + 1),
    hasNext: ordered.length > 0 && (position < ordered.length - 1 || state.repeat !== "off"),
    hasPrevious: ordered.length > 0 && (position > 0 || state.repeat === "all"),
  };
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function TrackArtwork({ src, className, iconClassName }: { src?: string; className?: string; iconClassName?: string }) {
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

function trackByline(track: PlayerTrack) {
  return track.artist || "Unknown artist";
}

export interface PlayerTransportProps {
  track: PlayerTrack | null;
  playing: boolean;
  onPlayPause?: () => void;
  buffering?: boolean;
  currentTime?: number;
  duration?: number;
  buffered?: MediaTimeRange[] | number;
  onSeek?: (time: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  shuffle?: boolean;
  onShuffleChange?: (shuffle: boolean) => void;
  repeat?: RepeatMode;
  onRepeatChange?: (repeat: RepeatMode) => void;
  volume?: number;
  muted?: boolean;
  onVolumeChange?: (volume: number) => void;
  onMutedChange?: (muted: boolean) => void;
  favorite?: boolean;
  onFavoriteChange?: (favorite: boolean) => void;
  /** 0-based position, rendered as "3 of 12". */
  queuePosition?: { index: number; total: number };
  /** Where playback comes from, e.g. "Playlist · Road trip". */
  context?: React.ReactNode;
}

function FavoriteButton({
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

function Transport({
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
      <span className="flex min-w-0 flex-col text-left">
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
      <Progress
        size="xs"
        value={pct}
        aria-label="Playback progress"
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(Math.min(currentTime, total))}
        aria-valuetext={total > 0 ? `${formatClock(currentTime)} of ${formatClock(total)}` : formatClock(currentTime)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          if (rect.width > 0 && total > 0) onSeek?.(((e.clientX - rect.left) / rect.width) * total);
        }}
        className="absolute inset-x-0 top-0 cursor-pointer rounded-none"
        indicatorClassName="rounded-none duration-200"
      />
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
          <span className="mr-1 whitespace-nowrap text-xs text-muted-foreground tabular-nums @max-5xl:hidden">
            {queuePosition.index + 1} of {queuePosition.total}
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

/* ------------------------------------------------------------------ */
/* NowPlaying                                                          */
/* ------------------------------------------------------------------ */

export interface NowPlayingProps extends PlayerTransportProps {
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. Default false. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Replaces the artwork (e.g. a `<video>`). */
  media?: React.ReactNode;
  onAddToPlaylist?: () => void;
  /** Extra action buttons next to favorite / add (e.g. a "More" menu). */
  actions?: React.ReactNode;
  /** Centered header content, e.g. "Playing from Road trip". */
  header?: React.ReactNode;
  /** Queue rendered under "Up next" (e.g. a `QueueList`). */
  queue?: React.ReactNode;
  queueTitle?: React.ReactNode;
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

/* ------------------------------------------------------------------ */
/* QueueList                                                           */
/* ------------------------------------------------------------------ */

export interface QueueListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  items: PlayerTrack[];
  currentId?: string | null;
  playing?: boolean;
  /** Tap a row to jump to it. */
  onSelect?: (item: PlayerTrack, index: number) => void;
  onRemove?: (item: PlayerTrack, index: number) => void;
  /** Enables drag handles and Alt+↑/↓. Indices are positions in `items`. */
  onReorder?: (from: number, to: number) => void;
  /** Accessible list name. Default "Queue". */
  label?: string;
  /** Shown when the queue is empty. Default "Nothing queued". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  emptyMessage?: React.ReactNode;
}

/** Reorderable queue: current row marked with NowPlayingBars, tap to jump, remove, drag or Alt+↑/↓ to reorder. */
export const QueueList = React.forwardRef<HTMLDivElement, QueueListProps>(
  (
    { items, currentId, playing = false, onSelect, onRemove, onReorder, label = "Queue", emptyState, emptyMessage, className, ...props },
    ref
  ) => {
    const listRef = React.useRef<HTMLUListElement | null>(null);
    const [announcement, setAnnouncement] = React.useState("");
    const [drag, setDrag] = React.useState<{ from: number; over: number; id: string } | null>(null);
    const pendingFocus = React.useRef<{ id: string; slot: string } | null>(null);
    const hintId = React.useId();

    const announceMove = (item: PlayerTrack, to: number) =>
      setAnnouncement(`Moved ${item.title} to position ${to + 1} of ${items.length}`);

    React.useLayoutEffect(() => {
      const p = pendingFocus.current;
      if (!p || !listRef.current) return;
      pendingFocus.current = null;
      const row = Array.from(listRef.current.querySelectorAll<HTMLElement>("[data-queue-id]")).find((el) => el.dataset.queueId === p.id);
      row?.querySelector<HTMLElement>(`[data-slot="${p.slot}"]`)?.focus();
    }, [items]);

    const indicator = (key: string) => (
      <li key={key} aria-hidden data-slot="queue-drop-indicator" className="pointer-events-none -my-px h-0.5 rounded-full bg-primary" />
    );
    let otherIndex = -1;

    const overIndexAt = (clientY: number, draggedId: string) => {
      const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-queue-id]") ?? []);
      let count = 0;
      for (const row of rows) {
        if (row.dataset.queueId === draggedId) continue;
        const r = row.getBoundingClientRect();
        if (clientY > r.top + r.height / 2) count++;
      }
      return Math.min(items.length - 1, count);
    };

    if (!items.length) {
      return (
        <div ref={ref} className={cn("py-6 text-center text-sm text-muted-foreground", className)} {...props}>
          {emptyState ?? emptyMessage ?? "Nothing queued"}
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        {onReorder && (
          <span id={hintId} className="sr-only">
            Press Alt plus Arrow Up or Arrow Down to move this track.
          </span>
        )}
        <ul ref={listRef} aria-label={label} className="flex flex-col gap-0.5">
          {items.map((item, index) => {
            const current = item.id === currentId;
            const dragging = drag?.id === item.id;
            if (!dragging) otherIndex++;
            const showIndicator = !!drag && !dragging && drag.from !== drag.over && otherIndex === drag.over;
            return (
              <React.Fragment key={item.id}>
                {showIndicator && indicator(`drop-${item.id}`)}
                <li
                  data-queue-id={item.id}
                  data-current={current ? "" : undefined}
                  data-dragging={dragging ? "" : undefined}
                  onKeyDown={(e) => {
                    if (!onReorder || !e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
                    e.preventDefault();
                    const to = e.key === "ArrowUp" ? index - 1 : index + 1;
                    if (to < 0 || to >= items.length) return;
                    const slot = (e.target as HTMLElement).closest<HTMLElement>("[data-slot]")?.dataset.slot ?? "queue-select";
                    pendingFocus.current = { id: item.id, slot };
                    onReorder(index, to);
                    announceMove(item, to);
                  }}
                  className={cn(
                    "group/queue relative flex items-center gap-1 rounded-control pr-1 transition-colors",
                    current ? "bg-primary-soft/60" : "hover:bg-accent",
                    dragging && "z-10 bg-background opacity-70 shadow-lg ring-1 ring-border"
                  )}
                >
                  {onReorder && (
                    <button
                      type="button"
                      data-slot="queue-handle"
                      aria-label={`Reorder ${item.title}`}
                      aria-describedby={hintId}
                      onPointerDown={(e) => {
                        if (e.pointerType === "mouse" && e.button !== 0) return;
                        e.preventDefault();
                        e.currentTarget.setPointerCapture?.(e.pointerId);
                        setDrag({ from: index, over: index, id: item.id });
                      }}
                      onPointerMove={(e) => {
                        if (!drag) return;
                        const over = overIndexAt(e.clientY, drag.id);
                        if (over !== drag.over) setDrag({ ...drag, over });
                      }}
                      onPointerUp={(e) => {
                        if (!drag) return;
                        e.currentTarget.releasePointerCapture?.(e.pointerId);
                        const { from, over } = drag;
                        setDrag(null);
                        if (from !== over) {
                          onReorder(from, over);
                          announceMove(items[from], over);
                        }
                      }}
                      onPointerCancel={() => setDrag(null)}
                      onKeyDown={(e) => {
                        if (e.altKey) return;
                        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                          e.preventDefault();
                          const to = e.key === "ArrowUp" ? index - 1 : index + 1;
                          if (to < 0 || to >= items.length) return;
                          pendingFocus.current = { id: item.id, slot: "queue-handle" };
                          onReorder(index, to);
                          announceMove(item, to);
                        }
                      }}
                      className={cn(
                        "grid h-10 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-sm text-muted-foreground/70 hover:text-foreground active:cursor-grabbing",
                        focusRing
                      )}
                    >
                      <RiDraggable aria-hidden className="size-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    data-slot="queue-select"
                    aria-current={current ? "true" : undefined}
                    disabled={item.unavailable}
                    onClick={() => onSelect?.(item, index)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-3 rounded-control py-1.5 text-left disabled:opacity-50",
                      !onReorder && "pl-2",
                      focusRing
                    )}
                  >
                    <span className="relative shrink-0">
                      <TrackArtwork src={item.artwork} className="size-10" />
                      {current && (
                        <span className="absolute inset-0 grid place-items-center rounded-md bg-black/45 text-white">
                          <NowPlayingBars playing={playing} className="text-white" />
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn("truncate text-sm font-medium", current ? "text-primary" : "text-foreground")}>{item.title}</span>
                      <span className="truncate text-xs text-muted-foreground">{trackByline(item)}</span>
                    </span>
                    {item.duration !== undefined && (
                      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{formatClock(item.duration)}</span>
                    )}
                  </button>
                  {onRemove && (
                    <button
                      type="button"
                      data-slot="queue-remove"
                      aria-label={`Remove ${item.title} from queue`}
                      onClick={() => onRemove(item, index)}
                      className={cn(
                        mediaButtonVariants({ size: "sm" }),
                        "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/queue:opacity-100 focus-visible:opacity-100"
                      )}
                    >
                      <RiCloseLine aria-hidden />
                    </button>
                  )}
                </li>
              </React.Fragment>
            );
          })}
          {drag && drag.from !== drag.over && drag.over >= items.length - 1 && indicator("drop-end")}
        </ul>
        <div aria-live="polite" aria-atomic="true" className="sr-only" data-slot="queue-announcer">
          {announcement}
        </div>
      </div>
    );
  }
);
QueueList.displayName = "QueueList";

/* ------------------------------------------------------------------ */
/* TrackRow                                                            */
/* ------------------------------------------------------------------ */

export interface TrackRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onPlay" | "onPause"> {
  track: PlayerTrack;
  /** 1-based number shown in the lead column. */
  index?: number;
  /** This row is the queue's current track. */
  current?: boolean;
  playing?: boolean;
  onPlay?: (track: PlayerTrack) => void;
  /** Pause when this is the current playing row (falls back to `onPlay`). */
  onPause?: (track: PlayerTrack) => void;
  showArtwork?: boolean;
  showAlbum?: boolean;
  favorite?: boolean;
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
        <span className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
          {track.duration !== undefined ? formatClock(track.duration) : "—"}
        </span>
        {menu && <div className="shrink-0">{menu}</div>}
      </div>
    );
  }
);
TrackRow.displayName = "TrackRow";
