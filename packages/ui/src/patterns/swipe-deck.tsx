import * as React from "react";
import { RiArrowGoBackLine, RiCheckLine, RiCloseLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { COMMIT_DISTANCE, dragProgress } from "../lib/gesture";
import { directionOf } from "../lib/direction";
import {
  DECK_STACK_RISE,
  DECK_STACK_STEP,
  clampDeckIndex,
  deckFlyDistance,
  deckKeyAction,
  deckRelease,
  deckStamps,
  deckTilt,
  undoTarget,
  type DeckHistoryEntry,
  type DeckSide,
} from "../lib/deck";
import { useControllableState } from "../hooks/use-controllable-state";
import { useDrag } from "../hooks/use-drag";
import { useIsoLayoutEffect, useLatestRef } from "../hooks/use-iso-layout-effect";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useSafeId } from "../hooks/use-safe-id";
import { Button } from "../primitives/button";
import { Skeleton } from "../primitives/progress";

export type SwipeDeckSide = DeckSide;

export interface SwipeDeckCardState {
  /** Position of the item in `items`. */
  index: number;
  /** True for the card on top (the one that can be swiped); the cards behind only peek out. */
  top: boolean;
}

export interface SwipeDeckApi {
  /** Swipe the top card to a side, as the buttons do. */
  swipe: (side: SwipeDeckSide) => void;
  /** Bring the last swiped card back. */
  undo: () => void;
}

export interface SwipeDeckProps<T> extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "defaultValue" | "onSwipe"> {
  /** The cards in order; the top one is at `index`. */
  items: readonly T[];
  /** A stable key per item (an id), so a card keeps its place and its flight when the list changes. */
  getKey: (item: T, index: number) => string | number;
  /** The content of one card (the deck draws the card surface). Cards behind the top one render too: keep them cheap. */
  renderCard: (item: T, state: SwipeDeckCardState) => React.ReactNode;
  /** Names the item in the screen reader announcements ("Kept: Invoice 12"). Default: no name. */
  getLabel?: (item: T) => string;
  /** Index of the top card (`items.length` = none left). */
  index?: number;
  /**
   * Initial top-card index when uncontrolled.
   * @default 0
   */
  defaultIndex?: number;
  /** Called with the new top-card index after a card is swiped away. */
  onIndexChange?: (index: number) => void;
  /** A card was dismissed to a side by a drag, a key or a button. `start` and `end` follow the reading direction. */
  onSwipe?: (side: SwipeDeckSide, item: T, index: number) => void;
  /** The last swipe was taken back. */
  onUndo?: (item: T, index: number) => void;
  /** The last card was swiped away. */
  onEmpty?: () => void;
  /** Content shown once every card has been swiped away. */
  emptyState?: React.ReactNode;
  /** Name of the start action. Default "Skip". */
  startLabel?: string;
  /** Name of the end action (also Enter). Default "Keep". */
  endLabel?: string;
  /** Icon of the start button. Default a cross. */
  startIcon?: React.ReactNode;
  /** Icon of the end button. Default a check. */
  endIcon?: React.ReactNode;
  /** Cards that show in the stack (the top one included). Default 3. */
  stack?: number;
  /** Show the Skip, Undo and Keep buttons under the deck. Default true. */
  actions?: boolean;
  /** Distance (px) of a drag that commits. Default 90. */
  distance?: number;
  /** Ignore drags, keys and buttons. */
  disabled?: boolean;
  /** Skeleton cards instead of items; the controls are hidden. */
  loading?: boolean;
  /** Accessible name of the deck. Default "Card deck". */
  label?: string;
  /** Classes of each card surface (give it a height). */
  cardClassName?: string;
  /** Imperative handle (`swipe(side)`, `undo()`). */
  apiRef?: React.Ref<SwipeDeckApi>;
}

interface Leaving<T> {
  key: string | number;
  item: T;
  index: number;
  side: DeckSide;
  velocity: number;
}

const BEHIND_TRANSITION =
  "[transition:translate_var(--sutra-spring-gentle-duration)_var(--sutra-spring-gentle),scale_var(--sutra-spring-gentle-duration)_var(--sutra-spring-gentle),opacity_var(--sutra-duration)_var(--sutra-ease)]";
const stamp = "pointer-events-none absolute bottom-4 rounded-control border-2 px-2.5 py-1 text-sm font-bold uppercase tracking-wide";

interface CardProps<T> {
  item: T;
  itemKey: string | number;
  index: number;
  depth: number;
  stack: number;
  position: "top" | "behind" | "leaving";
  leaving?: Leaving<T>;
  enterFrom?: DeckSide;
  disabled: boolean;
  distance: number;
  startLabel: string;
  endLabel: string;
  total: number;
  cardClassName?: string;
  render: (item: T, state: SwipeDeckCardState) => React.ReactNode;
  onCommit: (side: DeckSide, velocity: number) => void;
  onGone: (key: string | number) => void;
  onProgress: (p: number) => void;
  onDragging: (dragging: boolean) => void;
}

function DeckCard<T>(props: CardProps<T>) {
  const { item, itemKey, index, depth, stack, position, leaving, enterFrom, disabled, distance, startLabel, endLabel, total, cardClassName, render } = props;
  const latest = useLatestRef(props);
  const inner = React.useRef<HTMLDivElement | null>(null);
  const top = position === "top";

  const binding = useDrag({
    axis: "x",
    enabled: top && !disabled,
    onPosition(x) {
      const el = inner.current;
      if (!el) return;
      const dir = directionOf(el);
      const marks = deckStamps(x, dir, latest.current.distance);
      el.style.setProperty("--sutra-deck-tilt", `${deckTilt(x)}deg`);
      el.style.setProperty("--sutra-deck-start", String(marks.start));
      el.style.setProperty("--sutra-deck-end", String(marks.end));
      if (latest.current.position === "top") latest.current.onProgress(dragProgress(x, latest.current.distance));
    },
    onEnd(info, cancelled) {
      const dir = directionOf(inner.current);
      const side = cancelled ? null : deckRelease(info.x, info.vx, dir, { distance: latest.current.distance });
      if (side) latest.current.onCommit(side, info.vx);
      else binding.settle({ x: 0 }, "snappy", { x: info.vx });
    },
  });
  const ref = useMergedRefs<HTMLDivElement>(binding.ref as React.Ref<HTMLDivElement>, inner);
  const { dragging } = binding;
  React.useEffect(() => {
    latest.current.onDragging(dragging);
    return () => {
      if (dragging) latest.current.onDragging(false);
    };
  }, [dragging, latest]);

  // Flying out after a dismissal, and coming back when an undo brings the card to the top again.
  const was = React.useRef(position);
  useIsoLayoutEffect(() => {
    const el = inner.current;
    if (position === "leaving" && leaving) {
      binding.settle({ x: deckFlyDistance(leaving.side, directionOf(el), el?.offsetWidth ?? 0) }, "snappy", { x: leaving.velocity }, () => latest.current.onGone(itemKey));
    } else if (was.current === "leaving") {
      binding.settle({ x: 0 }, "snappy");
    }
    was.current = position;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);
  // An undone card that had already left enters from the side it went.
  useIsoLayoutEffect(() => {
    const el = inner.current;
    if (!enterFrom || !el) return;
    binding.set(deckFlyDistance(enterFrom, directionOf(el), el.offsetWidth), 0);
    binding.settle({ x: 0 }, "snappy");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hidden = position === "behind" && depth >= stack;
  const eff = `(${depth} - var(--sutra-deck-progress, 0))`;
  return (
    <div
      data-slot="swipe-deck-card"
      data-position={position}
      data-depth={position === "behind" ? depth : 0}
      aria-hidden={top ? undefined : true}
      inert={top ? undefined : true}
      className={cn(
        "col-start-1 row-start-1 min-w-0 origin-bottom group-data-[dragging=true]/deck:transition-none",
        position === "behind" && BEHIND_TRANSITION,
        hidden && "pointer-events-none opacity-0"
      )}
      style={{
        zIndex: position === "leaving" ? stack + 3 : top ? stack + 2 : Math.max(0, stack - depth),
        scale: position === "behind" ? `calc(1 - ${eff} * ${DECK_STACK_STEP})` : 1,
        translate: position === "behind" ? `0px calc(${eff} * ${DECK_STACK_RISE}px)` : "0px 0px",
      }}
    >
      <div
        ref={ref}
        {...(top ? binding.handlers : null)}
        role={top ? "group" : undefined}
        aria-roledescription={top ? "card" : undefined}
        aria-label={top ? `Card ${index + 1} of ${total}` : undefined}
        data-dragging={dragging ? "true" : undefined}
        className={cn(
          "relative h-full select-none overflow-hidden rounded-box border border-border bg-card text-card-foreground shadow-md",
          top && !disabled && "cursor-grab data-[dragging=true]:cursor-grabbing",
          cardClassName
        )}
        style={{ translate: "var(--sutra-drag-x, 0px) 0px", rotate: "var(--sutra-deck-tilt, 0deg)" }}
      >
        {render(item, { index, top })}
        {position !== "behind" && (
          <>
            <span aria-hidden="true" data-slot="swipe-deck-stamp" data-side="end" className={cn(stamp, "start-4 -rotate-12 border-success text-success rtl:rotate-12")} style={{ opacity: "var(--sutra-deck-end, 0)" }}>
              {endLabel}
            </span>
            <span aria-hidden="true" data-slot="swipe-deck-stamp" data-side="start" className={cn(stamp, "end-4 rotate-12 border-destructive text-destructive rtl:-rotate-12")} style={{ opacity: "var(--sutra-deck-start, 0)" }}>
              {startLabel}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function SwipeDeckInner<T>(
  {
    items,
    getKey,
    renderCard,
    getLabel,
    index: indexProp,
    defaultIndex = 0,
    onIndexChange,
    onSwipe,
    onUndo,
    onEmpty,
    emptyState,
    startLabel = "Skip",
    endLabel = "Keep",
    startIcon,
    endIcon,
    stack = 3,
    actions = true,
    distance = COMMIT_DISTANCE,
    disabled = false,
    loading = false,
    label = "Card deck",
    cardClassName,
    apiRef,
    className,
    ...props
  }: SwipeDeckProps<T>,
  forwardedRef: React.ForwardedRef<HTMLDivElement>
) {
  const [rawIndex, setIndex] = useControllableState({ value: indexProp, defaultValue: defaultIndex, onChange: onIndexChange });
  const count = items.length;
  const at = clampDeckIndex(rawIndex, count);
  const depthMax = Math.max(1, Math.round(stack));
  const root = React.useRef<HTMLDivElement | null>(null);
  const setRoot = useMergedRefs(root, forwardedRef);
  const [leaving, setLeaving] = React.useState<Leaving<T>[]>([]);
  const [history, setHistory] = React.useState<DeckHistoryEntry[]>([]);
  const [entering, setEntering] = React.useState<{ key: string | number; side: DeckSide } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");
  const hintId = useSafeId("deck-hint");

  const keyAt = (i: number) => (i >= 0 && i < count ? getKey(items[i] as T, i) : undefined);
  const undo = undoTarget(history, at, keyAt);
  const latest = useLatestRef({ at, count, items, getKey, getLabel, onSwipe, onUndo, onEmpty, setIndex, startLabel, endLabel, disabled, undo });

  const swipe = React.useCallback(
    (side: DeckSide, velocity = 0) => {
      const o = latest.current;
      const item = o.items[o.at];
      if (item === undefined || o.disabled) return;
      const key = o.getKey(item, o.at);
      setHistory((h) => [...h.slice(-49), { index: o.at, key, side }]);
      setEntering(null);
      setLeaving((l) => [...l.filter((e) => e.key !== key), { key, item, index: o.at, side, velocity }]);
      const left = o.count - o.at - 1;
      const name = o.getLabel?.(item);
      setAnnouncement(`${side === "end" ? o.endLabel : o.startLabel}${name ? `: ${name}` : ""}. ${left > 0 ? `${left} left` : "No cards left"}`);
      root.current?.style.setProperty("--sutra-deck-progress", "0");
      o.onSwipe?.(side, item, o.at);
      o.setIndex(o.at + 1);
      if (left === 0) o.onEmpty?.();
    },
    [latest]
  );
  const undoLast = React.useCallback(() => {
    const o = latest.current;
    const target = o.undo;
    if (!target || o.disabled) return;
    const item = o.items[target.index];
    if (item === undefined) return;
    setHistory((h) => h.slice(0, -1));
    setLeaving((l) => l.filter((e) => e.key !== target.key));
    setEntering({ key: target.key, side: target.side });
    setAnnouncement(`Undid ${target.side === "end" ? o.endLabel : o.startLabel}${o.getLabel ? `: ${o.getLabel(item)}` : ""}`);
    o.onUndo?.(item, target.index);
    o.setIndex(target.index);
  }, [latest]);
  React.useImperativeHandle(apiRef, () => ({ swipe: (side) => swipe(side), undo: undoLast }), [swipe, undoLast]);

  const onGone = React.useCallback((key: string | number) => setLeaving((l) => l.filter((e) => e.key !== key)), []);
  const onProgress = React.useCallback((p: number) => root.current?.style.setProperty("--sutra-deck-progress", String(Math.round(p * 1000) / 1000)), []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || disabled || loading) return;
    const action = deckKeyAction(event.key, directionOf(event.currentTarget), { ctrl: event.ctrlKey, meta: event.metaKey, shift: event.shiftKey });
    if (!action) return;
    event.preventDefault();
    if (action.type === "undo") undoLast();
    else swipe(action.side);
  };

  const visible = items.slice(at, at + depthMax + 1).map((item, i) => ({ item, index: at + i, key: getKey(item, at + i) }));
  const visibleKeys = new Set(visible.map((v) => v.key));
  const flying = leaving.filter((e) => !visibleKeys.has(e.key));
  const empty = !loading && at >= count;
  const total = count;
  const controls = actions && !loading;

  return (
    <div ref={setRoot} data-slot="swipe-deck" aria-busy={loading || undefined} data-dragging={dragging ? "true" : undefined} {...props} className={cn("group/deck flex min-w-0 flex-col gap-4", className)}>
      <div
        data-slot="swipe-deck-stage"
        role="group"
        aria-roledescription="card deck"
        aria-label={label}
        aria-describedby={hintId}
        tabIndex={loading ? undefined : 0}
        onKeyDown={onKeyDown}
        className={cn("relative grid min-h-48 overflow-x-clip rounded-box", focusRing)}
        style={{ paddingBottom: (depthMax - 1) * DECK_STACK_RISE }}
      >
        {loading ? (
          <>
            <div aria-hidden="true" className="col-start-1 row-start-1 translate-y-2.5 scale-[0.96] origin-bottom rounded-box border border-border bg-card shadow-sm" />
            <div aria-hidden="true" className="relative col-start-1 row-start-1 grid gap-3 rounded-box border border-border bg-card p-5 shadow-md">
              <Skeleton className="h-32 w-full" />
              <Skeleton shape="text" lines={2} />
            </div>
            <span className="sr-only">Loading cards…</span>
          </>
        ) : (
          <>
            {empty && (
              <div data-slot="swipe-deck-empty" className="col-start-1 row-start-1 grid place-content-center justify-items-center gap-2 rounded-box border border-dashed border-border-strong p-6 text-center text-sm text-muted-foreground">
                {emptyState ?? (
                  <>
                    <RiCheckLine aria-hidden="true" className="size-6" />
                    All caught up
                  </>
                )}
              </div>
            )}
            {[...flying.map((e) => ({ ...e, mode: "leaving" as const })), ...visible.map((v, i) => ({ ...v, mode: i === 0 ? ("top" as const) : ("behind" as const), depth: i }))].map((c) => (
              <DeckCard
                key={c.key}
                item={c.item}
                itemKey={c.key}
                index={c.index}
                depth={"depth" in c ? c.depth : 0}
                stack={depthMax}
                position={c.mode}
                leaving={"side" in c ? (c as Leaving<T>) : leaving.find((e) => e.key === c.key)}
                enterFrom={entering?.key === c.key ? entering.side : undefined}
                disabled={disabled}
                distance={distance}
                startLabel={startLabel}
                endLabel={endLabel}
                total={total}
                cardClassName={cardClassName}
                render={renderCard}
                onCommit={swipe}
                onGone={onGone}
                onProgress={onProgress}
                onDragging={setDragging}
              />
            ))}
          </>
        )}
      </div>
      <span id={hintId} className="sr-only">
        {`Arrow keys swipe the top card, Enter chooses ${endLabel}, Control Z undoes the last swipe.`}
      </span>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      {controls && (
        <div data-slot="swipe-deck-actions" className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" disabled={disabled || empty} leadingIcon={startIcon ?? <RiCloseLine aria-hidden="true" />} onClick={() => swipe("start")}>
            {startLabel}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Undo" disabled={disabled || !undo} onClick={undoLast}>
            <RiArrowGoBackLine aria-hidden="true" />
          </Button>
          <Button variant="primary" disabled={disabled || empty} leadingIcon={endIcon ?? <RiCheckLine aria-hidden="true" />} onClick={() => swipe("end")}>
            {endLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Triage cards one at a time: drag the top card and it flies away (past 90 px or on a flick) or springs back, with a tilt of
 * 0.05 degrees per px and the cards behind stepping up the stack as it goes. The same choices are Skip and Keep buttons, the
 * arrow keys and Enter on the focused deck, and Ctrl or Command + Z or the Undo button takes the last swipe back (the card
 * flies in again). `start` and `end` follow the reading direction, `onSwipe(side, item, index)` reports each choice, `onEmpty`
 * fires after the last card, `index` / `defaultIndex` / `onIndexChange` control the position. Screen readers get a labelled
 * group, the top card as "Card 2 of 8" and a polite announcement per swipe; the cards behind are `inert`. Built on `useDrag`,
 * so a drag writes CSS variables and never re-renders; reduced motion drops the flight (a swipe just changes the card).
 */
export const SwipeDeck = React.forwardRef(SwipeDeckInner) as (<T>(props: SwipeDeckProps<T> & React.RefAttributes<HTMLDivElement>) => React.ReactElement | null) & {
  displayName?: string;
};
SwipeDeck.displayName = "SwipeDeck";
