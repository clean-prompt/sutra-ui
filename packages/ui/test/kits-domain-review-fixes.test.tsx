/** Review fixes in the domain kits: MiniPlayer, AccessGate, useKunjiSignIn, useInstallPrompt, QRScanner, CallScreen, SaveStatus and data-slot hooks. */
import * as React from "react";
import { renderToString } from "react-dom/server";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { MiniPlayer } from "../src/kits/media/audio-player";
import { AccessGate, useKunjiSignIn } from "../src/kits/identity/kunji";
import type { KunjiClient, KunjiPollResult, KunjiSession } from "../src/kits/identity/kunji-client";
import { QRScanner, type QRScannerDetector } from "../src/kits/identity/qr-scanner";
import { useInstallPrompt } from "../src/kits/workspace/install-prompt";
import { CallScreen, CallQualityIndicator } from "../src/kits/social/call-overlay";
import { MessageStatusIcon } from "../src/kits/social/messenger";
import { PresenceIndicator } from "../src/kits/social/presence";
import { SaveStatus } from "../src/kits/editor/editor-status";

const rect = (width: number, height = 4) =>
  ({ left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0, toJSON() {} }) as DOMRect;

describe("MiniPlayer compact seek bar", () => {
  const track = { id: "t", title: "Song" };

  it("seeks left to right even inside an RTL page, and from the keyboard", () => {
    const onSeek = vi.fn();
    render(
      <div dir="rtl">
        <MiniPlayer track={track} playing currentTime={20} duration={100} onSeek={onSeek} layout="compact" />
      </div>
    );
    const bar = screen.getByRole("slider", { name: "Playback progress" });
    // An LTR island like the full layout's SeekBar: the fill, the click position and the keys all read left to right.
    expect(bar.closest("[dir]")).toHaveAttribute("dir", "ltr");
    vi.spyOn(bar, "getBoundingClientRect").mockReturnValue(rect(200));
    fireEvent.click(bar, { clientX: 50 });
    expect(onSeek).toHaveBeenLastCalledWith(25);
    fireEvent.keyDown(bar, { key: "ArrowRight" });
    expect(onSeek).toHaveBeenLastCalledWith(25);
    fireEvent.keyDown(bar, { key: "ArrowLeft" });
    expect(onSeek).toHaveBeenLastCalledWith(15);
    fireEvent.keyDown(bar, { key: "End" });
    expect(onSeek).toHaveBeenLastCalledWith(100);
    fireEvent.keyDown(bar, { key: "Home" });
    expect(onSeek).toHaveBeenLastCalledWith(0);
  });

  it("stays a plain progressbar without onSeek", () => {
    render(<MiniPlayer track={track} playing currentTime={20} duration={100} layout="compact" />);
    expect(screen.getByRole("progressbar", { name: "Playback progress" })).not.toHaveAttribute("tabindex");
  });
});

describe("AccessGate polling", () => {
  it("keeps polling while the parent re-renders faster than pollInterval with an inline adapter", async () => {
    vi.useFakeTimers();
    try {
      const check = vi.fn(async (_signal?: AbortSignal) => ({ status: "pending" as const }));
      let bump!: () => void;
      function Parent() {
        const [n, setN] = React.useState(0);
        bump = () => setN((v) => v + 1);
        return (
          <AccessGate
            data-n={n}
            adapter={{ request: async () => ({ status: "pending" as const }), check: (signal) => check(signal) }}
            defaultRecord={{ status: "pending" }}
            pollInterval={100}
          />
        );
      }
      render(<Parent />);
      const base = check.mock.calls.length;
      // A re-render every 30 ms would restart a 100 ms interval forever if the adapter's identity mattered.
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          bump();
          await vi.advanceTimersByTimeAsync(30);
        });
      }
      expect(check.mock.calls.length - base).toBeGreaterThanOrEqual(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("useKunjiSignIn", () => {
  const approved: KunjiPollResult = { status: "approved", sessionId: "s1" };
  const makeClient = (): KunjiClient => ({
    appName: "Test",
    createSession: vi.fn(async () => ({ sessionId: "s1", challenge: "c", expiresAt: Date.now() + 60_000 }) as KunjiSession),
    checkStatus: vi.fn(async () => approved),
    poll: vi.fn(async () => approved),
  });

  it("does not restart the session when the client is a new object every render", async () => {
    const created: string[] = [];
    const { rerender } = renderHook(
      () =>
        useKunjiSignIn({
          client: {
            ...makeClient(),
            createSession: async () => {
              created.push("x");
              return { sessionId: "s", challenge: "c", expiresAt: Date.now() + 60_000 } as KunjiSession;
            },
            poll: () => new Promise<KunjiPollResult>(() => {}),
          },
        })
    );
    await act(async () => {});
    const after = created.length;
    rerender();
    rerender();
    await act(async () => {});
    expect(created.length).toBe(after);
  });

  it("still delivers onSuccess when the parent unmounts during the success animation", async () => {
    vi.useFakeTimers();
    try {
      const onSuccess = vi.fn();
      const client = makeClient();
      function Host() {
        const [gone, setGone] = React.useState(false);
        return gone ? null : <Inner onGone={() => setGone(true)} />;
      }
      function Inner({ onGone }: { onGone: () => void }) {
        useKunjiSignIn({ client, onSuccess, successDelay: 900, onStatusChange: (s) => s === "success" && onGone() });
        return null;
      }
      render(<Host />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(approved);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("useInstallPrompt hydration", () => {
  it("reads browser-only facts after mount, so the server render and the first client render agree", () => {
    const ua = vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    try {
      let first: boolean | undefined;
      function Probe() {
        const { isIOS } = useInstallPrompt();
        first ??= isIOS;
        return <span>{String(isIOS)}</span>;
      }
      expect(renderToString(<Probe />)).toContain("false");
      first = undefined;
      const { container } = render(<Probe />);
      expect(first).toBe(false);
      expect(container.textContent).toBe("true");
    } finally {
      ua.mockRestore();
    }
  });
});

describe("QRScanner upload after unmount", () => {
  it("does not call onResult when the image finishes decoding after the scanner unmounted", async () => {
    let release!: (bitmap: ImageBitmap) => void;
    const original = globalThis.createImageBitmap;
    globalThis.createImageBitmap = vi.fn(() => new Promise<ImageBitmap>((r) => (release = r))) as unknown as typeof createImageBitmap;
    const original$media = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
    try {
      const detector: QRScannerDetector = { detect: vi.fn().mockResolvedValue([{ rawValue: "hello" }]) };
      const onResult = vi.fn();
      const { container, unmount } = render(<QRScanner onResult={onResult} detector={detector} />);
      const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File(["x"], "qr.png", { type: "image/png" });
      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });
      unmount();
      await act(async () => {
        release({ width: 10, height: 10, close() {} } as ImageBitmap);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(onResult).not.toHaveBeenCalled();
    } finally {
      globalThis.createImageBitmap = original;
      if (original$media) Object.defineProperty(navigator, "mediaDevices", original$media);
      else delete (navigator as { mediaDevices?: unknown }).mediaDevices;
    }
  });
});

describe("CallScreen picture-in-picture drag", () => {
  it("follows the pointer through a CSS variable without re-rendering, and drops into the nearest corner", () => {
    const onPipCornerChange = vi.fn();
    const { container } = render(<CallScreen name="Maya" type="video" onPipCornerChange={onPipCornerChange} />);
    const pip = container.querySelector<HTMLElement>("[data-corner]")!;
    const stage = pip.parentElement!.firstElementChild as HTMLElement;
    vi.spyOn(stage, "getBoundingClientRect").mockReturnValue(rect(400, 300));
    pip.setPointerCapture = vi.fn();
    fireEvent.pointerDown(pip, { pointerId: 1, button: 0, clientX: 380, clientY: 280 });
    fireEvent.pointerMove(pip, { pointerId: 1, clientX: 100, clientY: 40 });
    expect(pip.style.getPropertyValue("--sutra-drag-x")).toBe("-280px");
    expect(pip.style.getPropertyValue("--sutra-drag-y")).toBe("-240px");
    fireEvent.pointerUp(pip, { pointerId: 1, clientX: 100, clientY: 40 });
    expect(onPipCornerChange).toHaveBeenCalledWith("top-left");
    expect(pip.style.getPropertyValue("--sutra-drag-x")).toBe("");
  });

  it("ends the drag when pointer capture is lost without a pointercancel", () => {
    const onPipCornerChange = vi.fn();
    const { container } = render(<CallScreen name="Maya" type="video" onPipCornerChange={onPipCornerChange} />);
    const pip = container.querySelector<HTMLElement>("[data-corner]")!;
    pip.setPointerCapture = vi.fn();
    fireEvent.pointerDown(pip, { pointerId: 1, button: 0, clientX: 380, clientY: 280 });
    fireEvent.pointerMove(pip, { pointerId: 1, clientX: 100, clientY: 40 });
    fireEvent.lostPointerCapture(pip, { pointerId: 1 });
    expect(pip.style.getPropertyValue("--sutra-drag-x")).toBe("");
    // A later stray move does nothing: the drag is over.
    fireEvent.pointerMove(pip, { pointerId: 1, clientX: 10, clientY: 10 });
    expect(pip.style.getPropertyValue("--sutra-drag-x")).toBe("");
    expect(onPipCornerChange).not.toHaveBeenCalled();
  });
});

describe("SaveStatus with an unparseable date", () => {
  it("never shows 'Invalid Date' in the title", () => {
    const { container } = render(<SaveStatus status="saved" savedAt="not a date" />);
    expect(container.innerHTML).not.toContain("Invalid Date");
  });
});

describe("data-slot hooks in workspace, terminal, ops, social and billing", () => {
  it("names the root of the components that lacked one", () => {
    const { container } = render(
      <div>
        <CallQualityIndicator quality="good" />
        <MessageStatusIcon status="sent" />
        <PresenceIndicator status="live" />
      </div>
    );
    for (const slot of ["call-quality-indicator", "message-status-icon", "presence-indicator"]) {
      expect(container.querySelector(`[data-slot="${slot}"]`), slot).not.toBeNull();
    }
  });

  it("lets a consumer override data-slot (it sits before the spread)", () => {
    const { container } = render(<CallQualityIndicator quality="good" data-slot="mine" />);
    expect(container.querySelector('[data-slot="mine"]')).not.toBeNull();
  });
});
