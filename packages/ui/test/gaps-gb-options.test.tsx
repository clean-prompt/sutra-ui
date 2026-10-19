import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Input, PasswordInput, inputShellVariants, inputVariants } from "../src/primitives/input";
import { Textarea } from "../src/primitives/textarea";
import { NumberInput } from "../src/primitives/number-input";
import { TagInput } from "../src/primitives/tag-input";
import { PaginationStatus } from "../src/primitives/pagination";
import { getPageWindow } from "../src/lib/pagination";
import { Rating } from "../src/primitives/rating";
import { Countdown } from "../src/patterns/countdown";
import { axeViolations } from "./a11y";

const tokens = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

describe("filled inputs", () => {
  it("outline stays the default: the shell and input classes carry no filled tokens", () => {
    expect(tokens(inputShellVariants()).has("bg-muted")).toBe(false);
    expect(tokens(inputVariants({ size: "md" })).has("bg-muted")).toBe(false);
    expect(tokens(inputShellVariants({ variant: "outline" }))).toEqual(tokens(inputShellVariants()));
  });

  it("the shell and inputVariants add the filled surface and a focus surface", () => {
    const control = tokens(inputShellVariants({ variant: "filled" }));
    for (const c of ["border-transparent", "bg-muted", "shadow-none", "focus-visible:bg-background"]) expect(control.has(c), c).toBe(true);
    const within = tokens(inputShellVariants({ variant: "filled", focus: "within" }));
    expect(within.has("focus-within:bg-background")).toBe(true);
    expect(tokens(inputVariants({ variant: "filled" })).has("bg-muted")).toBe(true);
  });

  it("Input: filled plain, with addons, and the prop never reaches the DOM", () => {
    const { rerender } = render(<Input aria-label="Name" variant="filled" />);
    const plain = screen.getByLabelText("Name");
    expect(plain).toHaveClass("bg-muted", "border-transparent", "shadow-none");
    expect(plain).not.toHaveClass("border-input", "bg-background");
    expect(plain).not.toHaveAttribute("variant");
    rerender(<Input aria-label="Name" variant="filled" leadingIcon={<span>i</span>} />);
    const wrapper = document.querySelector('[data-slot="input-wrapper"]')!;
    expect(wrapper).toHaveClass("bg-muted", "focus-within:bg-background");
    expect(wrapper).not.toHaveClass("bg-background");
    rerender(<Input aria-label="Name" />);
    expect(screen.getByLabelText("Name")).toHaveClass("bg-background");
    expect(screen.getByLabelText("Name")).not.toHaveClass("bg-muted");
  });

  it("PasswordInput passes variant through", () => {
    render(<PasswordInput aria-label="Secret" variant="filled" />);
    expect(screen.getByLabelText("Secret").closest('[data-slot="input-wrapper"]')).toHaveClass("bg-muted");
  });

  it("an invalid filled input still turns red", () => {
    render(<Input aria-label="Name" variant="filled" invalid />);
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Name").className).toContain("aria-invalid:border-destructive");
  });

  it("Textarea, NumberInput and TagInput accept variant", () => {
    const { container } = render(
      <>
        <Textarea aria-label="Bio" variant="filled" />
        <NumberInput aria-label="Qty" variant="filled" />
        <TagInput aria-label="Tags" variant="filled" />
        <Textarea aria-label="Plain bio" />
      </>
    );
    expect(screen.getByLabelText("Bio")).toHaveClass("bg-muted");
    expect(screen.getByLabelText("Plain bio")).toHaveClass("bg-background");
    expect(container.querySelector('[data-slot="number-input"]')).toHaveClass("bg-muted", "focus-within:bg-background");
    expect(container.querySelector('[data-slot="tag-input"]')).toHaveClass("bg-muted");
  });

  it("an invalid filled NumberInput shows the destructive border, not the transparent one", () => {
    const { container } = render(<NumberInput aria-label="Qty" variant="filled" invalid />);
    const el = container.querySelector('[data-slot="number-input"]')!;
    expect(el).toHaveClass("border-destructive");
    expect(el).not.toHaveClass("border-transparent");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <>
        <Input aria-label="Name" variant="filled" />
        <Textarea aria-label="Bio" variant="filled" />
      </>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("getPageWindow and PaginationStatus", () => {
  it("computes the rows a page covers and clamps the page", () => {
    expect(getPageWindow(1, 10, 245)).toEqual({ page: 1, pageCount: 25, from: 1, to: 10, total: 245 });
    expect(getPageWindow(25, 10, 245)).toEqual({ page: 25, pageCount: 25, from: 241, to: 245, total: 245 });
    expect(getPageWindow(99, 10, 245).page).toBe(25);
    expect(getPageWindow(0, 10, 245).page).toBe(1);
    expect(getPageWindow(2, 10, 0)).toEqual({ page: 1, pageCount: 0, from: 0, to: 0, total: 0 });
    expect(getPageWindow(1, 0, 5).to).toBe(1); // a bad page size counts as 1
    expect(getPageWindow(NaN, NaN, NaN).total).toBe(0);
  });

  it("shows the range, politely announced, with locale numbers", () => {
    const { container, rerender } = render(<PaginationStatus page={2} pageSize={10} total={1245} locale="en-US" />);
    const el = container.querySelector('[data-slot="pagination-status"]')!;
    expect(el).toHaveTextContent("11–20 of 1,245");
    expect(el).toHaveAttribute("aria-live", "polite");
    rerender(<PaginationStatus page={125} pageSize={10} total={1245} locale="de-DE" />);
    expect(el).toHaveTextContent("1.241–1.245 of 1.245");
  });

  it("supports a custom format, the empty state and loading", () => {
    const { container, rerender } = render(
      <PaginationStatus page={1} pageSize={5} total={12} format={({ from, to, total }) => `Rows ${from} to ${to} (${total})`} />
    );
    const el = () => container.querySelector('[data-slot="pagination-status"]')!;
    expect(el()).toHaveTextContent("Rows 1 to 5 (12)");
    rerender(<PaginationStatus page={1} pageSize={5} total={0} />);
    expect(el()).toHaveTextContent("No results");
    rerender(<PaginationStatus page={1} pageSize={5} total={0} emptyState="Nothing yet" />);
    expect(el()).toHaveTextContent("Nothing yet");
    rerender(<PaginationStatus page={1} pageSize={5} total={0} loading emptyState="Nothing yet" />);
    expect(el()).toHaveAttribute("aria-busy", "true");
    expect(el()).toHaveTextContent("Loading…");
    expect(el()).not.toHaveTextContent("Nothing yet");
    rerender(<PaginationStatus page={1} pageSize={5} total={12} loading />);
    expect(el()).toHaveAttribute("aria-busy", "true");
    expect(el()).toHaveTextContent("1–5 of 12");
  });

  it("forwards ref, className and props, and has no axe violations", async () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(<PaginationStatus ref={ref} page={1} pageSize={10} total={30} className="x" data-testid="s" />);
    expect(ref.current).toBe(screen.getByTestId("s"));
    expect(ref.current).toHaveClass("x");
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Rating allowClear", () => {
  it("clears by clicking the selected star by default (existing behaviour) and with Delete, Backspace and 0", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" defaultValue={3} onValueChange={onValueChange} />);
    await user.click(screen.getByRole("radio", { name: "3 stars out of 5" }));
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    await user.click(screen.getByRole("radio", { name: "2 stars out of 5" }));
    expect(onValueChange).toHaveBeenLastCalledWith(2);
    await user.keyboard("{Delete}");
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    await user.click(screen.getByRole("radio", { name: "4 stars out of 5" }));
    await user.keyboard("{Backspace}");
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    await user.click(screen.getByRole("radio", { name: "4 stars out of 5" }));
    await user.keyboard("0");
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });

  it("allowClear={false} keeps a given rating: no toggle off, no Delete, Backspace or 0, arrows stop at one", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" defaultValue={2} allowClear={false} onValueChange={onValueChange} />);
    await user.click(screen.getByRole("radio", { name: "2 stars out of 5" }));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "2 stars out of 5" })).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{Delete}{Backspace}0");
    expect(onValueChange).not.toHaveBeenCalled();
    await user.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByRole("radio", { name: "1 star out of 5" })).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(2);
  });

  it("allowClear={false} still lets an unrated control be rated, and half steps stop at half a star", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<Rating aria-label="Rate" allowClear={false} onValueChange={onValueChange} />);
    await user.click(screen.getByRole("radio", { name: "4 stars out of 5" }));
    expect(onValueChange).toHaveBeenLastCalledWith(4);
    rerender(<Rating aria-label="Rate" allowClear={false} allowHalf defaultValue={1} key="half" onValueChange={onValueChange} />);
    const radios = screen.getAllByRole("radio");
    act(() => radios[0]!.focus());
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith(0.5);
  });
});

describe("Countdown urgentBelow", () => {
  afterEach(() => vi.useRealTimers());

  it("takes the warning tone only inside the last stretch, compact and segments", () => {
    const now = Date.now();
    const { container, rerender } = render(<Countdown target={now + 120_000} format="compact" urgentBelow={60_000} />);
    const timer = () => container.querySelector('[role="timer"]')!;
    expect(timer()).not.toHaveAttribute("data-urgent");
    rerender(<Countdown target={now + 30_000} format="compact" urgentBelow={60_000} />);
    expect(timer()).toHaveAttribute("data-urgent", "true");
    expect(timer().className).toContain("text-warning");
    rerender(<Countdown target={now + 30_000} urgentBelow={60_000} />);
    expect(timer()).toHaveAttribute("data-urgent", "true");
    expect(container.querySelector('[role="timer"] span.rounded-box')!.className).toContain("bg-warning-soft");
    expect(container.querySelector('[role="timer"] span.rounded-box')!.className).not.toContain("bg-card");
  });

  it("is off without urgentBelow and once the time is up", () => {
    const now = Date.now();
    const { container, rerender } = render(<Countdown target={now + 30_000} />);
    expect(container.querySelector('[role="timer"]')).not.toHaveAttribute("data-urgent");
    rerender(<Countdown target={now - 1000} urgentBelow={60_000} />);
    expect(container.querySelector('[role="timer"]')).not.toHaveAttribute("data-urgent");
  });

  it("switches while it runs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { container } = render(<Countdown target={Date.now() + 5000} format="compact" urgentBelow={3000} />);
    const timer = () => container.querySelector('[role="timer"]')!;
    expect(timer()).not.toHaveAttribute("data-urgent");
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(timer()).toHaveAttribute("data-urgent", "true");
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(timer()).not.toHaveAttribute("data-urgent");
  });

  it("has no axe violations when urgent", async () => {
    const { container } = render(<Countdown target={Date.now() + 30_000} urgentBelow={60_000} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
