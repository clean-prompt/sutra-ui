import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  RiCameraOffLine,
  RiCameraSwitchLine,
  RiCheckLine,
  RiCloseLine,
  RiFlashlightFill,
  RiFlashlightLine,
  RiImageLine,
  RiQrScan2Line,
} from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";

/* ------------------------------------------------------------------ */
/* Detection                                                           */
/* ------------------------------------------------------------------ */

/** Minimal shape of the native `BarcodeDetector` (also what tests inject). */
export interface QRScannerDetector {
  detect(source: CanvasImageSource | ImageBitmapSource | ImageData): Promise<Array<{ rawValue: string }>>;
}

export type QRScannerState = "requesting" | "scanning" | "denied" | "unsupported" | "error" | "done";

type FrameDecoder = (source: HTMLVideoElement | HTMLImageElement | ImageBitmap) => Promise<string | null>;

interface BarcodeDetectorCtor {
  new (options?: { formats: string[] }): QRScannerDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

async function nativeDetector(): Promise<QRScannerDetector | null> {
  const Ctor = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const formats = (await Ctor.getSupportedFormats?.()) ?? ["qr_code"];
    if (!formats.includes("qr_code")) return null;
    return new Ctor({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

function sourceSize(source: HTMLVideoElement | HTMLImageElement | ImageBitmap) {
  if (source instanceof HTMLVideoElement) return [source.videoWidth, source.videoHeight] as const;
  if (source instanceof HTMLImageElement) return [source.naturalWidth, source.naturalHeight] as const;
  return [source.width, source.height] as const;
}

/** Build a decoder: injected detector, else native BarcodeDetector, else lazily-loaded jsQR on a canvas. */
async function createDecoder(injected?: QRScannerDetector | null): Promise<FrameDecoder> {
  const detector = injected ?? (await nativeDetector());
  if (detector) {
    return async (source) => {
      const codes = await detector.detect(source);
      return codes.find((c) => c.rawValue)?.rawValue ?? null;
    };
  }
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  return async (source) => {
    const [w0, h0] = sourceSize(source);
    if (!w0 || !h0) return null;
    const scale = Math.min(1, 960 / Math.max(w0, h0));
    const w = Math.round(w0 * scale);
    const h = Math.round(h0 * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, w, h);
    const image = ctx.getImageData(0, 0, w, h);
    return jsQR(image.data, w, h, { inversionAttempts: "attemptBoth" })?.data || null;
  };
}

async function loadImage(file: File): Promise<HTMLImageElement | ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall back to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

const SCAN_KEYFRAMES = `@keyframes sutra-qr-scanline{0%{top:6%;opacity:0}12%{opacity:1}88%{opacity:1}100%{top:94%;opacity:0}}
@keyframes sutra-qr-corners{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}`;

/* ------------------------------------------------------------------ */
/* QRScanner                                                           */
/* ------------------------------------------------------------------ */

export interface QRScannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onError" | "onResult"> {
  /** Called once with the decoded text; scanning then pauses until "Scan again". */
  onResult: (text: string) => void;
  onError?: (error: unknown) => void;
  /** Inject a detector (tests, custom engines). Otherwise BarcodeDetector, else jsQR. */
  detector?: QRScannerDetector | null;
  /** Initial camera. */
  facingMode?: "environment" | "user";
  /** Decode attempts per second. */
  fps?: number;
  /** Instruction under the viewfinder. */
  hint?: React.ReactNode;
  /** Offer "Upload image instead". Default true. */
  allowUpload?: boolean;
  /** Pause the camera and decoding. */
  paused?: boolean;
  viewportClassName?: string;
}

/** Camera QR scanner with a viewfinder, torch and camera switch, permission states and image upload fallback. */
export const QRScanner = React.forwardRef<HTMLDivElement, QRScannerProps>(
  (
    {
      onResult,
      onError,
      detector,
      facingMode: initialFacing = "environment",
      fps = 8,
      hint = "Point your camera at a QR code",
      allowUpload = true,
      paused = false,
      className,
      viewportClassName,
      ...props
    },
    ref
  ) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const fileRef = React.useRef<HTMLInputElement>(null);
    const streamRef = React.useRef<MediaStream | null>(null);
    const decoderRef = React.useRef<Promise<FrameDecoder> | null>(null);
    const doneRef = React.useRef(false);
    const [state, setState] = React.useState<QRScannerState>("requesting");
    const [facing, setFacing] = React.useState(initialFacing);
    const [attempt, setAttempt] = React.useState(0);
    const [torchSupported, setTorchSupported] = React.useState(false);
    const [torchOn, setTorchOn] = React.useState(false);
    const [canSwitch, setCanSwitch] = React.useState(false);
    const [message, setMessage] = React.useState<string | null>(null);
    const [lastResult, setLastResult] = React.useState<string | null>(null);

    const onResultRef = React.useRef(onResult);
    onResultRef.current = onResult;
    const onErrorRef = React.useRef(onError);
    onErrorRef.current = onError;

    const getDecoder = React.useCallback(() => {
      decoderRef.current ??= createDecoder(detector);
      return decoderRef.current;
    }, [detector]);
    React.useEffect(() => {
      decoderRef.current = null;
    }, [detector]);

    const stopStream = React.useCallback(() => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }, []);

    const deliver = React.useCallback(
      (text: string) => {
        if (doneRef.current) return;
        doneRef.current = true;
        setLastResult(text);
        setState("done");
        videoRef.current?.pause?.();
        stopStream();
        onResultRef.current(text);
      },
      [stopStream]
    );

    // Camera lifecycle.
    React.useEffect(() => {
      if (paused || doneRef.current) return;
      let alive = true;
      const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
      if (!media?.getUserMedia) {
        setState("unsupported");
        return;
      }
      setState("requesting");
      setMessage(null);
      (async () => {
        try {
          const stream = await media.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          });
          if (!alive) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          const track = stream.getVideoTracks()[0];
          const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
          setTorchSupported(Boolean(caps.torch));
          setTorchOn(false);
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            try {
              await video.play?.();
            } catch {
              /* autoplay may need a gesture; the muted inline video usually plays */
            }
          }
          if (!alive) return;
          setState("scanning");
          const devices = await media.enumerateDevices?.().catch(() => []);
          if (alive) setCanSwitch((devices ?? []).filter((d) => d.kind === "videoinput").length > 1);
        } catch (err) {
          if (!alive) return;
          const name = (err as { name?: string })?.name;
          if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
            setState("denied");
          } else if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") {
            setState("unsupported");
            setMessage("No camera was found on this device.");
          } else {
            setState("error");
            setMessage((err as Error)?.message || "The camera could not be started.");
          }
          onErrorRef.current?.(err);
        }
      })();
      return () => {
        alive = false;
        stopStream();
      };
    }, [facing, attempt, paused, stopStream]);

    // Decode loop (throttled).
    React.useEffect(() => {
      if (state !== "scanning" || paused) return;
      let alive = true;
      let timer: ReturnType<typeof setTimeout>;
      const interval = Math.max(50, 1000 / Math.max(1, fps));
      const tick = async () => {
        const video = videoRef.current;
        if (!alive || doneRef.current) return;
        if (video && video.readyState >= 2) {
          try {
            const decode = await getDecoder();
            const text = alive ? await decode(video) : null;
            if (text && alive) {
              deliver(text);
              return;
            }
          } catch (err) {
            onErrorRef.current?.(err);
          }
        }
        if (alive) timer = setTimeout(tick, interval);
      };
      timer = setTimeout(tick, interval);
      return () => {
        alive = false;
        clearTimeout(timer);
      };
    }, [state, paused, fps, getDecoder, deliver]);

    const toggleTorch = async () => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return;
      const next = !torchOn;
      try {
        await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
        setTorchOn(next);
      } catch (err) {
        onErrorRef.current?.(err);
      }
    };

    const scanAgain = () => {
      doneRef.current = false;
      setLastResult(null);
      setAttempt((a) => a + 1);
    };

    const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      setMessage(null);
      try {
        const [decode, image] = await Promise.all([getDecoder(), loadImage(file)]);
        const text = await decode(image);
        if (text) deliver(text);
        else setMessage("No QR code was found in that image.");
      } catch (err) {
        setMessage("That image couldn't be read.");
        onErrorRef.current?.(err);
      }
    };

    const status =
      state === "requesting"
        ? "Waiting for camera permission…"
        : state === "scanning"
          ? "Scanning for a QR code"
          : state === "done"
            ? "QR code scanned"
            : state === "denied"
              ? "Camera access is blocked"
              : state === "unsupported"
                ? "Camera not available"
                : "Camera error";

    return (
      <div
        ref={ref}
        data-slot="qr-scanner"
        data-state={state}
        className={cn("flex w-full flex-col items-center gap-4", className)}
        {...props}
      >
        <style>{SCAN_KEYFRAMES}</style>
        <div
          className={cn(
            "relative aspect-square w-full max-w-sm overflow-hidden rounded-box bg-zinc-950 text-white shadow-lg",
            viewportClassName
          )}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            aria-hidden
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-300",
              state === "scanning" ? "opacity-100" : "opacity-0",
              facing === "user" && "-scale-x-100"
            )}
          />

          {state === "scanning" && (
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute inset-[16%] rounded-3xl shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]" />
              <div
                className="absolute inset-[16%] motion-reduce:[animation:none]"
                style={{ animation: "sutra-qr-corners 2.4s ease-in-out infinite" }}
              >
                <span className="absolute left-0 top-0 size-9 rounded-tl-3xl border-l-4 border-t-4 border-white" />
                <span className="absolute right-0 top-0 size-9 rounded-tr-3xl border-r-4 border-t-4 border-white" />
                <span className="absolute bottom-0 left-0 size-9 rounded-bl-3xl border-b-4 border-l-4 border-white" />
                <span className="absolute bottom-0 right-0 size-9 rounded-br-3xl border-b-4 border-r-4 border-white" />
                <span
                  className="absolute inset-x-[8%] h-0.5 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_2px] shadow-primary/60 motion-reduce:hidden"
                  style={{ animation: "sutra-qr-scanline 2.2s ease-in-out infinite alternate" }}
                />
              </div>
            </div>
          )}

          {state === "requesting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Spinner size="lg" role="none" aria-hidden className="text-white" />
              <p className="text-sm text-white/80">Waiting for camera permission…</p>
            </div>
          )}

          {(state === "denied" || state === "unsupported" || state === "error") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <RiCameraOffLine aria-hidden className="mb-1 size-10 text-white/50" />
              <p className="text-sm font-semibold">
                {state === "denied"
                  ? "Camera access is blocked"
                  : state === "unsupported"
                    ? "Camera not available"
                    : "Couldn't start the camera"}
              </p>
              <p className="max-w-64 text-xs leading-relaxed text-white/65">
                {state === "denied"
                  ? "Allow camera access for this site in your browser settings (the camera icon in the address bar), then try again."
                  : state === "unsupported"
                    ? (message ?? "This browser can't open a camera here. Use HTTPS, or upload a picture of the code instead.")
                    : message}
              </p>
              {state !== "unsupported" && (
                <Button size="sm" variant="inverse" className="mt-2 bg-white text-zinc-950 hover:bg-white/90" onClick={() => setAttempt((a) => a + 1)}>
                  Try again
                </Button>
              )}
            </div>
          )}

          {state === "done" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-success text-success-foreground animate-in zoom-in-50 duration-300">
                <RiCheckLine aria-hidden className="size-6" />
              </span>
              <p className="text-sm font-semibold">Code scanned</p>
              {lastResult && <p className="max-w-full truncate font-mono text-xs text-white/60">{lastResult}</p>}
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={scanAgain}>
                Scan again
              </Button>
            </div>
          )}

          {state === "scanning" && (torchSupported || canSwitch) && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
              {torchSupported && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={torchOn ? "Turn flashlight off" : "Turn flashlight on"}
                  aria-pressed={torchOn}
                  onClick={toggleTorch}
                  className="rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
                >
                  {torchOn ? <RiFlashlightFill aria-hidden /> : <RiFlashlightLine aria-hidden />}
                </Button>
              )}
              {canSwitch && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Switch camera"
                  onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
                  className="rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
                >
                  <RiCameraSwitchLine aria-hidden />
                </Button>
              )}
            </div>
          )}
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>

        {hint != null && state !== "done" && <p className="text-center text-sm text-muted-foreground">{hint}</p>}
        {message && state !== "unsupported" && state !== "error" && (
          <p role="alert" className="text-center text-sm text-destructive">
            {message}
          </p>
        )}

        {allowUpload && state !== "done" && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={onFile}
            />
            <Button variant="ghost" size="sm" leadingIcon={<RiImageLine aria-hidden />} onClick={() => fileRef.current?.click()}>
              Upload image instead
            </Button>
          </>
        )}
      </div>
    );
  }
);
QRScanner.displayName = "QRScanner";

/* ------------------------------------------------------------------ */
/* QRScannerDialog                                                     */
/* ------------------------------------------------------------------ */

export interface QRScannerDialogProps extends Omit<QRScannerProps, "title"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the scanner (wrapped with `asChild`). */
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Close the dialog after a successful scan. Default true. */
  closeOnResult?: boolean;
}

/** Full-screen dialog around `QRScanner`; the camera only runs while it is open. */
export function QRScannerDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  title = "Scan QR code",
  description,
  closeOnResult = true,
  onResult,
  className,
  ...scannerProps
}: QRScannerDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            "dark fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white outline-none",
            "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            className
          )}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <RiQrScan2Line aria-hidden className="size-5 shrink-0" />
              <DialogPrimitive.Title className="truncate text-base font-semibold">{title}</DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close scanner" className="rounded-full bg-white/10 text-white hover:bg-white/20">
                <RiCloseLine aria-hidden />
              </Button>
            </DialogPrimitive.Close>
          </div>
          {description ? (
            <DialogPrimitive.Description className="px-4 text-sm text-white/60">{description}</DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">Camera viewfinder for scanning a QR code.</DialogPrimitive.Description>
          )}
          <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
            <QRScanner
              {...scannerProps}
              className="max-w-sm"
              onResult={(text) => {
                onResult(text);
                if (closeOnResult) setOpen(false);
              }}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
QRScannerDialog.displayName = "QRScannerDialog";
