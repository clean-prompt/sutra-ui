import * as React from "react";
import { cn } from "../lib/cn";
import { clamp } from "../lib/math";
import { useElementWidth } from "../hooks/use-resize-observer";
import { useMergedRefs } from "../hooks/use-merged-refs";

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
    { children, duration = 30, reverse = false, pauseOnHover = true, gap = "3rem", fade = true, itemClassName, label, className, style, ...props },
    ref
  ) => {
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

    return (
      <div
        ref={mergedRef}
        data-slot="marquee"
        data-pause-on-hover={pauseOnHover ? "true" : "false"}
        style={{ "--sutra-marquee-gap": gapValue, "--sutra-marquee-copies": copies, ...style } as React.CSSProperties}
        className={cn(
          "group/marquee relative flex w-full overflow-hidden",
          fade && fadeMaskClass,
          className
        )}
        {...props}
      >
        <div
          data-slot="marquee-track"
          style={{ animationDuration: `${loopSeconds}s`, animationDirection: reverse ? "reverse" : "normal" }}
          className={cn(
            "flex w-max shrink-0 items-center animate-marquee motion-reduce:w-full motion-reduce:animate-none motion-reduce:justify-center",
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
                "m-0 flex shrink-0 list-none items-center gap-(--sutra-marquee-gap) p-0 pr-(--sutra-marquee-gap)",
                "motion-reduce:min-w-0 motion-reduce:shrink motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-6 motion-reduce:pr-0",
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
  }
);
Marquee.displayName = "Marquee";
