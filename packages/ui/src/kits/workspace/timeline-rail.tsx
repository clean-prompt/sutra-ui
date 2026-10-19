import * as React from "react";
import { cn, focusRing, hitArea } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { formatClockTime, toValidDate } from "../../lib/time";
import { prefersReducedMotion } from "../../hooks/use-media-query";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../primitives/tooltip";

export interface TimelineRailTurn {
  /** Turn id; also the default DOM id used to find the turn element. */
  id: string;
  /** Prompt preview shown in the tooltip. */
  preview: string;
  time?: string | number | Date;
  bookmarked?: boolean;
  flagged?: boolean;
  /** Explicit 0–1 position; measured from the transcript when omitted. */
  position?: number;
}

export interface TranscriptTimelineRailProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  turns: TimelineRailTurn[];
  /** Scrollable transcript element (IntersectionObserver root and position source). Defaults to the viewport. */
  scrollContainer?: React.RefObject<HTMLElement | null>;
  /** Resolve a turn element. Default `document.getElementById(id)`. */
  getTurnElement?: (id: string) => HTMLElement | null;
  /** Called on click / Enter; when omitted the turn element is scrolled into view. */
  onJump?: (id: string) => void;
  /** Controlled current turn; tracked via IntersectionObserver when omitted. */
  activeId?: string | null;
  onActiveChange?: (id: string | null) => void;
  label?: string;
}

function formatTime(time: TimelineRailTurn["time"]) {
  if (typeof time === "string") return time;
  const d = toValidDate(time);
  return d ? formatClockTime(d) : null;
}

/** Minimap rail beside a long transcript: one tick per user turn, hover previews, jump and in-view sync. */
export const TranscriptTimelineRail = React.forwardRef<HTMLDivElement, TranscriptTimelineRailProps>(
  (
    {
      turns,
      scrollContainer,
      getTurnElement,
      onJump,
      activeId: activeProp,
      onActiveChange,
      label = "Transcript timeline",
      className,
      ...props
    },
    ref
  ) => {
    const resolve = React.useCallback(
      (id: string) => (getTurnElement ? getTurnElement(id) : typeof document !== "undefined" ? document.getElementById(id) : null),
      [getTurnElement]
    );
    const [measured, setMeasured] = React.useState<Record<string, number>>({});
    const [observed, setObserved] = React.useState<string | null>(null);
    const [focusIndex, setFocusIndex] = React.useState(0);
    const observedRef = React.useRef<string | null>(null);
    const active = activeProp !== undefined ? activeProp : observed;
    const tickRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
    const onActiveRef = useLatestRef(onActiveChange);
    const turnKey = turns.map((t) => t.id).join("|");

    const measure = React.useCallback(() => {
      const root = scrollContainer?.current ?? null;
      const total = root ? root.scrollHeight : typeof document !== "undefined" ? document.documentElement.scrollHeight : 0;
      if (!total) return;
      const rootTop = root ? root.getBoundingClientRect().top - root.scrollTop : -window.scrollY;
      const next: Record<string, number> = {};
      let any = false;
      for (const t of turns) {
        const el = resolve(t.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - rootTop;
        next[t.id] = clamp(top / total, 0, 1);
        if (top > 0) any = true;
      }
      setMeasured(any ? next : {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [turnKey, resolve, scrollContainer]);

    React.useLayoutEffect(() => {
      measure();
      const root = scrollContainer?.current;
      if (!root || typeof ResizeObserver === "undefined") {
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
      }
      const ro = new ResizeObserver(() => measure());
      ro.observe(root);
      if (root.firstElementChild) ro.observe(root.firstElementChild);
      return () => ro.disconnect();
    }, [measure, scrollContainer]);

    React.useEffect(() => {
      if (typeof IntersectionObserver === "undefined") return;
      const order = new Map(turns.map((t, i) => [t.id, i]));
      const visible = new Set<string>();
      const elToId = new Map<Element, string>();
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const id = elToId.get(entry.target);
            if (!id) continue;
            if (entry.isIntersecting) visible.add(id);
            else visible.delete(id);
          }
          if (!visible.size) return;
          const top = [...visible].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))[0]!;
          if (observedRef.current !== top) {
            observedRef.current = top;
            setObserved(top);
            onActiveRef.current?.(top);
          }
        },
        { root: scrollContainer?.current ?? null, rootMargin: "0px 0px -55% 0px", threshold: 0 }
      );
      for (const t of turns) {
        const el = resolve(t.id);
        if (!el) continue;
        elToId.set(el, t.id);
        io.observe(el);
      }
      return () => io.disconnect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [turnKey, resolve, scrollContainer]);

    const jump = (id: string) => {
      if (onJump) onJump(id);
      else resolve(id)?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      if (activeProp === undefined && observedRef.current !== id) {
        observedRef.current = id;
        setObserved(id);
        onActiveChange?.(id);
      }
    };

    const n = turns.length;
    const positionOf = (t: TimelineRailTurn, i: number) =>
      t.position ?? measured[t.id] ?? (n <= 1 ? 0 : i / (n - 1));
    const activeIndex = turns.findIndex((t) => t.id === active);
    const tabIndexTarget = Math.min(focusIndex, Math.max(0, n - 1));

    const onKeyDown = (e: React.KeyboardEvent, i: number) => {
      let next = -1;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") next = Math.min(n - 1, i + 1);
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = Math.max(0, i - 1);
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = n - 1;
      if (next < 0) return;
      e.preventDefault();
      setFocusIndex(next);
      tickRefs.current[next]?.focus();
    };

    if (!n) return null;

    return (
      <div
        ref={ref}
        role="toolbar"
        aria-orientation="vertical"
        aria-label={label}
        className={cn("relative flex h-full w-6 shrink-0 justify-center py-2", className)}
        {...props}
      >
        <span aria-hidden className="absolute inset-y-2 start-1/2 w-px -translate-x-1/2 rtl:translate-x-1/2 bg-border" />
        <div className="relative h-full w-full">
          {turns.map((t, i) => {
            const isActive = i === activeIndex;
            const marked = t.flagged ? "flagged" : t.bookmarked ? "bookmarked" : null;
            const time = formatTime(t.time);
            return (
              <Tooltip key={t.id}>
                <TooltipTrigger asChild>
                  <button
                    ref={(el) => {
                      tickRefs.current[i] = el;
                    }}
                    type="button"
                    tabIndex={i === tabIndexTarget ? 0 : -1}
                    aria-label={`Turn ${i + 1}: ${t.preview}${marked ? ` (${marked})` : ""}`}
                    aria-current={isActive ? "location" : undefined}
                    data-turn={t.id}
                    data-active={isActive || undefined}
                    data-marker={marked ?? undefined}
                    onClick={() => {
                      setFocusIndex(i);
                      jump(t.id);
                    }}
                    onFocus={() => setFocusIndex(i)}
                    onKeyDown={(e) => onKeyDown(e, i)}
                    style={{ top: `${positionOf(t, i) * 100}%` }}
                    className={cn(
                      hitArea,
                      "group/tick absolute start-1/2 flex h-3 w-6 -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm",
                      focusRing
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "block rounded-full transition-all duration-150",
                        marked === "flagged"
                          ? "size-2 bg-destructive"
                          : marked === "bookmarked"
                            ? "size-2 bg-warning"
                            : "h-0.5 w-2.5 bg-muted-foreground/50 group-hover/tick:w-4 group-hover/tick:bg-foreground",
                        isActive && !marked && "h-1 w-4 bg-primary",
                        isActive && marked && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" variant="light" className="max-w-64 text-start">
                  <span className="line-clamp-3 block font-normal">{t.preview}</span>
                  {(time || marked) && (
                    <span className="mt-1 flex items-center gap-2 text-2xs text-muted-foreground">
                      {time && <span>{time}</span>}
                      {marked && <span className={marked === "flagged" ? "text-destructive" : "text-warning"}>{marked === "flagged" ? "Flagged" : "Bookmarked"}</span>}
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  }
);
TranscriptTimelineRail.displayName = "TranscriptTimelineRail";
