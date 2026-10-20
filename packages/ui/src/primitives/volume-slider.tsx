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
  /**
   * Initial volume from 0 to 100 when uncontrolled.
   * @default 100
   */
  defaultValue?: number;
  /** Called with the new volume (0 to 100) as the slider moves. */
  onValueChange?: (value: number) => void;
  /**
   * Controlled muted state. While muted the slider keeps the stored level (turned neutral grey) unless
   * `zeroWhenMuted` shows it at 0. Use with `onMutedChange`.
   */
  muted?: boolean;
  /**
   * Initial muted state when uncontrolled.
   * @default false
   */
  defaultMuted?: boolean;
  /** Called when the mute button toggles the muted state. */
  onMutedChange?: (muted: boolean) => void;
  /** Show the level ("64%", or "Muted") after the slider. Default true. */
  showLevel?: boolean;
  /** Hide the mute toggle (the slider alone). Default false. */
  hideMuteButton?: boolean;
  /** Categorical colour of the range and thumb. Default primary. */
  accent?: Accent;
  /** Disables the slider and the mute button. */
  disabled?: boolean;
  /** Accessible name of the slider, e.g. "Music volume". Default "Volume". */
  label?: string;
  /** Accessible name of the mute toggle. Default `Mute ${label}`. */
  muteLabel?: string;
  /** Keyboard step. Default 1. */
  step?: number;
  /**
   * Slider and button size.
   * @default "md"
   */
  size?: Size;
  /** Class for the level label. */
  levelClassName?: string;
  /** Slider direction. Vertical stacks the toggle, slider and level in a column. Default "horizontal". */
  orientation?: "horizontal" | "vertical";
  /** Class for the mute toggle, merged last (e.g. another button style). */
  muteButtonClassName?: string;
  /** Class for the slider. */
  sliderClassName?: string;
  /** Wrap the slider, e.g. in a reveal-on-hover container or a popover. */
  renderSlider?: (slider: React.ReactElement) => React.ReactNode;
  /** Value to set when the toggle unmutes a level of 0 (the toggle then reads as "unmute" at 0). Default: none. */
  restoreOnUnmute?: number;
  /**
   * How the toggle exposes its state: `"pressed"` (default) keeps one name with `aria-pressed`;
   * `"label"` swaps its name between `muteLabel` and `unmuteLabel`.
   */
  muteToggle?: "pressed" | "label";
  /** Accessible name of the toggle when it unmutes (`muteToggle="label"`). Default `Unmute ${label}`. */
  unmuteLabel?: string;
  /** Show the slider at 0 while muted instead of keeping the stored level. Default false. */
  zeroWhenMuted?: boolean;
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
      orientation = "horizontal",
      muteButtonClassName,
      sliderClassName,
      renderSlider,
      restoreOnUnmute,
      muteToggle = "pressed",
      unmuteLabel,
      zeroWhenMuted = false,
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
    const vertical = orientation === "vertical";
    /* With `restoreOnUnmute`, a level of 0 counts as muted for the toggle. */
    const unmutes = muted || (restoreOnUnmute !== undefined && value <= 0);
    const toggle = () => {
      if (!unmutes) return setMuted(true);
      if (muted) setMuted(false);
      if (restoreOnUnmute !== undefined && value <= 0) setValue(Math.round(clamp(restoreOnUnmute, 0, 100)));
    };

    const slider = (
      <Slider
        size={sliderSize[size]}
        min={0}
        max={100}
        step={step}
        value={[muted && zeroWhenMuted ? 0 : value]}
        disabled={disabled}
        accent={accent}
        tone={muted ? "neutral" : undefined}
        orientation={orientation}
        thumbLabels={[label]}
        getValueText={() => levelText}
        onValueChange={(next) => {
          const v = next[0];
          if (v === undefined) return;
          if (muted) setMuted(false);
          setValue(v);
        }}
        className={cn(!vertical && "min-w-10 flex-1", sliderClassName)}
      />
    );

    return (
      <div
        ref={ref}
        data-slot="volume-slider"
        data-muted={muted ? "" : undefined}
        data-orientation={orientation}
        className={cn("flex w-full min-w-0 items-center gap-2", vertical && "w-auto flex-col", className)}
        {...props}
      >
        {hideMuteButton ? null : (
          <button
            type="button"
            aria-pressed={muteToggle === "pressed" ? muted : undefined}
            aria-label={muteToggle === "label" && unmutes ? (unmuteLabel ?? `Unmute ${label}`) : (muteLabel ?? `Mute ${label}`)}
            data-state={unmutes ? "muted" : "unmuted"}
            disabled={disabled}
            onClick={toggle}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-control transition-colors",
              "hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
              muted ? "text-destructive hover:text-destructive" : "text-muted-foreground",
              focusRing,
              buttonSize[size],
              muteButtonClassName
            )}
          >
            <Icon aria-hidden />
          </button>
        )}
        {renderSlider ? renderSlider(slider) : slider}
        {showLevel ? (
          <span
            aria-hidden
            data-slot="volume-slider-level"
            className={cn(
              "w-12 shrink-0 text-end text-sm font-medium tabular-nums",
              vertical && "text-center",
              muted ? "text-muted-foreground" : "text-foreground",
              levelClassName
            )}
          >
            {muted ? levelText : <bdi dir="ltr">{levelText}</bdi>}
          </span>
        ) : null}
      </div>
    );
  }
);
VolumeSlider.displayName = "VolumeSlider";
