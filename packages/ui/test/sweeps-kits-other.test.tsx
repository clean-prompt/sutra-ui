import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { formatClock, formatDuration } from "../src/lib/duration";
import { formatMediaTime } from "../src/kits/media/media-controls";
import { createPlayerQueue, playerQueueReducer } from "../src/kits/media/audio-player";
import { formatKanbanDuration, moveCard, type KanbanBoardModel } from "../src/kits/workspace/kanban-model";
import { MemoryMap, type MemoryNode } from "../src/kits/workspace/memory-map";
import { AudioLevelMeter } from "../src/kits/voice/voice";

describe("deprecated formatter presets match the lib calls their callers now use", () => {
  it("formatMediaTime === formatClock(seconds, { forceHours, minus })", () => {
    for (const s of [0, 5, 65, 3599.9, 3661, -3, NaN, Infinity]) {
      expect(formatMediaTime(s)).toBe(formatClock(s));
      expect(formatMediaTime(s, { forceHours: true })).toBe(formatClock(s, { forceHours: true }));
      expect(formatMediaTime(s, { negative: true })).toBe(formatClock(s, { minus: true }));
    }
    expect(formatMediaTime(65)).toBe("1:05");
    expect(formatMediaTime(65, { forceHours: true, negative: true })).toBe("-0:01:05");
  });

  it('formatKanbanDuration === formatDuration(ms, { maxUnit: "h", negative: "invalid" })', () => {
    for (const ms of [0, 45_000, 200_000, 26 * 3_600_000 + 300_000, -1, NaN]) {
      expect(formatKanbanDuration(ms)).toBe(formatDuration(ms, { maxUnit: "h", negative: "invalid" }));
    }
    expect(formatKanbanDuration(26 * 3_600_000 + 300_000)).toBe("26h 5m");
    expect(formatKanbanDuration(-1)).toBe("—");
  });
});

describe("index clamps that moved to lib helpers", () => {
  const board: KanbanBoardModel = {
    columns: [
      { id: "a", title: "A" },
      { id: "b", title: "B" },
    ],
    cards: [
      { id: "1", title: "One", columnId: "a" },
      { id: "2", title: "Two", columnId: "b" },
      { id: "3", title: "Three", columnId: "b" },
    ],
  };

  it("moveCard clamps the destination index (lib clamp)", () => {
    expect(moveCard(board, { cardId: "1", toColumn: "b", toIndex: 99 }).toIndex).toBe(2);
    expect(moveCard(board, { cardId: "1", toColumn: "b", toIndex: -5 }).toIndex).toBe(0);
    expect(moveCard(board, { cardId: "1", toColumn: "b", toIndex: NaN }).toIndex).toBe(0);
  });

  it("player queue moves reorder the play order (reorderArray)", () => {
    const q = createPlayerQueue([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);
    expect(playerQueueReducer(q, { type: "move", from: 0, to: 3 }).order).toEqual(["b", "c", "d", "a"]);
    expect(playerQueueReducer(q, { type: "move", from: 3, to: 1 }).order).toEqual(["a", "d", "b", "c"]);
    expect(playerQueueReducer(q, { type: "move", from: 0, to: 4 })).toBe(q);
  });

  it("AudioLevelMeter clamps the level to 0..1", () => {
    const { rerender } = render(<AudioLevelMeter level={2} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
    rerender(<AudioLevelMeter level={-1} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
    rerender(<AudioLevelMeter level={NaN} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
    rerender(<AudioLevelMeter level={0.42} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "42");
  });
});

describe("MemoryMap measures its container through useResizeObserver", () => {
  type Live = { cb: ResizeObserverCallback; targets: Element[]; live: boolean };
  const observers: Live[] = [];
  const original = globalThis.ResizeObserver;
  class FakeResizeObserver {
    rec: Live;
    constructor(cb: ResizeObserverCallback) {
      this.rec = { cb, targets: [], live: true };
      observers.push(this.rec);
    }
    observe(el: Element) {
      this.rec.targets.push(el);
    }
    unobserve() {}
    disconnect() {
      this.rec.live = false;
    }
  }
  afterEach(() => {
    globalThis.ResizeObserver = original;
    observers.length = 0;
  });

  const nodes: MemoryNode[] = Array.from({ length: 4 }, (_, i) => ({ id: `n${i}`, label: `Node ${i}`, kind: "fact", createdAt: i * 1000 }));
  const resize = (el: Element, width: number) =>
    act(() => {
      for (const o of observers.filter((o) => o.live && o.targets.includes(el))) {
        o.cb([{ target: el, contentRect: { width } as DOMRectReadOnly } as ResizeObserverEntry], {} as ResizeObserver);
      }
    });

  it("follows the container width, ignores zero widths and re-subscribes after list view", () => {
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
    const { container, rerender } = render(<MemoryMap nodes={nodes} staticLayout listView={false} />);
    const canvas = () => container.querySelector("canvas")!;
    expect(canvas()).toHaveAttribute("width", "640");
    resize(canvas().parentElement!, 900);
    expect(canvas()).toHaveAttribute("width", "900");
    resize(canvas().parentElement!, 0);
    expect(canvas()).toHaveAttribute("width", "900");
    const first = canvas().parentElement!;

    rerender(<MemoryMap nodes={nodes} staticLayout listView />);
    expect(container.querySelector("canvas")).toBeNull();
    expect(observers.some((o) => o.live && o.targets.includes(first))).toBe(false);

    rerender(<MemoryMap nodes={nodes} staticLayout listView={false} />);
    resize(canvas().parentElement!, 720);
    expect(canvas()).toHaveAttribute("width", "720");
  });
});
