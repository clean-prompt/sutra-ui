import * as React from "react";
import { RiPauseLine, RiPlayLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { clamp } from "../lib/math";
import { useElementWidth } from "../hooks/use-resize-observer";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useControllableState } from "../hooks/use-controllable-state";

export interface MarqueeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The items. Each child becomes one list item; the whole set is repeated to make the loop seamless. */
  children?: React.ReactNode;
  /** Seconds for one loop. Default 30. */
  duration?: number;
  /** Scroll left to right instead of right to left. */
  reverse?: boolean;
  /** Stop scrolling while the pointer or keyboard focus is inside. Default true. */
  pauseOnHover?: boolean;
  /** Space between items: a number is pixels, a string is any CSS length. Default `3rem`. */
  gap?: number | string;
  /** Fade the left and right edges out. Default true. */
  fade?: boolean;
  /** Classes for every item's `li`. */
  itemClassName?: string;
  /** Accessible name of the list. */
  label?: string;
  /**
   * Show a pause and play button at the end of the row, in the flow beside the track (WCAG 2.2.2: moving content
   * needs a control that outlasts hover and focus, for touch and keyboard users). Hidden under reduced motion, where
   * the row is already still. Default false.
   */
  pausable?: boolean;
  /** Controlled paused state. The button toggles it; `pauseOnHover` still pauses on top of it. */
  paused?: boolean;
  /** Initial paused state when uncontrolled. Default false. */
  defaultPaused?: boolean;
  /** Called with the new state when the button is pressed. */
  onPausedChange?: (paused: boolean) => void;
  /** Accessible name of the pause button (a toggle: it stays the same while `aria-pressed` flips). Default "Pause scrolling". */
  pauseLabel?: string;
}

/** The most copies of the items one track will hold (very short lists on very wide screens stop growing here). */
const MAX_COPIES = 10;

/* A class, not an inline style, so reduced motion can drop it again. */
const fadeMaskClass =
  "[-webkit-mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)] [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)] motion-reduce:[-webkit-mask-image:none] motion-reduce:[mask-image:none]";

/**
 * An endless, slowly scrolling row of items (logos, chips, quotes). The row repeats its items as often as the width needs,
 * hides the repeats from assistive tech and stands still, wrapped onto lines, under `prefers-reduced-motion`.
 * Keep the items presentational: the repeats are inert, so links and buttons inside would not work in them.
 */
export const Marquee = React.forwardRef<HTMLDivElement, MarqueeProps>(
  (
    {
      children,
      duration = 30,
      reverse = false,
      pauseOnHover = true,
      gap = "3rem",
      fade = true,
      itemClassName,
      label,
      pausable = false,
      paused: pausedProp,
      defaultPaused = false,
      onPausedChange,
      pauseLabel = "Pause scrolling",
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [pausedState, setPaused] = useControllableState<boolean>({ value: pausedProp, defaultValue: defaultPaused, onChange: onPausedChange });
    const paused = pausedState;
    const rootRef = React.useRef<HTMLDivElement>(null);
    const firstCopyRef = React.useRef<HTMLUListElement>(null);
    const mergedRef = useMergedRefs<HTMLDivElement>(ref, rootRef);
    const rootWidth = useElementWidth(rootRef);
    const copyWidth = useElementWidth(firstCopyRef);
    // One scroll step moves a copy out of view, so the track needs a copy more than the width alone calls for.
    const copies = copyWidth > 0 ? clamp(Math.ceil(rootWidth / copyWidth) + 1, 2, MAX_COPIES) : 2;
    const items = React.Children.toArray(children);
    const gapValue = typeof gap === "number" ? `${gap}px` : gap;
    const loopSeconds = Number.isFinite(duration) && duration > 0 ? duration : 30;

    const row = (
      <div
        ref={mergedRef}
        data-slot="marquee"
        data-paused={paused ? "true" : undefined}
        data-pause-on-hover={pauseOnHover ? "true" : "false"}
        style={{ "--sutra-marquee-gap": gapValue, "--sutra-marquee-copies": copies, ...style } as React.CSSProperties}
        className={cn(
          "group/marquee relative flex w-full overflow-hidden",
          fade && fadeMaskClass,
          pausable && "min-w-0 flex-1",
          className
        )}
        {...props}
      >
        <div
          data-slot="marquee-track"
          style={{ animationDuration: `${loopSeconds}s`, animationDirection: reverse ? "reverse" : "normal" }}
          className={cn(
            "flex w-max shrink-0 items-center animate-marquee rtl:[animation-name:sutra-marquee-rtl] motion-reduce:w-full motion-reduce:animate-none motion-reduce:justify-center",
            paused && "[animation-play-state:paused]",
            pauseOnHover && "group-hover/marquee:[animation-play-state:paused] group-focus-within/marquee:[animation-play-state:paused]"
          )}
        >
          {Array.from({ length: copies }, (_, copy) => (
            <ul
              key={copy}
              ref={copy === 0 ? firstCopyRef : undefined}
              role="list"
              aria-label={copy === 0 ? label : undefined}
              aria-hidden={copy > 0 ? true : undefined}
              inert={copy > 0 ? true : undefined}
              data-slot="marquee-list"
              className={cn(
                "m-0 flex shrink-0 list-none items-center gap-(--sutra-marquee-gap) p-0 pe-(--sutra-marquee-gap)",
                "motion-reduce:min-w-0 motion-reduce:shrink motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-6 motion-reduce:pe-0",
                copy > 0 && "motion-reduce:hidden"
              )}
            >
              {items.map((item, i) => (
                <li key={React.isValidElement(item) && item.key != null ? item.key : i} data-slot="marquee-item" className={itemClassName}>
                  {item}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    );

    if (!pausable) return row;
    return (
      <div data-slot="marquee-frame" className="flex w-full items-center gap-2">
        {row}
        <button
          type="button"
          data-slot="marquee-pause"
          aria-label={pauseLabel}
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-control border border-input bg-background text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground motion-reduce:hidden",
            focusRing
          )}
        >
          {paused ? <RiPlayLine className="size-4" aria-hidden="true" /> : <RiPauseLine className="size-4" aria-hidden="true" />}
        </button>
      </div>
    );
  }
);
Marquee.displayName = "Marquee";
