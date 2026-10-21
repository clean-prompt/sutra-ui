import * as React from "react";
import { cn, focusRing, hitArea } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useDrag } from "../../hooks/use-drag";
import { useMergedRefs } from "../../hooks/use-merged-refs";
import { formatClock } from "../../lib/duration";
import { clamp, toPercent } from "../../lib/math";
import type { MediaTone } from "./media-controls-base";
import type { MediaTimeRange } from "./media-controls-element";

/* ------------------------------------------------------------------ */
/* SeekBar                                                             */
/* ------------------------------------------------------------------ */

export interface MediaChapter {
  /** Start time in seconds. */
  start: number;
  title?: string;
}

export interface SeekBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Current playback time (seconds). */
  value: number;
  /** Total length in seconds. */
  duration: number;
  /** Buffered ranges, or a single buffered-until time. */
  buffered?: MediaTimeRange[] | number;
  /** Commit a seek (keyboard, click, end of drag). */
  onSeek?: (time: number) => void;
  /** Live scrub position while dragging; `null` when the drag ends. */
  onScrub?: (time: number | null) => void;
  /** Arrow-key step in seconds. Default 5. */
  step?: number;
  /** Chapter markers drawn on the track, each with a start time and title. */
  chapters?: MediaChapter[];
  /** Preview image for a time, shown in the hover bubble. */
  thumbnails?: (time: number) => string | null | undefined;
  /** Elapsed/total labels: beside the bar (`"inline"`), under it (`"below"`) or hidden. Default "inline". */
  showTimes?: boolean | "inline" | "below";
  /** Right-hand label shows the total or the remaining time (click toggles). */
  timeDisplay?: "total" | "remaining";
  /** Initial mode of the right-hand label when `timeDisplay` is not controlled. Default "total". */
  defaultTimeDisplay?: "total" | "remaining";
  /** Called with `total` or `remaining` when the user toggles the right-hand label. */
  onTimeDisplayChange?: (mode: "total" | "remaining") => void;
  /** `default` follows the theme; `overlay` is for a bar drawn over video. */
  tone?: MediaTone;
  /** Track thickness: `sm` or `md`. */
  size?: "sm" | "md";
  /** Disables dragging, clicking and keyboard seeking. */
  disabled?: boolean;
  /** Accessible name of the slider. */
  label?: string;
}

/** Media scrubber with buffered and played layers, hover time preview, chapters and keyboard seeking. */
export const SeekBar = React.forwardRef<HTMLDivElement, SeekBarProps>(
  (
    {
      value,
      duration,
      buffered,
      onSeek,
      onScrub,
      step = 5,
      chapters,
      thumbnails,
      showTimes = "inline",
      timeDisplay,
      defaultTimeDisplay = "total",
      onTimeDisplayChange,
      tone = "default",
      size = "md",
      disabled,
      label = "Seek",
      className,
      ...props
    },
    ref
  ) => {
    const trackRef = React.useRef<HTMLDivElement | null>(null);
    const [scrub, setScrub] = React.useState<number | null>(null);
    const [hover, setHover] = React.useState<number | null>(null);
    const draggingRef = React.useRef<number | null>(null);
    const [mode, setMode] = useControllableState({
      value: timeDisplay,
      defaultValue: defaultTimeDisplay,
      onChange: onTimeDisplayChange,
    });

    const finite = Number.isFinite(duration) && duration > 0;
    const total = finite ? duration : 0;
    const shown = scrub ?? (Number.isFinite(value) ? Math.max(0, value) : 0);
    const clampTime = (t: number) => clamp(t, 0, total);
    const pct = (t: number) => toPercent(t, total);
    const forceHours = total >= 3600;

    const ranges: MediaTimeRange[] =
      typeof buffered === "number" ? [{ start: 0, end: buffered }] : (buffered ?? []);

    const timeAt = (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return shown;
      return clampTime(((clientX - rect.left) / rect.width) * total);
    };

    const commit = (t: number) => {
      if (disabled || !finite) return;
      onSeek?.(clampTime(t));
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || !finite) return;
      const big = Math.max(step, total / 10);
      const map: Record<string, number> = {
        ArrowLeft: shown - step,
        ArrowDown: shown - step,
        ArrowRight: shown + step,
        ArrowUp: shown + step,
        PageDown: shown - big,
        PageUp: shown + big,
        Home: 0,
        End: total,
      };
      if (!(e.key in map)) return;
      e.preventDefault();
      e.stopPropagation();
      commit(map[e.key]);
    };

    // The scrub is a position drag (absolute mode: the press is the first position, the pointer is captured at once); the hover
    // bubble stays here. A disabled bar refuses the press in `allow`, so a drag already under way still ends cleanly.
    const drag = useDrag({
      mode: "absolute",
      axis: "x",
      allow: () => !disabled && finite,
      onDown: (e) => e.currentTarget.focus({ preventScroll: true }),
      onMove: (info) => {
        const width = trackRef.current?.getBoundingClientRect().width ?? 0;
        const t = width > 0 ? clampTime((info.fx ?? 0) * total) : shown;
        draggingRef.current = t;
        setScrub(t);
        onScrub?.(t);
      },
      onEnd: (_info, cancelled) => {
        const t = draggingRef.current;
        if (t === null) return;
        draggingRef.current = null;
        setScrub(null);
        onScrub?.(null);
        if (!cancelled) commit(t);
      },
    });
    const setTrackRef = useMergedRefs<HTMLDivElement>(trackRef, drag.ref as React.Ref<HTMLDivElement>);
    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!finite) return;
      drag.handlers.onPointerMove?.(e);
      if (draggingRef.current === null && e.pointerType !== "touch") setHover(timeAt(e.clientX));
    };

    const bubbleTime = scrub ?? hover;
    const chapterAt = (t: number) =>
      chapters?.length ? [...chapters].sort((a, b) => a.start - b.start).filter((c) => c.start <= t).pop() : undefined;
    const bubbleChapter = bubbleTime !== null ? chapterAt(bubbleTime) : undefined;
    const thumb = bubbleTime !== null ? thumbnails?.(bubbleTime) : undefined;
    const overlay = tone === "overlay";
    const timeText = finite ? `${formatClock(shown)} of ${formatClock(total)}` : formatClock(shown);
    const currentChapter = chapterAt(shown);

    const timeClass = cn(
      hitArea,
      "shrink-0 font-mono text-xs tabular-nums",
      overlay ? "text-white/80" : "text-muted-foreground"
    );
    const elapsed = <span className={cn(timeClass, showTimes !== "below" && "min-w-10 text-end")}>{formatClock(shown, { forceHours })}</span>;
    const remaining = mode === "remaining";
    const totalLabel = (
      <button
        type="button"
        onClick={() => setMode(remaining ? "total" : "remaining")}
        aria-label={remaining ? "Show total time" : "Show remaining time"}
        className={cn(timeClass, "min-w-10 rounded-xs text-start hover:underline", showTimes === "below" && "text-end", focusRing)}
      >
        {remaining ? formatClock(total - shown, { forceHours, minus: true }) : formatClock(total, { forceHours })}
      </button>
    );

    const track = (
      <div
        ref={setTrackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(Math.min(shown, total || shown))}
        aria-valuetext={currentChapter?.title ? `${timeText}, ${currentChapter.title}` : timeText}
        aria-disabled={disabled || !finite || undefined}
        aria-orientation="horizontal"
        data-dragging={scrub !== null ? "" : undefined}
        onKeyDown={onKeyDown}
        onPointerDown={drag.handlers.onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={drag.handlers.onPointerUp}
        onPointerCancel={drag.handlers.onPointerCancel}
        onLostPointerCapture={drag.handlers.onLostPointerCapture}
        onPointerLeave={() => setHover(null)}
        className={cn(
          hitArea,
          "group/seek relative flex min-w-0 flex-1 cursor-pointer touch-none select-none items-center outline-none",
          size === "sm" ? "h-4" : "h-5",
          (disabled || !finite) && "cursor-default opacity-60"
        )}
      >
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-full transition-[height] duration-150",
            size === "sm" ? "h-[3px] group-hover/seek:h-1" : "h-1 group-hover/seek:h-1.5 group-data-[dragging]/seek:h-1.5",
            overlay ? "bg-white/25" : "bg-muted"
          )}
        >
          {ranges.map((r, i) => (
            <div
              key={i}
              data-slot="seek-buffered"
              className={cn("absolute inset-y-0", overlay ? "bg-white/40" : "bg-foreground/15")}
              style={{ left: `${pct(r.start)}%`, width: `${Math.max(0, pct(r.end) - pct(r.start))}%` }}
            />
          ))}
          <div
            data-slot="seek-played"
            className={cn("absolute inset-y-0 start-0", overlay ? "bg-primary" : "bg-primary")}
            style={{ width: `${pct(shown)}%` }}
          />
          {chapters
            ?.filter((c) => c.start > 0 && c.start < total)
            .map((c) => (
              <span
                key={c.start}
                data-slot="seek-chapter"
                className={cn("absolute inset-y-0 w-0.5 -translate-x-1/2 rtl:translate-x-1/2", overlay ? "bg-black/60" : "bg-background")}
                style={{ left: `${pct(c.start)}%` }}
              />
            ))}
        </div>
        {bubbleTime !== null && hover !== null && scrub === null && (
          <div
            aria-hidden
            className={cn("pointer-events-none absolute inset-y-0 w-px", overlay ? "bg-white/50" : "bg-foreground/30")}
            style={{ left: `${pct(hover)}%` }}
          />
        )}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm ring-0 transition-transform duration-150",
            size === "sm" ? "size-3" : "size-3.5",
            "scale-0 group-hover/seek:scale-100 group-focus-visible/seek:scale-100 group-focus-visible/seek:ring-4 group-focus-visible/seek:ring-ring/35 group-data-[dragging]/seek:scale-110",
            overlay && "bg-white"
          )}
          style={{ left: `${pct(shown)}%` }}
        />
        {bubbleTime !== null && finite && (
          <div
            aria-hidden
            data-slot="seek-preview"
            className="pointer-events-none absolute bottom-full z-10 mb-2 flex -translate-x-1/2 rtl:translate-x-1/2 flex-col items-center gap-1"
            style={{ left: `clamp(2.5rem, ${pct(bubbleTime)}%, calc(100% - 2.5rem))` }}
          >
            {thumb && (
              <img src={thumb} alt="" className="aspect-video w-40 rounded-md border border-white/20 bg-black object-cover shadow-lg" />
            )}
            <span className="whitespace-nowrap rounded-md bg-inverse px-1.5 py-0.5 text-xs font-medium text-inverse-foreground tabular-nums shadow-md">
              {bubbleChapter?.title && <span className="me-1.5 opacity-75">{bubbleChapter.title}</span>}
              {formatClock(bubbleTime, { forceHours })}
            </span>
          </div>
        )}
      </div>
    );

    return (
      <div
        ref={ref}
        // Media time runs left to right whatever the page direction: the bar, its times and its hover bubble stay together.
        dir="ltr"
        className={cn(
          "w-full min-w-0",
          showTimes === "below" ? "flex flex-col gap-1" : "flex items-center gap-3",
          className
        )}
        {...props}
      >
        {showTimes === "below" ? (
          <>
            {track}
            <div className="flex items-center justify-between">
              {elapsed}
              {totalLabel}
            </div>
          </>
        ) : showTimes ? (
          <>
            {elapsed}
            {track}
            {totalLabel}
          </>
        ) : (
          track
        )}
      </div>
    );
  }
);
SeekBar.displayName = "SeekBar";
