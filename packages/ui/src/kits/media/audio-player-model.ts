import * as React from "react";
import { reorderArray } from "../../lib/reorder";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import type { RepeatMode } from "./media-controls-playback";
import type { MediaTimeRange } from "./media-controls-element";

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


export interface PlayerTransportProps {
  /** Track that is loaded (title, artist, artwork); `null` shows an empty player. */
  track: PlayerTrack | null;
  /** Whether audio is playing; sets the play and pause icon. */
  playing: boolean;
  /** Called when the user presses the play or pause button. */
  onPlayPause?: () => void;
  /** Shows a spinner on the play button while audio loads. */
  buffering?: boolean;
  /** Playback position in seconds. */
  currentTime?: number;
  /** Track length in seconds. Default 0; an infinite or NaN value marks a live stream with no progress or seeking. */
  duration?: number;
  /** Buffered ranges, or a single buffered-until time, drawn on the seek bar. */
  buffered?: MediaTimeRange[] | number;
  /** Called with the time in seconds when the user seeks. */
  onSeek?: (time: number) => void;
  /** Called when the user presses Next. */
  onNext?: () => void;
  /** Called when the user presses Previous. */
  onPrevious?: () => void;
  /** Whether a next track exists; `false` disables Next (it is also disabled without `onNext`). */
  hasNext?: boolean;
  /** Whether a previous track exists; `false` disables Previous (it is also disabled without `onPrevious`). */
  hasPrevious?: boolean;
  /** Shuffle state shown on the shuffle button. */
  shuffle?: boolean;
  /** Called with the new state when the user toggles shuffle; the button is hidden when unset. */
  onShuffleChange?: (shuffle: boolean) => void;
  /** Repeat mode (`off`, `all` or `one`) shown on the repeat button. */
  repeat?: RepeatMode;
  /** Called with the next mode when the user cycles repeat; the button is hidden when unset. */
  onRepeatChange?: (repeat: RepeatMode) => void;
  /** Volume from 0 to 1. */
  volume?: number;
  /** Whether audio is muted. */
  muted?: boolean;
  /** Called with the volume (0 to 1) when the user moves the slider; the volume control is hidden when unset. */
  onVolumeChange?: (volume: number) => void;
  /** Called with the new state when the user presses the mute button. */
  onMutedChange?: (muted: boolean) => void;
  /** Whether the track is a favourite; fills the heart button. */
  favorite?: boolean;
  /** Called with the new state when the user toggles the heart; the button is hidden when unset. */
  onFavoriteChange?: (favorite: boolean) => void;
  /** 0-based position, rendered as "3 of 12". */
  queuePosition?: { index: number; total: number };
  /** Where playback comes from, e.g. "Playlist · Road trip". */
  context?: React.ReactNode;
}
