import * as React from "react";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cameraErrorStatus, useCamera } from "../src/hooks/use-camera";
import {
  CAMERA_VIDEO_TYPES,
  CameraCapture,
  baseMimeType,
  pickVideoMimeType,
} from "../src/patterns/camera-capture";
import { axeViolations } from "./helpers/a11y";

/* ------------------------------------------------------------------ */
/* Fakes: jsdom has no camera, MediaRecorder, canvas or object URLs     */
/* ------------------------------------------------------------------ */

type FakeTrack = {
  stop: ReturnType<typeof vi.fn>;
  kind: string;
  getCapabilities: () => object;
  getSettings: () => { width: number; height: number; facingMode?: string };
};

let tracks: FakeTrack[];
let getUserMedia: ReturnType<typeof vi.fn>;
let enumerateDevices: ReturnType<typeof vi.fn>;
let recorders: FakeRecorder[];
let supportedTypes: string[];
const originalMedia = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");

function videoInput(id: string) {
  return { kind: "videoinput", deviceId: id, label: id, groupId: "g" } as MediaDeviceInfo;
}

class FakeRecorder {
  static isTypeSupported = (type: string) => supportedTypes.includes(type);
  state: "inactive" | "recording" = "inactive";
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(
    public stream: MediaStream,
    public options: { mimeType?: string } = {}
  ) {
    this.mimeType = options.mimeType ?? "";
    recorders.push(this);
  }
  start = vi.fn(() => {
    this.state = "recording";
  });
  stop = vi.fn(() => {
    if (this.state === "inactive") return;
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["frame"], { type: this.mimeType }) });
    this.onstop?.();
  });
}

beforeEach(() => {
  tracks = [];
  recorders = [];
  supportedTypes = ["video/webm;codecs=vp8", "video/webm", "video/mp4"];
  getUserMedia = vi.fn().mockImplementation(async (c: { video: { facingMode?: { ideal: string } } }) => {
    const facingMode = c.video.facingMode?.ideal;
    const t: FakeTrack = {
      stop: vi.fn(),
      kind: "video",
      getCapabilities: () => ({}),
      getSettings: () => ({ width: 640, height: 480, facingMode }),
    };
    tracks.push(t);
    return { getTracks: () => [t], getVideoTracks: () => [t] };
  });
  enumerateDevices = vi.fn().mockResolvedValue([videoInput("front")]);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia, enumerateDevices },
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => 640 });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, get: () => 480 });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => ({ drawImage: vi.fn() }) as unknown as RenderingContext
  );
  HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback, type?: string) {
    cb(new Blob(["img"], { type: type ?? "image/png" }));
  };
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => "blob:capture");
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
  (globalThis as { MediaRecorder?: unknown }).MediaRecorder = FakeRecorder;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (HTMLVideoElement.prototype as { videoWidth?: number }).videoWidth;
  delete (HTMLVideoElement.prototype as { videoHeight?: number }).videoHeight;
  delete (HTMLCanvasElement.prototype as { toBlob?: unknown }).toBlob;
  delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
  delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
  delete (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
  if (originalMedia) Object.defineProperty(navigator, "mediaDevices", originalMedia);
  else delete (navigator as { mediaDevices?: unknown }).mediaDevices;
});

const liveTracks = () => tracks.filter((t) => t.stop.mock.calls.length === 0);
const status = () => document.querySelector<HTMLElement>("p[role=status][aria-live=polite]")!;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

describe("pickVideoMimeType / baseMimeType", () => {
  it("picks the first supported candidate", () => {
    expect(pickVideoMimeType(["video/webm;codecs=vp9", "video/mp4"], (t) => t === "video/mp4")).toBe("video/mp4");
    expect(pickVideoMimeType(["a", "b"], () => true)).toBe("a");
  });
  it("returns undefined when nothing is supported or the recorder is missing", () => {
    expect(pickVideoMimeType(["video/webm"], () => false)).toBeUndefined();
    delete (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
    expect(pickVideoMimeType()).toBeUndefined();
  });
  it("defaults to MediaRecorder.isTypeSupported and the default preference list", () => {
    expect(pickVideoMimeType()).toBe("video/webm;codecs=vp8");
    supportedTypes = ["video/mp4"];
    expect(pickVideoMimeType(CAMERA_VIDEO_TYPES)).toBe("video/mp4");
  });
  it("strips parameters", () => {
    expect(baseMimeType("video/webm;codecs=vp8")).toBe("video/webm");
    expect(baseMimeType("Video/MP4")).toBe("video/mp4");
  });
  it("classifies getUserMedia errors", () => {
    expect(cameraErrorStatus({ name: "NotAllowedError" })).toBe("denied");
    expect(cameraErrorStatus({ name: "NotFoundError" })).toBe("unavailable");
    expect(cameraErrorStatus(new Error("boom"))).toBe("error");
    expect(cameraErrorStatus(null)).toBe("error");
  });
});

/* ------------------------------------------------------------------ */
/* useCamera                                                           */
/* ------------------------------------------------------------------ */

describe("useCamera", () => {
  it("goes requesting → live, lists devices and releases every track on unmount (StrictMode)", async () => {
    const { result, unmount } = renderHook(() => useCamera({ facingMode: "user", constraints: { width: { ideal: 640 } } }));
    expect(result.current.status).toBe("requesting");
    await waitFor(() => expect(result.current.status).toBe("live"));
    expect(result.current.stream).not.toBeNull();
    await waitFor(() => expect(result.current.devices).toHaveLength(1));
    expect(result.current.canSwitch).toBe(false);
    const request = getUserMedia.mock.calls.at(-1)![0];
    expect(request.video).toEqual({ width: { ideal: 640 }, facingMode: { ideal: "user" } });
    expect(request.audio).toBe(false);
    // StrictMode's discarded first mount released its stream; only one camera is running.
    expect(liveTracks()).toHaveLength(1);
    unmount();
    expect(liveTracks()).toHaveLength(0);
  });

  it("stays idle when disabled and releases the camera when disabled later", async () => {
    const { result, rerender } = renderHook(({ enabled }) => useCamera({ enabled }), { initialProps: { enabled: false } });
    expect(result.current.status).toBe("idle");
    expect(getUserMedia).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.status).toBe("live"));
    rerender({ enabled: false });
    expect(result.current.status).toBe("idle");
    expect(result.current.stream).toBeNull();
    expect(liveTracks()).toHaveLength(0);
  });

  it("stop() releases the tracks at once and start() reopens", async () => {
    const { result } = renderHook(() => useCamera());
    await waitFor(() => expect(result.current.status).toBe("live"));
    act(() => result.current.stop());
    expect(result.current.status).toBe("idle");
    expect(liveTracks()).toHaveLength(0);
    const calls = getUserMedia.mock.calls.length;
    act(() => result.current.start());
    await waitFor(() => expect(result.current.status).toBe("live"));
    expect(getUserMedia.mock.calls.length).toBe(calls + 1);
    expect(liveTracks()).toHaveLength(1);
  });

  it("switches between facing modes and to a device id", async () => {
    enumerateDevices.mockResolvedValue([videoInput("front"), videoInput("back")]);
    const { result } = renderHook(() => useCamera({ facingMode: "environment" }));
    await waitFor(() => expect(result.current.canSwitch).toBe(true));
    act(() => result.current.switchCamera());
    await waitFor(() => expect(result.current.status).toBe("live"));
    expect(result.current.facingMode).toBe("user");
    expect(getUserMedia.mock.calls.at(-1)![0].video.facingMode).toEqual({ ideal: "user" });
    act(() => result.current.switchCamera("back"));
    await waitFor(() => expect(getUserMedia.mock.calls.at(-1)![0].video.deviceId).toEqual({ exact: "back" }));
    await waitFor(() => expect(result.current.status).toBe("live"));
    expect(liveTracks()).toHaveLength(1);
  });

  it("reports denied, missing and unsupported cameras", async () => {
    const onError = vi.fn();
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error("no"), { name: "NotAllowedError" }));
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error("no"), { name: "NotAllowedError" }));
    const denied = renderHook(() => useCamera({ onError }));
    await waitFor(() => expect(denied.result.current.status).toBe("denied"));
    expect(onError).toHaveBeenCalled();
    expect((denied.result.current.error as Error).name).toBe("NotAllowedError");
    denied.unmount();

    getUserMedia.mockRejectedValue(Object.assign(new Error("none"), { name: "NotFoundError" }));
    const missing = renderHook(() => useCamera());
    await waitFor(() => expect(missing.result.current.status).toBe("unavailable"));
    missing.unmount();

    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
    const unsupported = renderHook(() => useCamera());
    expect(unsupported.result.current.status).toBe("unavailable");
    expect(unsupported.result.current.error).toBeNull();
  });

  it("drops a stream that arrives after unmount", async () => {
    let resolve!: (s: unknown) => void;
    getUserMedia.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );
    const { unmount } = renderHook(() => useCamera());
    unmount();
    const t: FakeTrack = { stop: vi.fn(), kind: "video", getCapabilities: () => ({}), getSettings: () => ({ width: 1, height: 1 }) };
    await act(async () => {
      resolve({ getTracks: () => [t], getVideoTracks: () => [t] });
      await Promise.resolve();
    });
    expect(t.stop).toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* CameraCapture                                                       */
/* ------------------------------------------------------------------ */

const root = (c: HTMLElement) => c.querySelector("[data-slot=camera-capture]")!;

describe("CameraCapture", () => {
  it("shows a loading viewport, then captures a photo, reviews it and uses it", async () => {
    const onCapture = vi.fn();
    const { container } = render(<CameraCapture onCapture={onCapture} photoType="image/webp" photoQuality={0.8} />);
    expect(root(container)).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading camera…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Take photo" })).toBeNull();

    const shutter = await screen.findByRole("button", { name: "Take photo" });
    expect(root(container)).not.toHaveAttribute("aria-busy");
    expect(getUserMedia.mock.calls[0]![0].video.facingMode).toEqual({ ideal: "user" });
    // Front camera preview is mirrored.
    expect(container.querySelector("video")).toHaveClass("-scale-x-100");
    expect(await axeViolations(container)).toEqual([]);

    fireEvent.click(shutter);
    const review = await screen.findByRole("group", { name: "Review photo" });
    expect(review).toHaveFocus();
    expect(screen.getByRole("img", { name: "Captured photo" })).toHaveAttribute("src", "blob:capture");
    expect(status()).toHaveTextContent("Photo captured");
    // The camera is released during review.
    expect(liveTracks()).toHaveLength(0);
    expect(await axeViolations(container)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Use photo" }));
    await waitFor(() => expect(onCapture).toHaveBeenCalledTimes(1));
    const [blob, meta] = onCapture.mock.calls[0]!;
    expect(blob).toBeInstanceOf(Blob);
    expect(meta).toEqual({ kind: "photo", type: "image/webp", width: 640, height: 480 });
  });

  it("retake returns to the live camera and focuses the capture button", async () => {
    render(<CameraCapture onCapture={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Take photo" }));
    await screen.findByRole("group", { name: "Review photo" });
    const calls = getUserMedia.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Retake" }));
    const shutter = await screen.findByRole("button", { name: "Take photo" });
    expect(getUserMedia.mock.calls.length).toBeGreaterThan(calls);
    await waitFor(() => expect(shutter).toHaveFocus());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:capture");
  });

  it("does not mirror when mirror={false} or for the rear camera", async () => {
    const { container, unmount } = render(<CameraCapture onCapture={vi.fn()} facingMode="environment" />);
    await screen.findByRole("button", { name: "Take photo" });
    expect(container.querySelector("video")).not.toHaveClass("-scale-x-100");
    unmount();
    const next = render(<CameraCapture onCapture={vi.fn()} mirror={false} />);
    await screen.findByRole("button", { name: "Take photo" });
    expect(next.container.querySelector("video")).not.toHaveClass("-scale-x-100");
  });

  it("shows a rejected onCapture as an error and keeps the review", async () => {
    const onCapture = vi.fn().mockRejectedValue(new Error("Upload failed"));
    render(<CameraCapture onCapture={onCapture} />);
    fireEvent.click(await screen.findByRole("button", { name: "Take photo" }));
    fireEvent.click(await screen.findByRole("button", { name: "Use photo" }));
    expect(await screen.findByText("Upload failed")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Review photo" })).toBeInTheDocument();
  });

  it("records a video with the preferred supported type, stops and reviews it", async () => {
    const onCapture = vi.fn();
    const { container } = render(
      <CameraCapture mode="video" onCapture={onCapture} videoTypes={["video/x-none", "video/mp4", "video/webm"]} />
    );
    fireEvent.click(await screen.findByRole("button", { name: "Start recording" }));
    expect(recorders).toHaveLength(1);
    expect(recorders[0]!.options.mimeType).toBe("video/mp4");
    expect(recorders[0]!.start).toHaveBeenCalled();
    expect(status()).toHaveTextContent("Recording started.");
    const timer = container.querySelector("[data-slot=camera-capture-timer]")!;
    expect(timer).toHaveAttribute("aria-hidden", "true");
    expect(timer).toHaveTextContent("0:00");
    expect(await axeViolations(container)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    const review = await screen.findByRole("group", { name: "Review video" });
    expect(review).toHaveFocus();
    expect(container.querySelector("video[aria-label='Recorded video']")).toHaveAttribute("src", "blob:capture");
    expect(status()).toHaveTextContent("Recording stopped");

    fireEvent.click(screen.getByRole("button", { name: "Use video" }));
    await waitFor(() => expect(onCapture).toHaveBeenCalled());
    const [blob, meta] = onCapture.mock.calls[0]!;
    expect((blob as Blob).type).toBe("video/mp4");
    expect(meta).toMatchObject({ kind: "video", type: "video/mp4", width: 640, height: 480 });
    expect(meta.duration).toBeGreaterThanOrEqual(0);
  });

  it("stops by itself at maxDuration", async () => {
    render(<CameraCapture mode="video" onCapture={vi.fn()} maxDuration={0.15} />);
    fireEvent.click(await screen.findByRole("button", { name: "Start recording" }));
    expect(screen.getByRole("button", { name: "Stop recording" })).toBeInTheDocument();
    await screen.findByRole("group", { name: "Review video" });
    expect(recorders[0]!.stop).toHaveBeenCalled();
  });

  it("delivers right away without review", async () => {
    const onCapture = vi.fn();
    render(<CameraCapture onCapture={onCapture} review={false} />);
    fireEvent.click(await screen.findByRole("button", { name: "Take photo" }));
    await waitFor(() => expect(onCapture).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("group", { name: "Review photo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Take photo" })).toBeInTheDocument();
  });

  it("advances prompts, announces each once and stops after the last", async () => {
    render(
      <CameraCapture
        mode="video"
        onCapture={vi.fn()}
        prompts={["Look straight", { label: "Turn your head left", duration: 0.3 }, "Blink twice"]}
        promptInterval={0.3}
      />
    );
    fireEvent.click(await screen.findByRole("button", { name: "Start recording" }));
    expect(screen.getByText("Look straight")).toBeInTheDocument();
    expect(status()).toHaveTextContent("Recording started. Step 1 of 3: Look straight");
    await waitFor(() => expect(screen.getByText("Turn your head left")).toBeInTheDocument());
    await waitFor(() => expect(status()).toHaveTextContent("Step 2 of 3: Turn your head left"));
    await screen.findByText("Blink twice", undefined, { timeout: 1500 });
    await waitFor(() => expect(status()).toHaveTextContent("Step 3 of 3: Blink twice"));
    await screen.findByRole("group", { name: "Review video" }, { timeout: 1500 });
    expect(recorders[0]!.stop).toHaveBeenCalled();
  });

  it("counts down before recording and can be canceled", async () => {
    const { container } = render(<CameraCapture mode="video" onCapture={vi.fn()} countdown={1} />);
    fireEvent.click(await screen.findByRole("button", { name: "Start recording" }));
    expect(root(container)).toHaveAttribute("data-state", "countdown");
    expect(status()).toHaveTextContent("Recording starts in 1 second.");
    expect(recorders).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(root(container)).toHaveAttribute("data-state", "live");

    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    await screen.findByRole("button", { name: "Stop recording" }, { timeout: 2000 });
    expect(recorders).toHaveLength(1);
  });

  it("offers a camera switch when there are several cameras", async () => {
    enumerateDevices.mockResolvedValue([videoInput("front"), videoInput("back")]);
    const { container } = render(<CameraCapture onCapture={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Switch camera" }));
    await waitFor(() => expect(getUserMedia.mock.calls.at(-1)![0].video.facingMode).toEqual({ ideal: "environment" }));
    await screen.findByRole("button", { name: "Take photo" });
    await waitFor(() => expect(container.querySelector("video")).not.toHaveClass("-scale-x-100"));
    expect(liveTracks()).toHaveLength(1);
  });

  it("explains a denied camera and retries", async () => {
    getUserMedia.mockRejectedValue(Object.assign(new Error("Permission denied"), { name: "NotAllowedError" }));
    const onError = vi.fn();
    const { container } = render(<CameraCapture onCapture={vi.fn()} onError={onError} />);
    expect(await screen.findByText("Camera access is blocked")).toBeInTheDocument();
    expect(screen.getByText(/Allow camera access/)).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
    const calls = getUserMedia.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(getUserMedia.mock.calls.length).toBeGreaterThan(calls));
  });

  it("explains a missing camera and other errors", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
    const { unmount } = render(<CameraCapture onCapture={vi.fn()} />);
    expect(screen.getByText("No camera available")).toBeInTheDocument();
    expect(screen.getByText(/secure \(HTTPS\)/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    unmount();

    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia, enumerateDevices } });
    getUserMedia.mockRejectedValue(new Error("Device busy"));
    render(<CameraCapture onCapture={vi.fn()} />);
    expect(await screen.findByText("Couldn't start the camera")).toBeInTheDocument();
    expect(screen.getByText("Device busy")).toBeInTheDocument();
  });

  it("keeps the camera off while loading", () => {
    const { container } = render(<CameraCapture onCapture={vi.fn()} loading />);
    expect(root(container)).toHaveAttribute("aria-busy", "true");
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("stops the recorder and camera on unmount without delivering", async () => {
    const onCapture = vi.fn();
    const { unmount } = render(<CameraCapture mode="video" onCapture={onCapture} review={false} />);
    fireEvent.click(await screen.findByRole("button", { name: "Start recording" }));
    unmount();
    expect(recorders[0]!.stop).toHaveBeenCalled();
    expect(onCapture).not.toHaveBeenCalled();
    expect(liveTracks()).toHaveLength(0);
  });

  it("does not leak tracks across StrictMode remounts", async () => {
    const { unmount } = render(
      <React.StrictMode>
        <CameraCapture onCapture={vi.fn()} />
      </React.StrictMode>
    );
    await screen.findByRole("button", { name: "Take photo" });
    expect(liveTracks()).toHaveLength(1);
    unmount();
    expect(liveTracks()).toHaveLength(0);
  });
});
