import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Combobox, type ComboboxOption } from "../src/primitives/combobox";
import { axeViolations } from "./helpers/a11y";

const fruits: ComboboxOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
];

describe("Combobox empty state", () => {
  it("has no axe violations with no options at all", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={[]} />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    expect(await screen.findByText("No results")).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("has no axe violations when the search matches nothing", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={fruits} />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    await user.keyboard("zzz");
    expect(await screen.findByText("No results")).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("has no axe violations with a custom empty state and a server-side filter", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={[]} filter={false} emptyState={<em>Nothing here</em>} />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    expect(await screen.findByText("Nothing here")).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("keeps the message outside the listbox, in a polite live region", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={fruits} />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    await user.keyboard("zzz");
    const message = await screen.findByText("No results");
    expect(message.closest('[role="listbox"]')).toBeNull();
    expect(message.closest('[data-slot="combobox-empty"]')).toHaveAttribute("aria-live", "polite");
  });

  it("brings the options back when the search is cleared", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={fruits} />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    await user.keyboard("zzz");
    await screen.findByText("No results");
    await user.keyboard("{Backspace}{Backspace}{Backspace}");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
    expect(screen.queryByText("No results")).toBeNull();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("shows Create instead of the empty message when creatable", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={fruits} creatable />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    await user.keyboard("zzz");
    expect(await screen.findByRole("option", { name: /Create/ })).toBeInTheDocument();
    expect(screen.queryByText("No results")).toBeNull();
    expect(await axeViolations(document.body)).toEqual([]);
  });
});
