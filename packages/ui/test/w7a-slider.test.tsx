import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { axeViolations } from "./helpers/a11y";
import { Field, FieldDescription, FieldError, FieldLabel } from "../src/primitives/field";
import { RangeSlider, Slider } from "../src/primitives/slider";

afterEach(cleanup);

beforeAll(() => {
  // Radix measures the thumb; jsdom has no ResizeObserver.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("Slider field integration and naming", () => {
  it("names a single thumb from aria-label and keeps the id on the root", async () => {
    const { container } = render(<Slider id="vol" aria-label="Volume" defaultValue={[30]} />);
    const thumb = screen.getByRole("slider", { name: "Volume" });
    expect(thumb).toBeInTheDocument();
    expect(container.querySelector("#vol")).not.toBe(thumb);
    expect(container.querySelector("#vol")).not.toHaveAttribute("aria-label");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("names a single thumb from aria-labelledby, and thumbLabels still wins", () => {
    const { rerender } = render(
      <>
        <span id="ext">External</span>
        <Slider aria-labelledby="ext" defaultValue={[30]} />
      </>
    );
    expect(screen.getByRole("slider", { name: "External" })).toBeInTheDocument();
    rerender(
      <>
        <span id="ext">External</span>
        <Slider aria-labelledby="ext" thumbLabels={["Own"]} defaultValue={[30]} />
      </>
    );
    expect(screen.getByRole("slider", { name: "Own" })).toBeInTheDocument();
  });

  it("reads a surrounding Field: label name, description, invalid and disabled", async () => {
    const { container, rerender } = render(
      <Field invalid>
        <FieldLabel>Brightness</FieldLabel>
        <Slider defaultValue={[30]} />
        <FieldDescription>Between 0 and 100.</FieldDescription>
        <FieldError>Too bright.</FieldError>
      </Field>
    );
    const thumb = screen.getByRole("slider", { name: "Brightness" });
    expect(thumb).toHaveAccessibleDescription("Between 0 and 100. Too bright.");
    expect(thumb).toHaveAttribute("aria-invalid", "true");
    expect(container.querySelector("span[data-orientation]")).toHaveAttribute("aria-invalid", "true");
    expect(await axeViolations(container)).toEqual([]);
    rerender(
      <Field disabled>
        <FieldLabel>Brightness</FieldLabel>
        <Slider defaultValue={[30]} />
      </Field>
    );
    expect(screen.getByRole("slider")).toHaveAttribute("data-disabled");
    // an explicit prop beats the field
    rerender(
      <Field disabled>
        <FieldLabel>Brightness</FieldLabel>
        <Slider defaultValue={[30]} disabled={false} />
      </Field>
    );
    expect(screen.getByRole("slider")).not.toHaveAttribute("data-disabled");
  });

  it("describes and flags invalid without a Field", () => {
    render(
      <>
        <p id="hint">Hint text</p>
        <Slider aria-label="Level" aria-describedby="hint" invalid defaultValue={[10]} />
      </>
    );
    const thumb = screen.getByRole("slider", { name: "Level" });
    expect(thumb).toHaveAccessibleDescription("Hint text");
    expect(thumb).toHaveAttribute("aria-invalid", "true");
  });

  it("keeps Minimum / Maximum for two thumbs and groups them under an aria-label", async () => {
    const { container } = render(<RangeSlider aria-label="Price" defaultValue={[20, 80]} />);
    expect(screen.getByRole("slider", { name: "Minimum" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Maximum" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Price" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});
