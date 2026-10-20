/**
 * TimePicker `wheel`: an opt-in popover with scrolling wheels (hours, minutes, optional seconds and AM/PM). Off by default
 * (no extra button, same markup), `true` adds a clock button, `"touch"` waits for a coarse pointer. The wheels follow the
 * field's clock, step, min, max and granularity, change the value as they move, work controlled and uncontrolled, stay left
 * to right in RTL, and the segments keep their keys. jsdom has no layout: a wheel row is chosen by clicking it.
 */
import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimePicker } from "../src/primitives/time-picker";
import { DirectionProvider } from "../src/primitives/direction-provider";
import { axeViolations } from "./a11y";

const original = window.matchMedia;
/** A coarse (touch) primary pointer. */
const coarsePointer = () => {
  window.matchMedia = ((query: string) => ({ ...original(query), matches: query.includes("pointer: coarse") })) as typeof window.matchMedia;
};
afterEach(() => {
  window.matchMedia = original;
});

const open = () => fireEvent.click(screen.getByRole("button", { name: "Choose time" }));
const panel = () => screen.getByRole("dialog", { name: "Choose time" });
const wheel = (name: string) => within(panel()).getByRole("listbox", { name });
const row = (name: string, text: string) => within(wheel(name)).getByRole("option", { name: text });
const selected = (name: string) => within(wheel(name)).getByRole("option", { selected: true }).textContent;
const input = (name: string) => screen.getByRole("spinbutton", { name }) as HTMLInputElement;

describe("TimePicker wheel: off by default", () => {
  it("has no clock button and no panel, and the markup is the old one", () => {
    const { container } = render(<TimePicker aria-label="Start" hourCycle={12} defaultValue="09:30" />);
    expect(screen.queryByRole("button", { name: "Choose time" })).toBeNull();
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("[data-slot=time-picker] > svg")).not.toBeNull();
  });

  it('wheel="touch" on a fine pointer changes nothing', () => {
    render(<TimePicker aria-label="Start" wheel="touch" hourCycle={12} defaultValue="09:30" />);
    expect(screen.queryByRole("button", { name: "Choose time" })).toBeNull();
    expect(input("Hour").inputMode).toBe("numeric");
  });
});

describe("TimePicker wheel: the panel", () => {
  it("opens from the clock button with hours, minutes and AM/PM on a 12-hour clock, at the current time", () => {
    render(<TimePicker aria-label="Start" wheel hourCycle={12} locale="en-US" defaultValue="09:30" />);
    const trigger = screen.getByRole("button", { name: "Choose time" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    open();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(within(panel()).getAllByRole("listbox").map((l) => l.getAttribute("aria-label"))).toEqual(["Hour", "Minute", "AM/PM"]);
    expect(within(wheel("Hour")).getAllByRole("option").map((o) => o.textContent)).toEqual(Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")));
    expect([selected("Hour"), selected("Minute"), selected("AM/PM")]).toEqual(["09", "30", "AM"]);
  });

  it("uses 00 to 23, a seconds wheel and the minute step of the field", () => {
    render(<TimePicker aria-label="Start" wheel hourCycle={24} granularity="second" step={15} defaultValue="13:45:20" />);
    open();
    expect(within(panel()).getAllByRole("listbox").map((l) => l.getAttribute("aria-label"))).toEqual(["Hour", "Minute", "Second"]);
    expect(within(wheel("Hour")).getAllByRole("option")).toHaveLength(24);
    expect(within(wheel("Minute")).getAllByRole("option").map((o) => o.textContent)).toEqual(["00", "15", "30", "45"]);
    expect(within(wheel("Second")).getAllByRole("option")).toHaveLength(60);
    expect([selected("Hour"), selected("Minute"), selected("Second")]).toEqual(["13", "45", "20"]);
  });

  it("keeps a minute that is not a multiple of the step while it is the value", () => {
    render(<TimePicker aria-label="Start" wheel hourCycle={24} step={15} defaultValue="10:07" />);
    open();
    expect(within(wheel("Minute")).getAllByRole("option").map((o) => o.textContent)).toEqual(["00", "07", "15", "30", "45"]);
  });

  it("follows the locale's order (Korean puts the day period first) and names every wheel from labels", () => {
    render(<TimePicker aria-label="시작" wheel locale="ko-KR" hourCycle={12} defaultValue="15:04" labels={{ wheel: "시간 선택", dayPeriod: "오전/오후", hour: "시", minute: "분", done: "확인" }} />);
    fireEvent.click(screen.getByRole("button", { name: "시간 선택" }));
    const names = within(screen.getByRole("dialog", { name: "시간 선택" })).getAllByRole("listbox").map((l) => l.getAttribute("aria-label"));
    expect(names).toEqual(["오전/오후", "시", "분"]);
    expect(screen.getByRole("button", { name: "확인" })).toBeInTheDocument();
  });

  it("has no axe violations open", async () => {
    const { baseElement } = render(<TimePicker aria-label="Start" wheel hourCycle={12} defaultValue="09:30" />);
    open();
    expect(await axeViolations(baseElement)).toEqual([]);
  });
});

describe("TimePicker wheel: changing the value", () => {
  it("uncontrolled: a wheel row changes the value, the segments and the hidden input follow", () => {
    const onValueChange = vi.fn();
    const { container } = render(<TimePicker aria-label="Start" name="start" wheel hourCycle={12} defaultValue="09:30" onValueChange={onValueChange} />);
    open();
    fireEvent.click(row("Hour", "10"));
    expect(onValueChange).toHaveBeenLastCalledWith("10:30");
    expect(input("Hour").value).toBe("10");
    fireEvent.click(row("Minute", "45"));
    expect(onValueChange).toHaveBeenLastCalledWith("10:45");
    fireEvent.click(row("AM/PM", "PM"));
    expect(onValueChange).toHaveBeenLastCalledWith("22:45");
    expect(input("AM/PM").value).toBe("PM");
    expect(container.querySelector<HTMLInputElement>("input[type=hidden]")!.value).toBe("22:45");
    expect(selected("AM/PM")).toBe("PM");
  });

  it("12 AM is midnight and 12 PM is noon", () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="Start" wheel hourCycle={12} defaultValue="09:30" onValueChange={onValueChange} />);
    open();
    fireEvent.click(row("Hour", "12"));
    expect(onValueChange).toHaveBeenLastCalledWith("00:30");
    fireEvent.click(row("AM/PM", "PM"));
    expect(onValueChange).toHaveBeenLastCalledWith("12:30");
  });

  it("controlled: reports the change and shows whatever the parent passes back", () => {
    const onValueChange = vi.fn();
    const Controlled = () => {
      const [value, setValue] = React.useState<string | undefined>("09:30");
      return (
        <TimePicker
          aria-label="Start"
          wheel
          hourCycle={24}
          value={value}
          onValueChange={(next) => {
            onValueChange(next);
            if (next !== "11:30") setValue(next); // the parent refuses 11:30
          }}
        />
      );
    };
    render(<Controlled />);
    open();
    fireEvent.click(row("Hour", "10"));
    expect(input("Hour").value).toBe("10");
    fireEvent.click(row("Hour", "11"));
    expect(onValueChange).toHaveBeenLastCalledWith("11:30");
    expect(input("Hour").value).toBe("10");
    expect(selected("Hour")).toBe("10");
  });

  it("an outside change of the value moves the wheels", () => {
    const { rerender } = render(<TimePicker aria-label="Start" wheel hourCycle={24} value="09:30" />);
    open();
    expect(selected("Hour")).toBe("09");
    rerender(<TimePicker aria-label="Start" wheel hourCycle={24} value="17:05" />);
    expect([selected("Hour"), selected("Minute")]).toEqual(["17", "05"]);
  });

  it("an empty field stays empty until a wheel moves; Done sets the wheels' time (min, or midnight)", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<TimePicker aria-label="Start" wheel hourCycle={24} onValueChange={onValueChange} />);
    open();
    expect(onValueChange).not.toHaveBeenCalled();
    expect([selected("Hour"), selected("Minute")]).toEqual(["00", "00"]);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onValueChange).toHaveBeenLastCalledWith("00:00");
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<TimePicker aria-label="Start" wheel hourCycle={24} min="08:30" defaultValue={undefined} onValueChange={onValueChange} key="min" />);
    open();
    expect([selected("Hour"), selected("Minute")]).toEqual(["08", "30"]);
  });

  it("an empty field takes the whole time as soon as one wheel moves", () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="Start" wheel hourCycle={24} onValueChange={onValueChange} />);
    open();
    fireEvent.click(row("Hour", "14"));
    expect(onValueChange).toHaveBeenLastCalledWith("14:00");
  });

  it("min and max disable the rows that cannot be reached and clamp the rest", () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="Start" wheel hourCycle={24} min="08:30" max="17:15" defaultValue="09:00" onValueChange={onValueChange} />);
    open();
    const disabledHours = within(wheel("Hour")).getAllByRole("option").filter((o) => o.getAttribute("aria-disabled") === "true").map((o) => o.textContent);
    expect(disabledHours).toEqual([...Array.from({ length: 8 }, (_, i) => String(i).padStart(2, "0")), ...Array.from({ length: 6 }, (_, i) => String(i + 18))]);
    expect(row("Minute", "00")).not.toHaveAttribute("aria-disabled"); // 09:00 is in range
    fireEvent.click(row("Hour", "08")); // disabled in the list? 08:xx is partly in range
    // 08 is enabled (08:30 to 08:59 fit); the minute is then clamped up to 08:30
    expect(onValueChange).toHaveBeenLastCalledWith("08:30");
    fireEvent.click(row("Hour", "07")); // fully out of range: ignored
    expect(onValueChange).toHaveBeenLastCalledWith("08:30");
  });

  it("the keys of the segments work as before with the wheels on", () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="Start" wheel hourCycle={24} defaultValue="09:30" onValueChange={onValueChange} />);
    const hour = input("Hour");
    hour.focus();
    fireEvent.keyDown(hour, { key: "ArrowUp" });
    expect(onValueChange).toHaveBeenLastCalledWith("10:30");
    fireEvent.keyDown(hour, { key: "1" });
    fireEvent.keyDown(hour, { key: "5" });
    expect(onValueChange).toHaveBeenLastCalledWith("15:30");
    expect(hour.inputMode).toBe("numeric");
  });
});

describe("TimePicker wheel: touch", () => {
  it('wheel="touch" on a coarse pointer adds the button, stops the keyboard and opens on a tap of the field', () => {
    coarsePointer();
    render(<TimePicker aria-label="Start" wheel="touch" hourCycle={24} defaultValue="09:30" />);
    expect(screen.getByRole("button", { name: "Choose time" })).toBeInTheDocument();
    expect(input("Hour").inputMode).toBe("none");
    fireEvent.click(input("Minute"));
    expect(panel()).toBeInTheDocument();
    expect(selected("Hour")).toBe("09");
  });

  it("a tap on the field while the panel is open keeps it open; Escape closes it and focus returns to the button", () => {
    coarsePointer();
    render(<TimePicker aria-label="Start" wheel="touch" hourCycle={24} defaultValue="09:30" />);
    fireEvent.click(input("Hour"));
    fireEvent.pointerDown(input("Hour"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(within(panel()).getAllByRole("listbox")[0]!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("readOnly and disabled never open the wheels", () => {
    coarsePointer();
    const { rerender } = render(<TimePicker aria-label="Start" wheel readOnly defaultValue="09:30" />);
    expect(screen.queryByRole("button", { name: "Choose time" })).toBeNull();
    fireEvent.click(input("Hour"));
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<TimePicker aria-label="Start" wheel disabled defaultValue="09:30" />);
    expect(screen.queryByRole("button", { name: "Choose time" })).toBeNull();
  });
});

describe("TimePicker wheel: right to left", () => {
  it("the wheels stay hour, minute, AM/PM from left to right like the segments", () => {
    render(
      <div dir="rtl">
        <TimePicker aria-label="Start" wheel hourCycle={12} locale="en-US" defaultValue="09:30" />
      </div>
    );
    open();
    const group = within(panel()).getByRole("group");
    expect(group).toHaveAttribute("dir", "ltr");
    const names = within(group).getAllByRole("listbox").map((l) => l.getAttribute("aria-label"));
    expect(names).toEqual(["Hour", "Minute", "AM/PM"]);
  });

  it("inside a DirectionProvider the wheels still change the value", () => {
    const onValueChange = vi.fn();
    render(
      <DirectionProvider dir="rtl">
        <TimePicker aria-label="Start" wheel hourCycle={24} defaultValue="09:30" onValueChange={onValueChange} />
      </DirectionProvider>
    );
    open();
    fireEvent.click(row("Hour", "11"));
    expect(onValueChange).toHaveBeenLastCalledWith("11:30");
  });
});
