# VideoPlayer

> Custom `<video>` player: auto-hiding gradient chrome, seek bar with previews, volume, subtitle/audio chips, speed, PiP/AirPlay/fullscreen, scoped keyboard shortcuts, autoplay-muted fallback, resume and up-next.

- Import: `import { VideoPlayer } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/video-player` (kit `media`)
- `data-slot`: `video-surface`, `video-top`, `video-controls`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `audioTrack` | `string` |  | Controlled id of the selected audio track. |
| `audioTracks` | `MediaTrackOption[]` |  | Server-side audio tracks (you reload the stream in `onAudioTrackChange`). Without this, native `audioTracks` are used. |
| `autoHideMs` | `number` | `3000` | Hide the chrome after this much inactivity while playing. Default 3000ms. |
| `autoPlay` | `boolean` | `false` | Try to start playing; falls back to muted playback and shows a "tap to unmute" pill. |
| `backLabel` | `string` | `"Back"` | Accessible name of the back button. Default "Back". |
| `chapters` | `MediaChapter[]` |  | Chapter markers drawn on the seek bar, each with a start time and title. |
| `crossOrigin` | `"anonymous" \| "use-credentials"` |  | CORS mode of the video element; needed for side-loaded WebVTT tracks from another origin. |
| `defaultAudioTrack` | `string` |  | Initial audio track when `audioTrack` is not controlled. |
| `defaultSubtitleTrack` | `string \| null` | `null` | Initial subtitle track when `subtitleTrack` is not controlled. Default none. |
| `errorMessage` | `React.ReactNode` |  | Text shown in the error overlay. Default "This video can't be played right now.". |
| `fit` | `"contain" \| "cover"` | `"contain"` | How the video fills the frame: `contain` (letterbox) or `cover` (crop). Default "contain". |
| `loop` | `boolean` |  | Restarts the video when it ends. |
| `muted` | `boolean` | `false` | Start muted. |
| `nextLabel` | `string` | `"Next episode"` | Accessible name of the next button. Default "Next episode". |
| `onAudioTrackChange` | `(id: string) => void` |  | Called with the track id when the user picks another audio track. |
| `onBack` | `() => void` |  | Shows a back button in the top bar (also fired by Escape). |
| `onEnded` | `() => void` |  | Called when playback reaches the end. |
| `onError` | `(error: { code: number; message?: string }) => void` |  | Called with the media error code and message when the video fails to load or play. |
| `onNext` | `() => void` |  | Shows a "next" button and enables the up-next countdown. |
| `onResume` | `(time: number) => void` |  | Called with the position in seconds when the user accepts the resume offer from `resumeAt`. |
| `onSubtitleTrackChange` | `(id: string \| null) => void` |  | Called with the track id (or `null`) when the user changes subtitles. |
| `poster` | `string` |  | Image shown before playback starts. |
| `rates` | `number[]` |  | Speeds offered in the playback rate menu; defaults to the built-in set. |
| `resumeAt` | `number` |  | Offer to resume from this position (seconds). Ignored under 5s. |
| `skipSeconds` | `number` | `10` | Skip button distance. Default 10s. |
| `src` | `string` |  | Address of the video file or stream. |
| `subtitle` | `React.ReactNode` |  | Line under the title, for example the episode name. |
| `subtitleTrack` | `string \| null` |  | Controlled id of the shown subtitle track; `null` for off. |
| `thumbnails` | `(time: number) => string \| null` |  | Returns a preview image URL for a time, shown in the seek bar's hover bubble. |
| `title` | `React.ReactNode` |  | Title shown in the top bar. |
| `topActions` | `React.ReactNode` |  | Extra controls in the top bar (e.g. a CastPicker). |
| `tracks` | `VideoTextTrack[]` |  | Side-loaded WebVTT tracks. Without this, the element's own text tracks are offered. |
| `upNext` | `VideoUpNext` |  | When set (with `onNext`), ending playback shows an "Up next in 5…" card. |
| `upNextCountdown` | `number` | `5` | Countdown seconds for the up-next card. Default 5. |
| `videoClassName` | `string` |  | Extra classes for the `<video>` element. |
| `videoRef` | `React.Ref<HTMLVideoElement>` |  | Ref to the underlying `<video>` element; `ref` stays on the root. |

## Example (live: `#/components/media-player/video-player` in the playground)

```tsx
import * as React from "react";
import { Button } from "@sutra/ui/core";
import { CastPicker, VideoPlayer } from "@sutra/ui/media";

function VideoPlayerDemo() {
  const [index, setIndex] = React.useState(0);
  const [broken, setBroken] = React.useState(false);
  const ep = episodes[index];
  const next = episodes[index + 1];
  const subs = React.useMemo(
    () => [
      { id: "en", label: "English", srcLang: "en", src: vttUrl([[1, 6, "The tide is coming in."], [8, 14, "Keep the light burning."], [16, 22, "Someone is out there."]]) },
      { id: "es", label: "Español", srcLang: "es", src: vttUrl([[1, 6, "La marea está subiendo."], [8, 14, "Mantén la luz encendida."], [16, 22, "Hay alguien ahí fuera."]]) },
    ],
    []
  );
  const [audioTrack, setAudioTrack] = React.useState("en");
  const thumbCache = React.useRef(new Map<number, string>());
  const thumbnails = (t: number) => {
    const bucket = Math.floor(t / 5) * 5;
    if (!thumbCache.current.has(bucket)) {
      const mm = `${Math.floor(bucket / 60)}:${String(bucket % 60).padStart(2, "0")}`;
      thumbCache.current.set(bucket, art(ep.colors[0], ep.colors[1], mm, 320, 180));
    }
    return thumbCache.current.get(bucket);
  };
  React.useEffect(() => thumbCache.current.clear(), [index]);

  return (
    <div className="flex w-full flex-col gap-3">
      <VideoPlayer
        className="aspect-[4/3] sm:aspect-video"
        key={ep.id}
        src={broken ? "data:video/mp4;base64,AAAA" : wavFor(ep.id, ep.seconds, ep.root, ep.pattern)}
        poster={art(ep.colors[0], ep.colors[1], `E${ep.n} · ${ep.title}`, 1280, 720)}
        title={ep.title}
        subtitle={`Tidewater · Season 1, Episode ${ep.n}`}
        tracks={subs}
        audioTracks={[
          { id: "en", label: "English 5.1", language: "en" },
          { id: "ja", label: "Japanese", language: "ja" },
        ]}
        audioTrack={audioTrack}
        onAudioTrackChange={setAudioTrack}
        chapters={[{ start: 0, title: "Cold open" }, { start: ep.seconds * 0.35, title: "Act one" }, { start: ep.seconds * 0.7, title: "Act two" }]}
        thumbnails={thumbnails}
        resumeAt={index === 0 ? 12 : undefined}
        onNext={next ? () => setIndex((i) => i + 1) : undefined}
        upNext={next ? { title: `E${next.n} · ${next.title}`, subtitle: "Tidewater", image: art(next.colors[0], next.colors[1], `E${next.n}`, 320, 180) } : undefined}
        onBack={index > 0 ? () => setIndex(0) : undefined}
        topActions={<CastPicker devices={castDevices} onSelect={() => {}} triggerTone="overlay" variant="popover" description={ep.title} />}
      />
      <div className="flex flex-wrap items-center gap-2">
        {/* Audio-only demo source (generated WAV) with poster, side-loaded VTT subtitles, chapters, hover thumbnails, resume offer and an up-next countdown. Click the player and try space, ←/→, ↑/↓, m, c, f. */}
        <Button size="sm" variant="secondary" onClick={() => setBroken((b) => !b)}>
          {broken ? "Restore source" : "Break source"}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setIndex(0)} disabled={index === 0}>
          Episode 1
        </Button>
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): art, castDevices, episodes, vttUrl, wavFor.
