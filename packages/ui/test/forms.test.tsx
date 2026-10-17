import * as React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useControllableState } from "../src/hooks/use-controllable-state";
import { Field, FieldDescription, FieldError, FieldHint, FieldLabel } from "../src/components/field";
import { Input, PasswordInput } from "../src/components/input";
import { NumberInput } from "../src/components/number-input";
import { TagInput } from "../src/components/tag-input";
import { OTPField } from "../src/components/input-otp";
import { Textarea } from "../src/components/textarea";
import {
  Checkbox,
  CheckboxField,
  CheckboxGroup,
  CheckboxGroupItem,
  CheckboxGroupSelectAll,
} from "../src/components/checkbox";
import { RadioGroupField } from "../src/components/radio";
import { Switch, SwitchField } from "../src/components/switch";
import { SegmentedControl } from "../src/components/segmented-control";
import { Rating } from "../src/components/rating";
import { RangeSlider, Slider } from "../src/components/slider";
import { Combobox, type ComboboxOption } from "../src/components/combobox";
import { SimpleSelect } from "../src/components/select";
import { DatePicker } from "../src/components/date-picker";
import { Dropzone, isFileAccepted, validateFiles, describeFileConstraints } from "../src/components/dropzone";
import { FileUpload, FileUploadDropzone, FileUploadList, formatBytes } from "../src/components/file-upload";
import { PasswordStrength, getPasswordScore } from "../src/components/password-strength";
import { axeViolations } from "./a11y";

// input-otp probes document.elementFromPoint (password-manager badge detection); jsdom lacks it.
beforeAll(() => {
  if (!document.elementFromPoint) document.elementFromPoint = () => null;
});

function makeFile(name: string, type: string, size = 10) {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

/* ------------------------------------------------------------------ */
/* useControllableState                                                */
/* ------------------------------------------------------------------ */

describe("useControllableState", () => {
  it("manages internal state when uncontrolled and calls onChange", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: 1, onChange }));
    expect(result.current[0]).toBe(1);
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);
    act(() => result.current[1]((prev) => prev + 10));
    expect(result.current[0]).toBe(12);
    expect(onChange).toHaveBeenLastCalledWith(12);
  });

  it("does not call onChange when the value is unchanged", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: "a", onChange }));
    act(() => result.current[1]("a"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("follows the value prop when controlled", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useControllableState({ value, defaultValue: "x", onChange }),
      { initialProps: { value: "a" } }
    );
    expect(result.current[0]).toBe("a");
    act(() => result.current[1]("b"));
    // Still "a" until the parent passes the new value.
    expect(result.current[0]).toBe("a");
    expect(onChange).toHaveBeenCalledWith("b");
    rerender({ value: "c" });
    expect(result.current[0]).toBe("c");
  });
});

/* ------------------------------------------------------------------ */
/* Field                                                               */
/* ------------------------------------------------------------------ */

describe("Field", () => {
  it("associates label, hint, description and error with the control", () => {
    render(
      <Field invalid>
        <FieldLabel>Email</FieldLabel>
        <Input />
        <FieldDescription>We never share it.</FieldDescription>
        <FieldHint>Use your work address</FieldHint>
        <FieldError>Email is required</FieldError>
      </Field>
    );
    const input = screen.getByLabelText("Email");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = (input.getAttribute("aria-describedby") ?? "").split(" ");
    const error = screen.getByRole("alert");
    const description = screen.getByText("We never share it.");
    const hint = screen.getByText("Use your work address").closest("p")!;
    expect(describedBy).toContain(error.id);
    expect(describedBy).toContain(description.id);
    expect(describedBy).toContain(hint.id);
    expect(input).toHaveAccessibleDescription(/Email is required/);
  });

  it("omits aria-invalid and error id when there is no error", () => {
    render(
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input />
        <FieldError errors={[]} />
      </Field>
    );
    const input = screen.getByLabelText("Name");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders deduplicated error messages from an errors array", () => {
    render(
      <Field invalid>
        <FieldLabel>Pw</FieldLabel>
        <Input />
        <FieldError errors={["Too short", { message: "Too short" }, { message: "Needs a digit" }, null]} />
      </Field>
    );
    const items = within(screen.getByRole("alert")).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["Too short", "Needs a digit"]);
  });

  it("propagates disabled and required to the control", () => {
    render(
      <Field disabled required>
        <FieldLabel>Code</FieldLabel>
        <Input />
      </Field>
    );
    const input = screen.getByLabelText(/Code/);
    expect(input).toBeDisabled();
    expect(input).toBeRequired();
  });
});

/* ------------------------------------------------------------------ */
/* Input / PasswordInput                                               */
/* ------------------------------------------------------------------ */

describe("Input", () => {
  it("clear button clears an uncontrolled value and calls onChange/onClear", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(<Input aria-label="Query" clearable onChange={onChange} onClear={onClear} />);
    const input = screen.getByLabelText("Query") as HTMLInputElement;
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    await user.type(input, "hello");
    expect(input.value).toBe("hello");
    onChange.mockClear();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(input.value).toBe("");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].target.value).toBe("");
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(input).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("clear button works for a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [v, setV] = React.useState("abc");
      return <Input aria-label="Q" clearable value={v} onChange={(e) => setV(e.target.value)} />;
    }
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByLabelText("Q")).toHaveValue("");
  });

  it("PasswordInput toggles visibility", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" defaultValue="s3cret" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    const hide = screen.getByRole("button", { name: "Hide password" });
    expect(hide).toHaveAttribute("aria-pressed", "true");
    await user.click(hide);
    expect(input).toHaveAttribute("type", "password");
  });
});

/* ------------------------------------------------------------------ */
/* NumberInput                                                         */
/* ------------------------------------------------------------------ */

describe("NumberInput", () => {
  it("increments and decrements with buttons, clamped to min/max", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberInput aria-label="Qty" defaultValue={1} min={0} max={2} onValueChange={onValueChange} />);
    const input = screen.getByRole("spinbutton", { name: "Qty" });
    const inc = screen.getByRole("button", { name: "Increase" });
    const dec = screen.getByRole("button", { name: "Decrease" });
    await user.click(inc);
    expect(input).toHaveValue("2");
    expect(input).toHaveAttribute("aria-valuenow", "2");
    expect(onValueChange).toHaveBeenLastCalledWith(2);
    expect(inc).toBeDisabled();
    await user.click(dec);
    await user.click(dec);
    expect(input).toHaveValue("0");
    expect(dec).toBeDisabled();
  });

  it("supports arrow, page, Home and End keys", async () => {
    const user = userEvent.setup();
    render(<NumberInput aria-label="N" defaultValue={5} min={0} max={100} step={2} />);
    const input = screen.getByRole("spinbutton");
    input.focus();
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-valuenow", "7");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(input).toHaveAttribute("aria-valuenow", "3");
    await user.keyboard("{PageUp}");
    expect(input).toHaveAttribute("aria-valuenow", "23");
    await user.keyboard("{PageDown}");
    expect(input).toHaveAttribute("aria-valuenow", "3");
    await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(input).toHaveAttribute("aria-valuenow", "23");
    await user.keyboard("{End}");
    expect(input).toHaveAttribute("aria-valuenow", "100");
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-valuenow", "100");
    await user.keyboard("{Home}");
    expect(input).toHaveAttribute("aria-valuenow", "0");
  });

  it("clamps typed values on blur", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberInput aria-label="N" min={1} max={10} onValueChange={onValueChange} />);
    const input = screen.getByRole("spinbutton");
    await user.type(input, "42");
    await user.tab();
    expect(input).toHaveValue("10");
    expect(onValueChange).toHaveBeenLastCalledWith(10);
  });

  it("respects decimal steps without float drift", async () => {
    const user = userEvent.setup();
    render(<NumberInput aria-label="N" defaultValue={0.1} step={0.2} />);
    await user.click(screen.getByRole("button", { name: "Increase" }));
    expect(screen.getByRole("spinbutton")).toHaveAttribute("aria-valuenow", "0.3");
  });
});

/* ------------------------------------------------------------------ */
/* TagInput                                                            */
/* ------------------------------------------------------------------ */

function tagTexts(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[data-slot="tag-input-tag"]')).map((el) => el.textContent);
}

describe("TagInput", () => {
  it("adds tags with Enter and comma, removes the last with Backspace", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(<TagInput aria-label="Tags" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Tags");
    await user.type(input, "react{Enter}");
    await user.type(input, "vue,");
    expect(tagTexts(container)).toEqual(["react", "vue"]);
    expect(input).toHaveValue("");
    expect(onValueChange).toHaveBeenLastCalledWith(["react", "vue"]);
    await user.keyboard("{Backspace}");
    expect(tagTexts(container)).toEqual(["react"]);
  });

  it("removes a tag with its remove button", async () => {
    const user = userEvent.setup();
    const { container } = render(<TagInput aria-label="Tags" defaultValue={["a", "b"]} />);
    await user.click(screen.getByRole("button", { name: "Remove a" }));
    expect(tagTexts(container)).toEqual(["b"]);
  });

  it("rejects duplicates case-insensitively unless allowed", async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    const { container, unmount } = render(
      <TagInput aria-label="Tags" defaultValue={["React"]} onReject={onReject} />
    );
    await user.type(screen.getByLabelText("Tags"), "react{Enter}");
    expect(tagTexts(container)).toEqual(["React"]);
    expect(onReject).toHaveBeenCalledWith("react", "duplicate");
    unmount();

    const second = render(<TagInput aria-label="Tags2" defaultValue={["React"]} allowDuplicates />);
    await user.type(screen.getByLabelText("Tags2"), "React{Enter}");
    expect(tagTexts(second.container)).toEqual(["React", "React"]);
  });

  it("enforces max", async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    const { container } = render(<TagInput aria-label="Tags" max={2} onReject={onReject} />);
    const input = screen.getByLabelText("Tags");
    await user.type(input, "a{Enter}b{Enter}");
    expect(tagTexts(container)).toEqual(["a", "b"]);
    // The input becomes read-only at the limit.
    expect(input).toHaveAttribute("readonly");
  });

  it("reports max rejections from a paste", async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    const { container } = render(<TagInput aria-label="Tags" max={2} onReject={onReject} />);
    await user.click(screen.getByLabelText("Tags"));
    await user.paste("one, two, three");
    expect(tagTexts(container)).toEqual(["one", "two"]);
    expect(onReject).toHaveBeenCalledWith("three", "max");
  });

  it("splits pasted text on separators and newlines", async () => {
    const user = userEvent.setup();
    const { container } = render(<TagInput aria-label="Tags" />);
    await user.click(screen.getByLabelText("Tags"));
    await user.paste("alpha, beta\ngamma,,alpha");
    expect(tagTexts(container)).toEqual(["alpha", "beta", "gamma"]);
    expect(screen.getByLabelText("Tags")).toHaveValue("");
  });

  it("pastes plain text without separators into the input", async () => {
    const user = userEvent.setup();
    const { container } = render(<TagInput aria-label="Tags" />);
    await user.click(screen.getByLabelText("Tags"));
    await user.paste("solo");
    expect(tagTexts(container)).toEqual([]);
    expect(screen.getByLabelText("Tags")).toHaveValue("solo");
  });
});

/* ------------------------------------------------------------------ */
/* OTPField                                                            */
/* ------------------------------------------------------------------ */

describe("OTPField", () => {
  it("typing fills slots and fires onComplete", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onChange = vi.fn();
    const { container } = render(
      <OTPField aria-label="Code" length={4} onComplete={onComplete} onChange={onChange} />
    );
    const input = screen.getByLabelText("Code");
    await user.click(input);
    await user.keyboard("12");
    const slots = () => Array.from(container.querySelectorAll('[data-slot="input-otp-slot"]'));
    expect(slots()).toHaveLength(4);
    expect(slots().map((s) => s.textContent)).toEqual(["1", "2", "", ""]);
    expect(onComplete).not.toHaveBeenCalled();
    await user.keyboard("34");
    expect(input).toHaveValue("1234");
    expect(slots().map((s) => s.textContent)).toEqual(["1", "2", "3", "4"]);
    expect(onChange).toHaveBeenLastCalledWith("1234");
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith("1234"));
  });

  it("rejects non-digits by default", async () => {
    const user = userEvent.setup();
    render(<OTPField aria-label="Code" length={4} />);
    const input = screen.getByLabelText("Code");
    await user.click(input);
    await user.keyboard("a1b");
    expect(input).toHaveValue("1");
  });

  it("renders separators between groups", () => {
    render(<OTPField aria-label="Code" length={6} groupSize={3} />);
    expect(screen.getAllByRole("separator")).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/* Textarea                                                            */
/* ------------------------------------------------------------------ */

describe("Textarea", () => {
  it("shows a live character counter against maxLength", async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Bio" showCount maxLength={10} />);
    expect(screen.getByText(/characters used/).parentElement).toHaveTextContent("0/10 characters used");
    await user.type(screen.getByLabelText("Bio"), "hello");
    expect(screen.getByText(/characters used/).parentElement).toHaveTextContent("5/10 characters used");
    await user.type(screen.getByLabelText("Bio"), "world!!");
    // maxLength stops input at 10.
    expect(screen.getByLabelText("Bio")).toHaveValue("helloworld");
    expect(screen.getByText(/characters used/).parentElement).toHaveTextContent("10/10");
  });

  it("counts without a limit and reflects controlled values", () => {
    const { rerender } = render(<Textarea aria-label="Bio" showCount value="abc" onChange={() => {}} />);
    expect(screen.getByText(/characters/).parentElement).toHaveTextContent("3 characters");
    rerender(<Textarea aria-label="Bio" showCount value="abcdef" onChange={() => {}} />);
    expect(screen.getByText(/characters/).parentElement).toHaveTextContent("6 characters");
  });
});

/* ------------------------------------------------------------------ */
/* Checkbox / CheckboxGroup                                            */
/* ------------------------------------------------------------------ */

describe("Checkbox", () => {
  it("toggles and reports onCheckedChange", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<CheckboxField label="Accept terms" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Accept terms" });
    expect(box).toHaveAttribute("aria-checked", "false");
    await user.click(screen.getByText("Accept terms"));
    expect(box).toHaveAttribute("aria-checked", "true");
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    await user.keyboard(" ");
    expect(box).toHaveAttribute("aria-checked", "false");
  });

  it("renders indeterminate as aria-checked=mixed", () => {
    render(<Checkbox aria-label="Some" checked="indeterminate" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "mixed");
  });

  it("CheckboxGroup select-all is mixed when partially selected and toggles enabled items", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <CheckboxGroup label="Toppings" defaultValue={["cheese"]} onValueChange={onValueChange}>
        <CheckboxGroupSelectAll />
        <CheckboxGroupItem value="cheese" label="Cheese" />
        <CheckboxGroupItem value="ham" label="Ham" />
        <CheckboxGroupItem value="olives" label="Olives" disabled />
      </CheckboxGroup>
    );
    expect(screen.getByRole("group", { name: "Toppings" })).toBeInTheDocument();
    const all = screen.getByRole("checkbox", { name: "Select all" });
    expect(all).toHaveAttribute("aria-checked", "mixed");

    await user.click(all);
    expect(onValueChange).toHaveBeenLastCalledWith(["cheese", "ham"]);
    expect(all).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", { name: "Ham" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", { name: "Olives" })).toHaveAttribute("aria-checked", "false");

    await user.click(all);
    expect(onValueChange).toHaveBeenLastCalledWith([]);
    expect(all).toHaveAttribute("aria-checked", "false");

    await user.click(screen.getByRole("checkbox", { name: "Ham" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["ham"]);
    expect(all).toHaveAttribute("aria-checked", "mixed");
  });

  it("CheckboxGroup renders from options", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <CheckboxGroup
        aria-label="Days"
        options={[
          { value: "mon", label: "Monday" },
          { value: "tue", label: "Tuesday" },
        ]}
        onValueChange={onValueChange}
      />
    );
    await user.click(screen.getByRole("checkbox", { name: "Tuesday" }));
    await user.click(screen.getByRole("checkbox", { name: "Monday" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["tue", "mon"]);
  });
});

/* ------------------------------------------------------------------ */
/* RadioGroup                                                          */
/* ------------------------------------------------------------------ */

/**
 * Radix moves roving focus in a setTimeout and only checks the newly focused radio while an
 * arrow key is still held, so keep the key down until focus has moved (as in a real browser).
 */
async function arrow(user: ReturnType<typeof userEvent.setup>, key: "ArrowDown" | "ArrowUp") {
  const before = document.activeElement;
  await user.keyboard(`{${key}>}`);
  await waitFor(() => expect(document.activeElement).not.toBe(before));
  await user.keyboard(`{/${key}}`);
}

describe("RadioGroup", () => {
  const options = [
    { value: "s", label: "Small" },
    { value: "m", label: "Medium" },
    { value: "l", label: "Large" },
  ];

  it("selects on click and moves selection with arrow keys", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<RadioGroupField label="Size" options={options} onValueChange={onValueChange} />);
    expect(screen.getByRole("radiogroup", { name: "Size" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Small" }));
    expect(screen.getByRole("radio", { name: "Small" })).toBeChecked();
    expect(onValueChange).toHaveBeenLastCalledWith("s");
    await arrow(user, "ArrowDown");
    expect(screen.getByRole("radio", { name: "Medium" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Medium" })).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith("m");
    await arrow(user, "ArrowDown");
    await arrow(user, "ArrowDown");
    // Loops back to the first item.
    expect(screen.getByRole("radio", { name: "Small" })).toBeChecked();
    await arrow(user, "ArrowUp");
    expect(screen.getByRole("radio", { name: "Large" })).toBeChecked();
  });

  it("skips disabled options", async () => {
    const user = userEvent.setup();
    render(
      <RadioGroupField
        label="Size"
        defaultValue="s"
        options={[options[0], { ...options[1], disabled: true }, options[2]]}
      />
    );
    await user.click(screen.getByRole("radio", { name: "Small" }));
    await arrow(user, "ArrowDown");
    expect(screen.getByRole("radio", { name: "Large" })).toBeChecked();
  });
});

/* ------------------------------------------------------------------ */
/* Switch                                                              */
/* ------------------------------------------------------------------ */

describe("Switch", () => {
  it("toggles aria-checked and reports onCheckedChange", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<SwitchField label="Notifications" onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole("switch", { name: "Notifications" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    await user.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByText("Notifications"));
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });

  it("is disabled from a Field", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Field disabled>
        <FieldLabel>Wifi</FieldLabel>
        <Switch onCheckedChange={onCheckedChange} />
      </Field>
    );
    const sw = screen.getByRole("switch", { name: "Wifi" });
    expect(sw).toBeDisabled();
    await user.click(sw);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* SegmentedControl                                                    */
/* ------------------------------------------------------------------ */

describe("SegmentedControl", () => {
  it("selects one segment and never deselects", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        aria-label="View"
        options={[
          { value: "list", label: "List" },
          { value: "grid", label: "Grid" },
        ]}
        onValueChange={onValueChange}
      />
    );
    const list = screen.getByRole("radio", { name: "List" });
    const grid = screen.getByRole("radio", { name: "Grid" });
    // Defaults to the first option.
    expect(list).toHaveAttribute("aria-checked", "true");
    await user.click(grid);
    expect(grid).toHaveAttribute("aria-checked", "true");
    expect(list).toHaveAttribute("aria-checked", "false");
    expect(onValueChange).toHaveBeenLastCalledWith("grid");
    await user.click(grid);
    expect(grid).toHaveAttribute("aria-checked", "true");
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------ */
/* Rating                                                              */
/* ------------------------------------------------------------------ */

describe("Rating", () => {
  it("click sets the value and clicking it again clears", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rating" onValueChange={onValueChange} />);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    const three = screen.getByRole("radio", { name: "3 stars out of 5" });
    await user.click(three);
    expect(onValueChange).toHaveBeenLastCalledWith(3);
    expect(three).toHaveAttribute("aria-checked", "true");
    expect(three).toHaveFocus();
    await user.click(three);
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });

  it("supports arrow, Home, End and digit keys", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rating" defaultValue={2} onValueChange={onValueChange} />);
    screen.getByRole("radio", { name: "2 stars out of 5" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(3);
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    await user.keyboard("{End}");
    expect(onValueChange).toHaveBeenLastCalledWith(5);
    await user.keyboard("{ArrowRight}");
    // Clamped at max: no change emitted.
    expect(onValueChange).toHaveBeenCalledTimes(4);
    await user.keyboard("{Home}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    await user.keyboard("4");
    expect(onValueChange).toHaveBeenLastCalledWith(4);
    expect(screen.getByRole("radio", { name: "4 stars out of 5" })).toHaveFocus();
  });

  it("supports half steps by keyboard and pointer position", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rating" allowHalf defaultValue={2} onValueChange={onValueChange} />);
    screen.getByRole("radio", { name: "2 stars out of 5" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(2.5);
    expect(screen.getByRole("radio", { name: "2.5 stars out of 5" })).toHaveAttribute("aria-checked", "true");

    // jsdom has no layout: give the 4th star a box so the left half maps to 3.5.
    const fourth = screen.getAllByRole("radio")[3];
    fourth.getBoundingClientRect = () =>
      ({ left: 100, right: 120, width: 20, top: 0, bottom: 20, height: 20, x: 100, y: 0, toJSON() {} }) as DOMRect;
    fireEvent.click(fourth, { clientX: 105 });
    expect(onValueChange).toHaveBeenLastCalledWith(3.5);
    fireEvent.click(fourth, { clientX: 115 });
    expect(onValueChange).toHaveBeenLastCalledWith(4);
  });

  it("renders a static image when read-only", () => {
    render(<Rating readOnly value={3} />);
    expect(screen.getByRole("img", { name: "Rated 3 out of 5" })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Slider                                                              */
/* ------------------------------------------------------------------ */

describe("Slider", () => {
  it("renders one thumb with aria-valuenow", () => {
    render(<Slider aria-label="Volume" defaultValue={[30]} />);
    const thumbs = screen.getAllByRole("slider");
    expect(thumbs).toHaveLength(1);
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "30");
  });

  it("renders two labelled thumbs for a range", () => {
    render(<RangeSlider defaultValue={[10, 80]} />);
    const thumbs = screen.getAllByRole("slider");
    expect(thumbs).toHaveLength(2);
    expect(screen.getByRole("slider", { name: "Minimum" })).toHaveAttribute("aria-valuenow", "10");
    expect(screen.getByRole("slider", { name: "Maximum" })).toHaveAttribute("aria-valuenow", "80");
  });

  it("moves with the keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Slider thumbLabels={["Level"]} defaultValue={[50]} step={5} onValueChange={onValueChange} />);
    const thumb = screen.getByRole("slider", { name: "Level" });
    thumb.focus();
    await user.keyboard("{ArrowRight}");
    expect(thumb).toHaveAttribute("aria-valuenow", "55");
    expect(onValueChange).toHaveBeenLastCalledWith([55]);
    await user.keyboard("{Home}");
    expect(thumb).toHaveAttribute("aria-valuenow", "0");
  });
});

/* ------------------------------------------------------------------ */
/* Combobox                                                            */
/* ------------------------------------------------------------------ */

const fruits: ComboboxOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
];

describe("Combobox", () => {
  it("filters options as you type and selects one", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Combobox aria-label="Fruit" options={fruits} onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option")).toHaveLength(3);
    await user.keyboard("ban");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
    await user.click(screen.getByRole("option", { name: "Banana" }));
    expect(onValueChange).toHaveBeenCalledWith("banana");
    expect(trigger).toHaveTextContent("Banana");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the empty state when nothing matches", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={fruits} />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    await user.keyboard("zzz");
    expect(await screen.findByText("No results found.")).toBeInTheDocument();
  });

  it("multiple mode shows chips that can be removed", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Combobox multiple aria-label="Fruits" options={fruits} onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox", { name: "Fruits" });
    await user.click(trigger);
    await user.click(screen.getByRole("option", { name: "Apple" }));
    await user.click(screen.getByRole("option", { name: "Cherry" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["apple", "cherry"]);
    // Stays open in multiple mode.
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByRole("button", { name: "Remove Apple" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["cherry"]);
    expect(screen.queryByRole("button", { name: "Remove Apple" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Cherry" })).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("is named by a surrounding FieldLabel and wired to Field ids", async () => {
    const user = userEvent.setup();
    render(
      <Field invalid required>
        <FieldLabel>Fruit</FieldLabel>
        <Combobox options={fruits} />
        <FieldError>Pick one</FieldError>
      </Field>
    );
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAttribute("aria-required", "true");
    expect(trigger).toHaveAccessibleDescription(/Pick one/);
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Fruit" })).toBeInTheDocument();
  });

  it("collapses extra chips into +N", () => {
    render(
      <Combobox multiple aria-label="Fruits" options={fruits} defaultValue={["apple", "banana", "cherry"]} maxChips={1} />
    );
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("creatable creates and selects a new value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onCreate = vi.fn();
    render(<Combobox aria-label="Fruit" options={fruits} creatable onCreate={onCreate} onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    await user.click(trigger);
    await user.keyboard("Mango");
    const create = await screen.findByRole("option", { name: /Create/ });
    await user.click(create);
    expect(onCreate).toHaveBeenCalledWith("Mango");
    expect(onValueChange).toHaveBeenCalledWith("Mango");
    expect(trigger).toHaveTextContent("Mango");
  });
});

/* ------------------------------------------------------------------ */
/* SimpleSelect                                                        */
/* ------------------------------------------------------------------ */

describe("SimpleSelect", () => {
  const options = [
    { value: "us", label: "United States" },
    { value: "ca", label: "Canada" },
    { value: "mx", label: "Mexico", disabled: true },
  ];

  it("opens and selects an option with the keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<SimpleSelect aria-label="Country" options={options} onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox", { name: "Country" });
    expect(trigger).toHaveTextContent("Select…");
    trigger.focus();
    await user.keyboard("{Enter}");
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getAllByRole("option")).toHaveLength(3);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("ca");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(trigger).toHaveTextContent("Canada");
  });

  it("selects an option with the pointer", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<SimpleSelect aria-label="Country" options={options} onValueChange={onValueChange} />);
    await user.click(screen.getByRole("combobox", { name: "Country" }));
    await user.click(await screen.findByRole("option", { name: "United States" }));
    expect(onValueChange).toHaveBeenCalledWith("us");
    expect(screen.getByRole("combobox", { name: "Country" })).toHaveTextContent("United States");
  });
});

/* ------------------------------------------------------------------ */
/* DatePicker                                                          */
/* ------------------------------------------------------------------ */

describe("DatePicker", () => {
  it("opens a calendar and picking a day calls onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DatePicker
        aria-label="Due date"
        defaultValue={new Date(2024, 0, 15)}
        locale="en-US"
        onValueChange={onValueChange}
      />
    );
    const trigger = screen.getByRole("button", { name: "Due date" });
    expect(trigger).toHaveTextContent("Jan 15, 2024");
    await user.click(trigger);
    const grid = await screen.findByRole("grid");
    const day = within(grid).getByRole("button", { name: /January 20/ });
    await user.click(day);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    const picked = onValueChange.mock.calls[0][0] as Date;
    expect([picked.getFullYear(), picked.getMonth(), picked.getDate()]).toEqual([2024, 0, 20]);
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expect(trigger).toHaveTextContent("Jan 20, 2024");
  });

  it("clearable resets the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DatePicker aria-label="Due" clearable defaultValue={new Date(2024, 0, 15)} onValueChange={onValueChange} />
    );
    await user.click(screen.getByRole("button", { name: "Clear date" }));
    expect(onValueChange).toHaveBeenCalledWith(undefined);
    expect(screen.getByRole("button", { name: "Due" })).toHaveTextContent("Pick a date");
  });
});

/* ------------------------------------------------------------------ */
/* Dropzone helpers + drop                                             */
/* ------------------------------------------------------------------ */

describe("Dropzone helpers", () => {
  it("isFileAccepted matches MIME, wildcard and extension", () => {
    const png = makeFile("photo.PNG", "image/png");
    const pdf = makeFile("doc.pdf", "application/pdf");
    const unknown = makeFile("notes.md", "");
    expect(isFileAccepted(png)).toBe(true);
    expect(isFileAccepted(png, "image/*")).toBe(true);
    expect(isFileAccepted(png, "image/png")).toBe(true);
    expect(isFileAccepted(png, "image/jpeg")).toBe(false);
    expect(isFileAccepted(png, ".png")).toBe(true);
    expect(isFileAccepted(pdf, "image/*, .pdf")).toBe(true);
    expect(isFileAccepted(pdf, "image/*")).toBe(false);
    expect(isFileAccepted(unknown, ".md")).toBe(true);
    expect(isFileAccepted(unknown, "text/*")).toBe(false);
    // "imagex/*" must not match "image/*"-like prefixes loosely.
    expect(isFileAccepted(makeFile("a.bin", "imagex/foo"), "image/*")).toBe(false);
  });

  it("validateFiles rejects by type, size and count", () => {
    const a = makeFile("a.png", "image/png", 100);
    const big = makeFile("big.png", "image/png", 5000);
    const txt = makeFile("t.txt", "text/plain", 10);
    const b = makeFile("b.png", "image/png", 100);
    const c = makeFile("c.png", "image/png", 100);

    const result = validateFiles([a, big, txt, b, c], { accept: "image/*", maxSize: 1024, maxFiles: 2 });
    expect(result.accepted).toEqual([a, b]);
    const codes = result.rejections.map((r) => [r.file.name, r.errors.map((e) => e.code)]);
    expect(codes).toEqual([
      ["big.png", ["file-too-large"]],
      ["t.txt", ["file-invalid-type"]],
      ["c.png", ["too-many-files"]],
    ]);
    expect(result.rejections[0].errors[0].message).toMatch(/larger than 1 KB/);
  });

  it("validateFiles honours multiple=false and currentCount", () => {
    const a = makeFile("a.png", "image/png");
    const b = makeFile("b.png", "image/png");
    const single = validateFiles([a, b], { multiple: false });
    expect(single.accepted).toEqual([a]);
    expect(single.rejections[0].errors[0]).toEqual({ code: "too-many-files", message: "Only one file can be uploaded." });

    const counted = validateFiles([a, b], { maxFiles: 3, currentCount: 2 });
    expect(counted.accepted).toEqual([a]);
    expect(counted.rejections.map((r) => r.file)).toEqual([b]);

    expect(validateFiles([a, b]).accepted).toHaveLength(2);
  });

  it("describeFileConstraints builds a readable hint", () => {
    expect(describeFileConstraints({ accept: "image/*,.pdf", maxSize: 10 * 1024 * 1024, maxFiles: 3 })).toBe(
      "Images, PDF · up to 10 MB · max 3 files"
    );
    expect(describeFileConstraints({})).toBe("");
  });

  it("drop calls onDrop with accepted files and rejections", () => {
    const onDrop = vi.fn();
    render(<Dropzone aria-label="Upload" accept="image/*" maxSize={1000} onDrop={onDrop} />);
    const zone = screen.getByRole("button", { name: "Upload" });
    const ok = makeFile("ok.png", "image/png", 10);
    const bad = makeFile("bad.exe", "application/x-msdownload", 10);
    fireEvent.drop(zone, { dataTransfer: { files: [ok, bad], items: [] } });
    expect(onDrop).toHaveBeenCalledTimes(1);
    const [accepted, rejections] = onDrop.mock.calls[0];
    expect(accepted).toEqual([ok]);
    expect(rejections).toHaveLength(1);
    expect(rejections[0].file).toBe(bad);
    expect(rejections[0].errors[0].code).toBe("file-invalid-type");
  });

  it("shows drag feedback and ignores drops while disabled", () => {
    const onDrop = vi.fn();
    const { rerender } = render(<Dropzone aria-label="Upload" accept="image/*" onDrop={onDrop} />);
    const zone = screen.getByRole("button", { name: "Upload" });
    fireEvent.dragEnter(zone, { dataTransfer: { items: [{ kind: "file", type: "text/plain" }], files: [] } });
    expect(zone).toHaveAttribute("data-drag", "reject");
    expect(screen.getByText("Some files aren't supported")).toBeInTheDocument();
    fireEvent.dragLeave(zone, { dataTransfer: { items: [], files: [] } });
    expect(zone).not.toHaveAttribute("data-drag");
    fireEvent.dragEnter(zone, { dataTransfer: { items: [{ kind: "file", type: "image/png" }], files: [] } });
    expect(zone).toHaveAttribute("data-drag", "accept");
    fireEvent.dragLeave(zone, { dataTransfer: { items: [], files: [] } });

    rerender(<Dropzone aria-label="Upload" accept="image/*" onDrop={onDrop} disabled />);
    fireEvent.drop(zone, { dataTransfer: { files: [makeFile("a.png", "image/png")], items: [] } });
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("opens the file picker via the hidden input and validates picked files", async () => {
    const user = userEvent.setup();
    const onDrop = vi.fn();
    const { container } = render(<Dropzone aria-label="Upload" accept=".pdf" onDrop={onDrop} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const pdf = makeFile("x.pdf", "application/pdf");
    await user.upload(input, pdf);
    expect(onDrop).toHaveBeenCalledWith([pdf], []);
  });
});

/* ------------------------------------------------------------------ */
/* FileUpload                                                          */
/* ------------------------------------------------------------------ */

describe("FileUpload", () => {
  it("formatBytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-5)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1.4 * 1024 * 1024)).toBe("1.4 MB");
    expect(formatBytes(5 * 1024 ** 3, 2)).toBe("5 GB");
    expect(formatBytes(1024 ** 6)).toBe("1048576 TB");
  });

  it("adds dropped files, lists them, reports rejections and removes", async () => {
    const user = userEvent.setup();
    const onFilesChange = vi.fn();
    const onFilesRejected = vi.fn();
    render(
      <FileUpload accept="image/*" maxFiles={2} onFilesChange={onFilesChange} onFilesRejected={onFilesRejected}>
        <FileUploadDropzone aria-label="Drop files" />
        <FileUploadList />
      </FileUpload>
    );
    expect(screen.queryByRole("list", { name: "Files" })).not.toBeInTheDocument();
    const zone = screen.getByRole("button", { name: "Drop files" });
    const a = makeFile("a.png", "image/png", 2048);
    const t = makeFile("t.txt", "text/plain", 10);
    fireEvent.drop(zone, { dataTransfer: { files: [a, t], items: [] } });

    const list = screen.getByRole("list", { name: "Files" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(within(list).getByText("a.png")).toBeInTheDocument();
    expect(within(list).getByText("2 KB")).toBeInTheDocument();
    expect(onFilesChange).toHaveBeenLastCalledWith([expect.objectContaining({ file: a, status: "idle" })]);
    expect(onFilesRejected).toHaveBeenCalledWith([expect.objectContaining({ file: t })]);
    expect(screen.getByRole("alert")).toHaveTextContent("t.txt isn't a supported file type.");

    const b = makeFile("b.png", "image/png");
    const c = makeFile("c.png", "image/png");
    fireEvent.drop(zone, { dataTransfer: { files: [b, c], items: [] } });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent("You can upload up to 2 files.");

    await user.click(screen.getByRole("button", { name: "Remove a.png" }));
    expect(screen.queryByText("a.png")).not.toBeInTheDocument();
    expect(onFilesChange).toHaveBeenLastCalledWith([expect.objectContaining({ file: b })]);
  });

  it("replaces the file in single mode", () => {
    render(
      <FileUpload multiple={false}>
        <FileUploadDropzone aria-label="Drop" />
        <FileUploadList />
      </FileUpload>
    );
    const zone = screen.getByRole("button", { name: "Drop" });
    fireEvent.drop(zone, { dataTransfer: { files: [makeFile("one.pdf", "application/pdf")], items: [] } });
    fireEvent.drop(zone, { dataTransfer: { files: [makeFile("two.pdf", "application/pdf")], items: [] } });
    expect(screen.queryByText("one.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("two.pdf")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* PasswordStrength                                                    */
/* ------------------------------------------------------------------ */

describe("PasswordStrength", () => {
  it("getPasswordScore edge cases", () => {
    expect(getPasswordScore("")).toBe(0);
    expect(getPasswordScore("aB1!")).toBe(1); // too short
    expect(getPasswordScore("aaaaaaaaaaaaaaaa")).toBe(1); // repeated char
    expect(getPasswordScore("Password123!")).toBe(1); // common prefix
    expect(getPasswordScore("abcdefghijklmnopqrst")).toBe(1); // single class caps at 1
    expect(getPasswordScore("abcdefG1")).toBe(2);
    expect(getPasswordScore("abcdefG1!")).toBe(3);
    expect(getPasswordScore("abcdefghijklmnoP")).toBe(3); // long with 2 classes
    expect(getPasswordScore("Tr0ub4dor&3xyz")).toBe(4);
  });

  it("renders the meter, label and checklist", () => {
    const { rerender } = render(<PasswordStrength password="" />);
    const meter = screen.getByRole("meter", { name: "Password strength" });
    expect(meter).toHaveAttribute("aria-valuenow", "0");
    expect(meter).toHaveAttribute("aria-valuetext", "No password");
    const list = screen.getByRole("list", { name: "Password requirements" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(within(list).getAllByText("(not met)")).toHaveLength(5);

    rerender(<PasswordStrength password="Tr0ub4dor&3xyz" />);
    expect(meter).toHaveAttribute("aria-valuenow", "4");
    expect(meter).toHaveAttribute("aria-valuetext", "Strong");
    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(within(list).getAllByText("(met)")).toHaveLength(5);

    rerender(<PasswordStrength password="abc" labels={["Bad", "Meh", "Ok", "Great"]} requirements={[]} />);
    expect(screen.getByText("Bad")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Accessibility                                                       */
/* ------------------------------------------------------------------ */

describe("forms a11y", () => {
  it("Field + Input has no violations", async () => {
    const { container } = render(
      <Field invalid>
        <FieldLabel>Email</FieldLabel>
        <Input type="email" clearable defaultValue="a@b" />
        <FieldDescription>Work email</FieldDescription>
        <FieldError>Invalid email</FieldError>
      </Field>
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  it("CheckboxGroup with select-all has no violations", async () => {
    const { container } = render(
      <CheckboxGroup label="Toppings" defaultValue={["a"]}>
        <CheckboxGroupSelectAll />
        <CheckboxGroupItem value="a" label="A" description="First" />
        <CheckboxGroupItem value="b" label="B" />
      </CheckboxGroup>
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  it("RadioGroup has no violations", async () => {
    const { container } = render(
      <RadioGroupField
        label="Plan"
        defaultValue="pro"
        options={[
          { value: "free", label: "Free", description: "For individuals" },
          { value: "pro", label: "Pro" },
        ]}
      />
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  it("Switch has no violations", async () => {
    const { container } = render(<SwitchField label="Dark mode" description="Use dark theme" defaultChecked />);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("Combobox (closed and open) has no violations", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Field>
        <FieldLabel>Fruit</FieldLabel>
        <Combobox options={fruits} defaultValue="apple" />
      </Field>
    );
    expect(await axeViolations(container)).toEqual([]);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("other controls have no violations", async () => {
    const { container } = render(
      <div>
        <NumberInput aria-label="Qty" defaultValue={1} />
        <TagInput aria-label="Tags" defaultValue={["a"]} />
        <Textarea aria-label="Bio" showCount maxLength={20} />
        <Rating aria-label="Score" defaultValue={2} />
        <PasswordInput aria-label="Password" />
        <SegmentedControl aria-label="View" options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} />
        <PasswordStrength password="abc" />
      </div>
    );
    // Let SegmentedControl's enter-animation frame flush inside act.
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    expect(await axeViolations(container)).toEqual([]);
  });
});
