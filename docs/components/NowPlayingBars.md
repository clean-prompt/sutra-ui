# NowPlayingBars

> Three-bar equalizer marking the playing row; static when paused and under reduced motion.

- Import: `import { NowPlayingBars } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/media-controls` (kit `media`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string \| null` |  | Accessible label; defaults to "Now playing" / "Paused". Pass `null` to hide from assistive tech. |
| `playing` | `boolean` | `true` | Animate (sounding) or hold still (current but paused). Default true. |
| `size` | `"sm" \| "md" \| "lg"` | `"sm"` | Size of the animated bars. Default "sm". |

## Example (live: `#/components/media-player/media-controls` in the playground)

```tsx
import * as React from "react";
import {
  NowPlayingBars,
  PlayPauseButton,
  PlaybackRateMenu,
  RepeatButton,
  SeekBar,
  ShuffleButton,
  SkipButton,
  TrackCycleChip,
  VolumeControl,
} from "@sutra/ui/media";

function ControlsDemo() {
  const [time, setTime] = React.useState(65);
  const [volume, setVolume] = React.useState(0.7);
  const [muted, setMuted] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [rate, setRate] = React.useState(1);
  const [sub, setSub] = React.useState<string | null>(null);
  const [audioLang, setAudioLang] = React.useState<string | null>("en");
  const [repeat, setRepeat] = React.useState<RepeatMode>("off");
  const langs = [
    { id: "en", label: "English", language: "en" },
    { id: "es", label: "Spanish", language: "es" },
    { id: "fr", label: "French", language: "fr" },
    { id: "de", label: "German", language: "de" },
  ];
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="space-y-2">
        {/* SeekBar: buffered layer, chapters, hover preview, click the total to toggle remaining */}
        <SeekBar
          value={time}
          duration={200}
          buffered={[{ start: 0, end: 130 }]}
          onSeek={setTime}
          chapters={[{ start: 0, title: "Intro" }, { start: 50, title: "Verse" }, { start: 120, title: "Chorus" }]}
        />
        <SeekBar value={time} duration={200} onSeek={setTime} showTimes="below" size="sm" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <PlayPauseButton playing={playing} onClick={() => setPlaying((p) => !p)} />
        <PlayPauseButton playing={playing} onClick={() => setPlaying((p) => !p)} variant="primary" size="lg" />
        <SkipButton direction="back" onSkip={(d) => setTime((t) => Math.max(0, t + d))} />
        <SkipButton direction="forward" onSkip={(d) => setTime((t) => Math.min(200, t + d))} />
        <SkipButton direction="forward" seconds={30} onSkip={(d) => setTime((t) => Math.min(200, t + d))} />
        <ShuffleButton />
        <RepeatButton value={repeat} onValueChange={setRepeat} />
        <span className="text-xs text-muted-foreground">repeat: {repeat}</span>
        <NowPlayingBars playing={playing} size="md" />
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <VolumeControl volume={volume} muted={muted} onVolumeChange={setVolume} onMutedChange={setMuted} />
        <VolumeControl volume={volume} muted={muted} onVolumeChange={setVolume} onMutedChange={setMuted} expand="always" />
        <VolumeControl volume={volume} muted={muted} onVolumeChange={setVolume} onMutedChange={setMuted} orientation="vertical" />
        <PlaybackRateMenu rate={rate} onRateChange={setRate} />
        <TrackCycleChip kind="subtitles" tracks={langs.slice(0, 2)} value={sub} onValueChange={setSub} />
        <TrackCycleChip kind="audio" tracks={langs} value={audioLang} onValueChange={setAudioLang} mode="menu" />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-box bg-black p-3">
        <PlayPauseButton playing={playing} onClick={() => setPlaying((p) => !p)} variant="overlay-ghost" />
        <SkipButton tone="overlay" direction="back" />
        <SkipButton tone="overlay" />
        <VolumeControl tone="overlay" volume={volume} muted={muted} onVolumeChange={setVolume} onMutedChange={setMuted} />
        <div className="flex-1" />
        <TrackCycleChip tone="overlay" kind="subtitles" tracks={langs.slice(0, 2)} value={sub} onValueChange={setSub} />
        <PlaybackRateMenu tone="overlay" rate={rate} onRateChange={setRate} />
      </div>
    </div>
  );
}
```
