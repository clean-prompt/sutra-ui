/** Drawer on useDrag: no React render per move, imperative translate and scrim fade, touch-action, windowed velocity, cancel, reopen. */
import "./gesture-pointer";
import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "../src/primitives/drawer";

let clock = 0;
beforeEach(() => {
  clock = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
});
afterEach(() => vi.restoreAllMocks());

const touch = { pointerId: 1, pointerType: "touch", isPrimary: true } as const;
const at = (y: number) => ({ ...touch, clientX: 100, clientY: y });
const tick = (ms: number) => {
  clock += ms;
};

function Sheet(props: Partial<React.ComponentProps<typeof Drawer>> & { onRender?: () => void }) {
  const { onRender, ...rest } = props;
  return (
    <React.Profiler id="drawer" onRender={() => onRender?.()}>
      <Drawer defaultOpen {...rest}>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Sheet</DrawerTitle>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    </React.Profiler>
  );
}

describe("Drawer on useDrag", () => {
  it("does not re-render per pointer move and writes translate and the scrim fade straight to the DOM", () => {
    const onRender = vi.fn();
    render(<Sheet onRender={onRender} />);
    const dialog = screen.getByRole("dialog");
    const title = screen.getByText("Sheet");
    fireEvent.pointerDown(title, at(100));
    fireEvent.pointerMove(title, at(110));
    expect(dialog).toHaveAttribute("data-dragging", "true");
    const commits = onRender.mock.calls.length;
    for (let i = 1; i <= 25; i++) fireEvent.pointerMove(title, at(110 + i * 2));
    expect(onRender.mock.calls.length).toBe(commits);
    expect(dialog.style.translate).toBe("0 60px");
    const scrim = dialog.previousElementSibling as HTMLElement; // the overlay is the content's sibling in the portal
    expect(Number(scrim.style.opacity)).toBeLessThan(1);
    expect(Number(scrim.style.opacity)).toBeGreaterThan(0.2);
    fireEvent.pointerUp(title, at(160));
    expect(dialog).not.toHaveAttribute("data-dragging");
    expect(scrim.style.opacity).toBe("");
  });

  it("hands touch-action to the hook: vertical drags are ours, horizontal panning stays native", () => {
    render(<Sheet />);
    expect(screen.getByRole("dialog").style.touchAction).toBe("pan-x");
  });

  it("is not draggable when it cannot be dismissed and has one snap point", () => {
    render(<Sheet dismissible={false} />);
    expect(screen.getByRole("dialog").style.touchAction).toBeFalsy();
  });

  it("a short fast flick down dismisses (velocity from the last 100 ms)", async () => {
    render(<Sheet />);
    const title = screen.getByText("Sheet");
    fireEvent.pointerDown(title, at(100));
    tick(16);
    fireEvent.pointerMove(title, at(115));
    tick(16);
    fireEvent.pointerMove(title, at(140));
    tick(16);
    fireEvent.pointerUp(title, at(170)); // 70 px, about 1700 px/s
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("a drag that rested before the release does not count as a flick", () => {
    render(<Sheet />);
    const title = screen.getByText("Sheet");
    fireEvent.pointerDown(title, at(100));
    tick(16);
    fireEvent.pointerMove(title, at(130));
    tick(16);
    fireEvent.pointerMove(title, at(160)); // fast, then the finger rests
    tick(600);
    fireEvent.pointerUp(title, at(160)); // 60 px < 80, speed 0
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("returns to its snap point after a cancel and after a short drag", () => {
    render(<Sheet snapPoints={[0.5, 1]} />);
    const dialog = screen.getByRole("dialog");
    const title = screen.getByText("Sheet");
    const rest = dialog.style.translate;
    expect(rest).toMatch(/^0 [\d.]+px$/);
    fireEvent.pointerDown(title, at(100));
    fireEvent.pointerMove(title, at(110));
    fireEvent.pointerMove(title, at(150));
    expect(dialog.style.translate).not.toBe(rest);
    fireEvent.pointerCancel(title, at(150));
    expect(dialog.style.translate).toBe(rest);
    expect(dialog).toHaveAttribute("data-snap", "0.5");
  });

  it("a flick up expands and a flick down collapses, one snap point at a time", () => {
    const onSnap = vi.fn();
    render(<Sheet snapPoints={[0.3, 0.6, 1]} defaultSnapPoint={0.6} onSnapPointChange={onSnap} dismissible={false} />);
    const title = screen.getByText("Sheet");
    fireEvent.pointerDown(title, at(300));
    tick(10);
    fireEvent.pointerMove(title, at(280));
    tick(10);
    fireEvent.pointerMove(title, at(250));
    tick(10);
    fireEvent.pointerUp(title, at(240));
    expect(onSnap).toHaveBeenLastCalledWith(1);
    fireEvent.pointerDown(title, at(100));
    tick(10);
    fireEvent.pointerMove(title, at(120));
    tick(10);
    fireEvent.pointerMove(title, at(150));
    tick(10);
    fireEvent.pointerUp(title, at(160));
    expect(onSnap).toHaveBeenLastCalledWith(0.6);
  });

  it("closing in the middle of a drag does not leave the next open stuck", async () => {
    const App = () => {
      const [open, setOpen] = React.useState(true);
      return (
        <>
          <button onClick={() => setOpen(true)}>reopen</button>
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Sheet</DrawerTitle>
              </DrawerHeader>
            </DrawerContent>
          </Drawer>
        </>
      );
    };
    render(<App />);
    fireEvent.pointerDown(screen.getByText("Sheet"), at(100));
    fireEvent.pointerMove(screen.getByText("Sheet"), at(130));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByText("reopen"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).not.toHaveAttribute("data-dragging");
    expect(dialog.style.translate).toBe("");
    fireEvent.pointerDown(screen.getByText("Sheet"), at(100));
    fireEvent.pointerMove(screen.getByText("Sheet"), at(120));
    expect(dialog).toHaveAttribute("data-dragging", "true");
    fireEvent.pointerUp(screen.getByText("Sheet"), at(120));
  });

  it("keeps consumer pointer handlers and lets them cancel a drag", () => {
    const onPointerDown = vi.fn((e: React.PointerEvent) => e.preventDefault());
    render(
      <Drawer defaultOpen>
        <DrawerContent onPointerDown={onPointerDown}>
          <DrawerHeader>
            <DrawerTitle>Sheet</DrawerTitle>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    );
    fireEvent.pointerDown(screen.getByText("Sheet"), at(100));
    fireEvent.pointerMove(screen.getByText("Sheet"), at(160));
    expect(onPointerDown).toHaveBeenCalled();
    expect(screen.getByRole("dialog")).not.toHaveAttribute("data-dragging");
  });
});
