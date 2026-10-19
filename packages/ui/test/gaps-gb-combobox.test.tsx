import * as React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Combobox, type ComboboxOption } from "../src/primitives/combobox";
import { TagInput } from "../src/primitives/tag-input";
import { usePendingRemoval } from "../src/hooks/use-pending-removal";
import { axeViolations } from "./a11y";

const fruits: ComboboxOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
];

describe("usePendingRemoval", () => {
  it("marks on the first press, removes on the second and ignores auto-repeat", () => {
    const { result, rerender } = renderHook(({ size }) => usePendingRemoval(size), { initialProps: { size: 2 } });
    let removed = true;
    act(() => {
      removed = result.current.press(false);
    });
    expect(removed).toBe(false);
    expect(result.current.pending).toBe(true);
    act(() => {
      removed = result.current.press(true);
    });
    expect(removed).toBe(false);
    expect(result.current.pending).toBe(true);
    act(() => {
      removed = result.current.press(false);
    });
    expect(removed).toBe(true);
    expect(result.current.pending).toBe(false);
    act(() => void result.current.press(false));
    expect(result.current.pending).toBe(true);
    rerender({ size: 3 }); // the list changed: the mark is gone
    expect(result.current.pending).toBe(false);
  });

  it("never removes from an empty list", () => {
    const { result } = renderHook(() => usePendingRemoval(0));
    expect(result.current.press(false)).toBe(false);
    expect(result.current.pending).toBe(false);
  });
});

describe("Combobox async mode", () => {
  it("filter={false} shows the options as given, whatever is typed", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={fruits} filter={false} />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    await user.keyboard("zzz");
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("a filter function keeps the options it accepts and shows the empty state when none do", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        aria-label="Fruit"
        options={fruits}
        filter={(o, q) => o.label.toLowerCase().startsWith(q.toLowerCase())}
        emptyState="Nothing here"
      />
    );
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    await user.keyboard("b");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
    expect(screen.getByRole("option", { name: "Banana" })).toBeInTheDocument();
    await user.keyboard("x");
    expect(await screen.findByText("Nothing here")).toBeInTheDocument();
  });

  it("controls the input value, reports changes and clears it on close", async () => {
    const user = userEvent.setup();
    const onInputValueChange = vi.fn();
    function Harness() {
      const [q, setQ] = React.useState("ch");
      return (
        <Combobox
          aria-label="Fruit"
          options={fruits}
          filter={false}
          inputValue={q}
          onInputValueChange={(v) => {
            onInputValueChange(v);
            setQ(v);
          }}
        />
      );
    }
    render(<Harness />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    const input = screen.getByPlaceholderText("Search…");
    expect(input).toHaveValue("ch");
    await user.type(input, "e");
    expect(onInputValueChange).toHaveBeenLastCalledWith("che");
    expect(input).toHaveValue("che");
    await user.keyboard("{Escape}");
    expect(onInputValueChange).toHaveBeenLastCalledWith("");
  });

  it("starts from defaultInputValue when uncontrolled", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={fruits} defaultInputValue="app" />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    expect(screen.getByPlaceholderText("Search…")).toHaveValue("app");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
  });

  it("shows a loading row with no options, never the empty state, and marks the list busy", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Combobox aria-label="Fruit" options={[]} filter={false} loading emptyState="No fruit" />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("No fruit")).toBeNull();
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-busy", "true");
    rerender(<Combobox aria-label="Fruit" options={[]} filter={false} loading={false} emptyState="No fruit" />);
    expect(await screen.findByText("No fruit")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).toBeNull();
  });

  it("keeps showing results during a refresh and uses a custom loadingState", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Combobox aria-label="Fruit" options={fruits} filter={false} loading />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-busy", "true");
    rerender(<Combobox aria-label="Fruit" options={[]} filter={false} loading loadingState="Searching…" />);
    expect(screen.getByText("Searching…")).toBeInTheDocument();
  });

  it("keeps the label of a selected value once it leaves the results", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Combobox multiple aria-label="Fruits" options={fruits} filter={false} />);
    await user.click(screen.getByRole("combobox", { name: "Fruits" }));
    await user.click(screen.getByRole("option", { name: "Apple" }));
    rerender(<Combobox multiple aria-label="Fruits" options={[{ value: "kiwi", label: "Kiwi" }]} filter={false} />);
    expect(screen.getByRole("button", { name: "Remove Apple" })).toBeInTheDocument();
  });

  it("hides the Create row while loading", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Combobox aria-label="Fruit" options={fruits} creatable defaultInputValue="kiwi" />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    expect(await screen.findByText(/Create/)).toBeInTheDocument();
    rerender(<Combobox aria-label="Fruit" options={fruits} creatable loading defaultInputValue="kiwi" />);
    expect(screen.queryByText(/Create/)).toBeNull();
  });
});

describe("Combobox clearable and openOnFocus", () => {
  it("clears a single value with the button and returns focus to the field", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Combobox aria-label="Fruit" options={fruits} defaultValue="banana" clearable onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    expect(trigger).toHaveTextContent("Banana");
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onValueChange).toHaveBeenLastCalledWith("");
    expect(trigger).toHaveTextContent("Select…");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it("clears everything in multiple mode, with a custom label", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Combobox multiple aria-label="Fruits" options={fruits} defaultValue={["apple", "cherry"]} clearable clearLabel="Clear all" onValueChange={onValueChange} />
    );
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onValueChange).toHaveBeenLastCalledWith([]);
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
  });

  it("offers no clear button when empty or disabled, and keyboard clears with Delete or Backspace", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Combobox aria-label="Fruit" options={fruits} clearable />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    rerender(<Combobox aria-label="Fruit" options={fruits} clearable disabled defaultValue="apple" />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    rerender(<Combobox aria-label="Fruit" options={fruits} clearable defaultValue="apple" key="k1" />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    trigger.focus();
    await user.keyboard("{Backspace}");
    expect(trigger).toHaveTextContent("Select…");
  });

  it("is controlled when clearable too", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Combobox aria-label="Fruit" options={fruits} value="apple" clearable onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onValueChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveTextContent("Apple");
  });

  it("opens on keyboard focus, not on a pointer press, and not when focus returns", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={fruits} openOnFocus />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    await user.tab();
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
    await new Promise((r) => setTimeout(r, 10));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("a pointer click toggles as before with openOnFocus", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={fruits} openOnFocus />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("does not open on focus without the option", () => {
    render(<Combobox aria-label="Fruit" options={fruits} />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    act(() => trigger.focus());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Combobox confirmBackspace", () => {
  it("renders no live region unless confirmBackspace is on", () => {
    const { container } = render(<Combobox multiple aria-label="Fruits" options={fruits} defaultValue={["apple"]} />);
    expect(container.querySelector("[aria-live]")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("removes the last chip at once by default", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Combobox multiple aria-label="Fruits" options={fruits} defaultValue={["apple", "banana"]} onValueChange={onValueChange} />);
    screen.getByRole("combobox", { name: "Fruits" }).focus();
    await user.keyboard("{Backspace}");
    expect(onValueChange).toHaveBeenLastCalledWith(["apple"]);
  });

  it("marks first, announces, and removes on the second press", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <Combobox multiple aria-label="Fruits" options={fruits} defaultValue={["apple", "banana"]} confirmBackspace onValueChange={onValueChange} />
    );
    const trigger = screen.getByRole("combobox", { name: "Fruits" });
    trigger.focus();
    await user.keyboard("{Backspace}");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(container.querySelector('[data-pending-remove="true"]')).toHaveTextContent("Banana");
    expect(announcer(container)).toHaveTextContent("Press Backspace again to remove Banana");
    await user.keyboard("{Backspace}");
    expect(onValueChange).toHaveBeenLastCalledWith(["apple"]);
    expect(container.querySelector('[data-pending-remove="true"]')).toBeNull();
    expect(announcer(container)).toHaveTextContent("");
  });

  it("another key or blur clears the mark, and a held key never confirms", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <Combobox multiple aria-label="Fruits" options={fruits} defaultValue={["apple", "banana"]} confirmBackspace onValueChange={onValueChange} />
    );
    const trigger = screen.getByRole("combobox", { name: "Fruits" });
    trigger.focus();
    await user.keyboard("{Backspace}");
    expect(container.querySelector('[data-pending-remove="true"]')).not.toBeNull();
    fireEvent.keyDown(trigger, { key: "Backspace", repeat: true });
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.keyDown(trigger, { key: "ArrowLeft" });
    expect(container.querySelector('[data-pending-remove="true"]')).toBeNull();
    await user.keyboard("{Backspace}");
    expect(container.querySelector('[data-pending-remove="true"]')).not.toBeNull();
    act(() => trigger.blur());
    expect(container.querySelector('[data-pending-remove="true"]')).toBeNull();
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("Combobox axe", () => {
  it("has no violations while loading, clearable and open", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={[]} filter={false} loading clearable defaultValue="apple" />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("has no violations with results and a refresh spinner", async () => {
    const user = userEvent.setup();
    render(<Combobox multiple aria-label="Fruits" options={fruits} filter={false} loading confirmBackspace defaultValue={["apple"]} />);
    await user.click(screen.getByRole("combobox", { name: "Fruits" }));
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

const announcer = (c: HTMLElement) => c.querySelector<HTMLElement>('[aria-live="polite"]')!;
const tagTexts = (c: HTMLElement) => Array.from(c.querySelectorAll('[data-slot="tag-input-tag"]')).map((el) => el.textContent);

describe("TagInput confirmBackspace", () => {
  it("renders no live region or status unless confirmBackspace is on", () => {
    const { container } = render(<TagInput aria-label="Tags" defaultValue={["a"]} />);
    expect(container.querySelector("[aria-live]")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("is off by default: one Backspace removes the last tag", async () => {
    const user = userEvent.setup();
    const { container } = render(<TagInput aria-label="Tags" defaultValue={["a", "b"]} />);
    await user.click(screen.getByLabelText("Tags"));
    await user.keyboard("{Backspace}");
    expect(tagTexts(container)).toEqual(["a"]);
  });

  it("marks the last tag first and removes it on the second press", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(<TagInput aria-label="Tags" defaultValue={["a", "b"]} confirmBackspace onValueChange={onValueChange} />);
    await user.click(screen.getByLabelText("Tags"));
    await user.keyboard("{Backspace}");
    expect(tagTexts(container)).toEqual(["a", "b"]);
    expect(onValueChange).not.toHaveBeenCalled();
    const pending = container.querySelector('[data-slot="tag-input-tag"][data-pending-remove="true"]');
    expect(pending).toHaveTextContent("b");
    expect(announcer(container)).toHaveTextContent("Press Backspace again to remove b");
    await user.keyboard("{Backspace}");
    expect(tagTexts(container)).toEqual(["a"]);
    expect(onValueChange).toHaveBeenLastCalledWith(["a"]);
    expect(announcer(container)).toHaveTextContent("");
  });

  it("typing, blur and other keys clear the mark; a held key does not confirm", async () => {
    const user = userEvent.setup();
    const { container } = render(<TagInput aria-label="Tags" defaultValue={["a", "b"]} confirmBackspace />);
    const input = screen.getByLabelText("Tags");
    const marked = () => container.querySelector('[data-pending-remove="true"]') !== null;
    await user.click(input);
    await user.keyboard("{Backspace}");
    expect(marked()).toBe(true);
    await user.keyboard("x");
    expect(marked()).toBe(false);
    await user.keyboard("{Backspace}"); // removes the typed x, field is empty again
    await user.keyboard("{Backspace}");
    expect(marked()).toBe(true);
    fireEvent.keyDown(input, { key: "Backspace", repeat: true });
    expect(tagTexts(container)).toEqual(["a", "b"]);
    fireEvent.keyDown(input, { key: "ArrowLeft" });
    expect(marked()).toBe(false);
    await user.keyboard("{Backspace}");
    expect(marked()).toBe(true);
    act(() => input.blur());
    expect(marked()).toBe(false);
    expect(tagTexts(container)).toEqual(["a", "b"]);
  });

  it("does not mark while text is in the field, or when there are no tags", async () => {
    const user = userEvent.setup();
    const { container } = render(<TagInput aria-label="Tags" confirmBackspace />);
    const input = screen.getByLabelText("Tags");
    await user.type(input, "ab{Backspace}");
    expect(input).toHaveValue("a");
    await user.keyboard("{Backspace}{Backspace}");
    expect(container.querySelector('[data-pending-remove="true"]')).toBeNull();
  });
});

describe("TagInput extras", () => {
  it("renders custom tag content with the tag state", async () => {
    const user = userEvent.setup();
    const renderTag = vi.fn((tag: string, s: { index: number; pending: boolean }) => <b>{`#${s.index}:${tag}`}</b>);
    const { container } = render(<TagInput aria-label="Tags" defaultValue={["a", "b"]} renderTag={renderTag} />);
    expect(tagTexts(container)).toEqual(["#0:a", "#1:b"]);
    expect(screen.getByRole("button", { name: "Remove a" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove a" }));
    expect(tagTexts(container)).toEqual(["#0:b"]);
  });

  it("shows a count, with the limit and tied to the input description", async () => {
    const user = userEvent.setup();
    const { container } = render(<TagInput aria-label="Tags" defaultValue={["a"]} max={3} showCount />);
    const count = container.querySelector('[data-slot="tag-input-count"]')!;
    expect(count).toHaveTextContent("1 / 3");
    expect(screen.getByLabelText("Tags")).toHaveAccessibleDescription("1 / 3 tags");
    await user.type(screen.getByLabelText("Tags"), "b{Enter}");
    expect(count).toHaveTextContent("2 / 3");
  });

  it("counts without a limit and omits the count by default", () => {
    const { container, rerender } = render(<TagInput aria-label="Tags" defaultValue={["a", "b"]} showCount />);
    expect(container.querySelector('[data-slot="tag-input-count"]')).toHaveTextContent("2 tags");
    rerender(<TagInput aria-label="Tags" defaultValue={["a", "b"]} />);
    expect(container.querySelector('[data-slot="tag-input-count"]')).toBeNull();
  });

  it("keeps readOnly working: no remove buttons, no removal", async () => {
    const user = userEvent.setup();
    const { container } = render(<TagInput aria-label="Tags" defaultValue={["a", "b"]} readOnly confirmBackspace />);
    expect(screen.queryByRole("button")).toBeNull();
    await user.click(screen.getByLabelText("Tags"));
    await user.keyboard("{Backspace}{Backspace}");
    expect(tagTexts(container)).toEqual(["a", "b"]);
  });

  it("has no axe violations with every extra on", async () => {
    const { container } = render(<TagInput aria-label="Tags" defaultValue={["a", "b"]} max={5} showCount confirmBackspace renderTag={(t) => t.toUpperCase()} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
