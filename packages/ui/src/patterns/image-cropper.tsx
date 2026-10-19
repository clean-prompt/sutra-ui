import * as React from "react";
import { RiAnticlockwise2Line, RiClockwise2Line, RiImageLine, RiZoomInLine, RiZoomOutLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import {
  CROP_HANDLES,
  applyAspect,
  centerCrop,
  clampCrop,
  cropEquals,
  getCropOutputSize,
  moveCrop,
  normalizeAspect,
  normalizeRotation,
  resizeCrop,
  rotateCrop,
  rotatedSize,
  roundCrop,
  type CropHandle,
  type CropOutputOptions,
  type CropRect,
  type CropRotation,
  type CropSize,
} from "../lib/crop";
import { clamp } from "../lib/math";
import { useControllableState } from "../hooks/use-controllable-state";
import { useElementSize } from "../hooks/use-resize-observer";
import { useIsoLayoutEffect } from "../hooks/use-iso-layout-effect";
import { useSafeId } from "../hooks/use-safe-id";
import { useAsyncAction } from "../hooks/use-async-action";
import { Button } from "../primitives/button";
import { SegmentedControl } from "../primitives/segmented-control";
import { Slider } from "../primitives/slider";
import { Spinner } from "../primitives/spinner";
import { InlineAlert } from "../primitives/inline-alert";

/* ------------------------------------------------------------------ */
/* Canvas output                                                       */
/* ------------------------------------------------------------------ */

export interface CropToCanvasOptions extends CropOutputOptions {
  /** Clockwise rotation applied before cropping (quarter turns). The crop is in the rotated image's pixels. */
  rotation?: number;
  /** Natural size of `image`; read from it when omitted. */
  naturalSize?: CropSize;
}

export interface CropToBlobOptions extends CropToCanvasOptions {
  /** Output MIME type. Default `image/png`. */
  type?: string;
  /** Encoder quality 0–1 for lossy types. */
  quality?: number;
}

type CropImageSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap | HTMLVideoElement;

function naturalSizeOf(image: CropImageSource): CropSize {
  if (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement)
    return { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
  if (typeof HTMLVideoElement !== "undefined" && image instanceof HTMLVideoElement)
    return { width: image.videoWidth, height: image.videoHeight };
  return { width: (image as HTMLCanvasElement).width, height: (image as HTMLCanvasElement).height };
}

/**
 * Draws `crop` (natural pixels of the image rotated by `rotation`) onto a new canvas.
 * Returns `null` without a 2D context. Cross-origin images need CORS (`crossOrigin`) or the canvas is tainted.
 */
export function cropToCanvas(image: CropImageSource, crop: CropRect, options: CropToCanvasOptions = {}): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const natural = options.naturalSize ?? naturalSizeOf(image);
  const rotation = normalizeRotation(options.rotation ?? 0);
  const bounds = rotatedSize(natural, rotation);
  const rect = clampCrop(crop, bounds);
  const out = getCropOutputSize(rect, options);
  const canvas = document.createElement("canvas");
  canvas.width = out.width;
  canvas.height = out.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(out.scaleX, out.scaleY);
  ctx.translate(-rect.x, -rect.y);
  ctx.translate(bounds.width / 2, bounds.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(image, -natural.width / 2, -natural.height / 2, natural.width, natural.height);
  return canvas;
}

/** `cropToCanvas`, encoded as a Blob (`null` if the canvas could not be drawn or encoded). */
export function cropToBlob(image: CropImageSource, crop: CropRect, options: CropToBlobOptions = {}): Promise<Blob | null> {
  const canvas = cropToCanvas(image, crop, options);
  if (!canvas || typeof canvas.toBlob !== "function") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), options.type ?? "image/png", options.quality);
    } catch {
      resolve(null);
    }
  });
}

/* ------------------------------------------------------------------ */
/* ImageCropper                                                        */
/* ------------------------------------------------------------------ */

export interface ImageCropperAspectOption {
  /** Width ÷ height, or `null` for free. */
  value: number | null;
  label: React.ReactNode;
  /** Required when `label` is not text. */
  "aria-label"?: string;
}

/** Free, 1:1, 4:3 and 16:9. */
export const imageCropperAspectOptions: ImageCropperAspectOption[] = [
  { value: null, label: "Free" },
  { value: 1, label: "1:1" },
  { value: 4 / 3, label: "4:3" },
  { value: 16 / 9, label: "16:9" },
];

export interface ImageCropperHandle {
  /** The cropped image as a canvas (`null` before the image loads). */
  getCroppedCanvas: (options?: CropToCanvasOptions) => HTMLCanvasElement | null;
  /** The cropped image as a Blob; options default to the `output` prop. */
  getCroppedBlob: (options?: CropToBlobOptions) => Promise<Blob | null>;
  /** Rotates by `delta` degrees (quarter turns), carrying the crop along. */
  rotate: (delta: number) => void;
  /** Back to the centred default crop, no rotation and no zoom. */
  reset: () => void;
}

export interface ImageCropperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onError" | "onLoad"> {
  /** URL of the image to crop. */
  src: string;
  /** Alternative text for the image. Default "Image to crop". */
  alt?: string;
  /** `crossOrigin` of the loaded image; cross-origin images need CORS (`"anonymous"`) or the exported canvas is tainted. */
  crossOrigin?: React.ImgHTMLAttributes<HTMLImageElement>["crossOrigin"];
  /** Crop in natural pixels of the image after `rotation`. */
  crop?: CropRect | null;
  /** Initial crop in natural pixels when uncontrolled. */
  defaultCrop?: CropRect | null;
  /** Called with the crop on every change while dragging or stepping. */
  onCropChange?: (crop: CropRect) => void;
  /** Fires when a drag ends or after a keyboard step, with the final crop. */
  onCropEnd?: (crop: CropRect) => void;
  /** Width ÷ height to lock to, or `null` for free. */
  aspect?: number | null;
  /**
   * Initial aspect ratio when uncontrolled (`null` is free).
   * @default null
   */
  defaultAspect?: number | null;
  /** Called with the new aspect ratio (or `null` for free) when the user picks a preset. */
  onAspectChange?: (aspect: number | null) => void;
  /** Aspect presets, shown as a segmented control (see `imageCropperAspectOptions`). */
  aspectOptions?: ImageCropperAspectOption[];
  /** Clockwise rotation in degrees (snapped to 0, 90, 180, 270). */
  rotation?: number;
  /**
   * Initial rotation in degrees when uncontrolled.
   * @default 0
   */
  defaultRotation?: number;
  /** Called with the new rotation (0, 90, 180 or 270) when the user rotates the image. */
  onRotationChange?: (rotation: CropRotation) => void;
  /** Show the rotate left/right buttons. Default true. */
  rotatable?: boolean;
  /** Controlled zoom factor (1 shows the whole image). Use with `onZoomChange`. */
  zoom?: number;
  /**
   * Initial zoom factor when uncontrolled.
   * @default 1
   */
  defaultZoom?: number;
  /** Called with the new zoom factor when it changes. */
  onZoomChange?: (zoom: number) => void;
  /** Show a zoom slider. Default false. */
  zoomable?: boolean;
  /**
   * Smallest zoom factor.
   * @default 1
   */
  minZoom?: number;
  /**
   * Largest zoom factor.
   * @default 3
   */
  maxZoom?: number;
  /** Smallest crop in natural pixels. Default 16. */
  minWidth?: number;
  /** Smallest crop in natural pixels. Default 16. */
  minHeight?: number;
  /** Arrow-key step in natural pixels (Shift multiplies by 10). Default 1. */
  keyboardStep?: number;
  /** Shows an Apply button that encodes the crop and calls this. */
  onComplete?: (blob: Blob, crop: CropRect) => void | Promise<void>;
  /**
   * Text of the Apply button.
   * @default "Apply"
   */
  applyLabel?: string;
  /** Output settings for Apply and `getCroppedBlob`. */
  output?: CropToBlobOptions;
  /** Show the loading state even after the image has loaded (e.g. while the source is prepared). */
  loading?: boolean;
  /** Replaces the default "could not be loaded" message. */
  errorState?: React.ReactNode;
  /** Called with the natural size of the image once it has loaded. */
  onImageLoad?: (size: CropSize) => void;
  /** Called when the image fails to load. */
  onImageError?: () => void;
  /** Extra controls at the end of the toolbar. */
  toolbar?: React.ReactNode;
  /** Classes for the image area (default height `h-80`). */
  stageClassName?: string;
  /** Imperative handle (`getCroppedBlob`, `rotate`, …). `ref` is the root element. */
  cropperRef?: React.Ref<ImageCropperHandle | null>;
}

const HANDLE_NAMES: Record<CropHandle, string> = {
  nw: "top-left",
  n: "top",
  ne: "top-right",
  e: "right",
  se: "bottom-right",
  s: "bottom",
  sw: "bottom-left",
  w: "left",
};

const HANDLE_POSITION: Record<CropHandle, string> = {
  nw: "start-0 top-0 cursor-nwse-resize",
  n: "start-1/2 top-0 cursor-ns-resize",
  ne: "start-full top-0 cursor-nesw-resize",
  e: "start-full top-1/2 cursor-ew-resize",
  se: "start-full top-full cursor-nwse-resize",
  s: "start-1/2 top-full cursor-ns-resize",
  sw: "start-0 top-full cursor-nesw-resize",
  w: "start-0 top-1/2 cursor-ew-resize",
};

/** Stage padding so handles on the image edge stay visible and grabbable. */
const PAD = 16;

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

type DragMode = "move" | CropHandle;

interface DragState {
  pointerId: number;
  mode: DragMode;
  startX: number;
  startY: number;
  start: CropRect;
  scaleX: number;
  scaleY: number;
}

interface ImageState {
  src: string;
  natural: CropSize | null;
  failed: boolean;
}

const pct = (n: number, of: number) => `${of > 0 ? (n / of) * 100 : 0}%`;

/** Image crop box: drag to move, eight handles to resize, aspect presets, quarter-turn rotation and optional zoom. */
export const ImageCropper = React.forwardRef<HTMLDivElement, ImageCropperProps>(
  (
    {
      src,
      alt = "Image to crop",
      crossOrigin,
      crop: cropProp,
      defaultCrop = null,
      onCropChange,
      onCropEnd,
      aspect: aspectProp,
      defaultAspect = null,
      onAspectChange,
      aspectOptions,
      rotation: rotationProp,
      defaultRotation = 0,
      onRotationChange,
      rotatable = true,
      zoom: zoomProp,
      defaultZoom = 1,
      onZoomChange,
      zoomable = false,
      minZoom = 1,
      maxZoom = 3,
      minWidth = 16,
      minHeight = 16,
      keyboardStep = 1,
      onComplete,
      applyLabel = "Apply",
      output,
      loading = false,
      errorState,
      onImageLoad,
      onImageError,
      toolbar,
      stageClassName,
      cropperRef,
      className,
      ...props
    },
    ref
  ) => {
    const [crop, setCropState] = useControllableState<CropRect | null>({
      value: cropProp,
      defaultValue: defaultCrop,
      onChange: (next) => {
        if (next) onCropChange?.(next);
      },
    });
    const [aspectRaw, setAspect] = useControllableState<number | null>({
      value: aspectProp,
      defaultValue: defaultAspect,
      onChange: onAspectChange,
    });
    const aspect = normalizeAspect(aspectRaw);
    const [rotationRaw, setRotationState] = useControllableState<number>({
      value: rotationProp,
      defaultValue: defaultRotation,
      onChange: (next) => onRotationChange?.(normalizeRotation(next)),
    });
    const rotation = normalizeRotation(rotationRaw);
    const [zoomRaw, setZoom] = useControllableState<number>({
      value: zoomProp,
      defaultValue: defaultZoom,
      onChange: onZoomChange,
    });
    const zoom = clamp(zoomRaw, minZoom, maxZoom);

    const [imageState, setImageState] = React.useState<ImageState>({ src, natural: null, failed: false });
    const image = imageState.src === src ? imageState : { src, natural: null, failed: false };
    const natural = image.natural;
    const bounds = React.useMemo(() => (natural ? rotatedSize(natural, rotation) : null), [natural, rotation]);
    const constraints = React.useMemo(() => ({ aspect, minWidth, minHeight }), [aspect, minWidth, minHeight]);
    const shown = crop && bounds ? clampCrop(crop, bounds, { minWidth, minHeight }) : null;
    const ready = !!bounds && !loading;

    const stageRef = React.useRef<HTMLDivElement | null>(null);
    const frameRef = React.useRef<HTMLDivElement | null>(null);
    const imgRef = React.useRef<HTMLImageElement | null>(null);
    const dragRef = React.useRef<DragState | null>(null);
    const [dragging, setDragging] = React.useState<DragMode | null>(null);
    const [announcement, setAnnouncement] = React.useState("");
    const hintId = useSafeId("image-cropper-hint");

    const latest = React.useRef({ crop: shown, bounds, rotation, aspect });
    latest.current = { crop: shown, bounds, rotation, aspect };

    const setCrop = React.useCallback(
      (next: CropRect) => {
        const rounded = roundCrop(next);
        if (!cropEquals(rounded, latest.current.crop)) {
          latest.current.crop = rounded;
          setCropState(rounded);
        }
        return rounded;
      },
      [setCropState]
    );

    /* Image loading */
    const handleLoad = React.useCallback(
      (img: HTMLImageElement) => {
        const size = { width: img.naturalWidth, height: img.naturalHeight };
        if (!size.width || !size.height) return;
        setImageState((prev) =>
          prev.src === src && prev.natural && prev.natural.width === size.width && prev.natural.height === size.height
            ? prev
            : { src, natural: size, failed: false }
        );
        onImageLoad?.(size);
      },
      [src, onImageLoad]
    );

    useIsoLayoutEffect(() => {
      const img = imgRef.current;
      // Cached images can finish before React attaches onLoad.
      if (img && img.complete && img.naturalWidth > 0) handleLoad(img);
    }, [src]);

    /* A default crop once the image size is known. */
    const needsDefault = !crop && !!bounds;
    React.useEffect(() => {
      if (!needsDefault || !bounds) return;
      setCrop(centerCrop(bounds, aspect));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needsDefault]);

    /* Re-shape the crop when the aspect changes. */
    const prevAspect = React.useRef(aspect);
    React.useEffect(() => {
      if (prevAspect.current === aspect) return;
      prevAspect.current = aspect;
      const { crop: c, bounds: b } = latest.current;
      if (aspect !== null && c && b) setCrop(applyAspect(c, aspect, b));
    }, [aspect, setCrop]);

    /* Layout: fit the rotated image in the stage, then apply zoom. */
    const stageSize = useElementSize(stageRef);
    const fit = bounds
      ? Math.max(0, Math.min((stageSize.width - 2 * PAD) / bounds.width, (stageSize.height - 2 * PAD) / bounds.height))
      : 0;
    const frameStyle: React.CSSProperties | undefined = bounds
      ? fit > 0
        ? { width: bounds.width * fit * zoom, height: bounds.height * fit * zoom }
        : { width: "100%", aspectRatio: `${bounds.width} / ${bounds.height}` }
      : undefined;

    /* Keep the crop centred in view when zooming. */
    const prevZoom = React.useRef(zoom);
    useIsoLayoutEffect(() => {
      if (prevZoom.current === zoom) return;
      prevZoom.current = zoom;
      const stage = stageRef.current;
      const { crop: c, bounds: b } = latest.current;
      if (!stage || !c || !b || fit <= 0) return;
      const scale = fit * zoom;
      stage.scrollLeft = PAD + (c.x + c.width / 2) * scale - stage.clientWidth / 2;
      stage.scrollTop = PAD + (c.y + c.height / 2) * scale - stage.clientHeight / 2;
    }, [zoom, fit]);

    /* Actions */
    const rotate = React.useCallback(
      (delta: number) => {
        const { crop: c, bounds: b, rotation: r, aspect: a } = latest.current;
        const next = normalizeRotation(r + delta);
        if (next === r) return;
        setRotationState(next);
        if (c && b && natural) {
          let moved = rotateCrop(c, b, delta);
          if (a !== null) moved = applyAspect(moved, a, rotatedSize(natural, next));
          setCropState(roundCrop(moved));
        }
      },
      [natural, setRotationState, setCropState]
    );

    const getCroppedCanvas = React.useCallback(
      (options?: CropToCanvasOptions) => {
        const img = imgRef.current;
        const { crop: c, rotation: r } = latest.current;
        if (!img || !c || !natural) return null;
        return cropToCanvas(img, c, { ...output, rotation: r, naturalSize: natural, ...options });
      },
      [natural, output]
    );

    const getCroppedBlob = React.useCallback(
      (options?: CropToBlobOptions) => {
        const img = imgRef.current;
        const { crop: c, rotation: r } = latest.current;
        if (!img || !c || !natural) return Promise.resolve(null);
        return cropToBlob(img, c, { ...output, rotation: r, naturalSize: natural, ...options });
      },
      [natural, output]
    );

    const reset = React.useCallback(() => {
      setRotationState(0);
      setZoom(1);
      if (natural) setCropState(roundCrop(centerCrop(natural, latest.current.aspect)));
    }, [natural, setRotationState, setZoom, setCropState]);

    React.useImperativeHandle(cropperRef, () => ({ getCroppedCanvas, getCroppedBlob, rotate, reset }), [
      getCroppedCanvas,
      getCroppedBlob,
      rotate,
      reset,
    ]);

    const apply = useAsyncAction(async () => {
      const c = latest.current.crop;
      const blob = await getCroppedBlob();
      if (!blob || !c) throw new Error("The crop could not be exported.");
      await onComplete?.(blob, c);
    });

    /* Pointer */
    const startDrag = (event: React.PointerEvent<HTMLElement>, mode: DragMode) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.stopPropagation();
      const frame = frameRef.current;
      if (!frame || !shown || !bounds) return;
      const rect = frame.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      dragRef.current = {
        pointerId: event.pointerId,
        mode,
        startX: event.clientX,
        startY: event.clientY,
        start: shown,
        scaleX: bounds.width / rect.width,
        scaleY: bounds.height / rect.height,
      };
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        /* best effort */
      }
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
      setDragging(mode);
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const b = latest.current.bounds;
      if (!drag || drag.pointerId !== event.pointerId || !b) return;
      const dx = (event.clientX - drag.startX) * drag.scaleX;
      const dy = (event.clientY - drag.startY) * drag.scaleY;
      setCrop(drag.mode === "move" ? moveCrop(drag.start, dx, dy, b) : resizeCrop(drag.start, drag.mode, dx, dy, b, constraints));
    };

    const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDragging(null);
      const c = latest.current.crop;
      if (c && !cropEquals(c, drag.start)) onCropEnd?.(c);
    };

    /* Keyboard */
    const keyStep = (event: React.KeyboardEvent<HTMLElement>, handle?: CropHandle) => {
      const dir = ARROWS[event.key];
      const b = latest.current.bounds;
      const c = latest.current.crop;
      if (!dir || !b || !c) return;
      event.preventDefault();
      event.stopPropagation();
      const step = Math.max(1, keyboardStep) * (event.shiftKey ? 10 : 1);
      const [dx, dy] = [dir[0] * step, dir[1] * step];
      let next: CropRect;
      if (handle) next = resizeCrop(c, handle, dx, dy, b, constraints);
      else if (event.altKey) next = resizeCrop(c, dx !== 0 ? "e" : "s", dx, dy, b, constraints);
      else next = moveCrop(c, dx, dy, b);
      const applied = setCrop(next);
      setAnnouncement(`${applied.width} × ${applied.height} at ${applied.x}, ${applied.y}`);
      if (!cropEquals(applied, c)) onCropEnd?.(applied);
    };

    const aspectIndex = aspectOptions
      ? aspectOptions.findIndex((o) => {
          const v = normalizeAspect(o.value);
          return v === null ? aspect === null : aspect !== null && Math.abs(v - aspect) < 1e-6;
        })
      : -1;
    const showToolbar = !!aspectOptions?.length || rotatable || zoomable || !!onComplete || toolbar != null;
    const busy = loading || (!natural && !image.failed);

    return (
      <div
        ref={ref}
        data-slot="image-cropper"
        aria-busy={busy || undefined}
        className={cn("flex w-full flex-col gap-3", className)}
        dir="ltr"
        {...props}
      >
        <div
          ref={stageRef}
          data-slot="image-cropper-stage"
          className={cn("relative h-80 overflow-auto rounded-box border border-border bg-muted scrollbar-thin", stageClassName)}
        >
          <div className="flex min-h-full w-max min-w-full items-center justify-center" style={{ padding: PAD }}>
            <div
              ref={frameRef}
              data-slot="image-cropper-frame"
              className={cn("relative shrink-0 touch-none select-none", !bounds && "size-0 overflow-hidden")}
              style={frameStyle}
            >
              <img
                ref={imgRef}
                key={src}
                src={src}
                alt={alt}
                crossOrigin={crossOrigin}
                draggable={false}
                onLoad={(e) => handleLoad(e.currentTarget)}
                onError={() => {
                  setImageState({ src, natural: null, failed: true });
                  onImageError?.();
                }}
                className={cn("pointer-events-none absolute start-1/2 top-1/2 max-w-none select-none", !ready && "invisible")}
                style={
                  natural && bounds
                    ? {
                        width: pct(natural.width, bounds.width),
                        height: pct(natural.height, bounds.height),
                        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                      }
                    : undefined
                }
              />
              {ready && shown && bounds && (
                <>
                  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div
                      className="absolute shadow-[0_0_0_9999px_var(--color-overlay)]"
                      style={{
                        left: pct(shown.x, bounds.width),
                        top: pct(shown.y, bounds.height),
                        width: pct(shown.width, bounds.width),
                        height: pct(shown.height, bounds.height),
                      }}
                    />
                  </div>
                  <div
                    role="group"
                    aria-roledescription="crop box"
                    aria-label="Crop area"
                    aria-describedby={hintId}
                    tabIndex={0}
                    data-slot="image-cropper-box"
                    data-dragging={dragging ?? undefined}
                    className={cn(
                      "absolute touch-none outline outline-1 outline-white/90 shadow-[0_0_0_1px_rgb(0_0_0/0.35)]",
                      dragging === "move" ? "cursor-grabbing" : "cursor-move",
                      focusRing
                    )}
                    style={{
                      left: pct(shown.x, bounds.width),
                      top: pct(shown.y, bounds.height),
                      width: pct(shown.width, bounds.width),
                      height: pct(shown.height, bounds.height),
                    }}
                    onPointerDown={(e) => startDrag(e, "move")}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onLostPointerCapture={endDrag}
                    onKeyDown={(e) => keyStep(e)}
                  >
                    <div
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute inset-0 transition-opacity",
                        "bg-[linear-gradient(to_right,transparent_33.2%,rgb(255_255_255/0.4)_33.2%,rgb(255_255_255/0.4)_33.5%,transparent_33.5%,transparent_66.5%,rgb(255_255_255/0.4)_66.5%,rgb(255_255_255/0.4)_66.8%,transparent_66.8%),linear-gradient(to_bottom,transparent_33.2%,rgb(255_255_255/0.4)_33.2%,rgb(255_255_255/0.4)_33.5%,transparent_33.5%,transparent_66.5%,rgb(255_255_255/0.4)_66.5%,rgb(255_255_255/0.4)_66.8%,transparent_66.8%)]",
                        dragging ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {CROP_HANDLES.map((handle) => {
                      const corner = handle.length === 2;
                      return (
                        <button
                          key={handle}
                          type="button"
                          aria-label={`Resize from ${HANDLE_NAMES[handle]}`}
                          data-handle={handle}
                          className={cn(
                            "absolute z-10 flex size-6 -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-xs",
                            HANDLE_POSITION[handle],
                            focusRing
                          )}
                          onPointerDown={(e) => startDrag(e, handle)}
                          onKeyDown={(e) => keyStep(e, handle)}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "block rounded-full bg-white shadow-sm ring-1 ring-black/25",
                              corner ? "size-3" : handle === "n" || handle === "s" ? "h-1.5 w-5" : "h-5 w-1.5"
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
          {busy && !image.failed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner size="lg" label="Loading image" />
            </div>
          )}
          {image.failed && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              {errorState ?? (
                <InlineAlert tone="destructive" icon={<RiImageLine />} className="max-w-sm">
                  The image could not be loaded.
                </InlineAlert>
              )}
            </div>
          )}
        </div>
        <span id={hintId} className="sr-only">
          Arrow keys move the crop, Alt or Option plus arrow keys resize it. Hold Shift for bigger steps.
        </span>
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
        {showToolbar && (
          <div data-slot="image-cropper-toolbar" className="flex flex-wrap items-center gap-2">
            {aspectOptions && aspectOptions.length > 0 && (
              <SegmentedControl
                size="sm"
                aria-label="Aspect ratio"
                disabled={!ready}
                value={aspectIndex >= 0 ? String(aspectIndex) : ""}
                onValueChange={(v) => {
                  const option = aspectOptions[Number(v)];
                  if (option) setAspect(normalizeAspect(option.value));
                }}
                options={aspectOptions.map((o, i) => ({ value: String(i), label: o.label, "aria-label": o["aria-label"] }))}
              />
            )}
            {rotatable && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Rotate left"
                  disabled={!ready}
                  onClick={() => rotate(-90)}
                >
                  <RiAnticlockwise2Line aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Rotate right"
                  disabled={!ready}
                  onClick={() => rotate(90)}
                >
                  <RiClockwise2Line aria-hidden />
                </Button>
              </div>
            )}
            {zoomable && (
              <div className="flex min-w-36 flex-1 items-center gap-2 text-muted-foreground sm:max-w-56">
                <RiZoomOutLine aria-hidden className="size-4 shrink-0" />
                <Slider
                  size="sm"
                  min={minZoom}
                  max={maxZoom}
                  step={0.01}
                  value={[zoom]}
                  disabled={!ready}
                  thumbLabels={["Zoom"]}
                  getValueText={(v) => `${Math.round(v * 100)}%`}
                  onValueChange={(v) => setZoom(clamp(v[0] ?? 1, minZoom, maxZoom))}
                />
                <RiZoomInLine aria-hidden className="size-4 shrink-0" />
              </div>
            )}
            {toolbar}
            {onComplete && (
              <Button
                type="button"
                size="sm"
                className="ms-auto"
                disabled={!ready || !shown}
                loading={apply.busy}
                onClick={() => void apply.run()}
              >
                {applyLabel}
              </Button>
            )}
          </div>
        )}
        {apply.error && (
          <InlineAlert tone="destructive" onDismiss={() => apply.setError(null)}>
            {apply.error}
          </InlineAlert>
        )}
      </div>
    );
  }
);
ImageCropper.displayName = "ImageCropper";
