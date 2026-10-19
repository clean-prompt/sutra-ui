import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "../src/patterns/command-menu";
import { axeViolations } from "./a11y";

const palette = (items = true) => (
  <Command>
    <CommandInput aria-label="Search" />
    <CommandList>
      <CommandEmpty>No results.</CommandEmpty>
      {items && <CommandItem value="apple">Apple</CommandItem>}
      {items && <CommandItem value="banana">Banana</CommandItem>}
    </CommandList>
  </Command>
);

describe("CommandEmpty", () => {
  it("has no axe violations when the search matches nothing", async () => {
    const user = userEvent.setup();
    render(palette());
    await user.type(screen.getByLabelText("Search"), "zzz");
    expect(await screen.findByText("No results.")).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("has no axe violations with no items at all", async () => {
    render(palette(false));
    expect(await screen.findByText("No results.")).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("keeps the message outside the listbox, in a polite live region, and hides the empty listbox", async () => {
    const user = userEvent.setup();
    render(palette());
    expect(screen.getAllByRole("option")).toHaveLength(2);
    await user.type(screen.getByLabelText("Search"), "zzz");
    const message = await screen.findByText("No results.");
    expect(message.closest('[role="listbox"]')).toBeNull();
    expect(message.closest('[data-slot="command-empty"]')).toHaveAttribute("aria-live", "polite");
    expect(document.querySelector("[cmdk-list]")).toHaveAttribute("hidden");
  });

  it("brings the list back when the search is cleared", async () => {
    const user = userEvent.setup();
    render(palette());
    const input = screen.getByLabelText("Search");
    await user.type(input, "zzz");
    await screen.findByText("No results.");
    await user.clear(input);
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
    expect(screen.queryByText("No results.")).toBeNull();
    expect(document.querySelector("[cmdk-list]")).not.toHaveAttribute("hidden");
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("keeps a forceMount item on screen next to the message", async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput aria-label="Search" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem forceMount value="__create__">
            Create it
          </CommandItem>
        </CommandList>
      </Command>
    );
    await user.type(screen.getByLabelText("Search"), "zzz");
    expect(await screen.findByRole("option", { name: "Create it" })).toBeVisible();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("still renders inline outside a CommandList", () => {
    render(
      <Command>
        <CommandInput aria-label="Search" />
        <CommandEmpty>Nothing here</CommandEmpty>
      </Command>
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});
