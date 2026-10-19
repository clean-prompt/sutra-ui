import * as React from "react";
import { cn } from "../lib/cn";
import { stagger } from "../hooks/use-stagger";
import { usePresence, type PresenceState } from "../hooks/use-presence";

export interface AnimatedListProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  items: readonly T[];
  /** A stable key per item (an id, not the index). */
  getKey: (item: T) => string | number;
  /** The content of one row. `state` is `"enter"`, `"idle"` or `"exit"` (an exiting row is a copy of its last render). */
  renderItem: (item: T, state: PresenceState, index: number) => React.ReactNode;
  /** The list element: `ul` and `ol` wrap each row in an `li`. Default `ul`. */
  as?: "ul" | "ol" | "div";
  /** Milliseconds a removed row stays while it leaves. Default 200, the speed of `animate-fade-out` and the collapse. */
  exitDuration?: number;
  /** Animate the rows of the first render too. Default false. */
  initial?: boolean;
  /** Rows added in one update enter one after the other (`--sutra-stagger`). Default true. */
  stagger?: boolean;
  /**
   * Let the neighbours close the gap as a removed row collapses (a `0fr` track, no measuring): `true` or `"height"` for
   * a column, `"width"` for a wrapping row of chips. Default true. Put spacing inside the rows (padding or margin on the
   * content), not as a `gap` between them, or the gap jumps when the row finally unmounts.
   */
  collapse?: boolean | "height" | "width";
  /** Class names for every row wrapper. */
  itemClassName?: string;
}

/**
 * A list whose rows enter with `animate-pop-in` and leave with `animate-fade-out` plus a height collapse, instead of
 * appearing and vanishing. Built on `usePresence`: nothing animates on first render, a removed row stays for
 * `exitDuration`, and under `prefers-reduced-motion` rows come and go at once. Each wrapper carries `data-state`,
 * `data-presence` and, while leaving, `inert` and `aria-hidden`. The list renders no live region: announce changes
 * yourself where they matter. Keep spacing inside the rows (padding), because a `gap` between wrappers would jump when a
 * row finally unmounts.
 */
function AnimatedListInner<T>(
  { items, getKey, renderItem, as = "ul", exitDuration = 200, initial = false, stagger: staggered = true, collapse = true, itemClassName, className, ...props }: AnimatedListProps<T>,
  ref: React.ForwardedRef<HTMLElement>
) {
  const rows = usePresence(items, (item) => String(getKey(item)), { exitDuration, initial, holdEnter: true });
  // A row keeps the stagger position it entered with: changing the delay of a finished animation would replay it.
  const order = React.useRef(new Map<string, number>());
  let next = 0;
  const Root = as as React.ElementType;
  const Row = (as === "div" ? "div" : "li") as React.ElementType;
  const wide = collapse === "width";
  return (
    <Root ref={ref} data-slot="animated-list" className={className} {...props}>
      {rows.map(({ item, key, state }, index) => {
        const leaving = state === "exit";
        if (leaving || state === "idle") order.current.delete(key);
        else if (!order.current.has(key)) order.current.set(key, next++);
        return (
          <Row
            key={key}
            data-slot="animated-list-item"
            data-state={leaving ? "closed" : "open"}
            data-presence={state}
            inert={leaving ? true : undefined}
            aria-hidden={leaving ? true : undefined}
            style={staggered && state === "enter" ? stagger(order.current.get(key) ?? 0) : undefined}
            className={cn(
              collapse && "grid duration-(--sutra-duration) ease-(--sutra-ease)",
              collapse && (wide ? "transition-[grid-template-columns]" : "transition-[grid-template-rows]"),
              collapse && (wide ? (leaving ? "grid-cols-[0fr]" : "grid-cols-[1fr]") : leaving ? "grid-rows-[0fr]" : "grid-rows-[1fr]"),
              state === "enter" && "animate-pop-in stagger",
              leaving && "pointer-events-none animate-fade-out",
              itemClassName
            )}
          >
            {collapse ? (
              <div className={cn("min-h-0 min-w-0", leaving && "overflow-hidden")} data-slot="animated-list-content">{renderItem(item, state, index)}</div>
            ) : (
              renderItem(item, state, index)
            )}
          </Row>
        );
      })}
    </Root>
  );
}

/** See `AnimatedListInner`: the generic cast keeps `ref` and the item type together. */
export const AnimatedList = React.forwardRef(AnimatedListInner) as (<T>(props: AnimatedListProps<T> & React.RefAttributes<HTMLElement>) => React.ReactElement | null) & {
  displayName?: string;
};
AnimatedList.displayName = "AnimatedList";
