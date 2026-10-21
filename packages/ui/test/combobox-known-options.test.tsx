import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Combobox, type ComboboxOption } from "../src/primitives/combobox";

afterEach(cleanup);

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => {};
});

const apple: ComboboxOption = { value: "apple", label: "Apple" };
const banana: ComboboxOption = { value: "banana", label: "Banana" };
const cherry: ComboboxOption = { value: "cherry", label: "Cherry" };

const trigger = () => screen.getByRole("combobox");

// The cache (`knownRef`) is private, so these tests assert it through what it shows: a label survives only for values
// that were selected when their option left `options`; anything else falls back to the raw value.
describe("Combobox keeps labels of selected values that left the async options", () => {
  it("resolves the label of a selected value on the very first render", () => {
    render(<Combobox aria-label="Fruit" options={[apple, banana]} value="banana" onValueChange={() => {}} />);
    expect(trigger()).toHaveTextContent("Banana");
  });

  it("single: keeps the label after the options change to something else", () => {
    const { rerender } = render(<Combobox aria-label="Fruit" options={[apple, banana]} value="banana" onValueChange={() => {}} />);
    rerender(<Combobox aria-label="Fruit" options={[cherry]} value="banana" onValueChange={() => {}} />);
    expect(trigger()).toHaveTextContent("Banana");
    rerender(<Combobox aria-label="Fruit" options={[]} value="banana" onValueChange={() => {}} />);
    expect(trigger()).toHaveTextContent("Banana");
  });

  it("does not keep a stale label once the value was deselected and its option is gone", () => {
    const { rerender } = render(<Combobox aria-label="Fruit" multiple options={[apple, banana]} value={["apple"]} onValueChange={() => {}} />);
    rerender(<Combobox aria-label="Fruit" multiple options={[apple, banana]} value={[]} onValueChange={() => {}} />);
    rerender(<Combobox aria-label="Fruit" multiple options={[cherry]} value={[]} onValueChange={() => {}} />);
    // selecting "apple" again from outside, while it is unknown: the raw value is shown, not a remembered label
    rerender(<Combobox aria-label="Fruit" multiple options={[cherry]} value={["apple"]} onValueChange={() => {}} />);
    expect(trigger()).toHaveTextContent("apple");
    expect(trigger()).not.toHaveTextContent("Apple");
  });

  it("multiple: keeps each selected label, drops the one that was deselected", () => {
    const { rerender } = render(
      <Combobox aria-label="Fruit" multiple options={[apple, banana, cherry]} value={["apple", "banana"]} onValueChange={() => {}} />
    );
    rerender(<Combobox aria-label="Fruit" multiple options={[]} value={["apple", "banana"]} onValueChange={() => {}} />);
    expect(trigger()).toHaveTextContent("Apple");
    expect(trigger()).toHaveTextContent("Banana");
    rerender(<Combobox aria-label="Fruit" multiple options={[]} value={["banana"]} onValueChange={() => {}} />);
    expect(trigger()).toHaveTextContent("Banana");
    expect(trigger()).not.toHaveTextContent("Apple");
    rerender(<Combobox aria-label="Fruit" multiple options={[]} value={["apple", "banana"]} onValueChange={() => {}} />);
    expect(trigger()).toHaveTextContent("Banana");
    expect(trigger()).not.toHaveTextContent("Apple");
    expect(trigger()).toHaveTextContent("apple");
  });

  it("controlled value that changes to a never-seen value shows the raw value, and to an option shows its label", () => {
    const { rerender } = render(<Combobox aria-label="Fruit" options={[apple]} value="apple" onValueChange={() => {}} />);
    rerender(<Combobox aria-label="Fruit" options={[apple]} value="durian" onValueChange={() => {}} />);
    expect(trigger()).toHaveTextContent("durian");
    rerender(<Combobox aria-label="Fruit" options={[apple, banana]} value="banana" onValueChange={() => {}} />);
    expect(trigger()).toHaveTextContent("Banana");
  });

  it("uncontrolled async: a picked option keeps its label after the search results change", async () => {
    const user = userEvent.setup();
    function Async() {
      const [q, setQ] = React.useState("");
      const options = q === "ch" ? [cherry] : [apple, banana];
      return <Combobox aria-label="Fruit" options={options} filter={false} inputValue={q} onInputValueChange={setQ} />;
    }
    render(<Async />);
    await user.click(trigger());
    await user.click(await screen.findByRole("option", { name: "Banana" }));
    expect(trigger()).toHaveTextContent("Banana");
    await user.click(trigger());
    await user.keyboard("ch");
    expect(await screen.findByRole("option", { name: "Cherry" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Banana" })).toBeNull();
    await user.keyboard("{Escape}");
    expect(trigger()).toHaveTextContent("Banana");
  });
});
