import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { normalizeTone, toneClasses, type ToneInput } from "../lib/tone";
import { rubberBand, swipeRowRelease, type SwipeSide } from "../lib/gesture";
import { useControllableState } from "../hooks/use-controllable-state";
import { useDrag } from "../hooks/use-drag";
import { useElementWidth } from "../hooks/use-resize-observer";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useDirection } from "../hooks/use-direction";
import { inlineSign } from "../lib/direction";
import { ItemListContext } from "../primitives/item-internal";

export type SwipeRowSide = SwipeSide;

export interface SwipeAction {
  /** Stable key. */
  id: string;
  /** Visible label (also the accessible name). */
  label: string;
  icon?: React.ReactNode;
  /** Solid colour of the action. Default "neutral". */
  tone?: ToneInput;
  /** A full swipe runs this action. Default: the outermost action of its side. */
  commit?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export interface SwipeRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onAction" | "defaultValue"> {
  /** Actions revealed by dragging toward the inline end (right in left-to-right text). */
  startActions?: SwipeAction[];
  /** Actions revealed by dragging toward the inline start (left in left-to-right text). */
  endActions?: SwipeAction[];
  /** Runs for a button press, a key press and a full swipe alike. */
  onAction?: (action: SwipeAction, side: SwipeSide) => void;
  /** Which side's actions are open (`null` closed). */
  value?: SwipeSide | null;
  defaultValue?: SwipeSide | null;
  onValueChange?: (side: SwipeSide | null) => void;
  /** A full swipe runs the outermost action. Default true; false stops at the revealed actions. */
  commit?: boolean;
  disabled?: boolean;
  /** Width of one action button in px, so the reveal distance is known without measuring. Default 72. */
  actionWidth?: number;
  /** Accessible name of the action groups. Default "Actions". */
  actionsLabel?: string;
  /** Classes of the sliding content layer (it must stay opaque to hide the actions). Default `bg-background`. */
  contentClassName?: string;
}

const NO_DRAG = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="slider"], [data-swipe-no-drag]';
/** Pull beyond the end of the travel: asymptotic, never more than this many px. */
const PULL_LIMIT = 72;

function commitIndex(actions: SwipeAction[], side: SwipeSide) {
  const marked = actions.findIndex((a) => a.commit && !a.disabled);
  if (marked >= 0) return marked;
  // The outermost button sits at the row's edge: first on the start side, last on the end side (in the order given).
  const order = side === "start" ? actions.map((_, i) => i) : actions.map((_, i) => actions.length - 1 - i);
  return order.find((i) => !actions[i]!.disabled) ?? -1;
}

/**
 * A list row that follows the finger: drag it to reveal buttons at its start or end, or swipe all the way to run the outermost
 * one. It builds on `useDrag` (the offset lives in `--sutra-drag-x`, no render per move), rubber-bands past the end, releases
 * with a spring and opens at 40% of the actions' width. The actions are real buttons: Tab reaches them (a focused button opens
 * its side), Arrow keys on the row open and close it, Escape closes it, and `onAction` runs for buttons and swipes alike.
 * Use `Item` rows as the content; inside an `ItemGroup` the row itself is the list item.
 */
export const SwipeRow = React.forwardRef<HTMLDivElement, SwipeRowProps>(function SwipeRow(
  {
    startActions = [],
    endActions = [],
    onAction,
    value: valueProp,
    defaultValue = null,
    onValueChange,
    commit = true,
    disabled = false,
    actionWidth = 72,
    actionsLabel = "Actions",
    contentClassName,
    className,
    children,
    onKeyDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onClickCapture,
    ...props
  },
  forwardedRef
) {
  const [value, setValue] = useControllableState<SwipeSide | null>({ value: valueProp, defaultValue, onChange: onValueChange });
  const inList = React.useContext(ItemListContext);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const startGroup = React.useRef<HTMLDivElement | null>(null);
  const endGroup = React.useRef<HTMLDivElement | null>(null);
  const lastFocus = React.useRef<HTMLElement | null>(null);
  const dir = inlineSign(useDirection(rootRef));
  const startWidth = startActions.length * actionWidth;
  const endWidth = endActions.length * actionWidth;
  const rowWidth = useElementWidth(rootRef);

  // Logical offset: positive reveals the start actions. `dir` turns it into the physical x (right-to-left rows flip).
  const startExtent = commit && startActions.length ? rowWidth : startWidth;
  const endExtent = commit && endActions.length ? rowWidth : endWidth;
  const bounds = dir > 0 ? { left: -endExtent, right: startExtent } : { left: -startExtent, right: endExtent };

  const fire = (action: SwipeAction, side: SwipeSide) => {
    if (action.disabled) return;
    action.onSelect?.();
    onAction?.(action, side);
  };
  const settledAt = React.useRef<number | null>(null);
  const targetFor = (side: SwipeSide | null) => (side === "start" ? startWidth * dir : side === "end" ? -endWidth * dir : 0);

  const drag = useDrag({
    axis: "x",
    enabled: !disabled && (startActions.length > 0 || endActions.length > 0),
    bounds,
    elastic: (overshoot) => rubberBand(overshoot, PULL_LIMIT),
    allow: (event) => !(event.target instanceof Element && event.target.closest(NO_DRAG)),
    onEnd(info, cancelled) {
      const logical = info.x * dir;
      const speed = info.vx * dir;
      const result = cancelled
        ? ({ type: "closed" } as const)
        : swipeRowRelease({
            offset: logical,
            velocity: speed,
            startWidth,
            endWidth,
            rowWidth,
            commit,
          });
      const v = { x: info.vx };
      if (result.type === "commit") {
        const actions = result.side === "start" ? startActions : endActions;
        const action = actions[commitIndex(actions, result.side)];
        if (action) {
          setValue(null);
          settledAt.current = 0;
          drag.settle({ x: (result.side === "start" ? 1 : -1) * dir * rowWidth }, "snappy", v, () => drag.settle({ x: 0 }, "gentle"));
          fire(action, result.side);
          return;
        }
      }
      const side = result.type === "reveal" ? result.side : null;
      setValue(side);
      settledAt.current = targetFor(side);
      drag.settle({ x: settledAt.current }, "snappy", v);
    },
  });
  const { set: setPosition, settle } = drag;
  const ref = useMergedRefs(rootRef, forwardedRef, drag.ref);

  // Follow `value` from outside (controlled, keys, focus): jump on the first sync, spring afterwards.
  const widthsReady = value === null || (value === "start" ? startWidth : endWidth) > 0;
  React.useEffect(() => {
    if (drag.dragging || !widthsReady) return;
    const target = targetFor(value);
    if (settledAt.current === target) return;
    if (settledAt.current === null) setPosition(target, 0);
    else settle({ x: target }, "snappy");
    settledAt.current = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, widthsReady, startWidth, endWidth, dir, drag.dragging]);

  // A press outside the actions closes an open row.
  const close = React.useCallback(() => setValue(null), [setValue]);
  const open = value !== null;
  React.useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [open, close]);

  const revealKey = (side: SwipeSide) => ((side === "start") === dir > 0 ? "ArrowRight" : "ArrowLeft");
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement;
    if (target.closest(NO_DRAG)) return;
    if (event.key === "Escape" && value) {
      event.preventDefault();
      close();
      lastFocus.current?.focus({ preventScroll: true });
      return;
    }
    const side = (["start", "end"] as const).find((s) => event.key === revealKey(s));
    if (!side) return;
    const actions = side === "start" ? startActions : endActions;
    if (value && value !== side) {
      event.preventDefault();
      close();
      lastFocus.current?.focus({ preventScroll: true });
    } else if (!value && actions.length) {
      event.preventDefault();
      lastFocus.current = target;
      setValue(side);
      (side === "start" ? startGroup : endGroup).current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus({ preventScroll: true });
    }
  };

  const renderGroup = (side: SwipeSide, actions: SwipeAction[]) => {
    if (!actions.length) return null;
    const primary = commitIndex(actions, side);
    const factor = (side === "start" ? 1 : -1) * dir;
    return (
      <div
        ref={side === "start" ? startGroup : endGroup}
        role="group"
        aria-label={actionsLabel}
        data-slot="swipe-row-actions"
        data-side={side}
        className={cn("absolute inset-y-0 flex overflow-hidden", side === "start" ? "start-0" : "end-0")}
        style={{ width: `max(${side === "start" ? startWidth : endWidth}px, calc(var(--sutra-drag-x, 0px) * ${factor}))` }}
        onFocus={(event) => {
          const from = event.relatedTarget as HTMLElement | null;
          if (from && !event.currentTarget.contains(from)) lastFocus.current = from;
          setValue(side);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
        }}
      >
        {actions.map((action, index) => (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled}
            data-action={action.id}
            onClick={() => {
              fire(action, side);
              close();
            }}
            style={{ minWidth: actionWidth, ...(index === primary ? null : { width: actionWidth }) }}
            title={action.label}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-5",
              index === primary ? "flex-1" : "flex-none",
              toneClasses.solid[normalizeTone(action.tone)],
              focusRing,
              "focus-visible:ring-inset"
            )}
          >
            {action.icon ? <span aria-hidden>{action.icon}</span> : null}
            <span className="max-w-full truncate">{action.label}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      role={inList ? "listitem" : undefined}
      data-slot="swipe-row"
      data-state={value ?? "closed"}
      data-dragging={drag.dragging || undefined}
      className={cn("relative isolate overflow-hidden", drag.dragging && "select-none", className)}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        drag.handlers.onPointerDown?.(event);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        drag.handlers.onPointerMove?.(event);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        drag.handlers.onPointerUp?.(event);
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        drag.handlers.onPointerCancel?.(event);
      }}
      onLostPointerCapture={(event) => {
        onLostPointerCapture?.(event);
        drag.handlers.onLostPointerCapture?.(event);
      }}
      onClickCapture={(event) => {
        onClickCapture?.(event);
        drag.handlers.onClickCapture?.(event);
        // While open, a tap on the row closes it instead of activating what is under the finger.
        if (!event.defaultPrevented && value && !(event.target as Element).closest('[data-slot="swipe-row-actions"]')) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
      {...props}
    >
      <div data-slot="swipe-row-content" className={cn("relative z-10 bg-background", contentClassName)} style={{ translate: "var(--sutra-drag-x, 0px) 0" }}>
        <ItemListContext.Provider value={false}>{children}</ItemListContext.Provider>
      </div>
      {renderGroup("start", startActions)}
      {renderGroup("end", endActions)}
    </div>
  );
});
SwipeRow.displayName = "SwipeRow";
