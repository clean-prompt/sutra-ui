# CallScreen

> In-call layout: remote video, draggable mirrored self-view, timer, quality and a control bar.

- Import: `import { CallScreen } from "@sutra/ui"` (or from `@sutra/ui/social`)
- Source: `packages/ui/src/kits/social/call-overlay` (kit `social`)
- `data-slot`: `call-screen`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Remote participant name. |
| `avatarSrc` | `string` |  | Remote participant's avatar image URL, shown when there is no video. |
| `cameraOff` | `boolean` |  | Controlled camera-off state. |
| `defaultCameraOff` | `boolean` | `type === "audio"` | Initial camera-off state when `cameraOff` is not controlled. |
| `defaultMuted` | `boolean` | `false` | Initial muted state when `muted` is not controlled. |
| `defaultPipCorner` | `CallPipCorner` | `"bottom-right"` | Initial corner of the local preview when `pipCorner` is not controlled. |
| `defaultScreenSharing` | `boolean` | `false` | Initial screen-sharing state when `screenSharing` is not controlled. |
| `defaultSpeakerOn` | `boolean` | `true` | Initial speaker state when `speakerOn` is not controlled. |
| `hideScreenShare` | `boolean` |  | Hide the screen share control. |
| `local` | `React.ReactNode` |  | Local preview node. |
| `localStream` | `MediaStream \| null` |  | Local camera stream piped into the preview `<video>`; the component never creates streams. |
| `mirrorLocal` | `boolean` | `true` | Mirror the local preview. Default true. |
| `muted` | `boolean` |  | Controlled microphone-muted state. |
| `onCameraOffChange` | `(off: boolean) => void` |  | Called with the new state when the user toggles the camera. |
| `onEndCall` | `() => void` |  | Called when the user presses the end call button. |
| `onMutedChange` | `(muted: boolean) => void` |  | Called with the new state when the user toggles the microphone. |
| `onPipCornerChange` | `(corner: CallPipCorner) => void` |  | Called with the corner when the user drags the local preview to another corner. |
| `onScreenSharingChange` | `(sharing: boolean) => void` |  | Called with the new state when the user toggles screen sharing. |
| `onSpeakerOnChange` | `(on: boolean) => void` |  | Called with the new state when the user toggles the speaker. |
| `pipCorner` | `CallPipCorner` |  | Controlled corner of the local preview: `top-left`, `top-right`, `bottom-left` or `bottom-right`. |
| `quality` | `CallQuality` | `"good"` | Connection quality shown as a quality indicator in the header. |
| `remote` | `React.ReactNode` |  | Remote video as a node (e.g. your own `<video>` or a placeholder). |
| `remoteStream` | `MediaStream \| null` |  | Remote stream piped into a `<video>` (the component never creates streams). |
| `screenSharing` | `boolean` |  | Controlled screen-sharing state. |
| `speakerOn` | `boolean` |  | Controlled speaker state. |
| `startedAt` | `Date \| number` |  | Call start time; duration counts from mount when omitted. |
| `status` | `React.ReactNode` |  | Status text instead of the timer, e.g. "Connecting…". |
| `type` | `CallType` | `"video"` | `audio` or `video`; video calls show the video stage and camera controls. Default "video". |

## Example (live: `#/components/social/call-screen` in the playground)

```tsx
import * as React from "react";
import { TextLink } from "@sutra/ui/core";
import { CallScreen } from "@sutra/ui/social";

function CallScreenDemo() {
  const [ended, setEnded] = React.useState(false);
  const [startedAt] = React.useState(() => Date.now() - 83_000);
  if (ended) {
    return (
      <p className="text-sm text-muted-foreground">
        Call ended. <TextLink variant="subtle" onClick={() => setEnded(false)}>Rejoin</TextLink>
      </p>
    );
  }
  return (
    <CallScreen
      name="Ana Lima"
      startedAt={startedAt}
      quality="good"
      remote={<div className="size-full bg-[radial-gradient(circle_at_30%_30%,#a684ff,transparent_55%),radial-gradient(circle_at_70%_70%,#00d3f2,transparent_50%),linear-gradient(135deg,#1e1a4d,#052f4a)]" />}
      local={<div className="size-full bg-gradient-to-br from-amber-300 to-rose-500" />}
      onEndCall={() => setEnded(true)}
      className="aspect-video min-h-0 w-full max-w-3xl"
    />
  );
}
```
