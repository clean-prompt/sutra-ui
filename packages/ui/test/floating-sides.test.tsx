import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Tooltip, TooltipContent, TooltipTrigger, SimpleTooltip } from "../src/primitives/tooltip";
import { Popover, PopoverContent, PopoverTrigger, HoverCard, HoverCardContent, HoverCardTrigger } from "../src/primitives/popover";
import { DirectionProvider } from "../src/primitives/direction-provider";
import { resolveFloatingSide } from "../src/primitives/floating-side-internal";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("dir");
});

const sideOf = (el: Element | null) => el?.closest("[data-side]")?.getAttribute("data-side");

function Pop({ side }: { side?: "start" | "end" | "left" | "right" | "top" | "bottom" }) {
  return (
    <Popover defaultOpen>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent side={side} avoidCollisions={false}>Panel</PopoverContent>
    </Popover>
  );
}
function Tip({ side }: { side?: "start" | "end" | "left" | "right" | "top" | "bottom" }) {
  return (
    <Tooltip open>
      <TooltipTrigger>Trigger</TooltipTrigger>
      <TooltipContent side={side} avoidCollisions={false}>Tip text</TooltipContent>
    </Tooltip>
  );
}
function Hover({ side }: { side?: "start" | "end" | "left" | "right" | "top" | "bottom" }) {
  return (
    <HoverCard open>
      <HoverCardTrigger>Hover</HoverCardTrigger>
      <HoverCardContent side={side} avoidCollisions={false}>Card</HoverCardContent>
    </HoverCard>
  );
}

describe("resolveFloatingSide", () => {
  it("maps start and end through the direction and passes physical sides through", () => {
    expect(resolveFloatingSide("start", "ltr")).toBe("left");
    expect(resolveFloatingSide("end", "ltr")).toBe("right");
    expect(resolveFloatingSide("start", "rtl")).toBe("right");
    expect(resolveFloatingSide("end", "rtl")).toBe("left");
    for (const s of ["top", "bottom", "left", "right"] as const) {
      expect(resolveFloatingSide(s, "ltr")).toBe(s);
      expect(resolveFloatingSide(s, "rtl")).toBe(s);
    }
    expect(resolveFloatingSide(undefined, "rtl")).toBeUndefined();
  });
});

describe("Tooltip, Popover and HoverCard logical sides", () => {
  it("keeps the default side when none is given", async () => {
    render(<Tip />);
    expect(sideOf(await screen.findByRole("tooltip"))).toBe("top");
    cleanup();
    render(<Pop />);
    expect(sideOf(await screen.findByText("Panel"))).toBe("bottom");
  });

  it("LTR: start is left and end is right", async () => {
    const { unmount } = render(<Tip side="start" />);
    expect(sideOf(await screen.findByRole("tooltip"))).toBe("left");
    unmount();
    render(<Tip side="end" />);
    expect(sideOf(await screen.findByRole("tooltip"))).toBe("right");
    cleanup();
    render(<Pop side="end" />);
    expect(sideOf(await screen.findByText("Panel"))).toBe("right");
    cleanup();
    render(<Hover side="start" />);
    expect(sideOf(await screen.findByText("Card"))).toBe("left");
  });

  it("RTL through DirectionProvider: start is right and end is left", async () => {
    const { unmount } = render(
      <DirectionProvider dir="rtl">
        <Tip side="start" />
      </DirectionProvider>
    );
    expect(sideOf(await screen.findByRole("tooltip"))).toBe("right");
    unmount();
    render(
      <DirectionProvider dir="rtl">
        <Tip side="end" />
      </DirectionProvider>
    );
    expect(sideOf(await screen.findByRole("tooltip"))).toBe("left");
    cleanup();
    render(
      <DirectionProvider dir="rtl">
        <Pop side="end" />
      </DirectionProvider>
    );
    expect(sideOf(await screen.findByText("Panel"))).toBe("left");
    cleanup();
    render(
      <DirectionProvider dir="rtl">
        <Hover side="start" />
      </DirectionProvider>
    );
    expect(sideOf(await screen.findByText("Card"))).toBe("right");
  });

  it("RTL through <html dir>: start and end follow the document", async () => {
    document.documentElement.dir = "rtl";
    render(<Pop side="start" />);
    expect(sideOf(await screen.findByText("Panel"))).toBe("right");
  });

  it("physical sides never change with the direction", async () => {
    render(
      <DirectionProvider dir="rtl">
        <Tip side="left" />
      </DirectionProvider>
    );
    expect(sideOf(await screen.findByRole("tooltip"))).toBe("left");
  });

  it("SimpleTooltip forwards a logical side", async () => {
    render(
      <DirectionProvider dir="rtl">
        <SimpleTooltip content="Hint" side="end" open>
          <button type="button">Go</button>
        </SimpleTooltip>
      </DirectionProvider>
    );
    expect(sideOf((await screen.findAllByText("Hint"))[0])).toBe("left");
  });
});
