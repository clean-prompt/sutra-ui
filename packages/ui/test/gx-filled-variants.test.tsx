import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, selectTriggerVariants } from "../src/primitives/select";
import { Combobox } from "../src/primitives/combobox";
import { DatePicker, DateRangePicker, DateTimePicker } from "../src/primitives/date-picker";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "../src/primitives/input-group";
import { cn } from "../src/lib/cn";
import { axeViolations } from "./a11y";

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
];

/** The classes every filled shell carries, and the outline-only ones it must drop. */
function expectFilled(el: Element) {
  const list = el.classList;
  for (const c of ["border-transparent", "bg-muted", "shadow-none"]) expect(list.contains(c), c).toBe(true);
  for (const c of ["shadow-xs", "bg-background", "border-input"]) expect(list.contains(c), c).toBe(false);
}
function expectOutline(el: Element) {
  const list = el.classList;
  for (const c of ["border-input", "bg-background", "shadow-xs"]) expect(list.contains(c), c).toBe(true);
  for (const c of ["border-transparent", "bg-muted", "shadow-none"]) expect(list.contains(c), c).toBe(false);
}

const selectEl = (variant?: "outline" | "filled") => (
  <Select>
    <SelectTrigger aria-label="Fruit" variant={variant}>
      <SelectValue placeholder="Pick" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="apple">Apple</SelectItem>
      <SelectItem value="banana">Banana</SelectItem>
    </SelectContent>
  </Select>
);

describe("filled variants on the popover triggers and InputGroup", () => {
  it("Select: outline is the default and filled swaps the shell", () => {
    const { unmount } = render(selectEl());
    const stock = screen.getByRole("combobox", { name: "Fruit" }).className;
    expectOutline(screen.getByRole("combobox", { name: "Fruit" }));
    unmount();
    render(selectEl("outline"));
    expect(screen.getByRole("combobox", { name: "Fruit" }).className).toBe(stock);
    expect(stock).toContain("hover:border-border-strong");
    cleanupAndRender(selectEl("filled"));
    const filled = screen.getByRole("combobox", { name: "Fruit" });
    expectFilled(filled);
    expect(filled.classList.contains("hover:border-border-strong")).toBe(false);
    expect(filled.classList.contains("hover:border-transparent")).toBe(true);
    expect(filled.className).toContain("data-[state=open]:bg-background");
  });

  it("Select: the raw cva keeps the outline classes and a consumer className still wins", () => {
    expect(selectTriggerVariants({ size: "md" })).toContain("bg-background");
    expect(cn(selectTriggerVariants({ variant: "filled" }), "bg-card")).toContain("bg-card");
  });

  it("Select: a filled trigger opens with the keyboard and picks an option", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger aria-label="Fruit" variant="filled">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );
    screen.getByRole("combobox", { name: "Fruit" }).focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("option", { name: "Banana" }));
    expect(onValueChange).toHaveBeenCalledWith("banana");
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("Combobox: filled single and multiple", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { unmount } = render(<Combobox aria-label="Fruit" options={fruits} />);
    const stock = screen.getByRole("combobox", { name: "Fruit" }).className;
    expectOutline(screen.getByRole("combobox", { name: "Fruit" }));
    unmount();
    render(<Combobox aria-label="Fruit" options={fruits} variant="filled" onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    expectFilled(trigger);
    expect(trigger.className).not.toBe(stock);
    expect(trigger.classList.contains("hover:border-border-strong")).toBe(false);
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "Apple" }));
    expect(onValueChange).toHaveBeenCalledWith("apple");
    expect(trigger).toHaveTextContent("Apple");
    cleanupAndRender(<Combobox multiple aria-label="Fruits" options={fruits} variant="filled" defaultValue={["apple"]} clearable />);
    expectFilled(screen.getByRole("combobox", { name: "Fruits" }));
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("DatePicker, DateRangePicker and DateTimePicker: filled triggers", async () => {
    render(
      <>
        <DatePicker aria-label="Day" />
        <DatePicker aria-label="Day filled" variant="filled" />
        <DateRangePicker aria-label="Range filled" variant="filled" />
        <DateTimePicker aria-label="Moment filled" variant="filled" />
      </>
    );
    expectOutline(screen.getByRole("button", { name: /Day$/ }));
    expectFilled(screen.getByRole("button", { name: "Day filled" }));
    expectFilled(screen.getByRole("button", { name: "Range filled" }));
    expectFilled(screen.getByRole("button", { name: "Moment filled" }));
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("DatePicker: a filled trigger still opens the calendar", async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Day" variant="filled" defaultValue={new Date(2025, 0, 15)} />);
    await user.click(screen.getByRole("button", { name: "Day" }));
    expect(await screen.findByRole("grid")).toBeInTheDocument();
  });

  it("InputGroup: filled swaps the shell and keeps addons and the control working", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <InputGroup aria-label="Domain">
        <InputGroupInput aria-label="Name" />
      </InputGroup>
    );
    expectOutline(screen.getByRole("group", { name: "Domain" }));
    unmount();
    render(
      <InputGroup aria-label="Domain" variant="filled">
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput aria-label="Name" />
      </InputGroup>
    );
    const group = screen.getByRole("group", { name: "Domain" });
    expectFilled(group);
    expect(group.className).toContain("has-[[data-slot=input-group-control]:focus-visible]:bg-background");
    await user.click(screen.getByText("https://"));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("paper style is token only: no literal colours in the filled classes", () => {
    const classes = [
      selectTriggerVariants({ variant: "filled" }),
      cn(selectTriggerVariants({ variant: "filled" })),
    ].join(" ");
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
  });
});

function cleanupAndRender(ui: React.ReactElement) {
  cleanup();
  return render(ui);
}
