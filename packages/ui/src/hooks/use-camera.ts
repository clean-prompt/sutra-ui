import * as React from "react";
import { useLatestRef } from "./use-iso-layout-effect";

/** Lifecycle of a `useCamera` stream. */
export type CameraStatus = "idle" | "requesting" | "live" | "denied" | "unavailable" | "error";

export type CameraFacingMode = "user" | "environment";

export interface UseCameraOptions {
  /** Camera to ask for first (`ideal`, so a device without it still opens). Default `"environment"`. */
  facingMode?: CameraFacingMode;
  /** A specific camera (`exact`); takes precedence over `facingMode`. */
  deviceId?: string;
  /** Also capture audio (for recording). Default false. */
  audio?: boolean | MediaTrackConstraints;
  /** Run the camera. When false the stream is released and the status is `"idle"`. Default true. */
  enabled?: boolean;
  /** Extra video constraints merged into the request (resolution, frame rate …). */
  constraints?: MediaTrackConstraints;
  /** Called with the raw error when the camera can't be opened. */
  onError?: (error: unknown) => void;
}

export interface UseCameraResult {
  /** Attach to a muted, `playsInline` `<video>`; the hook sets `srcObject` and plays it. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** The live stream, or null when not live. */
  stream: MediaStream | null;
  status: CameraStatus;
  /** The raw error behind `denied`, `unavailable` (null when the browser has no camera API) or `error`. */
  error: unknown;
  /** Video inputs, known once the camera is live (labels need permission). */
  devices: MediaDeviceInfo[];
  /** The facing mode currently requested. */
  facingMode: CameraFacingMode;
  /** The device currently requested, if one was picked. */
  deviceId: string | undefined;
  /** More than one camera is available. */
  canSwitch: boolean;
  /** Pick a camera by id, or with no argument flip between the front and rear camera. */
  switchCamera: (deviceId?: string) => void;
  /** (Re)open the camera, e.g. "Try again" after a denial or after `stop()`. */
  start: () => void;
  /** Release the camera now (status `"idle"`) until `start()`. */
  stop: () => void;
}

const DENIED = new Set(["NotAllowedError", "SecurityError", "PermissionDeniedError"]);
const MISSING = new Set(["NotFoundError", "OverconstrainedError", "DevicesNotFoundError"]);

/** Map a getUserMedia rejection to a camera status. */
export function cameraErrorStatus(error: unknown): "denied" | "unavailable" | "error" {
  const name = (error as { name?: string } | null)?.name ?? "";
  if (DENIED.has(name)) return "denied";
  if (MISSING.has(name)) return "unavailable";
  return "error";
}

function stopTracks(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}

/**
 * Opens a camera with getUserMedia and tracks permission and errors. Every start is guarded so a
 * superseded or unmounted run (StrictMode, fast toggles) releases what it acquired.
 */
export function useCamera(options: UseCameraOptions = {}): UseCameraResult {
  const { facingMode: facingProp = "environment", deviceId: deviceProp, audio = false, enabled = true, constraints } = options;
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const onErrorRef = useLatestRef(options.onError);

  const [facing, setFacing] = React.useState<CameraFacingMode>(facingProp);
  const [deviceId, setDeviceId] = React.useState<string | undefined>(deviceProp);
  const [prevProps, setPrevProps] = React.useState({ facingProp, deviceProp });
  if (prevProps.facingProp !== facingProp || prevProps.deviceProp !== deviceProp) {
    setPrevProps({ facingProp, deviceProp });
    if (prevProps.facingProp !== facingProp) setFacing(facingProp);
    if (prevProps.deviceProp !== deviceProp) setDeviceId(deviceProp);
  }

  const [stopped, setStopped] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const [status, setStatus] = React.useState<CameraStatus>(enabled ? "requesting" : "idle");
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);

  const active = enabled && !stopped;
  const audioKey = typeof audio === "boolean" ? String(audio) : JSON.stringify(audio);
  const constraintsKey = constraints ? JSON.stringify(constraints) : "";

  React.useEffect(() => {
    if (!active) {
      setStatus("idle");
      setStream(null);
      return;
    }
    let alive = true;
    const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!media?.getUserMedia) {
      setStatus("unavailable");
      setError(null);
      return;
    }
    setStatus("requesting");
    setError(null);
    const extra: MediaTrackConstraints = constraintsKey ? JSON.parse(constraintsKey) : {};
    const video: MediaTrackConstraints = deviceId
      ? { ...extra, deviceId: { exact: deviceId } }
      : { ...extra, facingMode: { ideal: facing } };
    const audioConstraint: boolean | MediaTrackConstraints = JSON.parse(audioKey);
    (async () => {
      try {
        const next = await media.getUserMedia({ audio: audioConstraint, video });
        if (!alive) {
          stopTracks(next);
          return;
        }
        streamRef.current = next;
        setStream(next);
        const el = videoRef.current;
        if (el) {
          el.srcObject = next;
          try {
            await el.play?.();
          } catch {
            /* autoplay may need a gesture; the muted inline video usually plays */
          }
        }
        if (!alive) return;
        setStatus("live");
        const list = await media.enumerateDevices?.().catch(() => []);
        if (alive) setDevices((list ?? []).filter((d) => d.kind === "videoinput"));
      } catch (err) {
        if (!alive) return;
        setError(err);
        setStatus(cameraErrorStatus(err));
        onErrorRef.current?.(err);
      }
    })();
    return () => {
      alive = false;
      stopTracks(streamRef.current);
      streamRef.current = null;
    };
  }, [active, facing, deviceId, attempt, audioKey, constraintsKey, onErrorRef]);

  // A <video> that mounts after the stream arrived (conditional markup) still gets it.
  React.useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream || el.srcObject === stream) return;
    el.srcObject = stream;
    el.play?.()?.catch?.(() => {});
  }, [stream, status]);

  // Keep the device list current while live (cameras plugged in or out).
  React.useEffect(() => {
    if (status !== "live") return;
    const media = navigator.mediaDevices;
    if (!media?.addEventListener || !media.enumerateDevices) return;
    let alive = true;
    const refresh = () => {
      media
        .enumerateDevices()
        .then((list) => alive && setDevices(list.filter((d) => d.kind === "videoinput")))
        .catch(() => {});
    };
    media.addEventListener("devicechange", refresh);
    return () => {
      alive = false;
      media.removeEventListener("devicechange", refresh);
    };
  }, [status]);

  const start = React.useCallback(() => {
    setStopped(false);
    setAttempt((a) => a + 1);
  }, []);

  const stop = React.useCallback(() => {
    stopTracks(streamRef.current);
    streamRef.current = null;
    setStopped(true);
  }, []);

  const switchCamera = React.useCallback((id?: string) => {
    if (id) {
      setDeviceId(id);
      return;
    }
    setDeviceId(undefined);
    setFacing((f) => (f === "environment" ? "user" : "environment"));
  }, []);

  return {
    videoRef,
    stream: status === "live" ? stream : null,
    status,
    error,
    devices,
    facingMode: facing,
    deviceId,
    canSwitch: devices.length > 1,
    switchCamera,
    start,
    stop,
  };
}
