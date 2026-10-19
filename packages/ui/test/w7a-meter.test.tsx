import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axeViolations } from "./a11y";
import { Meter } from "../src/primitives/meter";

afterEach(cleanup);

describe("Meter accessibility", () => {
  it("clamps aria-valuenow to the scale while the text keeps the real value", () => {
    const { rerender } = render(<Meter label="Disk" value={130} max={100} unit="GB" />);
    const bar = screen.getByRole("meter", { name: "Disk" });
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar).toHaveAttribute("aria-valuetext", "130 / 100 GB");
    rerender(<Meter label="Disk" value={-5} min={0} max={100} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
    rerender(<Meter label="Temp" value={10} min={20} max={80} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "20");
    rerender(<Meter label="Disk" value={50} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "50");
  });

  it("puts an aria-label / aria-labelledby passed to Meter on the meter role, not the wrapper", async () => {
    const { container, rerender } = render(<Meter aria-label="Battery" value={40} />);
    expect(screen.getByRole("meter", { name: "Battery" })).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveAttribute("aria-label");
    rerender(
      <>
        <h2 id="ext">External name</h2>
        <Meter aria-labelledby="ext" value={40} />
      </>
    );
    expect(screen.getByRole("meter", { name: "External name" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("keeps the visible label as the name, and the Usage fallback, when no aria name is passed", () => {
    const { rerender } = render(<Meter label="CPU" value={20} />);
    expect(screen.getByRole("meter", { name: "CPU" })).toBeInTheDocument();
    rerender(<Meter value={20} />);
    expect(screen.getByRole("meter", { name: "Usage" })).toBeInTheDocument();
  });
});
