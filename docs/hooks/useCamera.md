# useCamera

> Opens a camera with getUserMedia and tracks permission and errors. Every start is guarded so a superseded or unmounted run (StrictMode, fast toggles) releases what it acquired.

- Import: `import { useCamera } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-camera`

## Signature

```ts
useCamera(options?: UseCameraOptions): UseCameraResult
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `audio` | `boolean \| MediaTrackConstraints` | `false` | Also capture audio (for recording). Default false. |
| `constraints` | `MediaTrackConstraints` |  | Extra video constraints merged into the request (resolution, frame rate …). |
| `deviceId` | `string` |  | A specific camera (`exact`); takes precedence over `facingMode`. |
| `enabled` | `boolean` | `true` | Run the camera. When false the stream is released and the status is `"idle"`. Default true. |
| `facingMode` | `CameraFacingMode` | `"environment"` | Camera to ask for first (`ideal`, so a device without it still opens). Default `"environment"`. |
| `onError` | `(error: unknown) => void` |  | Called with the raw error when the camera can't be opened. |
