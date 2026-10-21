import * as React from "react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { clamp } from "../../lib/math";
import { VolumeSlider } from "../../primitives/volume-slider";
import { mediaButtonVariants, type MediaTone } from "./media-controls-base";

/* ------------------------------------------------------------------ */
/* VolumeControl                                                       */
/* ------------------------------------------------------------------ */

export interface VolumeControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "onVolumeChange"> {
  /** 0–1. */
  volume?: number;
  /** Initial volume (0 to 1) when `volume` is not controlled. */
  defaultVolume?: number;
  /** Called with the volume (0 to 1) while the user moves the slider or presses an arrow key. */
  onVolumeChange?: (volume: number) => void;
  /** Controlled mute state. */
  muted?: boolean;
  /** Initial mute state when `muted` is not controlled. */
  defaultMuted?: boolean;
  /** Called with the new state when the user presses the mute button. */
  onMutedChange?: (muted: boolean) => void;
  /** Horizontal slider beside the button, or a vertical slider in a popover above it. */
  orientation?: "horizontal" | "vertical";
  /** Reveal the horizontal slider on hover/focus, or always show it. Default "hover". */
  expand?: "hover" | "always";
  /** Volume change per arrow key. Default 0.05. */
  step?: number;
  /** `default` follows the theme; `overlay` is for controls drawn over video. */
  tone?: MediaTone;
  /** Button size: `sm`, `md` or `lg`. */
  size?: "sm" | "md" | "lg";
}

/**
 * Mute toggle plus a volume slider that expands on hover/focus (or pops up vertically).
 * A preset over `VolumeSlider`: media button style, 0–1 volume, arrow keys on the toggle, and the reveal / popover layout.
 */
export const VolumeControl = React.forwardRef<HTMLDivElement, VolumeControlProps>(
  (
    {
      volume: volumeProp,
      defaultVolume = 1,
      onVolumeChange,
      muted: mutedProp,
      defaultMuted = false,
      onMutedChange,
      orientation = "horizontal",
      expand = "hover",
      step = 0.05,
      tone = "default",
      size = "md",
      className,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const [volume, setVolume] = useControllableState({ value: volumeProp, defaultValue: defaultVolume, onChange: onVolumeChange });
    const [muted, setMuted] = useControllableState({ value: mutedProp, defaultValue: defaultMuted, onChange: onMutedChange });
    const level = muted || volume <= 0 ? 0 : volume;

    const change = (v: number) => {
      const next = Math.round(clamp(v, 0, 1) * 100) / 100;
      setVolume(next);
      if (next > 0 && muted) setMuted(false);
    };

    const overlay = tone === "overlay";
    const vertical = orientation === "vertical";

    return (
      <VolumeSlider
        ref={ref}
        value={volume * 100}
        onValueChange={(v) => setVolume(v / 100)}
        muted={muted}
        onMutedChange={setMuted}
        showLevel={false}
        size="sm"
        step={Math.max(1, Math.round(step * 100))}
        orientation={orientation}
        restoreOnUnmute={50}
        zeroWhenMuted
        muteToggle="label"
        muteLabel="Mute"
        unmuteLabel="Unmute"
        accent={overlay ? "white" : undefined}
        muteButtonClassName={mediaButtonVariants({ tone, size })}
        sliderClassName={cn(overlay && "[&_.bg-muted]:bg-white/25", vertical && "h-24 w-auto")}
        renderSlider={(slider) =>
          vertical ? (
            <div
              data-slot="volume-popover"
              className={cn(
                "absolute bottom-full start-1/2 z-20 -translate-x-1/2 rtl:translate-x-1/2 pb-2 transition-[opacity,translate] duration-150",
                "pointer-events-none translate-y-1 opacity-0",
                "group-hover/volume:pointer-events-auto group-hover/volume:translate-y-0 group-hover/volume:opacity-100",
                "group-focus-within/volume:pointer-events-auto group-focus-within/volume:translate-y-0 group-focus-within/volume:opacity-100"
              )}
            >
              <div
                className={cn(
                  "flex flex-col items-center rounded-box px-1.5 py-3 shadow-lg",
                  overlay ? "bg-black/80 backdrop-blur" : "border border-border bg-popover"
                )}
              >
                {slider}
              </div>
            </div>
          ) : (
            <div
              data-slot="volume-slider-reveal"
              className={cn(
                "flex items-center overflow-hidden transition-[width,opacity] duration-200 ease-out-quart",
                expand === "always"
                  ? "w-24 ps-1 pe-1.5 opacity-100"
                  : "w-0 opacity-0 group-hover/volume:w-24 group-hover/volume:ps-1 group-hover/volume:pe-1.5 group-hover/volume:opacity-100 group-focus-within/volume:w-24 group-focus-within/volume:ps-1 group-focus-within/volume:pe-1.5 group-focus-within/volume:opacity-100"
              )}
            >
              {slider}
            </div>
          )
        }
        className={cn("group/volume relative inline-flex w-auto min-w-0 flex-row items-center gap-0", className)}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          if ((e.target as HTMLElement).closest('[role="slider"]')) return;
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            e.stopPropagation();
            change(level + step);
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            e.stopPropagation();
            change(level - step);
          }
        }}
        {...props}
      />
    );
  }
);
VolumeControl.displayName = "VolumeControl";
