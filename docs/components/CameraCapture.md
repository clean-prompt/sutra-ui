# CameraCapture

> Camera photo and video capture with a mirrored preview, countdown, timed prompts, review, and permission states.

- Import: `import { CameraCapture } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/media`)
- Source: `packages/ui/src/patterns/camera-capture` (patterns)
- `data-slot`: `camera-capture`, `camera-capture-viewport`, `camera-capture-review`, `camera-capture-timer`, `camera-capture-prompt`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onCapture` (required) | `(blob: Blob, meta: CameraCaptureMeta) => void \| Promise<unknown>` |  | Called with the capture when the user chooses "Use" (or right away with `review={false}`). Return a promise to show progress; a rejection is shown as an error. |
| `audio` | `boolean` | `false` | Record audio with video. Default false. |
| `constraints` | `MediaTrackConstraints` |  | Extra video constraints (resolution, frame rate …). |
| `countdown` | `number` | `0` | Seconds of countdown before recording starts. Default 0. |
| `deviceId` | `string` |  | A specific camera; takes precedence over `facingMode`. |
| `facingMode` | `CameraFacingMode` | `"user"` | Camera to open. Default `"user"` (front). |
| `hint` | `React.ReactNode` |  | Instruction under the viewport. |
| `loading` | `boolean` | `false` | Not ready yet (e.g. fetching the prompts): shows the loading viewport and keeps the camera off. |
| `maxDuration` | `number` |  | Stop recording after this many seconds. |
| `mirror` | `boolean` |  | Mirror the live preview. Default: on for the front camera. |
| `mode` | `CameraCaptureMode` | `"photo"` | Take a photo or record a video. Default `"photo"`. |
| `onError` | `(error: unknown) => void` |  | Camera and capture errors (raw). |
| `photoQuality` | `number` | `0.92` | Photo quality 0–1 for lossy types. Default 0.92. |
| `photoType` | `string` | `"image/jpeg"` | Photo MIME type. Default `"image/jpeg"`. |
| `promptInterval` | `number` | `3` | Seconds per prompt when a prompt has no `duration`. Default 3. |
| `prompts` | `ReadonlyArray<string \| CameraCapturePrompt>` |  | Instructions shown one after another while recording. |
| `review` | `boolean` | `true` | Show the capture with Retake and Use before calling `onCapture`. Default true. |
| `stopAfterPrompts` | `boolean` | `true` | Stop recording when the last prompt has run its time. Default true. |
| `videoBitsPerSecond` | `number` |  | Target bitrate of recorded video in bits per second; the browser picks a default when omitted. |
| `videoTypes` | `readonly string[]` | `CAMERA_VIDEO_TYPES` | Recorder MIME types in order of preference; the first supported one is used. |
| `viewportClassName` | `string` |  | Classes for the camera viewport. |

## Example (live: `#/components/files/camera-capture` in the playground)

```tsx
import { Button } from "@cleanprompt/sutra-ui/core";
import { CameraCapture } from "@cleanprompt/sutra-ui/media";

<div className="@container w-full">
  <div className="grid grid-cols-1 w-full gap-4 @2xl:grid-cols-2">
    <CameraCapture mode="photo" onCapture={(blob) => setCaptured(URL.createObjectURL(blob))} />
    <CameraCapture mode="video" maxDuration={10} countdown={3} prompts={["Look at the camera", "Turn your head left", "Turn your head right"]} onCapture={() => undefined} />
  </div>
</div>
{captured ? (
  <div className="mt-3 flex items-center gap-3">
    <img src={captured} alt="Captured" className="h-24 rounded-box border border-border" />
    <Button size="sm" variant="ghost" onClick={() => setCaptured(null)}>
      Clear
    </Button>
  </div>
) : null}
```
