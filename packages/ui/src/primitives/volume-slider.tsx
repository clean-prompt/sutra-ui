import * as React from "react";
import { RiVolumeDownLine, RiVolumeMuteLine, RiVolumeUpLine } from "@remixicon/react";
import { cn, focusRing, type Size } from "../lib/cn";
import { clamp } from "../lib/math";
import { type Accent } from "../lib/accent";
import { useControllableState } from "../hooks/use-controllable-state";
import { Slider } from "./slider";

export interface VolumeSliderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "dir"> {
  /** Volume 0–100. */
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  muted?: boolean;
  defaultMuted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  /** Show the level ("64%", or "Muted") after the slider. Default true. */
  showLevel?: boolean;
  /** Hide the mute toggle (the slider alone). Default false. */
  hideMuteButton?: boolean;
  /** Categorical colour of the range and thumb. Default primary. */
  accent?: Accent;
  disabled?: boolean;
  /** Accessible name of the slider, e.g. "Music volume". Default "Volume". */
  label?: string;
  /** Accessible name of the mute toggle. Default `Mute ${label}`. */
  muteLabel?: string;
  /** Keyboard step. Default 1. */
  step?: number;
  size?: Size;
  /** Class for the level label. */
  levelClassName?: string;
}

const buttonSize: Record<Size, string> = { sm: "size-6 [&_svg]:size-3.5", md: "size-7 [&_svg]:size-4", lg: "size-8 [&_svg]:size-[18px]" };
const sliderSize: Record<Size, Size> = { sm: "sm", md: "sm", lg: "md" };

/** Pick the speaker icon for a level: muted (or 0), low (below 50) or high. */
export function volumeIcon(value: number, muted = false) {
  if (muted || value <= 0) return RiVolumeMuteLine;
  return value < 50 ? RiVolumeDownLine : RiVolumeUpLine;
}

/**
 * Volume control: a mute toggle (speaker icon by level), a `Slider` and the level ("64%" or "Muted").
 * Muting keeps the value, so unmuting restores it; moving the slider while muted unmutes.
 */
export const VolumeSlider = React.forwardRef<HTMLDivElement, VolumeSliderProps>(
  (
    {
      value: valueProp,
      defaultValue = 100,
      onValueChange,
      muted: mutedProp,
      defaultMuted = false,
      onMutedChange,
      showLevel = true,
      hideMuteButton = false,
      accent,
      disabled,
      label = "Volume",
      muteLabel,
      step = 1,
      size = "md",
      levelClassName,
      className,
      ...props
    },
    ref
  ) => {
    const [rawValue, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const [muted, setMuted] = useControllableState({ value: mutedProp, defaultValue: defaultMuted, onChange: onMutedChange });
    const value = Math.round(clamp(Number.isFinite(rawValue) ? rawValue : 0, 0, 100));
    const levelText = muted ? "Muted" : `${value}%`;
    const Icon = volumeIcon(value, muted);

    return (
      <div
        ref={ref}
        data-slot="volume-slider"
        data-muted={muted ? "" : undefined}
        className={cn("flex w-full min-w-0 items-center gap-2", className)}
        {...props}
      >
        {hideMuteButton ? null : (
          <button
            type="button"
            aria-pressed={muted}
            aria-label={muteLabel ?? `Mute ${label}`}
            disabled={disabled}
            onClick={() => setMuted(!muted)}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-control transition-colors",
              "hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
              muted ? "text-destructive hover:text-destructive" : "text-muted-foreground",
              focusRing,
              buttonSize[size]
            )}
          >
            <Icon aria-hidden />
          </button>
        )}
        <Slider
          size={sliderSize[size]}
          min={0}
          max={100}
          step={step}
          value={[value]}
          disabled={disabled}
          accent={accent}
          tone={muted ? "neutral" : undefined}
          thumbLabels={[label]}
          getValueText={() => levelText}
          onValueChange={(next) => {
            const v = next[0];
            if (v === undefined) return;
            if (muted) setMuted(false);
            setValue(v);
          }}
          className="min-w-10 flex-1"
        />
        {showLevel ? (
          <span
            aria-hidden
            data-slot="volume-slider-level"
            className={cn(
              "w-12 shrink-0 text-right text-sm font-medium tabular-nums",
              muted ? "text-muted-foreground" : "text-foreground",
              levelClassName
            )}
          >
            {levelText}
          </span>
        ) : null}
      </div>
    );
  }
);
VolumeSlider.displayName = "VolumeSlider";
