import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchTrigger } from "../src/patterns/search-trigger";
import { ShortcutProvider } from "../src/patterns/shortcuts";
import { AppHeader, DocsHeader } from "../src/blocks/header-navigation-blocks";
import { SidebarProvider } from "../src/patterns/sidebar-navigation";
import { axeViolations } from "./a11y";

afterEach(() => vi.restoreAllMocks());

const asMac = () => vi.spyOn(window.navigator, "platform", "get").mockReturnValue("MacIntel");
const pressKey = (init: KeyboardEventInit, target: Element | Document = document.body) => fireEvent.keyDown(target, init);

describe("SearchTrigger", () => {
  it("looks like a field: search icon, placeholder and the shortcut as Kbd chips", () => {
    const { container } = render(<SearchTrigger placeholder="Search tools…" />);
    const button = screen.getByRole("button", { name: "Search tools…" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("data-slot", "search-trigger");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect([...container.querySelectorAll("kbd")].map((k) => k.textContent)).toEqual(["Ctrl", "K"]);
  });

  it("shows ⌘ on macOS", () => {
    asMac();
    const { container } = render(<SearchTrigger />);
    expect([...container.querySelectorAll("kbd")].map((k) => k.textContent)).toEqual(["⌘", "K"]);
    expect(screen.getByRole("button")).toHaveAccessibleDescription("Shortcut: Command K");
  });

  it("describes the shortcut for assistive tech without renaming the button", () => {
    render(<SearchTrigger />);
    const button = screen.getByRole("button", { name: "Search…" });
    expect(button).toHaveAccessibleDescription("Shortcut: Control K");
    expect(button).toHaveAttribute("aria-keyshortcuts", "Meta+K Control+K");
  });

  it("follows a custom shortcut and label", () => {
    const { container } = render(<SearchTrigger shortcut="/" label="Find anything" />);
    expect([...container.querySelectorAll("kbd")].map((k) => k.textContent)).toEqual(["/"]);
    expect(screen.getByRole("button", { name: "Find anything" })).toHaveAttribute("aria-keyshortcuts", "/");
  });

  it("calls onClick, then onTrigger, on click and keyboard activation", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    render(<SearchTrigger onClick={() => calls.push("click")} onTrigger={() => calls.push("trigger")} />);
    const button = screen.getByRole("button");
    await user.click(button);
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(calls).toEqual(["click", "trigger", "click", "trigger"]);
  });

  it("skips onTrigger when onClick prevents the default", async () => {
    const user = userEvent.setup();
    const onTrigger = vi.fn();
    render(<SearchTrigger onClick={(e) => e.preventDefault()} onTrigger={onTrigger} />);
    await user.click(screen.getByRole("button"));
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("sizes the field and merges className last", () => {
    const { rerender } = render(<SearchTrigger size="sm" className="w-40" />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-8", "w-40");
    expect(button).not.toHaveClass("w-full");
    rerender(<SearchTrigger size="lg" />);
    expect(screen.getByRole("button")).toHaveClass("h-10");
    rerender(<SearchTrigger />);
    expect(screen.getByRole("button")).toHaveClass("h-9");
  });

  it("forwards the ref and props to the field", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<SearchTrigger ref={ref} data-testid="st" disabled />);
    expect(ref.current).toBe(screen.getByTestId("st"));
    expect(ref.current).toBeDisabled();
  });

  it("collapses to an icon button below the breakpoint only when asked", async () => {
    const user = userEvent.setup();
    const onTrigger = vi.fn();
    const { rerender } = render(<SearchTrigger onTrigger={onTrigger} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button")).not.toHaveClass("hidden");
    rerender(<SearchTrigger onTrigger={onTrigger} collapseBelow="sm" />);
    const [field, icon] = screen.getAllByRole("button");
    expect(field).toHaveClass("hidden", "sm:flex");
    expect(icon).toHaveClass("sm:hidden");
    expect(icon).toHaveAccessibleName("Search");
    await user.click(icon!);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    rerender(<SearchTrigger onTrigger={onTrigger} collapseBelow="md" size="lg" />);
    expect(screen.getAllByRole("button")[0]).toHaveClass("md:flex");
    expect(screen.getAllByRole("button")[1]).toHaveClass("md:hidden");
  });
});

describe("SearchTrigger hotkey", () => {
  it("does not listen without `hotkey`", () => {
    const onTrigger = vi.fn();
    render(<SearchTrigger onTrigger={onTrigger} />);
    pressKey({ key: "k", ctrlKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("calls onTrigger on the shortcut anywhere on the page", () => {
    const onTrigger = vi.fn();
    render(<SearchTrigger hotkey onTrigger={onTrigger} />);
    pressKey({ key: "k", ctrlKey: true });
    expect(onTrigger).toHaveBeenCalledTimes(1);
    pressKey({ key: "k" });
    pressKey({ key: "j", ctrlKey: true });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it("uses ⌘ on macOS and ignores Ctrl there", () => {
    asMac();
    const onTrigger = vi.fn();
    render(<SearchTrigger hotkey onTrigger={onTrigger} />);
    pressKey({ key: "k", ctrlKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
    pressKey({ key: "k", metaKey: true });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it("prevents the browser's own shortcut", () => {
    render(<SearchTrigger hotkey onTrigger={() => {}} />);
    const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("fires a mod+ chord while typing in a field", () => {
    const onTrigger = vi.fn();
    render(
      <>
        <input aria-label="Name" />
        <textarea aria-label="Notes" />
        <SearchTrigger hotkey onTrigger={onTrigger} />
      </>
    );
    pressKey({ key: "k", ctrlKey: true }, screen.getByLabelText("Name"));
    pressKey({ key: "k", ctrlKey: true }, screen.getByLabelText("Notes"));
    expect(onTrigger).toHaveBeenCalledTimes(2);
  });

  it("ignores a plain key while typing in a field, and fires it elsewhere", () => {
    const onTrigger = vi.fn();
    render(
      <>
        <input aria-label="Name" />
        <div contentEditable suppressContentEditableWarning data-testid="editable" />
        <SearchTrigger hotkey shortcut="/" onTrigger={onTrigger} />
      </>
    );
    pressKey({ key: "/" }, screen.getByLabelText("Name"));
    pressKey({ key: "/" }, screen.getByTestId("editable"));
    expect(onTrigger).not.toHaveBeenCalled();
    pressKey({ key: "/" });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it("calls the latest onTrigger without re-registering", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<SearchTrigger hotkey onTrigger={first} />);
    rerender(<SearchTrigger hotkey onTrigger={second} />);
    pressKey({ key: "k", ctrlKey: true });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("stops listening when unmounted or when `hotkey` is switched off", () => {
    const onTrigger = vi.fn();
    const { rerender, unmount } = render(<SearchTrigger hotkey onTrigger={onTrigger} />);
    rerender(<SearchTrigger hotkey={false} onTrigger={onTrigger} />);
    pressKey({ key: "k", ctrlKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
    rerender(<SearchTrigger hotkey onTrigger={onTrigger} />);
    pressKey({ key: "k", ctrlKey: true });
    expect(onTrigger).toHaveBeenCalledTimes(1);
    unmount();
    pressKey({ key: "k", ctrlKey: true });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it("fires once inside a ShortcutProvider and shows up in the registry", () => {
    const onTrigger = vi.fn();
    render(
      <ShortcutProvider>
        <SearchTrigger hotkey onTrigger={onTrigger} />
      </ShortcutProvider>
    );
    pressKey({ key: "k", ctrlKey: true });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });
});

describe("SearchTrigger in the header blocks", () => {
  it("DocsHeader and AppHeader use it, collapsing to an icon on phones, and open their palette", async () => {
    const user = userEvent.setup();
    const docs = render(<DocsHeader sticky={false} />);
    const field = docs.container.querySelector('[data-slot="search-trigger"]') as HTMLElement;
    expect(field).toHaveClass("hidden", "h-9", "sm:flex", "w-56", "lg:w-64");
    expect(field).toHaveTextContent("Search docs…");
    expect(screen.getByRole("button", { name: /^Search$/ })).toHaveClass("sm:hidden");
    await user.click(field);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    docs.unmount();

    render(
      <SidebarProvider contained shortcut={null}>
        <AppHeader />
      </SidebarProvider>
    );
    expect(document.querySelector('[data-slot="search-trigger"]')).toHaveClass("sm:flex", "w-60", "lg:w-72");
  });
});

describe("SearchTrigger accessibility", () => {
  it("has no axe violations, alone and collapsible", async () => {
    const { container } = render(
      <div>
        <SearchTrigger />
        <SearchTrigger collapseBelow="sm" shortcut="/" size="lg" />
        <SearchTrigger label="Find" size="sm" />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
