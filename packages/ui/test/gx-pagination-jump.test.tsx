import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination, PaginationEllipsis } from "../src/primitives/pagination";
import { axeViolations } from "./a11y";

describe("PaginationEllipsis onJump", () => {
  it("stays a decorative marker without onJump", () => {
    const { container } = render(<PaginationEllipsis />);
    const el = container.firstElementChild!;
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("button")).toBeNull();
  });

  it("is a labelled button with onJump that reports the gap it marks", async () => {
    const user = userEvent.setup();
    const onJump = vi.fn();
    render(
      <>
        <PaginationEllipsis onJump={onJump} />
        <PaginationEllipsis onJump={onJump} direction="start" jumpLabel="Jump back" />
      </>
    );
    await user.click(screen.getByRole("button", { name: "Jump to a page" }));
    expect(onJump).toHaveBeenLastCalledWith("end");
    screen.getByRole("button", { name: "Jump back" }).focus();
    await user.keyboard("{Enter}");
    expect(onJump).toHaveBeenLastCalledWith("start");
    await user.keyboard(" ");
    expect(onJump).toHaveBeenCalledTimes(3);
  });

  it("forwards the ref to the outer span in both modes", () => {
    const a = React.createRef<HTMLSpanElement>();
    const b = React.createRef<HTMLSpanElement>();
    render(
      <>
        <PaginationEllipsis ref={a} />
        <PaginationEllipsis ref={b} onJump={() => {}} />
      </>
    );
    expect(a.current?.tagName).toBe("SPAN");
    expect(b.current?.tagName).toBe("SPAN");
  });
});

describe("Pagination pageJump", () => {
  it("has no jump buttons unless pageJump is set", async () => {
    render(<Pagination totalPages={20} defaultPage={10} />);
    expect(screen.queryByRole("button", { name: "Jump to a page" })).toBeNull();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("turns the ellipsis into a page field and jumps on Enter (uncontrolled), then focuses the new page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination totalPages={20} pageJump onPageChange={onPageChange} />);
    await user.click(screen.getByRole("button", { name: "Jump to a page" }));
    const field = screen.getByRole("textbox", { name: "Go to page, 1 to 20" });
    expect(field).toHaveFocus();
    expect(await axeViolations(document.body)).toEqual([]);
    await user.keyboard("12{Enter}");
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(12);
    expect(screen.queryByRole("textbox")).toBeNull();
    const current = screen.getByRole("button", { name: "Page 12" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveFocus();
  });

  it("follows a controlled page and reports the jump once", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = render(<Pagination totalPages={20} page={3} pageJump onPageChange={onPageChange} />);
    await user.click(screen.getByRole("button", { name: "Jump to a page" }));
    await user.keyboard("9{Enter}");
    expect(onPageChange).toHaveBeenCalledExactlyOnceWith(9);
    // The parent did not accept it: the page stays 3 and focus still lands on the current page.
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
    rerender(<Pagination totalPages={20} page={9} pageJump onPageChange={onPageChange} />);
    expect(screen.getByRole("button", { name: "Page 9" })).toHaveAttribute("aria-current", "page");
  });

  it("jumps from the start gap too", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination totalPages={30} defaultPage={15} pageJump onPageChange={onPageChange} />);
    const buttons = screen.getAllByRole("button", { name: "Jump to a page" });
    expect(buttons).toHaveLength(2);
    await user.click(buttons[0]!);
    await user.keyboard("4{Enter}");
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("clamps an out of range page and ignores non-digits", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination totalPages={20} pageJump onPageChange={onPageChange} />);
    await user.click(screen.getByRole("button", { name: "Jump to a page" }));
    await user.keyboard("a9-9x{Enter}");
    expect(onPageChange).toHaveBeenCalledWith(20);
  });

  it("flags an empty field instead of jumping and keeps it open", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination totalPages={20} pageJump onPageChange={onPageChange} />);
    await user.click(screen.getByRole("button", { name: "Jump to a page" }));
    await user.keyboard("{Enter}");
    const field = screen.getByRole("textbox", { name: "Go to page, 1 to 20" });
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(onPageChange).not.toHaveBeenCalled();
    await user.keyboard("5");
    expect(field).not.toHaveAttribute("aria-invalid", "true");
  });

  it("Escape cancels and returns focus to the ellipsis; leaving the field cancels too", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <>
        <Pagination totalPages={20} pageJump onPageChange={onPageChange} />
        <button type="button">After</button>
      </>
    );
    await user.click(screen.getByRole("button", { name: "Jump to a page" }));
    await user.keyboard("7{Escape}");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Jump to a page" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Jump to a page" }));
    await user.keyboard("7");
    await user.click(screen.getByRole("button", { name: "After" }));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("is off while the pagination is disabled", () => {
    render(<Pagination totalPages={20} pageJump disabled />);
    expect(screen.queryByRole("button", { name: "Jump to a page" })).toBeNull();
  });
});
