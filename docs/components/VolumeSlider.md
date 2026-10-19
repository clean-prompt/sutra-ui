# VolumeSlider

> Volume control: a mute toggle (speaker icon by level), a `Slider` and the level ("64%" or "Muted"). Muting keeps the value, so unmuting restores it; moving the slider while muted unmutes.

- Import: `import { VolumeSlider } from "@sutra/ui"` (or from `@sutra/ui/system`)
- Source: `packages/ui/src/primitives/volume-slider` (primitives)
- `data-slot`: `volume-slider`, `volume-slider-level`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `accent` | `Accent` |  | Categorical colour of the range and thumb. Default primary. |
| `defaultMuted` | `boolean` | `false` | Initial muted state when uncontrolled. |
| `defaultValue` | `number` | `100` | Initial volume from 0 to 100 when uncontrolled. |
| `disabled` | `boolean` |  | Disables the slider and the mute button. |
| `hideMuteButton` | `boolean` | `false` | Hide the mute toggle (the slider alone). Default false. |
| `label` | `string` | `"Volume"` | Accessible name of the slider, e.g. "Music volume". Default "Volume". |
| `levelClassName` | `string` |  | Class for the level label. |
| `muteButtonClassName` | `string` |  | Class for the mute toggle, merged last (e.g. another button style). |
| `muted` | `boolean` |  | Controlled muted state. While muted the slider keeps the stored level (turned neutral grey) unless `zeroWhenMuted` shows it at 0. Use with `onMutedChange`. |
| `muteLabel` | `string` |  | Accessible name of the mute toggle. Default `Mute ${label}`. |
| `muteToggle` | `"pressed" \| "label"` | `"pressed"` | How the toggle exposes its state: `"pressed"` (default) keeps one name with `aria-pressed`; `"label"` swaps its name between `muteLabel` and `unmuteLabel`. |
| `onMutedChange` | `(muted: boolean) => void` |  | Called when the mute button toggles the muted state. |
| `onValueChange` | `(value: number) => void` |  | Called with the new volume (0 to 100) as the slider moves. |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Slider direction. Vertical stacks the toggle, slider and level in a column. Default "horizontal". |
| `renderSlider` | `(slider: React.ReactElement) => React.ReactNode` |  | Wrap the slider, e.g. in a reveal-on-hover container or a popover. |
| `restoreOnUnmute` | `number` |  | Value to set when the toggle unmutes a level of 0 (the toggle then reads as "unmute" at 0). Default: none. |
| `showLevel` | `boolean` | `true` | Show the level ("64%", or "Muted") after the slider. Default true. |
| `size` | `Size` | `"md"` | Slider and button size. |
| `sliderClassName` | `string` |  | Class for the slider. |
| `step` | `number` | `1` | Keyboard step. Default 1. |
| `unmuteLabel` | `string` |  | Accessible name of the toggle when it unmutes (`muteToggle="label"`). Default `Unmute ${label}`. |
| `value` | `number` |  | Volume 0–100. |
| `zeroWhenMuted` | `boolean` | `false` | Show the slider at 0 while muted instead of keeping the stored level. Default false. |

## Notes

**When to use:** A volume control made of a mute toggle with a level-aware speaker icon, a `Slider` from 0 to 100 and a level label ("64%" or "Muted"). Muting keeps the level, so unmuting restores it.

**Use instead when:**
- `Slider`: any other numeric range
- `Switch`: an on or off setting
- `ToggleButton`: a pressed state with no level
- `Progress`: playback or loading position the user does not drag

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | The mute toggle, then the slider thumb |
| Enter, Space | On the toggle: mute or unmute (native button) |
| ArrowRight, ArrowUp | On the thumb: raise by `step` (default 1); moving while muted also unmutes |
| ArrowLeft, ArrowDown | Lower by `step` |
| Shift+Arrow, PageUp, PageDown | Move ten steps |
| Home, End | 0 or 100 |

The thumb follows `Slider`, so in RTL ArrowLeft raises and ArrowRight lowers; the toggle has no direction dependent keys. With `orientation="vertical"` the toggle, slider and level stack in a column.

### Screen readers

- The thumb is a `role="slider"` named by `label` (default "Volume") with `aria-valuenow` from 0 to 100 and `aria-valuetext` set to the level text: "64%", or "Muted" while muted (the value stays at the kept level).
- The toggle is a native button. By default it keeps one name, "Mute" plus the label, and reports the state with `aria-pressed`. With `muteToggle="label"` there is no `aria-pressed` and the name swaps to `unmuteLabel` ("Unmute Volume") while it would unmute. Set `muteLabel` and `unmuteLabel` to translate them.
- The visible level text is `aria-hidden` because the thumb already announces it; the speaker icon is `aria-hidden`. `hideMuteButton` removes the toggle.

### Reduced motion

The toggle colour fades and the slider's thumb ring and press scale use short transitions; the reduced-motion net ends them in 1 ms.

### Server rendering

Server render: part of it fills in after mount. The toggle, level text and slider track render on the server from `value`, `defaultValue` and `muted`. The slider thumb is `display: none` until Radix mounts and locates it, so it appears after hydration, and the direction settles after hydration on an RTL page.

### Slots

- `volume-slider`: the root; `data-muted` and `data-orientation` are set on it
- `volume-slider-level`: the level label

### Gotchas

- Muting does not change the value: the slider stays at the kept level (it turns neutral grey) unless `zeroWhenMuted` shows it at 0. Moving the slider while muted unmutes and sets the value.
- At a level of 0 the icon is muted but `muted` is false. With `restoreOnUnmute={30}` the toggle then reads as "unmute" and sets 30 on press.
- `value` is a number from 0 to 100, rounded and clamped; `onValueChange` receives a number and `onMutedChange` a boolean. `muted` and `value` are controlled independently.
- `renderSlider` wraps the slider element (for a reveal-on-hover container or a popover); `disabled` disables both the toggle and the slider. `dir` is not accepted: the direction comes from the page.

## Example

```tsx
import * as React from "react";
import { VolumeSlider } from "@sutra/ui";

export function Example() {
  const [volume, setVolume] = React.useState(60);
  const [muted, setMuted] = React.useState(false);
  return (
    <VolumeSlider
      label="Music volume"
      value={volume}
      onValueChange={setVolume}
      muted={muted}
      onMutedChange={setMuted}
      restoreOnUnmute={30}
    />
  );
}
```
