import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Combobox, type ComboboxOption } from "../src/primitives/combobox";
import { axeViolations } from "./a11y";

afterEach(cleanup);

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => {};
});

const fruits: ComboboxOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
];

describe("Combobox chosen options are exposed to assistive tech", () => {
  it("single: only the chosen option is aria-checked", async () => {
    render(<Combobox aria-label="Fruit" options={fruits} defaultValue="banana" defaultOpen />);
    const banana = await screen.findByRole("option", { name: "Banana" });
    expect(banana).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("option", { name: "Apple" })).not.toHaveAttribute("aria-checked");
    expect(banana).toHaveAttribute("data-checked");
  });

  it("multiple: every option is checked or not, and it follows a pick", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" multiple options={fruits} defaultValue={["apple"]} defaultOpen />);
    expect(await screen.findByRole("option", { name: "Apple" })).toHaveAttribute("aria-checked", "true");
    const cherry = screen.getByRole("option", { name: "Cherry" });
    expect(cherry).toHaveAttribute("aria-checked", "false");
    await user.click(cherry);
    expect(screen.getByRole("option", { name: "Cherry" })).toHaveAttribute("aria-checked", "true");
  });

  it("passes axe with the list open", async () => {
    render(<Combobox aria-label="Fruit" multiple options={fruits} defaultValue={["apple"]} defaultOpen />);
    await screen.findByRole("option", { name: "Apple" });
    expect(await axeViolations(document.body)).toEqual([]);
  });
});
