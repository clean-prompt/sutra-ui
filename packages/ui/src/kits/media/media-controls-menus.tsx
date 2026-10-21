import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { RiClosedCaptioningLine, RiTranslate2 } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import {
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "../../primitives/dropdown-menu";
import type { MediaTone } from "./media-controls-base";
import { MediaMenuContent, chipClass } from "./media-controls-internal";

/* ------------------------------------------------------------------ */
/* Menus                                                               */
/* ------------------------------------------------------------------ */

export interface PlaybackRateMenuProps {
  /** Current playback speed, where 1 is normal. */
  rate: number;
  /** Called with the chosen speed when the user picks a rate. */
  onRateChange: (rate: number) => void;
  /** Speeds offered in the menu. Default 0.5 to 2 in steps of 0.25. */
  rates?: number[];
  /** `default` follows the theme; `overlay` is for a chip drawn over video. */
  tone?: MediaTone;
  /** Disables the trigger. */
  disabled?: boolean;
  /** Extra classes for the trigger chip. */
  className?: string;
}

/** Dropdown for playback speed (0.5× – 2×). */
export function PlaybackRateMenu({
  rate,
  onRateChange,
  rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
  tone = "default",
  disabled,
  className,
}: PlaybackRateMenuProps) {
  const fmt = (r: number) => `${r}×`;
  return (
    <DropdownMenuPrimitive.Root modal={false}>
      <DropdownMenuPrimitive.Trigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={`Playback speed: ${fmt(rate)}`}
          className={cn(chipClass(tone, rate !== 1), "min-w-12 justify-center normal-case tabular-nums", className)}
        >
          {fmt(rate)}
        </button>
      </DropdownMenuPrimitive.Trigger>
      <MediaMenuContent>
        <DropdownMenuLabel>Playback speed</DropdownMenuLabel>
        <DropdownMenuPrimitive.RadioGroup value={String(rate)} onValueChange={(v) => onRateChange(Number(v))}>
          {rates.map((r) => (
            <DropdownMenuRadioItem key={r} value={String(r)}>
              {r === 1 ? "Normal" : fmt(r)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuPrimitive.RadioGroup>
      </MediaMenuContent>
    </DropdownMenuPrimitive.Root>
  );
}
PlaybackRateMenu.displayName = "PlaybackRateMenu";

export interface MediaTrackOption {
  id: string;
  label: string;
  /** BCP 47 code; shown in the chip when present (e.g. "EN"). */
  language?: string;
}

export interface TrackCycleChipProps {
  /** Which track set this chip switches: `subtitles` or `audio`; sets the icon and labels. */
  kind: "subtitles" | "audio";
  /** Tracks to choose from, each with an id and label. */
  tracks: MediaTrackOption[];
  /** Selected track id, or null for off (subtitles). Controlled. */
  value?: string | null;
  /** Initial track id when uncontrolled. Default null (off). */
  defaultValue?: string | null;
  /** Called with the chosen track id, or `null` for off. */
  onValueChange?: (id: string | null) => void;
  /** Click cycles through the options, or opens a menu. Default: cycle up to 3 options, menu beyond. */
  mode?: "cycle" | "menu";
  /** Include an "Off" option. Default true for subtitles. */
  allowOff?: boolean;
  /** Label of the "off" option. Default "Off". */
  offLabel?: string;
  /** `default` follows the theme; `overlay` is for a chip drawn over video. */
  tone?: MediaTone;
  /** Disables the chip. */
  disabled?: boolean;
  /** Extra classes for the chip. */
  className?: string;
}

/** Chip showing the current subtitle/audio track; click cycles to the next one or opens a picker. */
export const TrackCycleChip = React.forwardRef<HTMLButtonElement, TrackCycleChipProps>(function TrackCycleChip(
  {
    kind,
    tracks,
    value: valueProp,
    defaultValue = null,
    onValueChange,
    mode,
    allowOff = kind === "subtitles",
    offLabel = "Off",
    tone = "default",
    disabled,
    className,
  },
  ref
) {
  const [value, setValue] = useControllableState<string | null>({ value: valueProp, defaultValue, onChange: onValueChange });
  const options: (string | null)[] = [...(allowOff ? [null] : []), ...tracks.map((t) => t.id)];
  const current = tracks.find((t) => t.id === value) ?? null;
  const short = current ? (current.language ? current.language.toUpperCase() : current.label) : offLabel;
  const full = current ? current.label : offLabel;
  const noun = kind === "subtitles" ? "Subtitles" : "Audio track";
  const Icon = kind === "subtitles" ? RiClosedCaptioningLine : RiTranslate2;
  const resolvedMode = mode ?? (options.length > 3 ? "menu" : "cycle");
  const active = kind === "subtitles" && current !== null;
  const content = (
    <>
      <Icon aria-hidden />
      <span className="max-w-24 truncate">{short}</span>
    </>
  );

  if (resolvedMode === "cycle") {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || options.length < 2}
        aria-label={`${noun}: ${full}. Switch to next`}
        data-kind={kind}
        onClick={() => {
          const at = options.indexOf(current ? current.id : null);
          setValue(options[(at + 1) % options.length] ?? null);
        }}
        className={cn(chipClass(tone, active), className)}
      >
        {content}
      </button>
    );
  }

  return (
    <DropdownMenuPrimitive.Root modal={false}>
      <DropdownMenuPrimitive.Trigger asChild disabled={disabled}>
        <button ref={ref} type="button" aria-label={`${noun}: ${full}`} data-kind={kind} className={cn(chipClass(tone, active), className)}>
          {content}
        </button>
      </DropdownMenuPrimitive.Trigger>
      <MediaMenuContent>
        <DropdownMenuLabel>{noun === "Subtitles" ? "Subtitles" : "Audio"}</DropdownMenuLabel>
        <DropdownMenuPrimitive.RadioGroup value={value ?? "__off"} onValueChange={(v) => setValue(v === "__off" ? null : v)}>
          {allowOff && (
            <>
              <DropdownMenuRadioItem value="__off">{offLabel}</DropdownMenuRadioItem>
              <DropdownMenuSeparator />
            </>
          )}
          {tracks.map((t) => (
            <DropdownMenuRadioItem key={t.id} value={t.id}>
              {t.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuPrimitive.RadioGroup>
      </MediaMenuContent>
    </DropdownMenuPrimitive.Root>
  );
});
TrackCycleChip.displayName = "TrackCycleChip";
