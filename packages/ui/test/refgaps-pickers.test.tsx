/** Pickers and dialogs: TimePicker, DateTimePicker, DatePicker popovers and useDialogs. */
import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimePicker } from "../src/primitives/time-picker";
import { DatePicker, DateRangePicker, DateTimePicker } from "../src/primitives/date-picker";
import { DialogProvider, useConfirm, useDialogs, type DialogsApi } from "../src/primitives/confirm";
import { Field, FieldLabel } from "../src/primitives/field";
import { axeViolations } from "./helpers/a11y";

const seg = (name: string) => screen.getByRole("spinbutton", { name });
const key = (el: Element, k: string) => fireEvent.keyDown(el, { key: k });
const type = (el: Element, keys: string) => {
  for (const k of keys) key(el, k);
};

/* ------------------------------------------------------------------ */
/* TimePicker                                                          */
/* ------------------------------------------------------------------ */

describe("TimePicker", () => {
  it("renders a named group of spinbuttons on a 24-hour clock", async () => {
    const { container } = render(<TimePicker aria-label="Start" locale="en-GB" defaultValue="09:05" />);
    const group = screen.getByRole("group", { name: "Start" });
    expect(within(group).getAllByRole("spinbutton")).toHaveLength(2);
    expect(seg("Hour")).toHaveValue("09");
    expect(seg("Hour")).toHaveAttribute("aria-valuenow", "9");
    expect(seg("Hour")).toHaveAttribute("aria-valuemax", "23");
    expect(seg("Minute")).toHaveValue("05");
    expect(screen.queryByRole("spinbutton", { name: "AM/PM" })).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("typing digits fills segments and moves focus", () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="Start" locale="en-GB" onValueChange={onValueChange} />);
    expect(seg("Hour")).toHaveAttribute("aria-valuetext", "Empty");
    seg("Hour").focus();
    type(seg("Hour"), "14");
    expect(seg("Minute")).toHaveFocus();
    expect(onValueChange).not.toHaveBeenCalled();
    type(seg("Minute"), "3");
    expect(onValueChange).not.toHaveBeenCalled(); // "3" may still become "30"–"39"
    type(seg("Minute"), "0");
    expect(onValueChange).toHaveBeenLastCalledWith("14:30");
    // A first digit that can't start a two-digit hour completes the segment at once.
    seg("Hour").focus();
    type(seg("Hour"), "7");
    expect(onValueChange).toHaveBeenLastCalledWith("07:30");
    expect(seg("Minute")).toHaveFocus();
  });

  it("a pending digit commits when focus leaves the segment", () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="Start" locale="en-GB" defaultValue="10:30" onValueChange={onValueChange} />);
    seg("Hour").focus();
    key(seg("Hour"), "1");
    expect(onValueChange).not.toHaveBeenCalled();
    key(seg("Hour"), "ArrowRight");
    expect(onValueChange).toHaveBeenLastCalledWith("01:30");
    expect(seg("Minute")).toHaveFocus();
  });

  it("uses a 12-hour clock by locale, with an AM/PM segment", () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="Start" locale="en-US" onValueChange={onValueChange} />);
    expect(seg("AM/PM")).toHaveValue("AM");
    expect(seg("Hour")).toHaveAttribute("aria-valuemin", "1");
    seg("Hour").focus();
    type(seg("Hour"), "2");
    type(seg("Minute"), "30");
    expect(onValueChange).toHaveBeenLastCalledWith("02:30");
    expect(seg("AM/PM")).toHaveFocus();
    key(seg("AM/PM"), "p");
    expect(onValueChange).toHaveBeenLastCalledWith("14:30");
    expect(seg("AM/PM")).toHaveValue("PM");
    key(seg("AM/PM"), "ArrowUp");
    expect(onValueChange).toHaveBeenLastCalledWith("02:30");
    // 12 AM is midnight.
    seg("Hour").focus();
    type(seg("Hour"), "12");
    expect(onValueChange).toHaveBeenLastCalledWith("00:30");
  });

  it("hourCycle overrides the locale", () => {
    const { rerender } = render(<TimePicker aria-label="T" locale="en-US" hourCycle={24} defaultValue="15:00" />);
    expect(screen.queryByRole("spinbutton", { name: "AM/PM" })).toBeNull();
    expect(seg("Hour")).toHaveValue("15");
    rerender(<TimePicker aria-label="T" locale="en-GB" hourCycle={12} defaultValue="15:00" />);
    expect(seg("Hour")).toHaveValue("03");
    expect(seg("AM/PM")).toHaveValue("pm"); // en-GB spells the day period in lower case
  });

  it("orders segments by locale (day period first in Korean)", () => {
    render(<TimePicker aria-label="T" locale="ko-KR" hourCycle={12} defaultValue="15:00" />);
    const names = screen.getAllByRole("spinbutton").map((el) => el.getAttribute("aria-label"));
    expect(names).toEqual(["AM/PM", "Hour", "Minute"]);
  });

  it("arrow keys step and wrap each segment; Home/End jump; Backspace clears", () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="T" locale="en-GB" defaultValue="23:59" onValueChange={onValueChange} />);
    key(seg("Hour"), "ArrowUp");
    expect(onValueChange).toHaveBeenLastCalledWith("00:59");
    key(seg("Minute"), "ArrowUp");
    expect(onValueChange).toHaveBeenLastCalledWith("00:00"); // no carry into the hour, like native fields
    key(seg("Minute"), "ArrowDown");
    expect(onValueChange).toHaveBeenLastCalledWith("00:59");
    key(seg("Hour"), "End");
    expect(onValueChange).toHaveBeenLastCalledWith("23:59");
    key(seg("Minute"), "Home");
    expect(onValueChange).toHaveBeenLastCalledWith("23:00");
    key(seg("Minute"), "Backspace");
    expect(onValueChange).toHaveBeenLastCalledWith(undefined);
    expect(seg("Minute")).toHaveValue("--");
    key(seg("Minute"), "ArrowDown");
    expect(onValueChange).toHaveBeenLastCalledWith("23:59");
  });

  it("step snaps the minute arrows to multiples", () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="T" locale="en-GB" step={15} defaultValue="10:07" onValueChange={onValueChange} />);
    key(seg("Minute"), "ArrowUp");
    expect(onValueChange).toHaveBeenLastCalledWith("10:15");
    key(seg("Minute"), "ArrowUp");
    key(seg("Minute"), "ArrowUp");
    key(seg("Minute"), "ArrowUp");
    expect(onValueChange).toHaveBeenLastCalledWith("10:00");
    key(seg("Minute"), "ArrowDown");
    expect(onValueChange).toHaveBeenLastCalledWith("10:45");
  });

  it("clamps to min and max", () => {
    const onValueChange = vi.fn();
    render(
      <TimePicker aria-label="T" locale="en-GB" min="09:00" max="17:30" defaultValue="09:00" onValueChange={onValueChange} />
    );
    key(seg("Hour"), "ArrowDown");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(seg("Hour")).toHaveValue("09");
    seg("Hour").focus();
    type(seg("Hour"), "18");
    expect(onValueChange).toHaveBeenLastCalledWith("17:30");
    expect(seg("Minute")).toHaveValue("30");
  });

  it("supports a seconds segment", () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="T" locale="en-GB" granularity="second" defaultValue="08:00" onValueChange={onValueChange} />);
    expect(seg("Second")).toHaveValue("00");
    key(seg("Second"), "ArrowDown");
    expect(onValueChange).toHaveBeenLastCalledWith("08:00:59");
  });

  it("controlled: follows the value prop and reports changes", () => {
    function Controlled() {
      const [value, setValue] = React.useState<string | undefined>("06:15");
      return (
        <>
          <TimePicker aria-label="T" locale="en-GB" value={value} onValueChange={setValue} />
          <output data-testid="out">{value ?? "none"}</output>
          <button onClick={() => setValue("21:45")}>Set</button>
          <button onClick={() => setValue(undefined)}>Reset</button>
        </>
      );
    }
    render(<Controlled />);
    key(seg("Hour"), "ArrowUp");
    expect(screen.getByTestId("out")).toHaveTextContent("07:15");
    fireEvent.click(screen.getByText("Set"));
    expect(seg("Hour")).toHaveValue("21");
    expect(seg("Minute")).toHaveValue("45");
    fireEvent.click(screen.getByText("Reset"));
    expect(seg("Hour")).toHaveValue("--");
  });

  it("controlled without onValueChange keeps the value", () => {
    render(<TimePicker aria-label="T" locale="en-GB" value="06:15" />);
    key(seg("Hour"), "ArrowUp");
    // The segment shows the edit, but nothing is committed upstream.
    expect(seg("Minute")).toHaveValue("15");
  });

  it("clear button empties the field and refocuses it", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="T" locale="en-GB" clearable defaultValue="10:00" onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Clear time" }));
    expect(onValueChange).toHaveBeenLastCalledWith(undefined);
    expect(seg("Hour")).toHaveValue("--");
    expect(seg("Hour")).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Clear time" })).toBeNull();
  });

  it("virtual keyboard input (no keydown) still types", () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="T" locale="en-GB" defaultValue="10:00" onValueChange={onValueChange} />);
    fireEvent.change(seg("Hour"), { target: { value: "109" } });
    expect(onValueChange).toHaveBeenLastCalledWith("09:00");
  });

  it("disabled and readOnly ignore keys; name posts the value", () => {
    const onValueChange = vi.fn();
    const { container, rerender } = render(
      <TimePicker aria-label="T" locale="en-GB" disabled name="at" defaultValue="10:00" onValueChange={onValueChange} />
    );
    expect(seg("Hour")).toBeDisabled();
    key(seg("Hour"), "ArrowUp");
    rerender(<TimePicker aria-label="T" locale="en-GB" readOnly name="at" defaultValue="10:00" onValueChange={onValueChange} />);
    key(seg("Hour"), "ArrowUp");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(container.querySelector('input[type="hidden"][name="at"]')).toHaveValue("10:00");
  });

  it("wires into Field: label names the group, invalid marks segments", async () => {
    const { container } = render(
      <Field invalid>
        <FieldLabel>Reminder</FieldLabel>
        <TimePicker locale="en-US" defaultValue="18:00" />
      </Field>
    );
    expect(screen.getByRole("group", { name: "Reminder" })).toHaveAttribute("data-invalid");
    expect(seg("Hour")).toHaveAttribute("aria-invalid", "true");
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* DateTimePicker                                                      */
/* ------------------------------------------------------------------ */

describe("DateTimePicker", () => {
  it("combines the picked day with the time", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DateTimePicker
        aria-label="Deadline"
        locale="en-US"
        hourCycle={24}
        defaultValue={new Date(2026, 9, 19, 14, 30)}
        onValueChange={onValueChange}
        name="deadline"
      />
    );
    const trigger = screen.getByRole("button", { name: "Deadline" });
    expect(trigger).toHaveTextContent("Oct 19, 2026, 14:30");
    await user.click(trigger);
    const grid = await screen.findByRole("grid");
    await user.click(within(grid).getByRole("button", { name: /October 22/ }));
    let [date, meta] = onValueChange.mock.calls.at(-1)!;
    expect(date).toEqual(new Date(2026, 9, 22, 14, 30));
    expect(meta).toEqual({ localValue: "2026-10-22T14:30" });
    // The popover stays open for the time.
    const time = screen.getByRole("group", { name: "Time" });
    key(within(time).getByRole("spinbutton", { name: "Hour" }), "ArrowUp");
    [date, meta] = onValueChange.mock.calls.at(-1)!;
    expect(meta.localValue).toBe("2026-10-22T15:30");
    expect(trigger).toHaveTextContent("Oct 22, 2026, 15:30");
    expect(document.querySelector('input[name="deadline"]')).toHaveValue("2026-10-22T15:30");
    expect(await axeViolations(document.body)).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
  });

  it("a time set before the day is used when the day is picked", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<DateTimePicker aria-label="At" locale="en-GB" defaultOpen onValueChange={onValueChange} />);
    const time = await screen.findByRole("group", { name: "Time" });
    within(time).getByRole("spinbutton", { name: "Hour" }).focus();
    type(within(time).getByRole("spinbutton", { name: "Hour" }), "08");
    type(within(time).getByRole("spinbutton", { name: "Minute" }), "45");
    expect(onValueChange).not.toHaveBeenCalled();
    const grid = screen.getByRole("grid");
    const firstDay = within(grid).getAllByRole("button").find((b) => !b.hasAttribute("disabled") && /\d/.test(b.textContent ?? ""))!;
    await user.click(firstDay);
    const date = onValueChange.mock.calls.at(-1)![0] as Date;
    expect([date.getHours(), date.getMinutes()]).toEqual([8, 45]);
  });

  it("accepts local datetime strings and respects min/max", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DateTimePicker
        aria-label="Event"
        locale="en-GB"
        value="2026-10-20T08:00"
        min="2026-10-20T09:30"
        max="2026-10-25T18:00"
        onValueChange={onValueChange}
        defaultOpen
      />
    );
    const grid = await screen.findByRole("grid");
    expect(grid.querySelector('[data-day="2026-10-19"]')).toHaveAttribute("data-disabled", "true");
    expect(grid.querySelector('[data-day="2026-10-26"]')).toHaveAttribute("data-disabled", "true");
    expect(grid.querySelector('[data-day="2026-10-25"]')).not.toHaveAttribute("data-disabled");
    // On the min day the time can't go before the min time.
    const hour = within(screen.getByRole("group", { name: "Time" })).getByRole("spinbutton", { name: "Hour" });
    key(hour, "ArrowUp");
    expect(onValueChange.mock.calls.at(-1)![1]).toEqual({ localValue: "2026-10-20T09:30" });
    // Picking the max day keeps the time (08:00 is before the 18:00 max).
    await user.click(within(grid).getByRole("button", { name: /October 25/ }));
    expect(onValueChange.mock.calls.at(-1)![1]).toEqual({ localValue: "2026-10-25T08:00" });
  });

  it("presets set the value and close; clear resets", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DateTimePicker
        aria-label="Remind"
        locale="en-GB"
        clearable
        presets={[{ label: "Tomorrow 9:00", getValue: () => new Date(2026, 9, 20, 9, 0) }]}
        onValueChange={onValueChange}
      />
    );
    await user.click(screen.getByRole("button", { name: "Remind" }));
    await user.click(await screen.findByRole("button", { name: "Tomorrow 9:00" }));
    expect(onValueChange.mock.calls.at(-1)![1]).toEqual({ localValue: "2026-10-20T09:00" });
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Clear date" }));
    expect(onValueChange).toHaveBeenLastCalledWith(undefined, { localValue: "" });
    expect(screen.getByRole("button", { name: "Remind" })).toHaveTextContent("Pick a date and time");
  });

  it("inside a Field the time field doesn't steal the field's id", async () => {
    render(
      <Field id="due">
        <FieldLabel>Due</FieldLabel>
        <DateTimePicker locale="en-GB" defaultOpen />
      </Field>
    );
    await screen.findByRole("grid");
    expect(document.querySelectorAll("#due")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Due" })).toHaveAttribute("id", "due");
  });
});

/* ------------------------------------------------------------------ */
/* Dialogs                                                             */
/* ------------------------------------------------------------------ */

function setup() {
  const api: { current: DialogsApi | null } = { current: null };
  function Grab() {
    api.current = useDialogs();
    return <button>Opener</button>;
  }
  const utils = render(
    <DialogProvider>
      <Grab />
    </DialogProvider>
  );
  return { ...utils, api: () => api.current! };
}

describe("useDialogs", () => {
  it("throws a clear error outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Bad() {
      useConfirm();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(/inside <DialogProvider>/);
    spy.mockRestore();
  });

  it("confirm resolves true on confirm and returns focus to the opener", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    const opener = screen.getByText("Opener");
    opener.focus();
    let p!: Promise<boolean>;
    act(() => {
      p = api().confirm({ title: "Delete file?", description: "This can't be undone.", tone: "destructive", confirmLabel: "Delete" });
    });
    const dialog = await screen.findByRole("alertdialog", { name: "Delete file?" });
    expect(await axeViolations(document.body)).toEqual([]);
    // Cancel gets initial focus, so a stray Enter doesn't delete.
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus());
    const del = within(dialog).getByRole("button", { name: "Delete" });
    expect(del.className).toMatch(/destructive/);
    await user.click(del);
    await expect(p).resolves.toBe(true);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("confirm resolves false on Cancel and on Escape; a string is the title", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    let p!: Promise<boolean>;
    act(() => {
      p = api().confirm("Discard changes?");
    });
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    await expect(p).resolves.toBe(false);

    act(() => {
      p = api().confirm("Discard changes?");
    });
    await screen.findByRole("alertdialog", { name: "Discard changes?" });
    await user.keyboard("{Escape}");
    await expect(p).resolves.toBe(false);
  });

  it("confirm waits for an async onConfirm", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    let finish!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((r) => (finish = r)));
    let result: boolean | undefined;
    act(() => {
      void api().confirm({ title: "Sign out?", onConfirm }).then((v) => (result = v));
    });
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalled();
    expect(result).toBeUndefined();
    await act(async () => finish());
    await waitFor(() => expect(result).toBe(true));
  });

  it("prompt resolves the trimmed value, null on Escape", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    let p!: Promise<string | null>;
    act(() => {
      p = api().prompt({ title: "Rename", label: "Name", defaultValue: "report.pdf" });
    });
    const dialog = await screen.findByRole("dialog", { name: "Rename" });
    const input = within(dialog).getByRole("textbox", { name: /Name/ });
    expect(input).toHaveValue("report.pdf");
    await waitFor(() => expect(input).toHaveFocus());
    expect(await axeViolations(document.body)).toEqual([]);
    await user.clear(input);
    expect(within(dialog).getByRole("button", { name: "OK" })).toBeDisabled();
    await user.type(input, "  notes.md  {Enter}");
    await expect(p).resolves.toBe("notes.md");

    act(() => {
      p = api().prompt("Folder name");
    });
    await screen.findByRole("dialog", { name: "Folder name" });
    await user.keyboard("{Escape}");
    await expect(p).resolves.toBeNull();
  });

  it("prompt validates and stays open until the value passes", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    let p!: Promise<string | null>;
    act(() => {
      p = api().prompt({
        title: "Absolute path",
        validate: async (v) => (v.startsWith("/") ? null : "Path must start with /"),
      });
    });
    const dialog = await screen.findByRole("dialog", { name: "Absolute path" });
    const input = within(dialog).getByRole("textbox", { name: "Absolute path" });
    await user.type(input, "media{Enter}");
    expect(await within(dialog).findByText("Path must start with /")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/Path must start with/);
    let settled = false;
    void p.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    await user.clear(input);
    await user.type(input, "/media{Enter}");
    await expect(p).resolves.toBe("/media");
  });

  it("prompt with required: false resolves an empty string", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    let p!: Promise<string | null>;
    act(() => {
      p = api().prompt({ title: "Note", required: false });
    });
    await user.click(await screen.findByRole("button", { name: "OK" }));
    await expect(p).resolves.toBe("");
  });

  it("choose resolves the picked option's value (any type), null on Escape", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    const nodes = [
      { id: 1, name: "pi-living" },
      { id: 2, name: "pi-office" },
      { id: 3, name: "pi-garage" },
    ];
    let p!: Promise<{ id: number; name: string } | null>;
    act(() => {
      p = api().choose({
        title: "Move to",
        confirmLabel: "Move",
        options: nodes.map((n) => ({ value: n, label: n.name, disabled: n.id === 1 })),
      });
    });
    const dialog = await screen.findByRole("dialog", { name: "Move to" });
    const group = within(dialog).getByRole("radiogroup", { name: "Move to" });
    // The first enabled option is preselected; the disabled one is shown but can't be picked.
    expect(within(group).getByRole("radio", { name: "pi-office" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "pi-living" })).toBeDisabled();
    expect(await axeViolations(document.body)).toEqual([]);
    await user.click(within(group).getByRole("radio", { name: "pi-garage" }));
    await user.click(within(dialog).getByRole("button", { name: "Move" }));
    await expect(p).resolves.toBe(nodes[2]);

    act(() => {
      p = api().choose({ title: "Move to", options: nodes.map((n) => ({ value: n, label: n.name })), defaultValue: nodes[1] });
    });
    expect(await screen.findByRole("radio", { name: "pi-office" })).toBeChecked();
    await user.keyboard("{Escape}");
    await expect(p).resolves.toBeNull();
  });

  it("queues dialogs: one at a time, in call order", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    let a!: Promise<boolean>;
    let b!: Promise<string | null>;
    act(() => {
      a = api().confirm("First?");
      b = api().prompt({ title: "Second", defaultValue: "x" });
    });
    await screen.findByRole("alertdialog", { name: "First?" });
    expect(screen.queryByRole("dialog", { name: "Second" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await expect(a).resolves.toBe(true);
    const second = await screen.findByRole("dialog", { name: "Second" });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await user.click(within(second).getByRole("button", { name: "OK" }));
    await expect(b).resolves.toBe("x");
  });

  it("unmounting the provider cancels pending dialogs", async () => {
    const { api, unmount } = setup();
    let a!: Promise<boolean>;
    let b!: Promise<string | null>;
    act(() => {
      a = api().confirm("First?");
      b = api().prompt("Second");
    });
    await screen.findByRole("alertdialog");
    unmount();
    await expect(a).resolves.toBe(false);
    await expect(b).resolves.toBeNull();
  });

  it("a dialog requested on mount survives StrictMode's remount", async () => {
    let result: boolean | undefined;
    function AskOnMount() {
      const confirm = useConfirm();
      React.useEffect(() => {
        void confirm("Continue?").then((v) => (result = v));
      }, [confirm]);
      return null;
    }
    render(
      <DialogProvider>
        <AskOnMount />
      </DialogProvider>
    );
    await screen.findAllByRole("alertdialog");
    await Promise.resolve();
    expect(result).toBeUndefined();
  });
});

describe("DatePicker popovers", () => {
  it("DatePicker and DateRangePicker popovers have an accessible name", async () => {
    const { unmount } = render(<DatePicker aria-label="Due" defaultOpen />);
    expect(await screen.findByRole("dialog", { name: "Due" })).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
    unmount();
    const range = render(<DateRangePicker defaultOpen />);
    expect(await screen.findByRole("dialog", { name: "Pick a date range" })).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
    range.unmount();
    // With no label and an empty placeholder the popover falls back to a generic name.
    render(<DateRangePicker defaultOpen placeholder="" />);
    expect(await screen.findByRole("dialog", { name: "Choose date range" })).toBeInTheDocument();
  });
});
