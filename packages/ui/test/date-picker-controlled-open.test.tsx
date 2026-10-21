/** A parent that controls `open` and sets it true itself (Radix does not call onOpenChange then) still gets a freshly synced popover. */
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DatePicker, DateRangePicker, DateTimePicker } from "../src/primitives/date-picker";

const A = { from: new Date(2020, 0, 10), to: new Date(2020, 0, 12) };
const B = { from: new Date(2024, 5, 3), to: new Date(2024, 5, 5) };

const caption = (text: string) => screen.queryByText(text, { selector: "[role='status'], span, div" });
const footer = () => document.body.querySelector("span.tabular-nums[aria-live='polite']")?.textContent ?? "";
const day = (label: RegExp) => screen.getByRole("button", { name: label });

describe("DateRangePicker with a parent-controlled open", () => {
  const ui = (value: typeof A, open: boolean) => (
    <DateRangePicker aria-label="Range" locale="en-US" numberOfMonths={1} value={value} open={open} onOpenChange={() => {}} />
  );

  it("shows the current value's month and range after the parent opens it", () => {
    const { rerender } = render(ui(A, false));
    rerender(ui(B, false));
    rerender(ui(B, true));
    expect(screen.getByText("June 2024")).toBeInTheDocument();
    expect(screen.queryByText("January 2020")).not.toBeInTheDocument();
    expect(footer()).toMatch(/Jun 3.+5, 2024/);
  });

  it("drops an unsaved draft from an earlier session when reopened by the parent", () => {
    const { rerender } = render(ui(A, true));
    fireEvent.click(day(/January 20th, 2020/));
    expect(footer()).toMatch(/Jan 10.+20, 2020/);
    rerender(ui(A, false));
    rerender(ui(A, true));
    expect(footer()).toMatch(/Jan 10.+12, 2020/);
  });

  it("keeps edits made while open across re-renders", () => {
    const { rerender } = render(ui(A, true));
    fireEvent.click(day(/January 20th, 2020/));
    fireEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(screen.getByText("February 2020")).toBeInTheDocument();
    rerender(ui(A, true));
    rerender(ui({ ...A }, true));
    expect(screen.getByText("February 2020")).toBeInTheDocument();
    expect(footer()).toMatch(/Jan 10.+20, 2020/);
  });

  it("does not resync a popover that mounts open", () => {
    render(ui(A, true));
    expect(screen.getByText("January 2020")).toBeInTheDocument();
    expect(footer()).toMatch(/Jan 10.+12, 2020/);
  });
});

describe("DateTimePicker with a parent-controlled open", () => {
  const ui = (value: Date, open: boolean) => (
    <DateTimePicker aria-label="At" locale="en-US" value={value} open={open} onOpenChange={() => {}} />
  );

  it("shows the current value's month after the parent opens it", () => {
    const { rerender } = render(ui(new Date(2020, 0, 10, 9, 0), false));
    rerender(ui(new Date(2024, 5, 3, 9, 0), false));
    rerender(ui(new Date(2024, 5, 3, 9, 0), true));
    expect(screen.getByText("June 2024")).toBeInTheDocument();
    expect(screen.queryByText("January 2020")).not.toBeInTheDocument();
  });

  it("returns to the value's month when reopened after browsing away", () => {
    const v = new Date(2020, 0, 10, 9, 0);
    const { rerender } = render(ui(v, true));
    fireEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(screen.getByText("February 2020")).toBeInTheDocument();
    rerender(ui(v, false));
    rerender(ui(v, true));
    expect(screen.getByText("January 2020")).toBeInTheDocument();
  });

  it("keeps the browsed month across re-renders while open", () => {
    const v = new Date(2020, 0, 10, 9, 0);
    const { rerender } = render(ui(v, true));
    fireEvent.click(screen.getByRole("button", { name: /next month/i }));
    rerender(ui(v, true));
    rerender(ui(new Date(v), true));
    expect(screen.getByText("February 2020")).toBeInTheDocument();
  });

  it("forgets a time typed before any day was picked once it is reopened", () => {
    const Harness = ({ open }: { open: boolean }) => (
      <DateTimePicker aria-label="At" locale="en-GB" open={open} onOpenChange={() => {}} />
    );
    const { rerender } = render(<Harness open />);
    const type = (name: string, keys: string) => {
      for (const k of keys) fireEvent.keyDown(screen.getByRole("spinbutton", { name }), { key: k });
    };
    type("Hour", "07");
    type("Minute", "30");
    expect(screen.getByRole("spinbutton", { name: "Hour" })).toHaveValue("07");
    rerender(<Harness open />);
    expect(screen.getByRole("spinbutton", { name: "Hour" })).toHaveValue("07");
    rerender(<Harness open={false} />);
    rerender(<Harness open />);
    expect(screen.getByRole("spinbutton", { name: "Hour" })).not.toHaveValue("07");
  });
});

describe("DatePicker", () => {
  it("opens on the current value's month when the parent opens it (Calendar mounts per open, no stale state)", () => {
    const ui = (value: Date, open: boolean) => (
      <DatePicker aria-label="On" locale="en-US" value={value} open={open} onOpenChange={() => {}} />
    );
    const { rerender } = render(ui(new Date(2020, 0, 10), false));
    rerender(ui(new Date(2024, 5, 3), false));
    rerender(ui(new Date(2024, 5, 3), true));
    expect(screen.getByText("June 2024")).toBeInTheDocument();
  });
});
