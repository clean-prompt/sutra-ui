/** SwipeDeck: drag, buttons and keys, undo, empty state, controlled index, right-to-left, reduced motion, loading, a11y. */
import "./gesture-pointer";
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SwipeDeck, type SwipeDeckApi, type SwipeDeckProps } from "../src/patterns/swipe-deck";
import { axeViolations } from "./a11y";

const original = window.matchMedia;
const reduceMotion = (on: boolean) => {
  window.matchMedia = ((query: string) => ({ ...original(query), matches: on && query.includes("reduce") })) as typeof window.matchMedia;
};
let clock = 0;
let frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
const run = (ms: number) => {
  for (let t = 0; t < ms; t += 16) {
    clock += 16;
    const batch = [...frames.values()];
    frames = new Map();
    act(() => batch.forEach((cb) => cb(clock)));
  }
};
beforeEach(() => {
  clock = 1000;
  frames = new Map();
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    frames.set(++frameId, cb);
    return frameId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => void frames.delete(id));
  reduceMotion(false);
});
afterEach(() => {
  vi.restoreAllMocks();
  window.matchMedia = original;
  document.documentElement.removeAttribute("dir");
});

interface Card {
  id: number;
  title: string;
}
const cards: Card[] = [
  { id: 1, title: "Invoice 12" },
  { id: 2, title: "Receipt 8" },
  { id: 3, title: "Contract 3" },
];

function Deck(props: Partial<SwipeDeckProps<Card>>) {
  return (
    <SwipeDeck
      items={cards}
      getKey={(c) => c.id}
      getLabel={(c) => c.title}
      renderCard={(c) => <div className="p-4">{c.title}</div>}
      {...props}
    />
  );
}
const stage = () => screen.getByRole("group", { name: "Card deck" });
const topCard = () => document.querySelector('[data-position="top"] [role="group"]') as HTMLElement;
const touch = { pointerId: 1, pointerType: "touch", isPrimary: true } as const;
const at = (x: number, y = 0) => ({ ...touch, clientX: x, clientY: y });
const drag = (el: HTMLElement, to: number, { steps = 6, gap = 16, release = true } = {}) => {
  fireEvent.pointerDown(el, at(0));
  for (let i = 1; i <= steps; i++) {
    clock += gap;
    fireEvent.pointerMove(el, at((to / steps) * i));
  }
  if (release) fireEvent.pointerUp(el, at(to));
};

describe("SwipeDeck structure", () => {
  it("is a labelled deck with the top card named by its place and the others inert", () => {
    render(<Deck />);
    expect(stage()).toHaveAttribute("aria-roledescription", "card deck");
    expect(stage()).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("group", { name: "Card 1 of 3" })).toHaveTextContent("Invoice 12");
    const behind = Array.from(document.querySelectorAll('[data-position="behind"]'));
    expect(behind).toHaveLength(2);
    expect(behind.every((el) => el.getAttribute("aria-hidden") === "true" && el.hasAttribute("inert"))).toBe(true);
    expect(stage().getAttribute("aria-describedby")).toBeTruthy();
  });

  it("renders at most stack + 1 cards and hides the deepest", () => {
    const many = Array.from({ length: 9 }, (_, id) => ({ id, title: `Card ${id}` }));
    render(<Deck items={many} stack={3} />);
    const all = document.querySelectorAll('[data-slot="swipe-deck-card"]');
    expect(all).toHaveLength(4);
    expect(all[3]!.className).toContain("opacity-0");
    expect(all[2]!.className).not.toContain("opacity-0");
  });

  it("spreads props onto the root and merges className", () => {
    render(<Deck data-testid="deck" className="extra" />);
    expect(screen.getByTestId("deck")).toHaveClass("extra", "flex");
    expect(screen.getByTestId("deck")).toHaveAttribute("data-slot", "swipe-deck");
  });
});

describe("buttons and keys", () => {
  it("Skip and Keep report the side, the item and the index, and advance", () => {
    const onSwipe = vi.fn();
    render(<Deck onSwipe={onSwipe} />);
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(onSwipe).toHaveBeenLastCalledWith("end", cards[0], 0);
    expect(screen.getByRole("group", { name: "Card 2 of 3" })).toHaveTextContent("Receipt 8");
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onSwipe).toHaveBeenLastCalledWith("start", cards[1], 1);
    expect(screen.getByRole("group", { name: "Card 3 of 3" })).toBeInTheDocument();
  });

  it("announces each swipe and the cards left", () => {
    render(<Deck />);
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(document.querySelector("[aria-live=polite]")).toHaveTextContent("Keep: Invoice 12. 2 left");
  });

  it("arrow keys and Enter on the focused deck do the same", () => {
    const onSwipe = vi.fn();
    render(<Deck onSwipe={onSwipe} />);
    fireEvent.keyDown(stage(), { key: "ArrowRight" });
    fireEvent.keyDown(stage(), { key: "ArrowLeft" });
    fireEvent.keyDown(stage(), { key: "Enter" });
    expect(onSwipe.mock.calls.map((c) => c[0])).toEqual(["end", "start", "end"]);
  });

  it("does not take keys that belong to something inside a card", () => {
    const onSwipe = vi.fn();
    render(<Deck onSwipe={onSwipe} renderCard={() => <input aria-label="note" />} />);
    fireEvent.keyDown(screen.getAllByLabelText("note")[0]!, { key: "Enter" });
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it("is mirrored in right-to-left text: ArrowLeft takes the end side", () => {
    const onSwipe = vi.fn();
    render(
      <div dir="rtl">
        <Deck onSwipe={onSwipe} />
      </div>
    );
    fireEvent.keyDown(stage(), { key: "ArrowLeft" });
    fireEvent.keyDown(stage(), { key: "ArrowRight" });
    expect(onSwipe.mock.calls.map((c) => c[0])).toEqual(["end", "start"]);
  });

  it("disabled ignores everything", () => {
    const onSwipe = vi.fn();
    render(<Deck disabled onSwipe={onSwipe} />);
    fireEvent.keyDown(stage(), { key: "Enter" });
    expect(screen.getByRole("button", { name: "Keep" })).toBeDisabled();
    drag(topCard(), 150);
    expect(onSwipe).not.toHaveBeenCalled();
  });
});

describe("undo", () => {
  it("is disabled until there is a swipe, then brings the last card back (button and Ctrl+Z)", () => {
    const onUndo = vi.fn();
    render(<Deck onUndo={onUndo} />);
    const undo = screen.getByRole("button", { name: "Undo" });
    expect(undo).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(undo).toBeEnabled();
    fireEvent.click(undo);
    expect(onUndo).toHaveBeenLastCalledWith(cards[1], 1);
    expect(screen.getByRole("group", { name: "Card 2 of 3" })).toBeInTheDocument();
    fireEvent.keyDown(stage(), { key: "z", ctrlKey: true });
    expect(onUndo).toHaveBeenLastCalledWith(cards[0], 0);
    expect(screen.getByRole("group", { name: "Card 1 of 3" })).toBeInTheDocument();
    expect(undo).toBeDisabled();
    expect(document.querySelector("[aria-live=polite]")).toHaveTextContent("Undid Keep: Invoice 12");
  });

  it("an undone card flies back in from the side it left (settles to rest)", () => {
    render(<Deck />);
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    run(1500); // the first card is gone
    expect(document.querySelectorAll('[data-position="leaving"]')).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    const back = topCard();
    expect(back).toHaveTextContent("Invoice 12");
    expect(parseFloat(back.style.getPropertyValue("--sutra-drag-x"))).toBeGreaterThan(100); // starts off to the end side
    run(1500);
    expect(parseFloat(back.style.getPropertyValue("--sutra-drag-x"))).toBeCloseTo(0, 0);
  });
});

describe("dragging", () => {
  it("a drag past the distance flies the card away and reports the side", () => {
    const onSwipe = vi.fn();
    render(<Deck onSwipe={onSwipe} />);
    const first = topCard();
    drag(first, 140);
    expect(onSwipe).toHaveBeenCalledWith("end", cards[0], 0);
    expect(document.querySelector('[data-position="leaving"]')).toBeInTheDocument();
    run(1500);
    expect(document.querySelector('[data-position="leaving"]')).toBeNull();
    expect(screen.getByRole("group", { name: "Card 2 of 3" })).toBeInTheDocument();
  });

  it("tilts 0.05 degrees per px while dragging and shows the stamp of the side", () => {
    render(<Deck />);
    const first = topCard();
    drag(first, 100, { release: false });
    expect(parseFloat(first.style.getPropertyValue("--sutra-deck-tilt"))).toBeCloseTo(5, 1);
    expect(parseFloat(first.style.getPropertyValue("--sutra-deck-end"))).toBeGreaterThan(0.5);
    expect(first.style.getPropertyValue("--sutra-deck-start")).toBe("0");
    fireEvent.pointerUp(first, at(100));
  });

  it("a short drag springs back and reports nothing", () => {
    const onSwipe = vi.fn();
    render(<Deck onSwipe={onSwipe} />);
    const first = topCard();
    drag(first, 40, { gap: 200 });
    run(1500);
    expect(onSwipe).not.toHaveBeenCalled();
    expect(parseFloat(first.style.getPropertyValue("--sutra-drag-x"))).toBeCloseTo(0, 0);
    expect(screen.getByRole("group", { name: "Card 1 of 3" })).toBeInTheDocument();
  });

  it("leftwards is the start side in left-to-right text and the end side in right-to-left", () => {
    const onSwipe = vi.fn();
    const { unmount } = render(<Deck onSwipe={onSwipe} />);
    drag(topCard(), -140);
    expect(onSwipe).toHaveBeenLastCalledWith("start", cards[0], 0);
    unmount();
    render(
      <div dir="rtl">
        <Deck onSwipe={onSwipe} />
      </div>
    );
    drag(topCard(), -140);
    expect(onSwipe).toHaveBeenLastCalledWith("end", cards[0], 0);
  });

  it("a mostly vertical gesture is left to the page", () => {
    const onSwipe = vi.fn();
    render(<Deck onSwipe={onSwipe} />);
    const first = topCard();
    fireEvent.pointerDown(first, at(0, 0));
    fireEvent.pointerMove(first, at(4, 60));
    fireEvent.pointerUp(first, at(4, 120));
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it("only the top card can be dragged", () => {
    expect(render(<Deck />)).toBeTruthy();
    expect(document.querySelectorAll('[data-position="behind"] [role="group"]')).toHaveLength(0);
  });
});

describe("empty, controlled and loading", () => {
  it("fires onEmpty after the last card and shows the empty state (undo still works)", () => {
    const onEmpty = vi.fn();
    render(<Deck items={cards.slice(0, 1)} onEmpty={onEmpty} emptyState={<span>Inbox zero</span>} />);
    expect(screen.queryByText("Inbox zero")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(onEmpty).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Inbox zero")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    expect(document.querySelector("[aria-live=polite]")).toHaveTextContent("No cards left");
  });

  it("has a default empty state", () => {
    render(<Deck items={[]} />);
    expect(screen.getByText("All caught up")).toBeInTheDocument();
  });

  it("follows a controlled index and only asks to change it", () => {
    const onIndexChange = vi.fn();
    const { rerender } = render(<Deck index={0} onIndexChange={onIndexChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(onIndexChange).toHaveBeenCalledWith(1);
    expect(screen.getByRole("group", { name: "Card 1 of 3" })).toBeInTheDocument();
    rerender(<Deck index={2} onIndexChange={onIndexChange} />);
    expect(screen.getByRole("group", { name: "Card 3 of 3" })).toBeInTheDocument();
  });

  it("starts at defaultIndex and clamps an index past the end", () => {
    const { rerender } = render(<Deck defaultIndex={1} />);
    expect(screen.getByRole("group", { name: "Card 2 of 3" })).toBeInTheDocument();
    rerender(<Deck index={99} />);
    expect(screen.getByText("All caught up")).toBeInTheDocument();
  });

  it("loading shows skeleton cards, no buttons, aria-busy and one status text", () => {
    render(<Deck loading data-testid="deck" />);
    expect(screen.getByTestId("deck")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Loading cards…")).toHaveClass("sr-only");
    expect(screen.queryByText("All caught up")).toBeNull();
  });

  it("apiRef swipes and undoes", () => {
    const api = React.createRef<SwipeDeckApi>();
    const onSwipe = vi.fn();
    render(<Deck apiRef={api} onSwipe={onSwipe} />);
    act(() => api.current!.swipe("start"));
    expect(onSwipe).toHaveBeenCalledWith("start", cards[0], 0);
    act(() => api.current!.undo());
    expect(screen.getByRole("group", { name: "Card 1 of 3" })).toBeInTheDocument();
  });
});

describe("reduced motion and a11y", () => {
  it("drops the flight: a swipe removes the card at once and an undo restores it in place", () => {
    reduceMotion(true);
    render(<Deck />);
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(document.querySelector('[data-position="leaving"]')).toBeNull();
    expect(screen.getByRole("group", { name: "Card 2 of 3" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(parseFloat(topCard().style.getPropertyValue("--sutra-drag-x"))).toBe(0);
  });

  it("is axe clean, also empty and loading", async () => {
    const { container, rerender } = render(<Deck />);
    expect(await axeViolations(container)).toEqual([]);
    rerender(<Deck index={3} />);
    expect(await axeViolations(container)).toEqual([]);
    rerender(<Deck loading />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
