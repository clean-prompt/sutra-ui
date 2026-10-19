import * as React from "react";
import { RiArrowLeftSLine, RiArrowRightSLine, RiPauseLine, RiPlayLine } from "@remixicon/react";
import { cn, hitArea } from "../lib/cn";
import { directionOf, inlineKeyStep } from "../lib/direction";
import { activeSlide, autoplayInterval, stepSlide } from "../lib/carousel";
import { useControllableState } from "../hooks/use-controllable-state";
import { useIsoLayoutEffect } from "../hooks/use-iso-layout-effect";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { Button } from "../primitives/button";
import { Skeleton } from "../primitives/progress";

export interface CarouselLabels {
  /** Name of the slide strip. Default "Slides". */
  slides?: string;
  previous?: string;
  next?: string;
  play?: string;
  pause?: string;
  /** Name of a dot (n is 1-based). Default "Go to slide n". */
  goTo?: (n: number) => string;
  /** Name of a slide, and the live announcement. Default "n of N". */
  slide?: (n: number, count: number) => string;
}

export interface CarouselProps extends Omit<React.HTMLAttributes<HTMLElement>, "defaultValue" | "onChange" | "children"> {
  /** The slides, one child each (a fragment's children count one by one). */
  children?: React.ReactNode;
  /** Index of the slide in view. */
  value?: number;
  defaultValue?: number;
  onValueChange?: (index: number) => void;
  /** Accessible name of the carousel. */
  label?: string;
  /** The arrows go round (rewinding to the other end) instead of stopping. Default false. */
  loop?: boolean;
  /** Previous and next buttons. Default true. */
  arrows?: boolean;
  /** One dot per slide. Default true. */
  dots?: boolean;
  /** Advance by itself: `true` every 5 s or a number of ms. It pauses on hover and focus and has a visible pause button; off under reduced motion until the user presses play. */
  autoplay?: boolean | number;
  /** A bar that fills over the autoplay interval (a CSS transition, hidden under reduced motion). Default false. */
  progress?: boolean;
  /** Where a slide stops in the strip. Default "start". */
  align?: "start" | "center";
  /** Classes for each slide: its width (`basis-4/5` to show the next slide peeking). Default `basis-full`. */
  slideClassName?: string;
  trackClassName?: string;
  /** Placeholder slide and `aria-busy` while the slides are on their way. */
  loading?: boolean;
  /** Shown when there are no slides. Default "Nothing to show". */
  emptyState?: React.ReactNode;
  labels?: CarouselLabels;
}

const defaultLabels = {
  slides: "Slides",
  previous: "Previous slide",
  next: "Next slide",
  play: "Start slide show",
  pause: "Pause slide show",
  goTo: (n: number) => `Go to slide ${n}`,
  slide: (n: number, count: number) => `${n} of ${count}`,
};

/** The slides: one per child, with the children of a fragment counted one by one. */
const flatten = (nodes: React.ReactNode): React.ReactNode[] =>
  React.Children.toArray(nodes).flatMap((node) => (React.isValidElement<{ children?: React.ReactNode }>(node) && node.type === React.Fragment ? flatten(node.props.children) : [node]));

/** A smooth scroll that has not ended after this long is over (browsers without `scrollend`). */
const TRAVEL_MS = 900;

/** The bar of `progress`: restarts from empty on every slide and fills with a plain transition over the interval. */
function ProgressFill({ ms, runKey }: { ms: number; runKey: number }) {
  const [full, setFull] = React.useState(false);
  React.useEffect(() => {
    setFull(false);
    let inner = 0;
    const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(() => setFull(true))));
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [runKey]);
  return <span aria-hidden className={cn("block h-full origin-left rtl:origin-right bg-primary ease-linear", full ? "scale-x-100 transition-transform" : "scale-x-0")} style={{ transitionDuration: `${ms}ms` }} />;
}

/**
 * A snap carousel: native CSS scroll-snap strip (swipe, trackpad and wheel just work), previous and next buttons, dots,
 * Arrow / Home / End keys on the strip, and the slide in view as `value` (found with an IntersectionObserver, so a free
 * scroll updates it). It follows the ARIA carousel pattern: `aria-roledescription="carousel"` and "slide" with "n of N"
 * names, and a status line that announces the slide unless it is rotating. `autoplay` pauses while the pointer or focus is inside, has a visible
 * pause button (WCAG 2.2.2) and stays off under reduced motion until the user starts it. Controlled or uncontrolled.
 */
export const Carousel = React.forwardRef<HTMLElement, CarouselProps>(
  (
    {
      children,
      value,
      defaultValue = 0,
      onValueChange,
      label,
      loop = false,
      arrows = true,
      dots = true,
      autoplay,
      progress = false,
      align = "start",
      slideClassName,
      trackClassName,
      loading = false,
      emptyState = "Nothing to show",
      labels,
      className,
      onPointerEnter,
      onPointerLeave,
      onFocus,
      onBlur,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const text = { ...defaultLabels, ...labels };
    const slides = flatten(children);
    const count = slides.length;
    const reduced = usePrefersReducedMotion();
    const [stored, setIndex] = useControllableState<number>({ value, defaultValue, onChange: onValueChange });
    const index = Math.min(Math.max(0, stored), Math.max(0, count - 1));
    const interval = autoplayInterval(autoplay);
    const [userPlay, setUserPlay] = React.useState<boolean | null>(null);
    const [hover, setHover] = React.useState(false);
    const [focused, setFocused] = React.useState(false);
    const [announcement, setAnnouncement] = React.useState("");
    const playing = interval > 0 && (userPlay ?? !reduced);
    const rotating = playing && !hover && !focused && count > 1;
    const rotatingRef = React.useRef(rotating);
    rotatingRef.current = rotating;

    const trackRef = React.useRef<HTMLDivElement | null>(null);
    const ratios = React.useRef<number[]>([]);
    const seen = React.useRef(-1);
    const travelling = React.useRef<{ index: number; timer: ReturnType<typeof setTimeout> } | null>(null);
    const placed = React.useRef(false);

    const endTravel = () => {
      if (travelling.current) clearTimeout(travelling.current.timer);
      travelling.current = null;
    };
    const scrollToIndex = (i: number, smooth: boolean) => {
      const track = trackRef.current;
      const slide = track?.children[i] as HTMLElement | undefined;
      if (!track || !slide) return;
      const t = track.getBoundingClientRect();
      const s = slide.getBoundingClientRect();
      const left = track.scrollLeft + (s.left - t.left) - (align === "center" ? (t.width - s.width) / 2 : 0);
      endTravel();
      if (smooth && !reduced && typeof track.scrollTo === "function") {
        travelling.current = { index: i, timer: setTimeout(endTravel, TRAVEL_MS) };
        track.scrollTo({ left, behavior: "smooth" });
      } else track.scrollLeft = left;
    };
    const go = (i: number, announce = true) => {
      if (i === index || i < 0 || i >= count) return;
      setIndex(i);
      scrollToIndex(i, true);
      if (announce) setAnnouncement(text.slide(i + 1, count));
    };
    const step = (dir: 1 | -1, announce = true) => go(stepSlide(index, count, dir, loop), announce);

    // The slide in view follows a free scroll; a scroll we started ourselves is left to finish first.
    React.useEffect(() => {
      const track = trackRef.current;
      if (!track || typeof IntersectionObserver === "undefined") return;
      ratios.current = [];
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) ratios.current[Number((entry.target as HTMLElement).dataset.index)] = entry.intersectionRatio;
          const at = activeSlide(ratios.current);
          if (at < 0) return;
          if (travelling.current) {
            if (at === travelling.current.index) endTravel();
            else return;
          }
          seen.current = at;
          setIndex(at);
          if (!rotatingRef.current) setAnnouncement(text.slide(at + 1, count));
        },
        { root: track, threshold: [0, 0.25, 0.5, 0.75, 1] }
      );
      for (const el of Array.from(track.children)) observer.observe(el);
      const onScrollEnd = () => endTravel();
      track.addEventListener("scrollend", onScrollEnd);
      return () => {
        observer.disconnect();
        track.removeEventListener("scrollend", onScrollEnd);
        endTravel();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [count, loading]);

    // A value set from outside (or the first render) brings that slide into view.
    useIsoLayoutEffect(() => {
      if (travelling.current || seen.current === index || !trackRef.current) return;
      scrollToIndex(index, placed.current);
      placed.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index, count, loading]);

    // Autoplay: one timer per slide; it starts over after a pause.
    React.useEffect(() => {
      if (!rotating) return;
      const id = setTimeout(() => step(1, false), interval);
      return () => clearTimeout(id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rotating, index, interval, count, loop]);

    const handleKey = (event: React.KeyboardEvent<HTMLElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement;
      if (target !== trackRef.current && !target.closest("[data-slot=carousel-controls]")) return;
      // Slides run along the reading direction: the key towards the inline end is "next".
      const along = inlineKeyStep(event.key, directionOf(trackRef.current));
      if (along) step(along);
      else if (event.key === "Home") go(0);
      else if (event.key === "End") go(count - 1);
      else return;
      event.preventDefault();
    };

    const atStart = !loop && index === 0;
    const atEnd = !loop && index >= count - 1;
    return (
      <section
        ref={ref}
        aria-roledescription="carousel"
        aria-label={label}
        aria-busy={loading || undefined}
        data-slot="carousel"
        className={cn("@container flex min-w-0 flex-col gap-3", className)}
        onPointerEnter={(e) => {
          onPointerEnter?.(e);
          setHover(true);
        }}
        onPointerLeave={(e) => {
          onPointerLeave?.(e);
          setHover(false);
        }}
        onFocus={(e) => {
          onFocus?.(e);
          setFocused(true);
        }}
        onBlur={(e) => {
          onBlur?.(e);
          if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
        }}
        onKeyDown={handleKey}
        {...props}
      >
        {loading ? (
          <>
            <span className="sr-only">Loading…</span>
            <Skeleton className="aspect-video w-full" />
          </>
        ) : count === 0 ? (
          <p className="rounded-box border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{emptyState}</p>
        ) : (
          <>
            <div
              ref={trackRef}
              role="group"
              aria-label={text.slides}
              tabIndex={0}
              data-slot="carousel-track"
              className={cn(
                "flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain rounded-box outline-none scrollbar-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
                trackClassName
              )}
            >
              {slides.map((slide, i) => (
                <div
                  key={i}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={text.slide(i + 1, count)}
                  data-index={i}
                  data-active={i === index || undefined}
                  className={cn("min-w-0 shrink-0 grow-0 basis-full", align === "center" ? "snap-center" : "snap-start", "snap-always", slideClassName)}
                >
                  {slide}
                </div>
              ))}
            </div>
            {progress && interval > 0 && !reduced ? (
              <div aria-hidden className="h-0.5 w-full overflow-hidden rounded-full bg-border">
                {rotating ? <ProgressFill ms={interval} runKey={index} /> : null}
              </div>
            ) : null}
            {count > 1 && (arrows || dots || interval > 0) ? (
              <div data-slot="carousel-controls" className="flex min-w-0 flex-wrap items-center justify-center gap-2">
                {interval > 0 ? (
                  <Button variant="ghost" size="icon-sm" aria-label={playing ? text.pause : text.play} onClick={() => setUserPlay(!playing)}>
                    {playing ? <RiPauseLine aria-hidden /> : <RiPlayLine aria-hidden />}
                  </Button>
                ) : null}
                {arrows ? (
                  <Button variant="outline" size="icon-sm" aria-label={text.previous} disabled={atStart} onClick={() => step(-1)}>
                    <RiArrowLeftSLine className="rtl:-scale-x-100" aria-hidden />
                  </Button>
                ) : null}
                {dots ? (
                  <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 px-1">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={text.goTo(i + 1)}
                        aria-current={i === index ? "true" : undefined}
                        onClick={() => go(i)}
                        className={cn(
                          hitArea,
                          "h-2 rounded-full outline-none transition-[width,background-color] focus-visible:ring-[3px] focus-visible:ring-ring/35",
                          i === index ? "w-5 bg-primary" : "w-2 bg-border-strong hover:bg-muted-foreground"
                        )}
                      />
                    ))}
                  </div>
                ) : null}
                {arrows ? (
                  <Button variant="outline" size="icon-sm" aria-label={text.next} disabled={atEnd} onClick={() => step(1)}>
                    <RiArrowRightSLine className="rtl:-scale-x-100" aria-hidden />
                  </Button>
                ) : null}
              </div>
            ) : null}
            <span role="status" className="sr-only">
              {announcement}
            </span>
          </>
        )}
      </section>
    );
  }
);
Carousel.displayName = "Carousel";
