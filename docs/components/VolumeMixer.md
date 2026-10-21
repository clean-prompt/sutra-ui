# VolumeMixer

> Sound mixer: an output card (device picker, master volume) over a table of apps with their status, a per-app `VolumeSlider` and level. Data in, events out.

- Import: `import { VolumeMixer } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/system`)
- Source: `packages/ui/src/kits/system/volume-mixer` (kit `system`)
- `data-slot`: `volume-mixer`, `volume-mixer-output`, `volume-mixer-skeleton`, `volume-mixer-apps`, `volume-mixer-skeleton-row`, `volume-mixer-playing`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `apps` (required) | `VolumeMixerApp[]` |  | Apps using audio, each with a name, volume, muted state and playing flag. |
| `accent` | `Accent` | `"pink"` | Categorical colour for the icon chip, sliders and playing indicator. Default "pink". |
| `defaultDevice` | `string` |  | Initially selected device id when `device` is not controlled. |
| `defaultMuted` | `boolean` |  | Initial master mute state when `muted` is not controlled. |
| `defaultVolume` | `number` | `100` | Initial master volume when `volume` is not controlled. |
| `device` | `string` |  | Selected device id. |
| `devices` | `AudioOutputDevice[]` | `[]` | Output devices for the picker. With one device or none, the name is shown as plain text. |
| `disabled` | `boolean` |  | Disables the master and per-app controls. |
| `emptyState` | `React.ReactNode` | `"No apps using audio"` | Shown when `apps` is empty. Default "No apps using audio". |
| `label` | `string` | `"App volumes"` | Accessible name of the apps table. Default "App volumes". |
| `loading` | `boolean` | `false` | Data is on its way. With no apps yet the card and table show placeholders; with apps the root is only marked busy. |
| `loadingRows` | `number` | `3` | Placeholder app rows while loading. Default 3. |
| `muted` | `boolean` |  | Controlled master mute state. |
| `onAppMutedChange` | `(id: string, muted: boolean) => void` |  | Called with the app id and the new state when the user mutes or unmutes an app. |
| `onAppVolumeChange` | `(id: string, volume: number) => void` |  | Called with the app id and the new volume (0 to 100) while the user moves its slider. |
| `onDeviceChange` | `(id: string) => void` |  | Called with the device id when the user picks an output device. |
| `onMutedChange` | `(muted: boolean) => void` |  | Called with the new state when the user mutes or unmutes the output. |
| `onVolumeChange` | `(volume: number) => void` |  | Called with the master volume (0 to 100) while the user moves the slider. |
| `outputLabel` | `React.ReactNode` | `"Output"` | Header title. Default "Output". |
| `volume` | `number` |  | Master output volume 0–100. |

## Example (live: `#/components/system/volume-mixer` in the playground)

```tsx
import * as React from "react";
import { VolumeMixer } from "@cleanprompt/sutra-ui/system";

function SoundDemo() {
  const [apps, setApps] = React.useState(initialApps);
  const update = (id: string, patch: Partial<VolumeMixerApp>) =>
    setApps((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  return (
    <VolumeMixer
      className="w-full"
      apps={apps}
      onAppVolumeChange={(id, volume) => update(id, { volume, muted: false })}
      onAppMutedChange={(id, muted) => update(id, { muted })}
      defaultVolume={64}
      devices={[
        { id: "speakers", name: "MacBook Pro Speakers" },
        { id: "airpods", name: "AirPods Pro" },
        { id: "display", name: "Studio Display" },
      ]}
      defaultDevice="speakers"
    />
  );
}
```

Playground helpers in this snippet (not part of the library): initialApps.
