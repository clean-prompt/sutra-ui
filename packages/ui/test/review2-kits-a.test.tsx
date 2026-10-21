/** Review 2 kit fixes (a): relative captions, MemoryMap zoom, PromptInputModelPill, ArtifactViewer fullscreen, TilingLayout tab drag. */
import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axeViolations } from "./helpers/a11y";
import { UsageLimitBars, formatResetCaption } from "../src/kits/ai/agent-usage";
import { AgentSessionList, formatAgentRelativeTime } from "../src/kits/agent/agent-sessions";
import { ConflictResolver, SyncStatus } from "../src/kits/workspace/sync-status";
import { formatRelativeTime } from "../src/lib/relative-time";
import { MemoryMap, type MemoryNode } from "../src/kits/workspace/memory-map";
import { PromptInputModelPill } from "../src/kits/ai/prompt-input";
import { ArtifactViewer } from "../src/kits/agent/artifacts";
import { TilingLayout, type LayoutNode } from "../src/patterns/tiling-layout";

const BASE = new Date("2026-10-19T12:00:00Z").getTime();
const MIN = 60_000;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function clock() {
  vi.useFakeTimers({ now: BASE, toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] });
}

/* ------------------------------------------------------------------ */
/* 1. Relative captions tick                                           */
/* ------------------------------------------------------------------ */

describe("relative captions refresh while mounted", () => {
  it("UsageLimitBars updates its reset caption without a `now` prop", () => {
    clock();
    const resetsAt = BASE + 2 * 60 * MIN + 30_000;
    render(<UsageLimitBars windows={[{ id: "s", label: "Session", percent: 40, resetsAt }]} />);
    const first = formatResetCaption(resetsAt, BASE);
    expect(screen.getByText(first)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(45 * MIN);
    });
    const later = formatResetCaption(resetsAt, Date.now());
    expect(later).not.toBe(first);
    expect(screen.getByText(later)).toBeInTheDocument();
  });

  it("UsageLimitBars keeps a fixed `now` prop", () => {
    clock();
    const resetsAt = BASE + 2 * 60 * MIN;
    render(<UsageLimitBars now={BASE} windows={[{ id: "s", label: "Session", percent: 40, resetsAt }]} />);
    act(() => {
      vi.advanceTimersByTime(45 * MIN);
    });
    expect(screen.getByText(formatResetCaption(resetsAt, BASE))).toBeInTheDocument();
  });

  it("AgentSessionList updates row times without a `now` prop", () => {
    clock();
    const updatedAt = BASE - 2 * MIN;
    render(<AgentSessionList sessions={[{ id: "s1", title: "Fix the bug", status: "idle", updatedAt }]} />);
    expect(screen.getByText(formatAgentRelativeTime(updatedAt, BASE))).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(10 * MIN);
    });
    const later = formatAgentRelativeTime(updatedAt, Date.now());
    expect(later).toBe("12m");
    expect(screen.getByText(later)).toBeInTheDocument();
  });

  it("AgentSessionList keeps a fixed `now` prop", () => {
    clock();
    render(<AgentSessionList now={BASE} sessions={[{ id: "s1", title: "Fix", status: "idle", updatedAt: BASE - 2 * MIN }]} />);
    act(() => {
      vi.advanceTimersByTime(10 * MIN);
    });
    expect(screen.getByText("2m")).toBeInTheDocument();
  });

  it("SyncStatus updates its last-synced text without a `now` prop", () => {
    clock();
    const last = BASE - 2 * MIN;
    render(<SyncStatus status="synced" lastSyncedAt={last} showLabel={false} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAccessibleDescription(`Last synced ${formatRelativeTime(last, BASE)}`);
    act(() => {
      vi.advanceTimersByTime(10 * MIN);
    });
    const later = formatRelativeTime(last, Date.now());
    expect(later).not.toBe(formatRelativeTime(last, BASE));
    expect(button).toHaveAccessibleDescription(`Last synced ${later}`);
  });

  it("SyncStatus keeps a fixed `now` prop", () => {
    clock();
    const last = BASE - 2 * MIN;
    render(<SyncStatus status="synced" lastSyncedAt={last} showLabel={false} now={new Date(BASE)} />);
    act(() => {
      vi.advanceTimersByTime(10 * MIN);
    });
    expect(screen.getByRole("button")).toHaveAccessibleDescription(`Last synced ${formatRelativeTime(last, BASE)}`);
  });

  it.each([true, false])("SyncStatus live region only changes on a state change (showLabel=%s)", async (showLabel) => {
    clock();
    const last = BASE - 2 * MIN;
    const { rerender } = render(<SyncStatus status="synced" lastSyncedAt={last} showLabel={showLabel} />);
    const region = screen.getByRole("status");
    const button = () => within(region).getByRole("button");
    const snapshot = () => ({ text: region.textContent, name: button().getAttribute("aria-label") ?? button().textContent });
    const before = snapshot();
    expect(before.name).not.toMatch(/ago/);
    act(() => {
      vi.advanceTimersByTime(MIN);
    });
    act(() => {
      vi.advanceTimersByTime(10 * MIN);
    });
    // The relative time did update, but only in the description, which lives outside the live region.
    expect(button()).toHaveAccessibleDescription(`Last synced ${formatRelativeTime(last, Date.now())}`);
    expect(region).not.toContainElement(document.getElementById(button().getAttribute("aria-describedby")!));
    expect(snapshot()).toEqual(before);
    expect(within(region).getByRole("button", { name: showLabel ? "Synced" : "Synced. All changes saved" })).toBeInTheDocument();

    rerender(<SyncStatus status="syncing" lastSyncedAt={last} showLabel={showLabel} />);
    const after = snapshot();
    expect(after.name).not.toBe(before.name);
    expect(after.name).toContain("Syncing…");
    // Icon-only has no text content; the change is carried by the name.
    if (showLabel) expect(after.text).not.toBe(before.text);
    vi.useRealTimers();
    expect(await axeViolations(region.parentElement!)).toEqual([]);
  });

  it("ConflictResolver version times update while open", () => {
    clock();
    const t = BASE - 2 * MIN;
    render(
      <ConflictResolver
        defaultOpen
        yours={{ content: "a", updatedAt: t, source: "This Mac" }}
        theirs={{ content: "b", updatedAt: t, source: "iPhone" }}
      />
    );
    const yours = screen.getByRole("region", { name: "Yours" });
    expect(yours).toHaveTextContent(formatRelativeTime(t, BASE));
    act(() => {
      vi.advanceTimersByTime(10 * MIN);
    });
    expect(yours).toHaveTextContent(formatRelativeTime(t, Date.now()));
  });

  it("does not tick when there is no relative caption to refresh", () => {
    clock();
    const spy = vi.spyOn(globalThis, "setInterval");
    render(
      <>
        <SyncStatus status="syncing" />
        <UsageLimitBars windows={[{ id: "s", label: "Session", percent: 40 }]} />
        <AgentSessionList sessions={[{ id: "s1", title: "Fix", status: "idle" }]} />
      </>
    );
    expect(spy).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* 2. MemoryMap wheel listener                                         */
/* ------------------------------------------------------------------ */

const kinds = ["fact", "skill", "person", "event"];
const memNodes: MemoryNode[] = Array.from({ length: 6 }, (_, i) => ({
  id: `n${i}`,
  label: `Node ${i}`,
  kind: kinds[i % 4]!,
  createdAt: BASE - i * 864e5,
}));

describe("MemoryMap wheel zoom", () => {
  it("attaches the wheel listener once and still uses the latest props", () => {
    const add = vi.spyOn(HTMLCanvasElement.prototype, "addEventListener");
    const wheelAdds = () => add.mock.calls.filter(([type]) => type === "wheel").length;
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<MemoryMap nodes={memNodes} staticLayout seed={1} onZoomChange={first} />);
    const afterMount = wheelAdds();
    expect(afterMount).toBeGreaterThan(0);
    rerender(<MemoryMap nodes={memNodes} staticLayout seed={1} onZoomChange={second} height={300} />);
    rerender(<MemoryMap nodes={memNodes} staticLayout seed={1} onZoomChange={second} height={320} />);
    expect(wheelAdds()).toBe(afterMount);

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const canvas = screen.getByRole("img");
    const wheel = new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true });
    canvas.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(second.mock.calls[0]![0].k).toBeGreaterThan(1);
  });

  it("re-attaches after switching back from the list view", () => {
    render(<MemoryMap nodes={memNodes} staticLayout seed={1} />);
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    const wheel = new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true });
    screen.getByRole("img").dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 3. PromptInputModelPill cooldown                                    */
/* ------------------------------------------------------------------ */

describe("PromptInputModelPill cooldown end", () => {
  const tick = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });

  it("does not fire onFastCooldownEnd when the cooldown is turned off mid-way", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] });
    const onEnd = vi.fn();
    const { rerender } = render(<PromptInputModelPill model="Opus" fast="cooldown" fastCooldown={5} onFastCooldownEnd={onEnd} />);
    tick(2000);
    rerender(<PromptInputModelPill model="Opus" fast="on" fastCooldown={5} onFastCooldownEnd={onEnd} />);
    tick(10_000);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("does not fire when the cooldown is canceled by clearing the seconds", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] });
    const onEnd = vi.fn();
    const { rerender } = render(<PromptInputModelPill model="Opus" fast="cooldown" fastCooldown={5} onFastCooldownEnd={onEnd} />);
    tick(2000);
    rerender(<PromptInputModelPill model="Opus" fast="off" onFastCooldownEnd={onEnd} />);
    tick(10_000);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("does not fire when the cooldown seconds are cleared while still in cooldown", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] });
    const onEnd = vi.fn();
    const { rerender } = render(<PromptInputModelPill model="Opus" fast="cooldown" fastCooldown={5} onFastCooldownEnd={onEnd} />);
    tick(2000);
    rerender(<PromptInputModelPill model="Opus" fast="cooldown" onFastCooldownEnd={onEnd} />);
    tick(10_000);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("does not fire on unmount mid-way", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] });
    const onEnd = vi.fn();
    const { unmount } = render(<PromptInputModelPill model="Opus" fast="cooldown" fastCooldown={3} onFastCooldownEnd={onEnd} />);
    tick(1000);
    unmount();
    tick(10_000);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("fires once when a restarted cooldown completes, using the latest callback", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] });
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<PromptInputModelPill model="Opus" fast="cooldown" fastCooldown={3} onFastCooldownEnd={first} />);
    tick(1000);
    rerender(<PromptInputModelPill model="Opus" fast="on" fastCooldown={3} onFastCooldownEnd={first} />);
    rerender(<PromptInputModelPill model="Opus" fast="cooldown" fastCooldown={2} onFastCooldownEnd={first} />);
    tick(1000);
    rerender(<PromptInputModelPill model="Opus" fast="cooldown" fastCooldown={2} onFastCooldownEnd={second} />);
    tick(1000);
    expect(screen.getByText("Fast mode off")).toBeInTheDocument();
    tick(5000);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------ */
/* 4. ArtifactViewer fullscreen is a real modal                        */
/* ------------------------------------------------------------------ */

describe("ArtifactViewer fullscreen", () => {
  const versions = [{ id: "1", content: "const a = 1;" }];

  it("traps focus in a modal dialog, hides the page and returns focus on Escape", async () => {
    const onFullscreenChange = vi.fn();
    render(
      <div>
        <button type="button">Outside</button>
        <ArtifactViewer title="counter.ts" kind="code" versions={versions} onFullscreenChange={onFullscreenChange} />
      </div>
    );
    const toggle = screen.getByRole("button", { name: "Fullscreen" });
    toggle.focus();
    fireEvent.click(toggle);
    expect(onFullscreenChange).toHaveBeenLastCalledWith(true);

    const dialog = await screen.findByRole("dialog", { name: "counter.ts" });
    expect(dialog).toHaveAttribute("data-fullscreen");
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Exit fullscreen" }));
    // The rest of the page is hidden from assistive tech while fullscreen.
    expect(screen.queryByRole("button", { name: "Outside" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Exit fullscreen" })).toHaveAttribute("aria-pressed", "true");
    expect(await axeViolations(document.body)).toEqual([]);

    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(onFullscreenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Fullscreen" }));
  });

  it("exits with the toggle and supports a controlled prop", async () => {
    const onFullscreenChange = vi.fn();
    const { rerender } = render(
      <ArtifactViewer title="counter.ts" kind="code" versions={versions} fullscreen onFullscreenChange={onFullscreenChange} />
    );
    const dialog = await screen.findByRole("dialog", { name: "counter.ts" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Exit fullscreen" }));
    expect(onFullscreenChange).toHaveBeenLastCalledWith(false);
    // Controlled: still open until the parent says otherwise.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    rerender(<ArtifactViewer title="counter.ts" kind="code" versions={versions} fullscreen={false} onFullscreenChange={onFullscreenChange} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("region", { name: "counter.ts" })).toBeInTheDocument();
  });

  it("forwards the ref in both modes", async () => {
    const ref = React.createRef<HTMLDivElement>();
    const { rerender } = render(<ArtifactViewer ref={ref} title="x" kind="code" versions={versions} />);
    expect(ref.current).toHaveAttribute("data-slot", "artifact-viewer");
    rerender(<ArtifactViewer ref={ref} title="x" kind="code" versions={versions} fullscreen />);
    await screen.findByRole("dialog");
    expect(ref.current).toHaveAttribute("data-fullscreen");
  });
});

/* ------------------------------------------------------------------ */
/* 5. TilingLayout tab drag: window listeners on unmount               */
/* ------------------------------------------------------------------ */

describe("TilingLayout tab drag", () => {
  it("removes its window listeners when unmounted mid-drag", () => {
    const live = new Map<string, Set<EventListenerOrEventListenerObject>>();
    const origAdd = window.addEventListener.bind(window);
    const origRemove = window.removeEventListener.bind(window);
    vi.spyOn(window, "addEventListener").mockImplementation((type: string, fn: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions) => {
      if (!live.has(type)) live.set(type, new Set());
      live.get(type)!.add(fn);
      origAdd(type, fn, opts);
    });
    vi.spyOn(window, "removeEventListener").mockImplementation((type: string, fn: EventListenerOrEventListenerObject, opts?: boolean | EventListenerOptions) => {
      live.get(type)?.delete(fn);
      origRemove(type, fn, opts);
    });
    const layout: LayoutNode = {
      type: "split",
      id: "root",
      direction: "row",
      sizes: [0.5, 0.5],
      children: [
        { type: "tabs", id: "g1", panes: ["a", "b"], active: "a" },
        { type: "tabs", id: "g2", panes: ["c"], active: "c" },
      ],
    };
    const before = (type: string) => live.get(type)?.size ?? 0;
    const counts = { move: before("pointermove"), up: before("pointerup") };
    const { unmount } = render(
      <TilingLayout layout={layout} onLayoutChange={() => {}} renderPane={(id) => <p>{id}</p>} paneTitle={(id) => id.toUpperCase()} />
    );
    const tab = screen.getByRole("tab", { name: "A" });
    const pointer = { pointerId: 1, pointerType: "mouse", button: 0 };
    fireEvent.pointerDown(tab, { ...pointer, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(tab, { ...pointer, clientX: 60, clientY: 40 });
    expect(before("pointermove")).toBeGreaterThan(counts.move);
    unmount();
    expect(before("pointermove")).toBe(counts.move);
    expect(before("pointerup")).toBe(counts.up);
  });
});

describe("ArtifactViewer fullscreen sizing", () => {
  it("fills the viewport even when the inline panel has a fixed height", async () => {
    render(<ArtifactViewer className="h-[520px] w-full" title="page.html" kind="code" versions={[{ id: "1", content: "x" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Fullscreen" }));
    const dialog = await screen.findByRole("dialog", { name: "page.html" });
    expect(dialog.className).toContain("h-dvh");
    expect(dialog.className).not.toContain("h-[520px]");
    expect(dialog.className).toContain("inset-0");
  });
});
