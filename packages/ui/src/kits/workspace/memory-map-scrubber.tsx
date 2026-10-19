/* TimeScrubber: time range slider with a histogram and chronological playback. */
import * as React from "react";
import { RiPauseFill, RiPlayFill } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { formatClockTime, formatShortDate } from "../../lib/time";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { Button } from "../../primitives/button";
import { RangeSlider } from "../../primitives/slider";
import { SimpleSelect } from "../../primitives/select";
import { bucketByTime, memoryTime, type MemoryNode } from "./memory-map-model";
import { timeExtent } from "./memory-map-internal";

/* ------------------------------------------------------------------ */
/* TimeScrubber                                                        */
/* ------------------------------------------------------------------ */

const SCALE = 1000;

export interface TimeScrubberProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Items to histogram (only `createdAt` is used). */
  nodes: readonly Pick<MemoryNode, "id" | "createdAt">[];
  min?: number;
  max?: number;
  value?: [number, number];
  defaultValue?: [number, number];
  onValueChange?: (range: [number, number]) => void;
  playing?: boolean;
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  speed?: number;
  defaultSpeed?: number;
  onSpeedChange?: (speed: number) => void;
  speeds?: number[];
  /** Histogram bucket count. Default 32. */
  buckets?: number;
  /** Full sweep duration at 1× in ms. Default 8000. */
  duration?: number;
  /** Playback tick in ms. Default 100. */
  tickMs?: number;
  formatTime?: (t: number) => string;
  locale?: string;
}

/** Range slider over time with a histogram of counts per bucket and chronological play/pause playback (Space toggles). */
export const TimeScrubber = React.forwardRef<HTMLDivElement, TimeScrubberProps>(
  (
    {
      nodes,
      min: minProp,
      max: maxProp,
      value: valueProp,
      defaultValue,
      onValueChange,
      playing: playingProp,
      defaultPlaying,
      onPlayingChange,
      speed: speedProp,
      defaultSpeed,
      onSpeedChange,
      speeds = [0.5, 1, 2, 4],
      buckets = 32,
      duration = 8000,
      tickMs = 100,
      formatTime,
      locale,
      className,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const extent = React.useMemo(() => timeExtent(nodes as MemoryNode[]), [nodes]);
    const min = minProp ?? extent[0];
    const max = maxProp ?? extent[1];
    // Uncontrolled and untouched, the range is "everything": it follows [min, max] as nodes arrive.
    const [rangeState, setValue] = useControllableState<[number, number] | undefined>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange as ((range: [number, number] | undefined) => void) | undefined,
    });
    const value: [number, number] = rangeState ?? [min, max];
    const [playing, setPlaying] = useControllableState<boolean>({
      value: playingProp,
      defaultValue: defaultPlaying ?? false,
      onChange: onPlayingChange,
    });
    const [speed, setSpeed] = useControllableState<number>({ value: speedProp, defaultValue: defaultSpeed ?? 1, onChange: onSpeedChange });
    const fmt = React.useMemo(() => {
      if (formatTime) return formatTime;
      const span = max - min;
      if (span > 2 * 864e5) {
        const year = span > 300 * 864e5 ? "always" : "never";
        return (t: number) => formatShortDate(t, { locale, year });
      }
      return (t: number) => formatClockTime(t, { locale });
    }, [formatTime, locale, min, max]);

    const valueRef = React.useRef(value);
    valueRef.current = value;
    const setValueRef = useLatestRef(setValue);
    const setPlayingRef = useLatestRef(setPlaying);

    React.useEffect(() => {
      if (!playing) return;
      const span = max - min;
      if (span <= 0) {
        setPlayingRef.current(false);
        return;
      }
      const step = (span * tickMs * speed) / duration;
      const id = setInterval(() => {
        const [a, b] = valueRef.current;
        const end = Math.min(max, b + step);
        const next: [number, number] = [a, end];
        valueRef.current = next;
        setValueRef.current(next);
        if (end >= max) setPlayingRef.current(false);
      }, tickMs);
      return () => clearInterval(id);
    }, [playing, speed, min, max, duration, tickMs]);

    const togglePlay = () => {
      if (!playing && valueRef.current[1] >= max) {
        const restart: [number, number] = [valueRef.current[0], valueRef.current[0]];
        valueRef.current = restart;
        setValue(restart);
      }
      setPlaying(!playing);
    };

    const toScale = (t: number) => (max === min ? 0 : Math.round(((t - min) / (max - min)) * SCALE));
    const fromScale = (s: number) => min + ((max - min) * s) / SCALE;
    const hist = React.useMemo(() => bucketByTime(nodes, buckets, [min, max]), [nodes, buckets, min, max]);
    const peak = Math.max(1, ...hist.map((h) => h.count));
    const inRange = nodes.reduce((n, x) => {
      const t = memoryTime(x.createdAt);
      return n + (t >= value[0] && t <= value[1] ? 1 : 0);
    }, 0);

    return (
      <div
        ref={ref}
        role="group"
        aria-label="Time scrubber"
        aria-keyshortcuts="Space"
        tabIndex={0}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented || (e.key !== " " && e.code !== "Space")) return;
          const target = e.target as HTMLElement;
          if (target.closest("button,[role=combobox],input,textarea,select")) return;
          e.preventDefault();
          togglePlay();
        }}
        className={cn("flex flex-col gap-2 rounded-box p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50", className)}
        {...props}
      >
        <div aria-hidden className="flex h-10 items-end gap-px px-2">
          {hist.map((h, i) => {
            const active = h.end >= value[0] && h.start <= value[1];
            return (
              <div
                key={i}
                data-bucket={i}
                title={`${fmt(h.start)}: ${h.count}`}
                className={cn("min-h-px flex-1 rounded-t-xs transition-colors", active ? "bg-primary/70" : "bg-muted")}
                style={{ height: `${(h.count / peak) * 100}%` }}
              />
            );
          })}
        </div>
        <RangeSlider
          min={0}
          max={SCALE}
          step={1}
          minStepsBetweenThumbs={0}
          value={[toScale(value[0]), toScale(value[1])]}
          onValueChange={(v) => setValue([fromScale(v[0] ?? 0), fromScale(v[1] ?? SCALE)])}
          thumbLabels={[`Start: ${fmt(value[0])}`, `End: ${fmt(value[1])}`]}
          size="sm"
          className="px-2"
        />
        <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
          <Button
            size="icon-sm"
            variant="secondary"
            aria-label={playing ? "Pause playback" : "Play timeline"}
            aria-pressed={playing}
            onClick={togglePlay}
          >
            {playing ? <RiPauseFill aria-hidden /> : <RiPlayFill aria-hidden />}
          </Button>
          <SimpleSelect
            size="sm"
            aria-label="Playback speed"
            className="w-20"
            value={String(speed)}
            onValueChange={(v) => setSpeed(Number(v))}
            options={speeds.map((s) => ({ value: String(s), label: `${s}×` }))}
          />
          <span className="tabular-nums">
            {fmt(value[0])} – {fmt(value[1])}
          </span>
          <span className="ms-auto tabular-nums" aria-live="polite" aria-atomic>
            {playing ? "" : `${inRange} of ${nodes.length} in range`}
          </span>
        </div>
      </div>
    );
  }
);
TimeScrubber.displayName = "TimeScrubber";
