import * as React from "react";
import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import {
  NowPlayingBars,
  PlayPauseButton,
  RepeatButton,
  SeekBar,
  ShuffleButton,
  SkipButton,
  TrackCycleChip,
  VolumeControl,
  formatMediaTime,
  nextRepeatMode,
  useMediaElement,
  type RepeatMode,
} from "../src/kits/media/media-controls";
import { VideoPlayer } from "../src/kits/media/video-player";
import {
  MiniPlayer,
  NowPlaying,
  QueueList,
  TrackRow,
  createPlayerQueue,
  playerQueueReducer,
  shufflePlayOrder,
  usePlayerQueue,
  type PlayerTrack,
} from "../src/kits/media/audio-player";
import { AlbumCard, EpisodeCard, MediaHero, MediaShelf, PlaylistCard, PosterCard } from "../src/kits/media/media-cards";
import { CastPicker, DeviceIcon, resolveDeviceKind, type CastDevice } from "../src/kits/media/cast-picker";
import { axeViolations } from "./a11y";

// jsdom may lack PointerEvent; without it fireEvent.pointer* drops clientX/clientY and pointerType.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
    }
  }
  (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill;
}

/* ------------------------------------------------------------------ */
/* HTMLMediaElement stubs (jsdom does not implement playback)          */
/* ------------------------------------------------------------------ */

function setProp(el: object, name: string, value: unknown) {
  Object.defineProperty(el, name, { configurable: true, writable: true, value });
}

type RejectMode = "never" | "unmuted" | "always";

function stubMedia(reject: RejectMode = "never") {
  const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    if (reject === "always" || (reject === "unmuted" && !this.muted)) {
      return Promise.reject(new DOMException("Autoplay refused", "NotAllowedError"));
    }
    setProp(this, "paused", false);
    setProp(this, "ended", false);
    this.dispatchEvent(new Event("play"));
    this.dispatchEvent(new Event("playing"));
    return Promise.resolve();
  });
  const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    setProp(this, "paused", true);
    this.dispatchEvent(new Event("pause"));
  });
  const load = vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  return { play, pause, load };
}

function prepare(el: HTMLMediaElement, props: Partial<Record<"duration" | "currentTime" | "volume", number>> & { muted?: boolean } = {}) {
  setProp(el, "paused", true);
  setProp(el, "ended", false);
  setProp(el, "duration", props.duration ?? 200);
  setProp(el, "currentTime", props.currentTime ?? 0);
  setProp(el, "volume", props.volume ?? 1);
  setProp(el, "muted", props.muted ?? false);
  setProp(el, "playbackRate", 1);
  setProp(el, "error", null);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ */
/* formatMediaTime                                                     */
/* ------------------------------------------------------------------ */

describe("formatMediaTime", () => {
  it("formats m:ss, h:mm:ss and guards bad input", () => {
    expect(formatMediaTime(0)).toBe("0:00");
    expect(formatMediaTime(65)).toBe("1:05");
    expect(formatMediaTime(200.9)).toBe("3:20");
    expect(formatMediaTime(3725)).toBe("1:02:05");
    expect(formatMediaTime(NaN)).toBe("0:00");
    expect(formatMediaTime(Infinity)).toBe("0:00");
    expect(formatMediaTime(-4)).toBe("0:00");
    expect(formatMediaTime(65, { forceHours: true })).toBe("0:01:05");
    expect(formatMediaTime(65, { negative: true })).toBe("-1:05");
  });
});

/* ------------------------------------------------------------------ */
/* usePlayerQueue                                                      */
/* ------------------------------------------------------------------ */

const items = ["a", "b", "c", "d", "e"].map((id) => ({ id }));

/** Deterministic rng cycling through a fixed list. */
function seq(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("usePlayerQueue", () => {
  it("advances, stops at the end with repeat off and wraps with repeat all", () => {
    const { result } = renderHook(() => usePlayerQueue({ items }));
    expect(result.current.current?.id).toBe("a");
    expect(result.current.hasPrevious).toBe(false);
    act(() => void result.current.next());
    expect(result.current.current?.id).toBe("b");
    act(() => void result.current.jumpTo("e"));
    let next: { id: string } | null = { id: "x" };
    act(() => {
      next = result.current.next();
    });
    expect(next).toBeNull();
    expect(result.current.ended).toBe(true);
    expect(result.current.current?.id).toBe("e");
    expect(result.current.hasNext).toBe(false);

    act(() => void result.current.setRepeat("all"));
    expect(result.current.hasNext).toBe(true);
    act(() => void result.current.next());
    expect(result.current.current?.id).toBe("a");
    act(() => void result.current.previous());
    expect(result.current.current?.id).toBe("e");
  });

  it("repeat one replays on auto-advance but a manual skip moves on", () => {
    const { result } = renderHook(() => usePlayerQueue({ items, repeat: "one" }));
    act(() => void result.current.next({ auto: true }));
    expect(result.current.current?.id).toBe("a");
    act(() => void result.current.next());
    expect(result.current.current?.id).toBe("b");
  });

  it("previous restarts the current track after 3 seconds", () => {
    const { result } = renderHook(() => usePlayerQueue({ items, index: 2 }));
    let item: { id: string } | null = null;
    act(() => {
      item = result.current.previous({ currentTime: 12 });
    });
    expect(item).toEqual({ id: "c" });
    expect(result.current.current?.id).toBe("c");
    act(() => {
      item = result.current.previous({ currentTime: 1 });
    });
    expect(item).toEqual({ id: "b" });
  });

  it("shuffles deterministically with an injected rng, keeps the current item first and restores order", () => {
    const rng = seq([0.1, 0.7, 0.3, 0.9]);
    expect(shufflePlayOrder(["a", "b", "c", "d", "e"], "c", seq([0.1, 0.7, 0.3, 0.9]))).toEqual(
      shufflePlayOrder(["a", "b", "c", "d", "e"], "c", seq([0.1, 0.7, 0.3, 0.9]))
    );
    const { result } = renderHook(() => usePlayerQueue({ items, index: 2, rng }));
    act(() => void result.current.setShuffle(true));
    const order = result.current.order;
    expect(order[0]).toBe("c");
    expect([...order].sort()).toEqual(["a", "b", "c", "d", "e"]);
    expect(order).toEqual(shufflePlayOrder(["a", "b", "c", "d", "e"], "c", seq([0.1, 0.7, 0.3, 0.9])));
    // Walk the shuffled order.
    act(() => void result.current.next());
    expect(result.current.current?.id).toBe(order[1]);
    act(() => void result.current.setShuffle(false));
    expect(result.current.order).toEqual(["a", "b", "c", "d", "e"]);
    expect(result.current.current?.id).toBe(order[1]);
  });

  it("reorders and removes while keeping the current item (pure reducer)", () => {
    let s = createPlayerQueue(items, { index: 1 });
    s = playerQueueReducer(s, { type: "move", from: 1, to: 3 });
    expect(s.order).toEqual(["a", "c", "d", "b", "e"]);
    expect(s.items.map((i) => i.id)).toEqual(["a", "c", "d", "b", "e"]);
    expect(s.currentId).toBe("b");
    s = playerQueueReducer(s, { type: "remove", id: "b" });
    expect(s.currentId).toBe("e");
    s = playerQueueReducer(s, { type: "add", items: [{ id: "z" }], next: true });
    expect(s.order).toEqual(["a", "c", "d", "e", "z"]);
    s = playerQueueReducer({ ...s, currentId: "c" }, { type: "add", items: [{ id: "y" }], next: true });
    expect(s.order).toEqual(["a", "c", "y", "d", "e", "z"]);
  });
});

/* ------------------------------------------------------------------ */
/* useMediaElement                                                     */
/* ------------------------------------------------------------------ */

function Harness({
  onState,
  autoPlay,
}: {
  onState: (s: ReturnType<typeof useMediaElement>) => void;
  autoPlay?: boolean;
}) {
  const ref = React.useRef<HTMLAudioElement | null>(null);
  const media = useMediaElement(ref, { autoPlay });
  onState(media);
  return <audio ref={ref} data-testid="audio" />;
}

describe("useMediaElement", () => {
  it("mirrors element events and drives the element", async () => {
    const stubs = stubMedia();
    let media!: ReturnType<typeof useMediaElement>;
    const el = document.createElement("audio");
    prepare(el);
    const ref = { current: el };
    const { result } = renderHook(() => useMediaElement(ref));
    media = result.current;
    expect(result.current.playing).toBe(false);
    expect(result.current.duration).toBe(200);

    await act(async () => {
      await result.current.play();
    });
    expect(stubs.play).toHaveBeenCalled();
    expect(result.current.playing).toBe(true);

    act(() => {
      setProp(el, "currentTime", 42);
      el.dispatchEvent(new Event("timeupdate"));
      el.dispatchEvent(new Event("waiting"));
    });
    expect(result.current.currentTime).toBe(42);
    expect(result.current.waiting).toBe(true);
    act(() => void el.dispatchEvent(new Event("playing")));
    expect(result.current.waiting).toBe(false);

    act(() => result.current.seek(500));
    expect(el.currentTime).toBe(200);
    act(() => result.current.skip(-10));
    expect(el.currentTime).toBe(190);

    act(() => result.current.setMuted(true));
    expect(el.muted).toBe(true);
    act(() => result.current.setVolume(0.4));
    expect(el.volume).toBe(0.4);
    expect(el.muted).toBe(false);
    expect(result.current.muted).toBe(false);

    act(() => result.current.setRate(1.5));
    expect(el.playbackRate).toBe(1.5);

    act(() => result.current.toggle());
    expect(stubs.pause).toHaveBeenCalled();
    expect(result.current.playing).toBe(false);

    act(() => {
      setProp(el, "error", { code: 4, message: "unsupported" });
      el.dispatchEvent(new Event("error"));
    });
    expect(result.current.error?.code).toBe(4);
    await act(async () => {
      setProp(el, "error", null);
      result.current.retry();
    });
    expect(stubs.load).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(media).toBeDefined();
  });

  it("falls back to muted playback when autoplay with sound is refused", async () => {
    const stubs = stubMedia("unmuted");
    let media!: ReturnType<typeof useMediaElement>;
    const audio = document.createElement("audio");
    prepare(audio);
    const ref = { current: audio };
    const { result } = renderHook(() => useMediaElement(ref, { autoPlay: true }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    media = result.current;
    expect(stubs.play).toHaveBeenCalledTimes(2);
    expect(audio.muted).toBe(true);
    expect(media.playing).toBe(true);
    expect(media.autoplayMuted).toBe(true);
    act(() => result.current.unmute());
    expect(audio.muted).toBe(false);
    expect(result.current.autoplayMuted).toBe(false);
  });

  it("flags autoplayBlocked when even muted playback is refused", async () => {
    stubMedia("always");
    const audio = document.createElement("audio");
    prepare(audio);
    const { result } = renderHook(() => useMediaElement({ current: audio }, { autoPlay: true }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.playing).toBe(false);
    expect(result.current.autoplayBlocked).toBe(true);
  });

  it("picks up a ref that is filled after mount", () => {
    stubMedia();
    let latest!: ReturnType<typeof useMediaElement>;
    render(<Harness onState={(m) => (latest = m)} />);
    expect(latest.element).toBe(screen.getByTestId("audio"));
  });
});

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

describe("SeekBar", () => {
  it("is a labelled slider with time text and keyboard seeking", async () => {
    const onSeek = vi.fn();
    const { container } = render(
      <SeekBar value={65} duration={200} buffered={[{ start: 0, end: 120 }]} onSeek={onSeek} chapters={[{ start: 0, title: "Intro" }, { start: 90, title: "Verse" }]} />
    );
    const slider = screen.getByRole("slider", { name: "Seek" });
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "200");
    expect(slider).toHaveAttribute("aria-valuenow", "65");
    expect(slider).toHaveAttribute("aria-valuetext", "1:05 of 3:20, Intro");
    expect(container.querySelector('[data-slot="seek-buffered"]')).toHaveStyle({ width: "60%" });
    expect(container.querySelectorAll('[data-slot="seek-chapter"]')).toHaveLength(1);

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onSeek).toHaveBeenLastCalledWith(70);
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(onSeek).toHaveBeenLastCalledWith(60);
    fireEvent.keyDown(slider, { key: "Home" });
    expect(onSeek).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(slider, { key: "End" });
    expect(onSeek).toHaveBeenLastCalledWith(200);

    expect(screen.getByText("1:05")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show remaining time" }));
    expect(screen.getByRole("button", { name: "Show total time" })).toHaveTextContent("-2:15");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("seeks by pointer drag", () => {
    const onSeek = vi.fn();
    const onScrub = vi.fn();
    render(<SeekBar value={0} duration={100} onSeek={onSeek} onScrub={onScrub} showTimes={false} />);
    const slider = screen.getByRole("slider");
    slider.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 20, right: 200, bottom: 20, x: 0, y: 0, toJSON() {} });
    fireEvent.pointerDown(slider, { clientX: 50, pointerId: 1, button: 0 });
    fireEvent.pointerMove(slider, { clientX: 100, pointerId: 1 });
    expect(onScrub).toHaveBeenLastCalledWith(50);
    expect(slider).toHaveAttribute("aria-valuenow", "50");
    fireEvent.pointerUp(slider, { clientX: 100, pointerId: 1 });
    expect(onSeek).toHaveBeenCalledWith(50);
    expect(onScrub).toHaveBeenLastCalledWith(null);
  });
});

describe("VolumeControl", () => {
  it("toggles mute and nudges volume with the arrow keys", async () => {
    function Controlled() {
      const [volume, setVolume] = React.useState(0.5);
      const [muted, setMuted] = React.useState(false);
      return (
        <>
          <VolumeControl volume={volume} muted={muted} onVolumeChange={setVolume} onMutedChange={setMuted} />
          <output data-testid="v">{volume}</output>
        </>
      );
    }
    const { container } = render(<Controlled />);
    const mute = screen.getByRole("button", { name: "Mute" });
    const slider = screen.getByRole("slider", { name: "Volume" });
    expect(slider).toHaveAttribute("aria-valuenow", "50");
    fireEvent.keyDown(mute, { key: "ArrowUp" });
    expect(screen.getByTestId("v")).toHaveTextContent("0.55");
    fireEvent.keyDown(mute, { key: "ArrowDown" });
    fireEvent.keyDown(mute, { key: "ArrowDown" });
    expect(screen.getByTestId("v")).toHaveTextContent("0.45");
    fireEvent.click(mute);
    expect(screen.getByRole("button", { name: "Unmute" })).toHaveAttribute("data-state", "muted");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    fireEvent.click(screen.getByRole("button", { name: "Unmute" }));
    expect(screen.getByRole("button", { name: "Mute" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("renders a vertical popover variant", () => {
    const { container } = render(<VolumeControl orientation="vertical" defaultVolume={0.2} />);
    expect(container.querySelector('[data-slot="volume-popover"]')).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Volume" })).toHaveAttribute("aria-orientation", "vertical");
  });
});

describe("RepeatButton & friends", () => {
  it("cycles off → all → one → off", async () => {
    const onValueChange = vi.fn();
    const { container } = render(<RepeatButton onValueChange={onValueChange} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAccessibleName("Repeat off");
    expect(btn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAccessibleName("Repeat all");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(btn);
    expect(btn).toHaveAccessibleName("Repeat one");
    fireEvent.click(btn);
    expect(btn).toHaveAccessibleName("Repeat off");
    expect(onValueChange.mock.calls.map((c) => c[0])).toEqual(["all", "one", "off"]);
    expect((["off", "all", "one"] as RepeatMode[]).map(nextRepeatMode)).toEqual(["all", "one", "off"]);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("renders play/pause, skip, shuffle and equalizer accessibly", async () => {
    const onSkip = vi.fn();
    const { container, rerender } = render(
      <div>
        <PlayPauseButton playing={false} />
        <SkipButton direction="back" onSkip={onSkip} />
        <SkipButton seconds={30} onSkip={onSkip} />
        <ShuffleButton defaultPressed />
        <NowPlayingBars playing />
      </div>
    );
    expect(screen.getByRole("button", { name: "Play" })).toHaveAttribute("data-state", "paused");
    fireEvent.click(screen.getByRole("button", { name: "Back 10 seconds" }));
    fireEvent.click(screen.getByRole("button", { name: "Forward 30 seconds" }));
    expect(onSkip.mock.calls).toEqual([[-10], [30]]);
    expect(screen.getByRole("button", { name: "Back 10 seconds" })).toHaveTextContent("10");
    expect(screen.getByRole("button", { name: "Shuffle" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: "Now playing" })).toHaveAttribute("data-state", "playing");
    expect(await axeViolations(container)).toEqual([]);
    rerender(
      <div>
        <PlayPauseButton playing />
        <NowPlayingBars playing={false} />
      </div>
    );
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Paused" })).toHaveAttribute("data-state", "paused");
  });

  it("TrackCycleChip cycles subtitles including Off", () => {
    function Chip() {
      const [value, setValue] = React.useState<string | null>(null);
      return (
        <TrackCycleChip
          kind="subtitles"
          value={value}
          onValueChange={setValue}
          tracks={[
            { id: "en", label: "English", language: "en" },
            { id: "es", label: "Spanish", language: "es" },
          ]}
        />
      );
    }
    render(<Chip />);
    const chip = screen.getByRole("button");
    expect(chip).toHaveAccessibleName("Subtitles: Off. Switch to next");
    fireEvent.click(chip);
    expect(chip).toHaveTextContent("EN");
    fireEvent.click(chip);
    expect(chip).toHaveAccessibleName("Subtitles: Spanish. Switch to next");
    fireEvent.click(chip);
    expect(chip).toHaveTextContent("Off");
  });
});

/* ------------------------------------------------------------------ */
/* VideoPlayer                                                         */
/* ------------------------------------------------------------------ */

function getVideo(container: HTMLElement) {
  const video = container.querySelector("video")!;
  return video;
}

describe("VideoPlayer", () => {
  it("auto-hides the chrome while playing and shows it on activity or pause", async () => {
    vi.useFakeTimers();
    stubMedia();
    const onBack = vi.fn();
    const { container } = render(<VideoPlayer src="movie.mp4" title="Big Buck Bunny" subtitle="S1 · E1" onBack={onBack} />);
    const video = getVideo(container);
    act(() => prepare(video, { duration: 600 }));
    const root = screen.getByRole("region", { name: "Big Buck Bunny" });
    expect(root).toHaveAttribute("data-chrome", "visible");
    expect(screen.getByText("S1 · E1")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Play Big Buck Bunny" }));
    });
    expect(root).toHaveAttribute("data-state", "playing");
    expect(screen.queryByRole("button", { name: "Play Big Buck Bunny" })).not.toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(3100));
    expect(root).toHaveAttribute("data-chrome", "hidden");

    fireEvent.pointerMove(root, { pointerType: "mouse" });
    expect(root).toHaveAttribute("data-chrome", "visible");
    act(() => void vi.advanceTimersByTime(2000));
    expect(root).toHaveAttribute("data-chrome", "visible");
    act(() => void vi.advanceTimersByTime(1200));
    expect(root).toHaveAttribute("data-chrome", "hidden");

    // Scoped keyboard shortcuts.
    root.focus();
    fireEvent.keyDown(root, { key: "k" });
    expect(root).toHaveAttribute("data-state", "paused");
    expect(root).toHaveAttribute("data-chrome", "visible");
    fireEvent.keyDown(root, { key: "m" });
    expect(video.muted).toBe(true);
    fireEvent.keyDown(root, { key: "ArrowRight" });
    expect(video.currentTime).toBe(5);
    fireEvent.keyDown(root, { key: "Escape" });
    expect(onBack).toHaveBeenCalled();
  });

  it("shows the up-next countdown and cancels it", async () => {
    vi.useFakeTimers();
    stubMedia();
    const onNext = vi.fn();
    const onEnded = vi.fn();
    const { container } = render(
      <VideoPlayer src="ep1.mp4" title="Episode 1" onNext={onNext} onEnded={onEnded} upNext={{ title: "Episode 2", subtitle: "The return" }} />
    );
    const video = getVideo(container);
    act(() => {
      prepare(video);
      setProp(video, "ended", true);
      video.dispatchEvent(new Event("ended"));
    });
    expect(onEnded).toHaveBeenCalled();
    const card = screen.getByRole("group", { name: "Up next" });
    expect(card).toHaveTextContent("Up next in 5…");
    act(() => void vi.advanceTimersByTime(1000));
    expect(card).toHaveTextContent("Up next in 4…");
    fireEvent.click(within(card).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("group", { name: "Up next" })).not.toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(8000));
    expect(onNext).not.toHaveBeenCalled();

    // Without cancelling, the countdown plays the next item.
    act(() => void video.dispatchEvent(new Event("ended")));
    for (let i = 0; i < 6; i++) act(() => void vi.advanceTimersByTime(1000));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("group", { name: "Up next" })).not.toBeInTheDocument();
  });

  it("shows the muted-autoplay pill, resume offer and error retry", async () => {
    stubMedia("unmuted");
    const onResume = vi.fn();
    const { container } = render(<VideoPlayer src="a.mp4" autoPlay resumeAt={754} onResume={onResume} />);
    const video = getVideo(container);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const pill = await screen.findByRole("button", { name: /Muted — tap to unmute/ });
    fireEvent.click(pill);
    expect(video.muted).toBe(false);
    expect(screen.queryByRole("button", { name: /tap to unmute/ })).not.toBeInTheDocument();

    expect(screen.getByText("Resume from 12:34?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(onResume).toHaveBeenCalledWith(754);
    expect(video.currentTime).toBe(754);

    act(() => {
      setProp(video, "error", { code: 2 });
      video.dispatchEvent(new Event("error"));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("can't be played");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("offers subtitle tracks from props", () => {
    stubMedia();
    const onSubtitleTrackChange = vi.fn();
    render(
      <VideoPlayer
        src="a.mp4"
        tracks={[{ id: "en", label: "English", srcLang: "en", src: "en.vtt" }]}
        onSubtitleTrackChange={onSubtitleTrackChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Subtitles: Off/ }));
    expect(onSubtitleTrackChange).toHaveBeenCalledWith("en");
  });
});

/* ------------------------------------------------------------------ */
/* Queue & player bars                                                 */
/* ------------------------------------------------------------------ */

const tracks: PlayerTrack[] = [
  { id: "1", title: "Alpha", artist: "Ana", album: "First", duration: 185 },
  { id: "2", title: "Bravo", artist: "Ben", duration: 200, explicit: true },
  { id: "3", title: "Charlie", artist: "Cy", duration: 240 },
];

describe("QueueList", () => {
  it("reorders with Alt+Arrow, announces the move and keeps focus", async () => {
    const onSelect = vi.fn();
    function Stateful() {
      const [list, setList] = React.useState(tracks);
      return (
        <QueueList
          items={list}
          currentId="2"
          playing
          onSelect={onSelect}
          onRemove={(item) => setList((l) => l.filter((t) => t.id !== item.id))}
          onReorder={(from, to) =>
            setList((l) => {
              const next = l.slice();
              const [m] = next.splice(from, 1);
              next.splice(to, 0, m);
              return next;
            })
          }
        />
      );
    }
    const { container } = render(<Stateful />);
    const list = screen.getByRole("list", { name: "Queue" });
    const rowTitles = () => within(list).getAllByRole("listitem").map((li) => li.querySelector('[data-slot="queue-select"]')!.textContent);
    expect(rowTitles()[0]).toContain("Alpha");
    expect(screen.getByRole("img", { name: "Now playing" })).toBeInTheDocument();

    const select = (title: string) =>
      Array.from(container.querySelectorAll<HTMLElement>('[data-slot="queue-select"]')).find((b) => b.textContent?.includes(title))!;
    const alpha = select("Alpha");
    alpha.focus();
    fireEvent.keyDown(alpha, { key: "ArrowDown", altKey: true });
    expect(rowTitles()[1]).toContain("Alpha");
    expect(container.querySelector('[data-slot="queue-announcer"]')).toHaveTextContent("Moved Alpha to position 2 of 3");
    expect(document.activeElement).toHaveTextContent("Alpha");

    const handle = screen.getByRole("button", { name: "Reorder Charlie" });
    handle.focus();
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(rowTitles()[1]).toContain("Charlie");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Reorder Charlie" }));

    expect(select("Bravo")).toHaveAttribute("aria-current", "true");
    fireEvent.click(select("Bravo"));
    expect(onSelect).toHaveBeenCalledWith(tracks[1], 0);
    fireEvent.click(screen.getByRole("button", { name: "Remove Bravo from queue" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("QueueList drag", () => {
  it("reorders by dragging the handle and shows a drop indicator", () => {
    const onReorder = vi.fn();
    const { container } = render(<QueueList items={tracks} onReorder={onReorder} />);
    container.querySelectorAll<HTMLElement>("[data-queue-id]").forEach((li, i) => {
      li.getBoundingClientRect = () => ({ top: i * 40, height: 40, bottom: i * 40 + 40, left: 0, right: 300, width: 300, x: 0, y: i * 40, toJSON() {} });
    });
    const handle = screen.getByRole("button", { name: "Reorder Alpha" });
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 20 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 110 });
    expect(container.querySelector('[data-slot="queue-drop-indicator"]')).toBeInTheDocument();
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 110 });
    expect(onReorder).toHaveBeenCalledWith(0, 2);
    expect(container.querySelector('[data-slot="queue-drop-indicator"]')).toBeNull();
    expect(container.querySelector('[data-slot="queue-announcer"]')).toHaveTextContent("Moved Alpha to position 3 of 3");
  });
});

describe("MiniPlayer", () => {
  const base = {
    track: tracks[0],
    playing: true,
    currentTime: 65,
    duration: 200,
  };

  it("renders both layouts in auto mode and expands from the compact bar", async () => {
    const onExpand = vi.fn();
    const onPlayPause = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <MiniPlayer
        {...base}
        onExpand={onExpand}
        onPlayPause={onPlayPause}
        onClose={onClose}
        onNext={() => {}}
        onPrevious={() => {}}
        shuffle
        onShuffleChange={() => {}}
        repeat="all"
        onRepeatChange={() => {}}
        volume={0.6}
        onVolumeChange={() => {}}
        favorite={false}
        onFavoriteChange={() => {}}
        queuePosition={{ index: 2, total: 12 }}
      />
    );
    const compact = container.querySelector<HTMLElement>('[data-layout="compact"]')!;
    const full = container.querySelector<HTMLElement>('[data-layout="full"]')!;
    expect(compact.className).toContain("@3xl:hidden");
    expect(full.className).toContain("@max-3xl:hidden");

    expect(within(compact).getByRole("progressbar", { name: "Playback progress" })).toHaveAttribute("aria-valuetext", "1:05 of 3:20");
    fireEvent.click(within(compact).getByRole("button", { name: "Open now playing: Alpha, Ana" }));
    expect(onExpand).toHaveBeenCalledTimes(1);
    fireEvent.click(within(compact).getByRole("button", { name: "Pause" }));
    expect(onPlayPause).toHaveBeenCalled();

    // Swipe up on the compact bar.
    fireEvent.pointerDown(compact, { pointerId: 3, pointerType: "touch", clientX: 100, clientY: 300 });
    fireEvent.pointerUp(compact, { pointerId: 3, pointerType: "touch", clientX: 102, clientY: 180 });
    expect(onExpand).toHaveBeenCalledTimes(2);

    expect(within(full).getByText("3 of 12")).toBeInTheDocument();
    expect(within(full).getByRole("button", { name: "Shuffle" })).toHaveAttribute("aria-pressed", "true");
    expect(within(full).getByRole("button", { name: "Repeat all" })).toBeInTheDocument();
    expect(within(full).getByRole("slider", { name: "Seek" })).toHaveAttribute("aria-valuetext", "1:05 of 3:20");
    expect(within(full).getByRole("button", { name: "Add Alpha to favorites" })).toBeInTheDocument();
    fireEvent.click(within(full).getByRole("button", { name: "Close player" }));
    expect(onClose).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("supports a single layout and renders nothing without a track", () => {
    const { container, rerender } = render(<MiniPlayer {...base} layout="compact" />);
    expect(container.querySelector('[data-layout="full"]')).toBeNull();
    expect(container.querySelector('[data-layout="compact"]')!.className).not.toContain("@3xl:hidden");
    rerender(<MiniPlayer {...base} layout="full" />);
    expect(container.querySelector('[data-layout="compact"]')).toBeNull();
    rerender(<MiniPlayer {...base} track={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("NowPlaying", () => {
  it("opens as a dialog, dismisses by swipe down (not from a slider) and by the chevron", async () => {
    const onOpenChange = vi.fn();
    render(
      <NowPlaying
        open
        onOpenChange={onOpenChange}
        {...{ track: tracks[1], playing: false, currentTime: 10, duration: 200 }}
        onFavoriteChange={() => {}}
        onAddToPlaylist={() => {}}
        header="Playing from Road trip"
        queue={<QueueList items={tracks} currentId="2" />}
      />
    );
    const dialog = screen.getByRole("dialog", { name: "Now playing: Bravo" });
    expect(within(dialog).getByRole("heading", { name: "Bravo" })).toBeInTheDocument();
    expect(within(dialog).getByRole("region", { name: "Up next" })).toBeInTheDocument();

    const slider = within(dialog).getByRole("slider", { name: "Seek" });
    fireEvent.pointerDown(slider, { pointerId: 5, pointerType: "touch", clientX: 10, clientY: 100 });
    fireEvent.pointerUp(slider, { pointerId: 5, pointerType: "touch", clientX: 12, clientY: 260 });
    expect(onOpenChange).not.toHaveBeenCalled();

    const heading = within(dialog).getByRole("heading", { name: "Bravo" });
    fireEvent.pointerDown(heading, { pointerId: 6, pointerType: "touch", clientX: 10, clientY: 100 });
    fireEvent.pointerUp(heading, { pointerId: 6, pointerType: "touch", clientX: 12, clientY: 260 });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    fireEvent.click(within(dialog).getByRole("button", { name: "Close now playing" }));
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("TrackRow", () => {
  it("shows number, hover play, explicit and unavailable states", async () => {
    const onPlay = vi.fn();
    const { container } = render(
      <div>
        <TrackRow track={tracks[0]} index={1} onPlay={onPlay} />
        <TrackRow track={tracks[1]} index={2} current playing onPlay={onPlay} />
        <TrackRow track={{ id: "x", title: "Gone", unavailable: true }} index={3} onPlay={onPlay} />
      </div>
    );
    fireEvent.click(screen.getByRole("button", { name: "Play Alpha" }));
    expect(onPlay).toHaveBeenCalledWith(tracks[0]);
    expect(screen.getByRole("button", { name: "Pause Bravo" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Explicit" })).toBeInTheDocument();
    expect(screen.getByText("3:05")).toBeInTheDocument();
    const gone = container.querySelector('[data-unavailable]')!;
    expect(gone).toHaveAttribute("aria-disabled", "true");
    expect(within(gone as HTMLElement).queryByRole("button")).toBeNull();
    expect(gone).toHaveTextContent("Unavailable");
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Cards & shelf                                                       */
/* ------------------------------------------------------------------ */

describe("PosterCard", () => {
  it("renders status, languages, progress, quiet actions and the busy overlay", async () => {
    const onPlay = vi.fn();
    const onDelete = vi.fn();
    const onShare = vi.fn();
    const actions = [
      { label: "Share", icon: <svg aria-hidden />, onSelect: onShare },
      { label: "Delete from disk", icon: <svg aria-hidden />, onSelect: onDelete, destructive: true },
    ];
    const { container, rerender } = render(
      <PosterCard
        title="Dune"
        year={2021}
        meta="2h 35m"
        onPlay={onPlay}
        status={{ label: "Transcoding", tone: "warning" }}
        languages={["en", "fr"]}
        progress={40}
        actions={actions}
      />
    );
    expect(screen.getByRole("heading", { name: "Dune" })).toBeInTheDocument();
    expect(screen.getByText("Transcoding")).toBeInTheDocument();
    expect(screen.getByText("en")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Watched" })).toHaveAttribute("aria-valuenow", "40");
    fireEvent.click(screen.getByRole("button", { name: "Delete from disk" }));
    expect(onDelete).toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete from disk" }).className).toContain("hover:bg-destructive");
    expect(screen.getByRole("button", { name: "Share" }).className).not.toContain("hover:bg-destructive");
    fireEvent.click(screen.getByRole("button", { name: "Play Dune" }));
    expect(onPlay).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);

    rerender(<PosterCard title="Dune" onPlay={onPlay} actions={actions} busy={{ label: "Moving…", progress: 42 }} />);
    expect(screen.getByRole("status", { name: "" }) ?? null).toBeTruthy();
    expect(screen.getByText("Moving… 42%")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();

    rerender(<PosterCard title="Dune" onPlay={onPlay} disabled disabledReason="Storage offline" />);
    expect(screen.getByRole("button", { name: "Dune: Storage offline" })).toBeDisabled();
  });

  it("EpisodeCard shows the episode number, runtime and description", async () => {
    const onPlay = vi.fn();
    const { container } = render(
      <EpisodeCard title="The Return" episode={3} season={1} runtime={2880} description="Things happen." progress={10} onPlay={onPlay} orientation="horizontal" />
    );
    expect(screen.getByText("S1 · E3")).toBeInTheDocument();
    expect(screen.getByText("48m")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Play episode 3: The Return" }));
    expect(onPlay).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("AlbumCard and PlaylistCard open and play separately", async () => {
    const onOpen = vi.fn();
    const onPlay = vi.fn();
    const { container } = render(
      <div>
        <AlbumCard title="Blue" subtitle="Joni Mitchell" onOpen={onOpen} onPlay={onPlay} />
        <PlaylistCard title="Road trip" count={12} artworks={["a.png", "b.png", "c.png", "d.png"]} onPlay={onPlay} playing />
      </div>
    );
    fireEvent.click(screen.getByRole("button", { name: "Play Blue" }));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Open Blue" }));
    expect(onOpen).toHaveBeenCalled();
    expect(screen.getByText("12 tracks")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause Road trip" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("MediaShelf", () => {
  it("pages with prev/next, tracks the edges and moves focus with arrows", async () => {
    const scrollBy = vi.fn();
    const onSeeAll = vi.fn();
    const { container } = render(
      <MediaShelf title="Continue watching" onSeeAll={onSeeAll}>
        {["One", "Two", "Three"].map((t) => (
          <PosterCard key={t} title={t} onPlay={() => {}} />
        ))}
      </MediaShelf>
    );
    expect(screen.getByRole("region", { name: "Continue watching" })).toBeInTheDocument();
    const list = container.querySelector("ul")!;
    list.scrollBy = scrollBy as unknown as typeof list.scrollBy;
    const prev = screen.getByRole("button", { name: "Scroll back" });
    const next = screen.getByRole("button", { name: "Scroll forward" });
    expect(prev).toBeDisabled();
    expect(next).toBeDisabled();

    act(() => {
      setProp(list, "clientWidth", 400);
      setProp(list, "scrollWidth", 1200);
      setProp(list, "scrollLeft", 0);
      list.dispatchEvent(new Event("scroll"));
    });
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(scrollBy).toHaveBeenCalledWith({ left: 360, behavior: "smooth" });

    act(() => {
      setProp(list, "scrollLeft", 800);
      list.dispatchEvent(new Event("scroll"));
    });
    expect(prev).toBeEnabled();
    expect(next).toBeDisabled();
    fireEvent.click(prev);
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -360, behavior: "smooth" });

    const first = screen.getByRole("button", { name: "Play One" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Play Two" }));
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Play Three" }));

    fireEvent.click(screen.getByRole("button", { name: "See all" }));
    expect(onSeeAll).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("switches to a grid from a breakpoint", () => {
    const { container } = render(
      <MediaShelf title="Library" gridAbove="md">
        <PosterCard title="A" />
      </MediaShelf>
    );
    expect(container.querySelector("ul")!.className).toContain("md:grid");
    expect(container.querySelector("li")!.className).toContain("md:w-auto");
  });
});

describe("MediaHero", () => {
  it("renders title, meta chips, synopsis and actions", async () => {
    const onPlay = vi.fn();
    const onMoreInfo = vi.fn();
    const { container } = render(
      <MediaHero title="Arrival" meta={["2016", "PG-13", "1h 56m"]} synopsis="A linguist is recruited." onPlay={onPlay} onMoreInfo={onMoreInfo} progress={30} />
    );
    expect(screen.getByRole("heading", { name: "Arrival" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Details" })).getAllByRole("listitem")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "More info" }));
    expect(onPlay).toHaveBeenCalled();
    expect(onMoreInfo).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* CastPicker                                                          */
/* ------------------------------------------------------------------ */

describe("CastPicker", () => {
  const devices: CastDevice[] = [
    { id: "me", name: "This MacBook", type: "laptop", current: true },
    { id: "tv", name: "Living room TV", type: "TV", description: "Apple TV" },
    { id: "phone", name: "Vyom's iPhone", type: "Mobile" },
    { id: "spk", name: "Kitchen speaker", type: "speaker", status: "busy" },
  ];

  it("lists devices and selects one", async () => {
    const onSelect = vi.fn();
    render(<CastPicker devices={devices} onSelect={onSelect} description="Dune (2021)" />);
    fireEvent.click(screen.getByRole("button", { name: "Play on another device" }));
    const dialog = screen.getByRole("dialog", { name: "Play on…" });
    expect(within(dialog).getByText("Dune (2021)")).toBeInTheDocument();
    const me = within(dialog).getByRole("button", { name: /This MacBook/ });
    expect(me).toHaveAttribute("aria-current", "true");
    expect(me).toHaveTextContent("This device");
    expect(within(dialog).getByRole("button", { name: /Kitchen speaker/ })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: /Living room TV/ }));
    expect(onSelect).toHaveBeenCalledWith(devices[1]);
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("shows connecting and connected states", () => {
    const onDisconnect = vi.fn();
    const { rerender } = render(
      <CastPicker variant="popover" defaultOpen devices={devices.map((d) => (d.id === "tv" ? { ...d, status: "connecting" } : d))} onDisconnect={onDisconnect} />
    );
    expect(screen.getByRole("status", { name: "Connecting to Living room TV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vyom's iPhone/ })).toBeDisabled();
    rerender(
      <CastPicker variant="popover" defaultOpen devices={devices.map((d) => (d.id === "tv" ? { ...d, status: "connected" } : d))} onDisconnect={onDisconnect} />
    );
    const tv = Array.from(document.querySelectorAll<HTMLElement>("[data-status]")).find((b) => b.textContent?.includes("Living room TV"))!;
    expect(tv).toHaveAttribute("data-status", "connected");
    expect(tv).toHaveTextContent("Connected");
    fireEvent.click(screen.getByRole("button", { name: "Disconnect Living room TV" }));
    expect(onDisconnect).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /connected to Living room TV/ })).toBeInTheDocument();
  });

  it("maps device types to icons", () => {
    expect(resolveDeviceKind("Mobile")).toBe("phone");
    expect(resolveDeviceKind("TV")).toBe("tv");
    expect(resolveDeviceKind("toaster")).toBe("desktop");
    render(<DeviceIcon type="speaker" label="Speaker" />);
    expect(screen.getByRole("img", { name: "Speaker" })).toBeInTheDocument();
  });
});
