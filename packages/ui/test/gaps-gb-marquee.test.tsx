import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Marquee } from "../src/assets/marquee";
import { LogoCloud } from "../src/assets/placeholder-logos";
import { axeViolations } from "./a11y";

const track = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-slot="marquee-track"]')!;

describe("Marquee pause control", () => {
  it("renders no button unless pausable, and keeps the root as the first element", () => {
    const { container } = render(<Marquee>x</Marquee>);
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("data-slot", "marquee");
  });

  it("shows a toggle button in flow beside the track, outside the faded region", () => {
    const { container } = render(
      <Marquee pausable label="Formats">
        <span>PDF</span>
      </Marquee>
    );
    const button = screen.getByRole("button", { name: "Pause scrolling" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    const frame = container.firstElementChild!;
    expect(frame).toHaveAttribute("data-slot", "marquee-frame");
    expect(frame.contains(button)).toBe(true);
    expect(container.querySelector('[data-slot="marquee"]')!.contains(button)).toBe(false);
    // hidden when reduced motion has already stopped the row
    expect(button.className).toContain("motion-reduce:hidden");
    expect(screen.getByRole("list", { name: "Formats" })).toBeInTheDocument();
  });

  it("toggles pausing uncontrolled and flips the icon, not the name", () => {
    const { container } = render(<Marquee pausable>x</Marquee>);
    const button = screen.getByRole("button", { name: "Pause scrolling" });
    expect(track(container).className).not.toMatch(/(^|\s)\[animation-play-state:paused\]/);
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAccessibleName("Pause scrolling");
    expect(track(container).className).toMatch(/(^|\s)\[animation-play-state:paused\]/);
    expect(container.querySelector('[data-slot="marquee"]')).toHaveAttribute("data-paused", "true");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(track(container).className).not.toMatch(/(^|\s)\[animation-play-state:paused\]/);
  });

  it("keeps pausing on hover and focus on top of the button", () => {
    const { container } = render(<Marquee pausable>x</Marquee>);
    expect(track(container).className).toContain("group-hover/marquee:[animation-play-state:paused]");
    expect(track(container).className).toContain("group-focus-within/marquee:[animation-play-state:paused]");
  });

  it("supports defaultPaused, a custom label and keyboard activation", () => {
    const { container } = render(
      <Marquee pausable defaultPaused pauseLabel="Stop the logos">
        x
      </Marquee>
    );
    const button = screen.getByRole("button", { name: "Stop the logos" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector('[data-slot="marquee"]')).toHaveAttribute("data-paused", "true");
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button); // Enter and Space on a button arrive as click
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("is controlled through paused and onPausedChange", () => {
    const onPausedChange = vi.fn();
    const { rerender } = render(
      <Marquee pausable paused={false} onPausedChange={onPausedChange}>
        x
      </Marquee>
    );
    const button = screen.getByRole("button", { name: "Pause scrolling" });
    fireEvent.click(button);
    expect(onPausedChange).toHaveBeenLastCalledWith(true);
    // the parent has not accepted it yet
    expect(button).toHaveAttribute("aria-pressed", "false");
    rerender(
      <Marquee pausable paused onPausedChange={onPausedChange}>
        x
      </Marquee>
    );
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(onPausedChange).toHaveBeenLastCalledWith(false);
  });

  it("pauses without a button when a parent controls paused", () => {
    const { container } = render(<Marquee paused>x</Marquee>);
    expect(screen.queryByRole("button")).toBeNull();
    expect(track(container).className).toMatch(/(^|\s)\[animation-play-state:paused\]/);
  });

  it("forwards ref, className and props to the scrolling region, and LogoCloud passes pausable", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Marquee ref={ref} pausable className="extra" data-testid="m">
        x
      </Marquee>
    );
    expect(ref.current).toBe(screen.getByTestId("m"));
    expect(ref.current).toHaveClass("extra");
    const cloud = render(<LogoCloud marquee pausable limit={4} />);
    expect(cloud.container.querySelector('[data-slot="marquee-pause"]')).not.toBeNull();
  });

  it("has no axe violations, paused or not", async () => {
    const { container } = render(
      <Marquee pausable label="Formats">
        <span>PDF</span>
        <span>PNG</span>
      </Marquee>
    );
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button"));
    expect(await axeViolations(container)).toEqual([]);
  });
});
