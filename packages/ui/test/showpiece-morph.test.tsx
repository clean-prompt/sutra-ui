/** ExpandCard / MorphDialog: the flight out of the card and back, focus, Escape, close button, scrim, controlled use, reduced motion, a11y. */
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExpandCard, MorphDialog } from "../src/patterns/morph-dialog";
import { axeViolations } from "./a11y";

const original = window.matchMedia;
const reduceMotion = (on: boolean) => {
  window.matchMedia = ((query: string) => ({ ...original(query), matches: on && query.includes("reduce") })) as typeof window.matchMedia;
};

interface Call {
  el: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  finish: () => void;
  cancelled: boolean;
}
let calls: Call[] = [];
const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} }) as DOMRect;

beforeEach(() => {
  calls = [];
  (Element.prototype as unknown as { animate: unknown }).animate = function (this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
    let finish!: () => void;
    const finished = new Promise<void>((r) => (finish = r));
    const call: Call = { el: this, keyframes, options, finish, cancelled: false };
    calls.push(call);
    return { finished, cancel: () => void (call.cancelled = true) };
  };
  const real = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const slot = this.getAttribute("data-slot");
    if (slot === "expand-card") return rect(20, 40, 300, 80);
    if (slot === "morph-dialog-frame") return rect(100, 100, 500, 400);
    return real.call(this);
  });
  reduceMotion(false);
});
afterEach(() => {
  delete (Element.prototype as unknown as { animate?: unknown }).animate;
  vi.restoreAllMocks();
  window.matchMedia = original;
});

const finishAll = async () => {
  await act(async () => {
    calls.filter((c) => !c.cancelled).forEach((c) => c.finish());
  });
};
const frameCalls = () => calls.filter((c) => c.el.getAttribute("data-slot") === "morph-dialog-frame");
const panelCalls = () => calls.filter((c) => c.el.getAttribute("data-slot") === "morph-dialog-panel");

function Card(props: Partial<React.ComponentProps<typeof ExpandCard>>) {
  return (
    <ExpandCard title="Team sync" description="Event details" detail={<p>Agenda: roadmap</p>} {...props}>
      <span className="block font-medium">Team sync</span>
      <span className="block text-sm">10:00 to 11:00</span>
    </ExpandCard>
  );
}
// Radix hides everything outside an open modal from assistive technology, the card included.
const card = () => screen.getByRole("button", { name: /Team sync/, hidden: true });

describe("ExpandCard opening", () => {
  it("is a button that announces a dialog and is hidden while open", () => {
    render(<Card />);
    expect(card()).toHaveAttribute("aria-haspopup", "dialog");
    expect(card()).not.toHaveAttribute("data-open");
    fireEvent.click(card());
    expect(screen.getByRole("dialog", { name: "Team sync" })).toBeInTheDocument();
    expect(card()).toHaveAttribute("data-open", "true");
  });

  it("flies out of the card's own rectangle: translate onto the card's corner and a clip to its size", () => {
    render(<Card />);
    fireEvent.click(card());
    const frame = frameCalls().at(-1)!;
    const panel = panelCalls().at(-1)!;
    expect(frame.keyframes[0]).toEqual({ transform: "translate(-80px, -60px)" }); // card (20, 40) onto panel (100, 100)
    expect(frame.keyframes[1]).toEqual({ transform: "translate(0px, 0px)" });
    expect(panel.keyframes[0]!.clipPath).toBe("inset(0px 200px 320px 0px round 0px)"); // 300 x 80 window in a 500 x 400 panel
    expect(panel.keyframes[1]!.clipPath).toBe("inset(0px 0px 0px 0px round 0px)");
    expect(frame.options.fill).toBe("backwards");
    expect(calls.some((c) => c.el.hasAttribute("data-morph-fade"))).toBe(true); // the detail fades in late
  });

  it("mirrors the anchor corner in right-to-left text", () => {
    render(
      <div dir="rtl">
        <Card />
      </div>
    );
    fireEvent.click(card());
    expect(panelCalls().at(-1)!.keyframes[0]!.clipPath).toBe("inset(0px 0px 320px 200px round 0px)");
    expect(frameCalls().at(-1)!.keyframes[0]!.transform).toBe("translate(-280px, -60px)"); // card right 320, panel right 600
  });

  it("repeats the face for the morph, hidden from assistive technology and inert; repeatFace={false} skips it", () => {
    const { unmount } = render(<Card />);
    fireEvent.click(card());
    const face = document.querySelector('[data-slot="expand-card-face"]')!;
    expect(face).toHaveAttribute("aria-hidden", "true");
    expect(face).toHaveAttribute("inert");
    expect(face).toHaveTextContent("Team sync");
    unmount();
    render(<Card repeatFace={false} />);
    fireEvent.click(card());
    expect(document.querySelector('[data-slot="expand-card-face"]')).toBeNull();
    expect(screen.getByText("Agenda: roadmap")).toBeInTheDocument();
  });

  it("wires the description and reports the end of the flight", async () => {
    const onMorphEnd = vi.fn();
    render(<Card onMorphEnd={onMorphEnd} />);
    fireEvent.click(card());
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription("Event details");
    expect(onMorphEnd).not.toHaveBeenCalled();
    await finishAll();
    expect(onMorphEnd).toHaveBeenCalledWith("open");
  });
});

describe("ExpandCard closing", () => {
  it("Escape flies the panel back onto the card, keeps it mounted until it lands, then returns focus to the card", async () => {
    const onMorphEnd = vi.fn();
    render(<Card onMorphEnd={onMorphEnd} />);
    card().focus();
    fireEvent.click(card());
    await finishAll();
    calls = [];
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument(); // still flying
    expect(card()).not.toHaveAttribute("data-open"); // the card is back underneath
    const frame = frameCalls().at(-1)!;
    expect(frame.keyframes[0]).toEqual({ transform: "translate(0px, 0px)" });
    expect(frame.keyframes[1]).toEqual({ transform: "translate(-80px, -60px)" });
    expect(frame.options.fill).toBe("both");
    await finishAll();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onMorphEnd).toHaveBeenLastCalledWith("close");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(card()).toHaveFocus();
  });

  it("the close button and a press on the scrim close it too", async () => {
    render(<Card />);
    fireEvent.click(card());
    await finishAll();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await finishAll();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(card());
    await finishAll();
    fireEvent.pointerDown(screen.getByRole("dialog"));
    await finishAll();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("a press inside the panel does not close it, and the detail function gets close", async () => {
    render(<Card detail={({ close }) => <button type="button" onClick={close}>Done</button>} />);
    fireEvent.click(card());
    await finishAll();
    fireEvent.pointerDown(document.querySelector('[data-slot="morph-dialog-panel"]')!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await finishAll();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ignores the scrim while it is already closing, and a reopen mid-flight keeps the dialog", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Card open onOpenChange={onOpenChange} />);
    await finishAll();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    rerender(<Card open={false} onOpenChange={onOpenChange} />); // the parent follows the request: the flight back starts
    onOpenChange.mockClear();
    fireEvent.pointerDown(screen.getByRole("dialog"));
    expect(onOpenChange).not.toHaveBeenCalled();
    const flight = calls.filter((c) => c.options.fill === "both"); // the closing flight
    rerender(<Card open onOpenChange={onOpenChange} />); // and opens again before it lands
    expect(flight.every((c) => c.cancelled)).toBe(true);
    await finishAll();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("controlled use", () => {
  it("follows open and only asks to change it", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Card open={false} onOpenChange={onOpenChange} />);
    fireEvent.click(card());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<Card open onOpenChange={onOpenChange} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    rerender(<Card open={false} onOpenChange={onOpenChange} />);
    await finishAll();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("starts open with defaultOpen", () => {
    render(<Card defaultOpen />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("MorphDialog on its own", () => {
  function Opener({ origin }: { origin?: React.ComponentProps<typeof MorphDialog>["origin"] }) {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>Open it</button>
        <MorphDialog open={open} onOpenChange={setOpen} origin={origin} title="Preview">
          <p>Body</p>
        </MorphDialog>
      </>
    );
  }

  it("flies from a rectangle you give it and hands focus back to whatever opened it (no trigger)", async () => {
    render(<Opener origin={{ left: 10, top: 20, width: 100, height: 60 }} />);
    const opener = screen.getByRole("button", { name: "Open it" });
    opener.focus();
    fireEvent.click(opener);
    expect(frameCalls().at(-1)!.keyframes[0]).toEqual({ transform: "translate(-90px, -80px)" });
    await finishAll();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await finishAll();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("lifts in when there is no origin", () => {
    render(<Opener />);
    fireEvent.click(screen.getByRole("button", { name: "Open it" }));
    const frame = frameCalls().at(-1)!;
    expect(frame.keyframes[0]).toMatchObject({ opacity: 0 });
    expect(panelCalls()).toHaveLength(0);
  });

  it("shows the title when asked", () => {
    render(<MorphDialog defaultOpen title="Visible title" showTitle />);
    expect(screen.getByText("Visible title")).not.toHaveClass("sr-only");
  });

  it("takes the three variants", () => {
    const { rerender } = render(<MorphDialog defaultOpen title="T" variant="sheet" />);
    expect(screen.getByRole("dialog").className).toContain("place-items-end");
    rerender(<MorphDialog defaultOpen title="T" variant="dialog" />);
    expect(screen.getByRole("dialog").className).toContain("place-items-center");
  });
});

describe("reduced motion and a11y", () => {
  it("has no flight under reduced motion: it opens and closes at once", async () => {
    reduceMotion(true);
    const onMorphEnd = vi.fn();
    render(<Card onMorphEnd={onMorphEnd} />);
    fireEvent.click(card());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    expect(onMorphEnd).toHaveBeenCalledWith("open");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onMorphEnd).toHaveBeenLastCalledWith("close");
    expect(calls).toHaveLength(0);
  });

  it("works where animate is missing", () => {
    delete (Element.prototype as unknown as { animate?: unknown }).animate;
    render(<Card />);
    fireEvent.click(card());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is axe clean closed and open, with and without a description", async () => {
    const { baseElement } = render(<Card />);
    expect(await axeViolations(baseElement)).toEqual([]);
    fireEvent.click(card());
    await finishAll();
    expect(await axeViolations(baseElement)).toEqual([]);
  });

  it("is axe clean open without a description", async () => {
    const { baseElement } = render(<Card description={undefined} />);
    fireEvent.click(card());
    await finishAll();
    expect(await axeViolations(baseElement)).toEqual([]);
  });

  it("spreads props onto the card button and merges className", () => {
    render(<Card data-testid="c" className="extra" disabled />);
    expect(screen.getByTestId("c")).toHaveClass("extra", "block");
    expect(screen.getByTestId("c")).toBeDisabled();
  });
});
