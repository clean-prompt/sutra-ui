import * as React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KeyboardShortcutsDialog } from "../src/blocks/modal-dialog-blocks";
import { formatShortcut, getShortcutKeyLabels, isShortcutKeys, type ShortcutPlatform } from "../src/lib/shortcuts";
import { CommandPaletteFromRegistry, useCommandMenuShortcut } from "../src/patterns/command-menu";
import { KeybindEditor } from "../src/patterns/keybind-editor";
import {
  ShortcutProvider,
  ShortcutScope,
  ShortcutsDialog,
  useShortcut,
  useShortcutRegistry,
  useShortcuts,
} from "../src/patterns/shortcuts";
import { SidebarProvider, useSidebar } from "../src/patterns/sidebar-navigation";
import { ShortcutKeys } from "../src/primitives/shortcut-keys";
import { SimpleTooltip, TooltipProvider } from "../src/primitives/tooltip";
import { axeViolations } from "./a11y";

function press(key: string, init: KeyboardEventInit = {}, target: Element | Document = document.body) {
  fireEvent.keyDown(target, { key, ...init });
}

function Bind({ keys, onFire, ...opts }: { keys: string; onFire: () => void } & Parameters<typeof useShortcut>[2]) {
  useShortcut(keys, onFire, opts);
  return null;
}

function withProvider(ui: React.ReactNode, platform: ShortcutPlatform = "other") {
  return render(<ShortcutProvider platform={platform}>{ui}</ShortcutProvider>);
}

describe("formatShortcut", () => {
  it("maps mod and modifiers to mac glyphs", () => {
    expect(formatShortcut("mod+k", { platform: "mac" })).toBe("⌘K");
    expect(formatShortcut("mod+shift+k", { platform: "mac" })).toBe("⇧⌘K");
    expect(formatShortcut("ctrl+alt+enter", { platform: "mac" })).toBe("⌃⌥↵");
    expect(formatShortcut("esc", { platform: "mac" })).toBe("⎋");
  });

  it("uses words elsewhere", () => {
    expect(formatShortcut("mod+k", { platform: "other" })).toBe("Ctrl+K");
    expect(formatShortcut("mod+shift+space", { platform: "other" })).toBe("Ctrl+Shift+Space");
    expect(formatShortcut("alt+arrowup", { platform: "other" })).toBe("Alt+↑");
  });

  it("formats sequences and alternatives", () => {
    expect(formatShortcut("g t", { platform: "mac" })).toBe("G then T");
    expect(formatShortcut(["mod+k", "/"], { platform: "other" })).toBe("Ctrl+K / /");
    expect(getShortcutKeyLabels("shift+?", { platform: "mac" })).toEqual([["⇧", "?"]]);
    expect(getShortcutKeyLabels("mod++", { platform: "other" })).toEqual([["Ctrl", "+"]]);
  });

  it("distinguishes keys specs from glyph strings", () => {
    expect(isShortcutKeys("mod+k")).toBe(true);
    expect(isShortcutKeys("g t")).toBe(true);
    expect(isShortcutKeys("⌘K")).toBe(false);
    expect(isShortcutKeys(["⌘", "K"])).toBe(false);
  });
});

describe("ShortcutKeys", () => {
  it("renders Kbd chips with sequence separator and spoken text", () => {
    const { container } = render(<ShortcutKeys keys="g t" platform="mac" />);
    expect(container.querySelectorAll("kbd")).toHaveLength(2);
    expect(container).toHaveTextContent("then");
    expect(screen.getByText("G then T", { selector: ".sr-only" })).toBeInTheDocument();
  });

  it("speaks platform modifier names", () => {
    render(<ShortcutKeys keys="mod+shift+k" platform="mac" />);
    expect(screen.getByText("Shift Command K")).toBeInTheDocument();
  });
});

describe("useShortcut matching", () => {
  it("fires simple combos and maps mod to Ctrl off mac", () => {
    const fn = vi.fn();
    withProvider(<Bind keys="mod+k" onFire={fn} />);
    press("k", { metaKey: true });
    expect(fn).not.toHaveBeenCalled();
    press("k", { ctrlKey: true });
    expect(fn).toHaveBeenCalledTimes(1);
    press("k", { ctrlKey: true, shiftKey: true });
    press("k", { ctrlKey: true, altKey: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("maps mod to Meta on mac", () => {
    const fn = vi.fn();
    withProvider(<Bind keys="mod+k" onFire={fn} />, "mac");
    press("k", { ctrlKey: true });
    expect(fn).not.toHaveBeenCalled();
    press("K", { metaKey: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("matches shifted symbols and the space key", () => {
    const help = vi.fn();
    const capture = vi.fn();
    withProvider(
      <>
        <Bind keys="shift+?" onFire={help} />
        <Bind keys="mod+shift+space" onFire={capture} />
      </>
    );
    press("?", { shiftKey: true });
    press(" ", { ctrlKey: true, shiftKey: true });
    expect(help).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it("prevents default and respects already-handled events", () => {
    const fn = vi.fn();
    withProvider(<Bind keys="mod+s" onFire={fn} />);
    const ev = new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true });
    document.body.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    const handled = new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true });
    handled.preventDefault();
    document.body.dispatchEvent(handled);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("runs only the most recently registered handler for a combo", () => {
    const first = vi.fn();
    const second = vi.fn();
    withProvider(
      <>
        <Bind keys="mod+j" onFire={first} />
        <Bind keys="mod+j" onFire={second} />
      </>
    );
    press("j", { ctrlKey: true });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("respects when() and enabled", () => {
    const fn = vi.fn();
    const { rerender } = withProvider(<Bind keys="x" onFire={fn} when={() => false} />);
    press("x");
    rerender(
      <ShortcutProvider platform="other">
        <Bind keys="x" onFire={fn} enabled={false} />
      </ShortcutProvider>
    );
    press("x");
    expect(fn).not.toHaveBeenCalled();
  });

  it("works standalone without a provider", () => {
    const fn = vi.fn();
    render(<Bind keys="ctrl+e" onFire={fn} />);
    press("e", { ctrlKey: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("sequences", () => {
  afterEach(() => vi.useRealTimers());

  it("fires a two-key sequence and prefers it over a single key", () => {
    const seq = vi.fn();
    const single = vi.fn();
    withProvider(
      <>
        <Bind keys="g t" onFire={seq} />
        <Bind keys="t" onFire={single} />
      </>
    );
    press("g");
    press("t");
    expect(seq).toHaveBeenCalledTimes(1);
    expect(single).not.toHaveBeenCalled();
    press("t");
    expect(single).toHaveBeenCalledTimes(1);
  });

  it("does not fire when another key interrupts", () => {
    const seq = vi.fn();
    withProvider(<Bind keys="g t" onFire={seq} />);
    press("g");
    press("x");
    press("t");
    expect(seq).not.toHaveBeenCalled();
  });

  it("times out after about a second", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 9, 0, 0));
    const seq = vi.fn();
    withProvider(<Bind keys="g t" onFire={seq} />);
    press("g");
    vi.setSystemTime(new Date(2026, 0, 1, 9, 0, 1, 500));
    press("t");
    expect(seq).not.toHaveBeenCalled();
    press("g");
    vi.setSystemTime(new Date(2026, 0, 1, 9, 0, 2, 200));
    press("t");
    expect(seq).toHaveBeenCalledTimes(1);
  });
});

describe("input suppression", () => {
  it("ignores inputs, textareas and contenteditable unless allowInInputs", () => {
    const plain = vi.fn();
    const allowed = vi.fn();
    withProvider(
      <>
        <Bind keys="n" onFire={plain} />
        <Bind keys="mod+enter" onFire={allowed} allowInInputs />
        <input aria-label="field" />
        <textarea aria-label="area" />
        <div contentEditable suppressContentEditableWarning data-testid="ce">
          <span data-testid="ce-child">x</span>
        </div>
        <input type="checkbox" aria-label="check" />
      </>
    );
    press("n", {}, screen.getByLabelText("field"));
    press("n", {}, screen.getByLabelText("area"));
    press("n", {}, screen.getByTestId("ce-child"));
    expect(plain).not.toHaveBeenCalled();
    press("n", {}, screen.getByLabelText("check"));
    expect(plain).toHaveBeenCalledTimes(1);
    press("Enter", { ctrlKey: true }, screen.getByLabelText("field"));
    expect(allowed).toHaveBeenCalledTimes(1);
  });
});

describe("scopes", () => {
  it("lets an active scope shadow global keys and falls back when it unmounts", () => {
    const global = vi.fn();
    const scoped = vi.fn();
    const other = vi.fn();
    function App({ dialog }: { dialog: boolean }) {
      return (
        <>
          <Bind keys="e" onFire={global} />
          <Bind keys="r" onFire={other} />
          {dialog && (
            <ShortcutScope name="dialog">
              <Bind keys="e" onFire={scoped} />
            </ShortcutScope>
          )}
        </>
      );
    }
    const { rerender } = withProvider(<App dialog />);
    press("e");
    expect(scoped).toHaveBeenCalledTimes(1);
    expect(global).not.toHaveBeenCalled();
    press("r");
    expect(other).toHaveBeenCalledTimes(1);
    rerender(
      <ShortcutProvider platform="other">
        <App dialog={false} />
      </ShortcutProvider>
    );
    press("e");
    expect(global).toHaveBeenCalledTimes(1);
  });

  it("blocks lower scopes when exclusive and ignores inactive named scopes", () => {
    const global = vi.fn();
    const inactive = vi.fn();
    withProvider(
      <>
        <Bind keys="r" onFire={global} />
        <Bind keys="q" onFire={inactive} scope="editor" />
        <ShortcutScope name="modal" exclusive />
      </>
    );
    press("r");
    press("q");
    expect(global).not.toHaveBeenCalled();
    expect(inactive).not.toHaveBeenCalled();
  });
});

describe("registry", () => {
  function Listing() {
    const { groups } = useShortcutRegistry();
    return (
      <ul>
        {groups.map((g) => (
          <li key={g.group}>
            {g.group}: {g.shortcuts.map((s) => `${s.label}=${s.keys}`).join(", ")}
          </li>
        ))}
      </ul>
    );
  }

  it("lists labelled, non-hidden shortcuts grouped and deduplicated", () => {
    function Defs() {
      useShortcuts([
        { keys: "g t", label: "Go to tasks", group: "Navigation", handler: () => {} },
        { keys: "g n", label: "Go to notes", group: "Navigation", handler: () => {} },
        { keys: "mod+s", label: "Save", handler: () => {} },
        { keys: "x", label: "Secret", hidden: true, handler: () => {} },
        { keys: "y", handler: () => {} },
      ]);
      return null;
    }
    withProvider(
      <>
        <Defs />
        <Bind keys="c" onFire={() => {}} id="create" label="Create" group="Create" />
        <Bind keys="c" onFire={() => {}} id="create" label="Create" group="Create" />
        <Listing />
      </>
    );
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["Navigation: Go to tasks=g t, Go to notes=g n", "General: Save=mod+s", "Create: Create=c"]);
  });

  it("updates when shortcuts unmount", () => {
    function App({ show }: { show: boolean }) {
      return (
        <>
          {show && <Bind keys="a" onFire={() => {}} label="Archive" />}
          <Listing />
        </>
      );
    }
    const { rerender } = withProvider(<App show />);
    expect(screen.getByText(/Archive/)).toBeInTheDocument();
    rerender(
      <ShortcutProvider platform="other">
        <App show={false} />
      </ShortcutProvider>
    );
    expect(screen.queryByText(/Archive/)).not.toBeInTheDocument();
  });
});

describe("ShortcutsDialog", () => {
  it("opens with shift+? and lists the registry, with search", async () => {
    const user = userEvent.setup();
    withProvider(
      <>
        <Bind keys="g t" onFire={() => {}} label="Go to tasks" group="Navigation" />
        <Bind keys="mod+s" onFire={() => {}} label="Save" />
        <ShortcutsDialog />
      </>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    press("?", { shiftKey: true });
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Go to tasks")).toBeInTheDocument();
    expect(within(dialog).getByText("Keyboard shortcuts", { selector: "span" })).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Search shortcuts"), "save");
    expect(within(dialog).queryByText("Go to tasks")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Save")).toBeInTheDocument();
  });

  it("has no axe violations when open", async () => {
    const { baseElement } = withProvider(
      <>
        <Bind keys="g t" onFire={() => {}} label="Go to tasks" />
        <ShortcutsDialog defaultOpen />
      </>
    );
    await screen.findByRole("dialog");
    expect(await axeViolations(baseElement, { disable: ["aria-hidden-focus"] })).toEqual([]);
  });
});

describe("integrations", () => {
  it("useCommandMenuShortcut registers in the registry when a provider exists", () => {
    let open = false;
    function Menu() {
      const [o, setO] = React.useState(false);
      open = o;
      useCommandMenuShortcut(setO);
      return null;
    }
    function Count() {
      const { shortcuts } = useShortcutRegistry();
      return <span data-testid="count">{shortcuts.map((s) => s.label).join(",")}</span>;
    }
    withProvider(
      <>
        <Menu />
        <Count />
      </>
    );
    expect(screen.getByTestId("count")).toHaveTextContent("Command menu");
    press("k", { ctrlKey: true });
    expect(open).toBe(true);
  });

  it("Sidebar mod+B goes through the registry", () => {
    function State() {
      const { collapsed } = useSidebar();
      return <span data-testid="sidebar">{collapsed ? "collapsed" : "expanded"}</span>;
    }
    function Count() {
      const { shortcuts } = useShortcutRegistry();
      return <span data-testid="labels">{shortcuts.map((s) => s.label).join(",")}</span>;
    }
    withProvider(
      <SidebarProvider contained>
        <State />
        <Count />
      </SidebarProvider>
    );
    expect(screen.getByTestId("labels")).toHaveTextContent("Toggle sidebar");
    press("b", { ctrlKey: true });
    expect(screen.getByTestId("sidebar")).toHaveTextContent("collapsed");
  });

  it("CommandPaletteFromRegistry lists and runs registry commands", async () => {
    const user = userEvent.setup();
    const go = vi.fn();
    withProvider(
      <>
        <Bind keys="g t" onFire={go} label="Go to tasks" group="Navigation" />
        <CommandPaletteFromRegistry />
      </>
    );
    press("k", { ctrlKey: true });
    const dialog = await screen.findByRole("dialog");
    const item = within(dialog).getByRole("option", { name: /Go to tasks/ });
    expect(within(item).getAllByText("G")).toHaveLength(1);
    expect(within(dialog).queryByText("Command palette")).not.toBeInTheDocument();
    await user.click(item);
    await waitFor(() => expect(go).toHaveBeenCalledTimes(1));
  });

  it("KeyboardShortcutsDialog reads the registry but keeps static groups working", async () => {
    const { unmount } = withProvider(
      <>
        <Bind keys="g t" onFire={() => {}} label="Go to tasks" />
        <KeyboardShortcutsDialog defaultOpen />
      </>
    );
    expect(await screen.findByText("Go to tasks")).toBeInTheDocument();
    expect(screen.queryByText("New note")).not.toBeInTheDocument();
    unmount();
    withProvider(<KeyboardShortcutsDialog defaultOpen groups={[{ title: "Mine", shortcuts: [{ label: "Static one", keys: ["⌘", "1"] }] }]} />);
    expect(await screen.findByText("Static one")).toBeInTheDocument();
  });

  it("SimpleTooltip renders a keys spec as chips", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <ShortcutProvider platform="mac">
          <SimpleTooltip content="Search" shortcut="mod+k">
            <button type="button">Search</button>
          </SimpleTooltip>
        </ShortcutProvider>
      </TooltipProvider>
    );
    await user.hover(screen.getByRole("button", { name: "Search" }));
    const tip = await screen.findAllByText("⌘");
    expect(tip.length).toBeGreaterThan(0);
  });

  it("KeybindEditor reads shortcuts from the registry inside a ShortcutProvider", () => {
    function Registered() {
      useShortcut("mod+b", () => {}, { id: "toggle-sidebar", label: "Toggle sidebar", group: "View" });
      return null;
    }
    render(
      <ShortcutProvider platform="mac">
        <Registered />
        <KeybindEditor />
      </ShortcutProvider>
    );
    expect(screen.getByText("Toggle sidebar")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "View" })).toBeInTheDocument();
  });
});
