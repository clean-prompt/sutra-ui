# ImageCropper

> Image crop box: drag to move, eight handles to resize, aspect presets, quarter-turn rotation and optional zoom.

- Import: `import { ImageCropper } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/media`)
- Source: `packages/ui/src/patterns/image-cropper` (patterns)
- `data-slot`: `image-cropper`, `image-cropper-stage`, `image-cropper-frame`, `image-cropper-box`, `image-cropper-toolbar`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` (required) | `string` |  | URL of the image to crop. |
| `alt` | `string` | `"Image to crop"` | Alternative text for the image. Default "Image to crop". |
| `applyLabel` | `string` | `"Apply"` | Text of the Apply button. |
| `aspect` | `number \| null` |  | Width ÷ height to lock to, or `null` for free. |
| `aspectOptions` | `ImageCropperAspectOption[]` |  | Aspect presets, shown as a segmented control (see `imageCropperAspectOptions`). |
| `crop` | `CropRect \| null` |  | Crop in natural pixels of the image after `rotation`. |
| `cropperRef` | `React.Ref<ImageCropperHandle \| null>` |  | Imperative handle (`getCroppedBlob`, `rotate`, …). `ref` is the root element. |
| `crossOrigin` | `React.ImgHTMLAttributes<HTMLImageElement>["crossOrigin"]` |  | `crossOrigin` of the loaded image; cross-origin images need CORS (`"anonymous"`) or the exported canvas is tainted. |
| `defaultAspect` | `number \| null` | `null` | Initial aspect ratio when uncontrolled (`null` is free). |
| `defaultCrop` | `CropRect \| null` | `null` | Initial crop in natural pixels when uncontrolled. |
| `defaultRotation` | `number` | `0` | Initial rotation in degrees when uncontrolled. |
| `defaultZoom` | `number` | `1` | Initial zoom factor when uncontrolled. |
| `errorState` | `React.ReactNode` |  | Replaces the default "could not be loaded" message. |
| `keyboardStep` | `number` | `1` | Arrow-key step in natural pixels (Shift multiplies by 10). Default 1. |
| `loading` | `boolean` | `false` | Show the loading state even after the image has loaded (e.g. while the source is prepared). |
| `maxZoom` | `number` | `3` | Largest zoom factor. |
| `minHeight` | `number` | `16` | Smallest crop in natural pixels. Default 16. |
| `minWidth` | `number` | `16` | Smallest crop in natural pixels. Default 16. |
| `minZoom` | `number` | `1` | Smallest zoom factor. |
| `onAspectChange` | `(aspect: number \| null) => void` |  | Called with the new aspect ratio (or `null` for free) when the user picks a preset. |
| `onComplete` | `(blob: Blob, crop: CropRect) => void \| Promise<void>` |  | Shows an Apply button that encodes the crop and calls this. |
| `onCropChange` | `(crop: CropRect) => void` |  | Called with the crop on every change while dragging or stepping. |
| `onCropEnd` | `(crop: CropRect) => void` |  | Fires when a drag ends or after a keyboard step, with the final crop. |
| `onImageError` | `() => void` |  | Called when the image fails to load. |
| `onImageLoad` | `(size: CropSize) => void` |  | Called with the natural size of the image once it has loaded. |
| `onRotationChange` | `(rotation: CropRotation) => void` |  | Called with the new rotation (0, 90, 180 or 270) when the user rotates the image. |
| `onZoomChange` | `(zoom: number) => void` |  | Called with the new zoom factor when it changes. |
| `output` | `CropToBlobOptions` |  | Output settings for Apply and `getCroppedBlob`. |
| `rotatable` | `boolean` | `true` | Show the rotate left/right buttons. Default true. |
| `rotation` | `number` |  | Clockwise rotation in degrees (snapped to 0, 90, 180, 270). |
| `stageClassName` | `string` |  | Classes for the image area (default height `h-80`). |
| `toolbar` | `React.ReactNode` |  | Extra controls at the end of the toolbar. |
| `zoom` | `number` |  | Controlled zoom factor (1 shows the whole image). Use with `onZoomChange`. |
| `zoomable` | `boolean` | `false` | Show a zoom slider. Default false. |

## Example (live: `#/components/files/image-cropper` in the playground)

```tsx
import * as React from "react";
import { ImageCropper, imageCropperAspectOptions } from "@cleanprompt/sutra-ui/media";

function CropperDemo() {
  const [result, setResult] = React.useState<string | null>(null);
  React.useEffect(() => () => (result ? URL.revokeObjectURL(result) : undefined), [result]);
  return (
    <div className="grid grid-cols-1 w-full gap-4 lg:grid-cols-[1fr_16rem]">
      <ImageCropper
        src={gradient("#615fff", "#00b8db", "Harbor at dawn")}
        aspectOptions={imageCropperAspectOptions}
        zoomable
        onComplete={(blob) => setResult(URL.createObjectURL(blob))}
      />
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Drag the box or its handles, pick an aspect, rotate, then Apply. With the box focused, arrows move it and Alt/Option + arrows resize it.</p>
        {result ? <img src={result} alt="Cropped result" className="w-full rounded-box border border-border" /> : null}
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): gradient.
