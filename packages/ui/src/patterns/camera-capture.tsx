import * as React from "react";
import {
  RiCameraLine,
  RiCameraSwitchLine,
  RiCheckLine,
  RiRecordCircleLine,
  RiRestartLine,
  RiStopCircleLine,
} from "@remixicon/react";
import { cn } from "../lib/cn";
import { formatClock } from "../lib/duration";
import { pluralize } from "../lib/format";
import { useCamera, type CameraFacingMode } from "../hooks/use-camera";
import { errorMessage, useAsyncAction, useMountedRef } from "../hooks/use-async-action";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { useObjectUrl } from "../hooks/use-object-url";
import { Button } from "../primitives/button";
import { InlineAlert, InlineAlertDescription, InlineAlertTitle } from "../primitives/inline-alert";
import { Skeleton } from "../primitives/progress";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Default MediaRecorder preference: WebM (VP9, then VP8), then MP4 for Safari. */
export const CAMERA_VIDEO_TYPES: readonly string[] = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4",
];

function recorderSupports(type: string): boolean {
  const Recorder = (globalThis as { MediaRecorder?: { isTypeSupported?: (t: string) => boolean } }).MediaRecorder;
  try {
    return Boolean(Recorder?.isTypeSupported?.(type));
  } catch {
    return false;
  }
}

/**
 * First candidate the recorder supports, or `undefined` to let the browser choose.
 * Pure when `isTypeSupported` is passed; defaults to `MediaRecorder.isTypeSupported`.
 */
export function pickVideoMimeType(
  candidates: readonly string[] = CAMERA_VIDEO_TYPES,
  isTypeSupported: (type: string) => boolean = recorderSupports
): string | undefined {
  for (const type of candidates) {
    if (type && isTypeSupported(type)) return type;
  }
  return undefined;
}

/** MIME type without parameters: `"video/webm;codecs=vp8"` → `"video/webm"`. */
export function baseMimeType(type: string): string {
  return String(type ?? "").split(";")[0]!.trim().toLowerCase();
}

/* ------------------------------------------------------------------ */
/* CameraCapture                                                       */
/* ------------------------------------------------------------------ */

export type CameraCaptureMode = "photo" | "video";

/** An instruction shown while recording, e.g. "Turn your head left". */
export interface CameraCapturePrompt {
  label: React.ReactNode;
  /** Text announced to screen readers (defaults to `label` when it is a string). */
  announce?: string;
  /** Seconds this prompt stays up. Default `promptInterval`. */
  duration?: number;
}

export interface CameraCaptureMeta {
  kind: CameraCaptureMode;
  /** MIME type of the blob, as recorded (e.g. `"image/jpeg"`, `"video/webm;codecs=vp8"`). */
  type: string;
  width: number;
  height: number;
  /** Recording length in seconds (video only). */
  duration?: number;
}

type Phase = "live" | "countdown" | "recording" | "review";

export interface CameraCaptureProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onError"> {
  /** Take a photo or record a video. Default `"photo"`. */
  mode?: CameraCaptureMode;
  /** Called with the capture when the user chooses "Use" (or right away with `review={false}`). Return a promise to show progress; a rejection is shown as an error. */
  onCapture: (blob: Blob, meta: CameraCaptureMeta) => void | Promise<unknown>;
  /** Camera and capture errors (raw). */
  onError?: (error: unknown) => void;
  /** Camera to open. Default `"user"` (front). */
  facingMode?: CameraFacingMode;
  /** A specific camera; takes precedence over `facingMode`. */
  deviceId?: string;
  /** Mirror the live preview. Default: on for the front camera. */
  mirror?: boolean;
  /** Record audio with video. Default false. */
  audio?: boolean;
  /** Extra video constraints (resolution, frame rate …). */
  constraints?: MediaTrackConstraints;
  /** Photo MIME type. Default `"image/jpeg"`. */
  photoType?: string;
  /** Photo quality 0–1 for lossy types. Default 0.92. */
  photoQuality?: number;
  /** Recorder MIME types in order of preference; the first supported one is used. */
  videoTypes?: readonly string[];
  /** Target bitrate of recorded video in bits per second; the browser picks a default when omitted. */
  videoBitsPerSecond?: number;
  /** Stop recording after this many seconds. */
  maxDuration?: number;
  /** Instructions shown one after another while recording. */
  prompts?: ReadonlyArray<string | CameraCapturePrompt>;
  /** Seconds per prompt when a prompt has no `duration`. Default 3. */
  promptInterval?: number;
  /** Stop recording when the last prompt has run its time. Default true. */
  stopAfterPrompts?: boolean;
  /** Seconds of countdown before recording starts. Default 0. */
  countdown?: number;
  /** Show the capture with Retake and Use before calling `onCapture`. Default true. */
  review?: boolean;
  /** Not ready yet (e.g. fetching the prompts): shows the loading viewport and keeps the camera off. */
  loading?: boolean;
  /** Instruction under the viewport. */
  hint?: React.ReactNode;
  /** Classes for the camera viewport. */
  viewportClassName?: string;
}

function normalizePrompt(prompt: string | CameraCapturePrompt): CameraCapturePrompt {
  return typeof prompt === "string" ? { label: prompt } : prompt;
}

function promptAnnouncement(prompt: CameraCapturePrompt, index: number, count: number) {
  const text = prompt.announce ?? (typeof prompt.label === "string" ? prompt.label : "");
  return count > 1 ? `Step ${index + 1} of ${count}${text ? `: ${text}` : ""}` : text;
}

function frameSize(stream: MediaStream | null, video: HTMLVideoElement | null) {
  const settings = stream?.getVideoTracks()[0]?.getSettings?.() ?? {};
  return {
    width: video?.videoWidth || settings.width || 0,
    height: video?.videoHeight || settings.height || 0,
  };
}

const overlayButton = "rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60";

/** Camera photo and video capture with a mirrored preview, countdown, timed prompts, review, and permission states. */
export const CameraCapture = React.forwardRef<HTMLDivElement, CameraCaptureProps>(
  (
    {
      mode = "photo",
      onCapture,
      onError,
      facingMode = "user",
      deviceId,
      mirror,
      audio = false,
      constraints,
      photoType = "image/jpeg",
      photoQuality = 0.92,
      videoTypes = CAMERA_VIDEO_TYPES,
      videoBitsPerSecond,
      maxDuration,
      prompts,
      promptInterval = 3,
      stopAfterPrompts = true,
      countdown = 0,
      review = true,
      loading = false,
      hint,
      className,
      viewportClassName,
      ...props
    },
    ref
  ) => {
    const [phase, setPhase] = React.useState<Phase>("live");
    const [captured, setCaptured] = React.useState<{ blob: Blob; meta: CameraCaptureMeta } | null>(null);
    const [captureError, setCaptureError] = React.useState<string | null>(null);
    const [announcement, setAnnouncement] = React.useState("");
    const [elapsed, setElapsed] = React.useState(0);
    const [countLeft, setCountLeft] = React.useState(0);
    const [promptIndex, setPromptIndex] = React.useState(0);

    const onErrorRef = useLatestRef(onError);
    const mounted = useMountedRef();
    const recorderRef = React.useRef<MediaRecorder | null>(null);
    const startedAtRef = React.useRef(0);
    const deadlineRef = React.useRef(0);
    const reviewRef = React.useRef<HTMLDivElement>(null);
    const captureButtonRef = React.useRef<HTMLButtonElement>(null);
    const focusCaptureRef = React.useRef(false);

    const camera = useCamera({
      facingMode,
      deviceId,
      audio: mode === "video" && audio,
      constraints,
      enabled: !loading && phase !== "review",
      onError: (err) => onErrorRef.current?.(err),
    });
    const streamRef = useLatestRef(camera.stream);

    const promptList = React.useMemo(() => (prompts ?? []).map(normalizePrompt), [prompts]);
    const promptsRef = useLatestRef(promptList);

    const submit = useAsyncAction((blob: Blob, meta: CameraCaptureMeta) => onCapture(blob, meta), {
      fallbackMessage: "The capture couldn't be used. Try again.",
    });

    const fail = React.useCallback(
      (message: string, err?: unknown) => {
        setCaptureError(message);
        if (err !== undefined) onErrorRef.current?.(err);
      },
      [onErrorRef]
    );

    const finish = (blob: Blob, meta: CameraCaptureMeta) => {
      const noun = meta.kind === "photo" ? "Photo captured" : "Recording stopped";
      if (review) {
        setCaptured({ blob, meta });
        setPhase("review");
        setAnnouncement(`${noun}. Review it, then use it or retake.`);
      } else {
        setPhase("live");
        setAnnouncement(`${noun}.`);
        void submit.run(blob, meta);
      }
    };
    const finishRef = useLatestRef(finish);

    // Review URL for the captured blob, revoked when it changes or on unmount.
    const previewUrl = useObjectUrl(captured?.blob);

    /* ---------------- photo ---------------- */

    const takePhoto = () => {
      const video = camera.videoRef.current;
      const { width, height } = frameSize(camera.stream, video);
      if (!video || !width || !height) {
        fail("The camera isn't ready yet. Try again in a moment.");
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx || typeof canvas.toBlob !== "function") {
        fail("This browser can't take a photo here.");
        return;
      }
      try {
        ctx.drawImage(video, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!mounted.current) return;
            if (!blob) {
              fail("The photo couldn't be captured. Try again.");
              return;
            }
            finishRef.current(blob, { kind: "photo", type: blob.type || photoType, width, height });
          },
          photoType,
          photoQuality
        );
      } catch (err) {
        fail("The photo couldn't be captured. Try again.", err);
      }
    };

    /* ---------------- video ---------------- */

    const stopRecording = React.useCallback(() => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch (err) {
          onErrorRef.current?.(err);
        }
      }
    }, [onErrorRef]);

    const beginRecording = () => {
      const stream = streamRef.current;
      const Recorder = (globalThis as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
      if (!stream) {
        setPhase("live");
        fail("The camera isn't ready yet. Try again in a moment.");
        return;
      }
      if (!Recorder) {
        setPhase("live");
        fail("This browser can't record video.");
        return;
      }
      const mimeType = pickVideoMimeType(videoTypes);
      let recorder: MediaRecorder;
      try {
        recorder = new Recorder(stream, {
          ...(mimeType ? { mimeType } : {}),
          ...(videoBitsPerSecond ? { videoBitsPerSecond } : {}),
        });
      } catch (err) {
        setPhase("live");
        fail("Recording couldn't start.", err);
        return;
      }
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        if (!mounted.current || recorderRef.current !== recorder) return;
        recorderRef.current = null;
        const duration = Math.max(0, (Date.now() - startedAtRef.current) / 1000);
        const type = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunks, { type });
        const size = frameSize(streamRef.current ?? stream, camera.videoRef.current);
        finishRef.current(blob, { kind: "video", type, duration, ...size });
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setPromptIndex(0);
      setCaptureError(null);
      try {
        recorder.start();
      } catch (err) {
        recorderRef.current = null;
        setPhase("live");
        fail("Recording couldn't start.", err);
        return;
      }
      setPhase("recording");
      if (!promptsRef.current.length) setAnnouncement("Recording started.");
    };
    const beginRef = useLatestRef(beginRecording);

    const startCapture = () => {
      setCaptureError(null);
      submit.reset();
      if (mode === "photo") {
        takePhoto();
      } else if (countdown > 0) {
        deadlineRef.current = Date.now() + countdown * 1000;
        setCountLeft(Math.ceil(countdown));
        setPhase("countdown");
        setAnnouncement(`Recording starts in ${Math.ceil(countdown)} ${pluralize(Math.ceil(countdown), "second")}.`);
      } else {
        beginRecording();
      }
    };

    const cancelCountdown = () => {
      setPhase("live");
      setAnnouncement("Countdown canceled.");
    };

    const retake = () => {
      setCaptured(null);
      setCaptureError(null);
      submit.reset();
      focusCaptureRef.current = true;
      setPhase("live");
      setAnnouncement("");
    };

    // Countdown (deadline-based, so a re-run effect doesn't restart it).
    React.useEffect(() => {
      if (phase !== "countdown") return;
      let timer: ReturnType<typeof setTimeout>;
      const tick = () => {
        const left = deadlineRef.current - Date.now();
        if (left <= 0) {
          beginRef.current();
          return;
        }
        setCountLeft(Math.ceil(left / 1000));
        timer = setTimeout(tick, left % 1000 || 1000);
      };
      tick();
      return () => clearTimeout(timer);
    }, [phase, beginRef]);

    // Recording timer (whole seconds only).
    React.useEffect(() => {
      if (phase !== "recording") return;
      const update = () => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      update();
      const id = setInterval(update, 250);
      return () => clearInterval(id);
    }, [phase]);

    // Auto-stop at maxDuration.
    React.useEffect(() => {
      if (phase !== "recording" || !maxDuration || maxDuration <= 0) return;
      const left = startedAtRef.current + maxDuration * 1000 - Date.now();
      const timer = setTimeout(stopRecording, Math.max(0, left));
      return () => clearTimeout(timer);
    }, [phase, maxDuration, stopRecording]);

    // Prompt sequence, timed from the recording start.
    React.useEffect(() => {
      if (phase !== "recording") return;
      const list = promptsRef.current;
      if (!list.length) return;
      const durations = list.map((p) => Math.max(0.1, p.duration ?? promptInterval) * 1000);
      let timer: ReturnType<typeof setTimeout>;
      const tick = () => {
        const t = Date.now() - startedAtRef.current;
        let acc = 0;
        let i = 0;
        while (i < durations.length && t >= acc + durations[i]!) {
          acc += durations[i]!;
          i++;
        }
        if (i >= durations.length) {
          if (stopAfterPrompts) stopRecording();
          return;
        }
        setPromptIndex(i);
        timer = setTimeout(tick, acc + durations[i]! - t);
      };
      tick();
      return () => clearTimeout(timer);
    }, [phase, promptInterval, stopAfterPrompts, stopRecording, promptsRef]);

    // Announce each prompt once (the first one together with "Recording started").
    React.useEffect(() => {
      if (phase !== "recording") return;
      const list = promptsRef.current;
      const prompt = list[promptIndex];
      if (!prompt) return;
      const text = promptAnnouncement(prompt, promptIndex, list.length);
      setAnnouncement(promptIndex === 0 ? `Recording started. ${text}`.trim() : text);
    }, [phase, promptIndex, promptsRef]);

    // Release a running recorder on unmount without delivering it.
    React.useEffect(
      () => () => {
        const recorder = recorderRef.current;
        recorderRef.current = null;
        if (recorder && recorder.state !== "inactive") {
          recorder.ondataavailable = null;
          recorder.onstop = null;
          try {
            recorder.stop();
          } catch {
            /* already stopped */
          }
        }
      },
      []
    );

    // Focus: into the review step, and back to the capture button after a retake once the camera is live.
    const prevPhase = React.useRef(phase);
    React.useEffect(() => {
      const prev = prevPhase.current;
      prevPhase.current = phase;
      if (prev !== phase && phase === "review") reviewRef.current?.focus();
    }, [phase]);
    React.useEffect(() => {
      if (focusCaptureRef.current && phase === "live" && camera.status === "live" && captureButtonRef.current) {
        focusCaptureRef.current = false;
        captureButtonRef.current.focus();
      }
    }, [phase, camera.status]);

    /* ---------------- render ---------------- */

    const blocked = camera.status === "denied" || camera.status === "unavailable" || camera.status === "error";
    const starting =
      loading || (phase !== "review" && (camera.status === "requesting" || camera.status === "idle"));
    const isLive = camera.status === "live" && !loading;
    const trackFacing = camera.stream?.getVideoTracks()[0]?.getSettings?.().facingMode;
    const mirrored = mirror ?? (trackFacing ?? (camera.deviceId ? undefined : camera.facingMode)) === "user";
    const prompt = phase === "recording" ? promptList[promptIndex] : undefined;
    const noun = mode === "photo" ? "photo" : "video";
    const busy = submit.busy;

    return (
      <div
        ref={ref}
        data-slot="camera-capture"
        data-state={phase}
        data-camera={loading ? "idle" : camera.status}
        aria-busy={starting || undefined}
        className={cn("flex w-full flex-col items-center gap-3", className)}
        {...props}
      >
        {blocked && phase !== "review" && !loading ? (
          <CameraBlockedAlert status={camera.status} error={camera.error} onRetry={camera.start} />
        ) : (
          <div
            data-slot="camera-capture-viewport"
            className={cn(
              "relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-box bg-zinc-950 text-white shadow-lg",
              viewportClassName
            )}
          >
            {phase !== "review" && (
              <video
                ref={camera.videoRef}
                muted
                playsInline
                autoPlay
                aria-hidden
                className={cn(
                  "absolute inset-0 size-full object-cover transition-opacity duration-300",
                  isLive ? "opacity-100" : "opacity-0",
                  mirrored && "-scale-x-100"
                )}
              />
            )}

            {starting && (
              <>
                <Skeleton className="absolute inset-0 h-full rounded-none opacity-20" />
                <span className="sr-only">Loading camera…</span>
              </>
            )}

            {phase === "review" && (
              <div
                ref={reviewRef}
                tabIndex={-1}
                role="group"
                aria-label={`Review ${noun}`}
                data-slot="camera-capture-review"
                className="absolute inset-0 outline-none"
              >
                {previewUrl &&
                  (captured?.meta.kind === "video" ? (
                    <video
                      src={previewUrl}
                      controls
                      playsInline
                      aria-label="Recorded video"
                      className="size-full bg-black object-contain"
                    />
                  ) : (
                    <img src={previewUrl} alt="Captured photo" className="size-full object-contain" />
                  ))}
              </div>
            )}

            {phase === "countdown" && (
              <div aria-hidden className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span key={countLeft} className="text-display-xl font-semibold tabular-nums animate-in zoom-in-50 duration-300">
                  {countLeft}
                </span>
              </div>
            )}

            {phase === "recording" && (
              <div
                aria-hidden
                data-slot="camera-capture-timer"
                className="absolute start-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 font-mono text-xs tabular-nums backdrop-blur"
              >
                <span className="size-2 rounded-full bg-destructive motion-safe:animate-pulse" />
                {formatClock(elapsed)}
                {maxDuration ? <span className="text-white/60">/ {formatClock(maxDuration)}</span> : null}
              </div>
            )}

            {prompt && (
              <div
                data-slot="camera-capture-prompt"
                className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/75 to-transparent px-4 pb-3 pt-8 text-center"
              >
                <p className="text-base font-medium">{prompt.label}</p>
                {promptList.length > 1 && (
                  <div aria-hidden className="flex gap-1.5">
                    {promptList.map((_, i) => (
                      <span key={i} className={cn("size-1.5 rounded-full", i <= promptIndex ? "bg-white" : "bg-white/35")} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {phase === "live" && isLive && camera.canSwitch && (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Switch camera"
                onClick={() => camera.switchCamera()}
                className={cn("absolute end-3 top-3", overlayButton)}
              >
                <RiCameraSwitchLine aria-hidden />
              </Button>
            )}
          </div>
        )}

        {phase === "review" ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="secondary" leadingIcon={<RiRestartLine aria-hidden />} onClick={retake} disabled={busy}>
              Retake
            </Button>
            <Button
              leadingIcon={<RiCheckLine aria-hidden />}
              loading={busy}
              disabled={!captured}
              onClick={() => captured && void submit.run(captured.blob, captured.meta)}
            >
              {mode === "photo" ? "Use photo" : "Use video"}
            </Button>
          </div>
        ) : isLive && !blocked ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {mode === "photo" ? (
              <Button ref={captureButtonRef} leadingIcon={<RiCameraLine aria-hidden />} onClick={startCapture} disabled={busy}>
                Take photo
              </Button>
            ) : phase === "recording" ? (
              <Button
                ref={captureButtonRef}
                variant="destructive"
                leadingIcon={<RiStopCircleLine aria-hidden />}
                onClick={() => {
                  setAnnouncement("Stopping recording…");
                  stopRecording();
                }}
              >
                Stop recording
              </Button>
            ) : phase === "countdown" ? (
              <Button ref={captureButtonRef} variant="secondary" onClick={cancelCountdown}>
                Cancel
              </Button>
            ) : (
              <Button ref={captureButtonRef} leadingIcon={<RiRecordCircleLine aria-hidden />} onClick={startCapture} disabled={busy}>
                Start recording
              </Button>
            )}
          </div>
        ) : null}

        {hint != null && phase !== "review" && !blocked && (
          <p className="text-center text-sm text-muted-foreground">{hint}</p>
        )}

        {(captureError || submit.error) && (
          <InlineAlert tone="destructive" className="max-w-md" onDismiss={captureError ? () => setCaptureError(null) : submit.reset}>
            <InlineAlertDescription>{captureError ?? submit.error}</InlineAlertDescription>
          </InlineAlert>
        )}

        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    );
  }
);
CameraCapture.displayName = "CameraCapture";

function CameraBlockedAlert({
  status,
  error,
  onRetry,
}: {
  status: "denied" | "unavailable" | "error" | string;
  error: unknown;
  onRetry: () => void;
}) {
  const retry = (
    <Button size="sm" variant="outline" onClick={onRetry}>
      Try again
    </Button>
  );
  if (status === "denied") {
    return (
      <InlineAlert tone="warning" className="max-w-md" action={retry}>
        <InlineAlertTitle>Camera access is blocked</InlineAlertTitle>
        <InlineAlertDescription>
          Allow camera access for this site in your browser settings (the camera icon in the address bar), then try again.
        </InlineAlertDescription>
      </InlineAlert>
    );
  }
  if (status === "unavailable") {
    return (
      <InlineAlert tone="neutral" className="max-w-md" action={error ? retry : undefined}>
        <InlineAlertTitle>No camera available</InlineAlertTitle>
        <InlineAlertDescription>
          {error
            ? "No camera was found. Connect one, or close other apps that are using it, then try again."
            : "This browser can't open a camera here. Camera access needs a secure (HTTPS) page."}
        </InlineAlertDescription>
      </InlineAlert>
    );
  }
  return (
    <InlineAlert tone="destructive" className="max-w-md" action={retry}>
      <InlineAlertTitle>Couldn't start the camera</InlineAlertTitle>
      <InlineAlertDescription>{errorMessage(error, "The camera could not be started.")}</InlineAlertDescription>
    </InlineAlert>
  );
}
