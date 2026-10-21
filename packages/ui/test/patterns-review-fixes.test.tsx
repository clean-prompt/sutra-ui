/**
 * Review fixes in `src/patterns`: RTL resize handle and selection keys, FadeText mask side, Coachmark focus, the rotating
 * notice bar's pause button, SchemaForm autosave ordering, ReorderableList Escape, Presence settling, shortcut fallbacks,
 * translatable `labels`, keybind `onValueChange` changes, and `data-slot` on roots.
 */
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TilingHandle } from "../src/patterns/tiling-layout-internal";
import { SelectionArea } from "../src/patterns/selection-area";
import { FadeText } from "../src/patterns/fade-text";
import { CoachmarkTour } from "../src/patterns/coachmarks";
import { RotatingNoticeBar } from "../src/patterns/notice-bar";
import { SchemaForm } from "../src/patterns/schema-form";
import { ReorderableList } from "../src/patterns/reorderable-list";
import { Presence } from "../src/patterns/presence";
import { useCommandMenuShortcut } from "../src/patterns/command-menu";
import { SidebarProvider } from "../src/patterns/sidebar-navigation";
import { KeybindEditor } from "../src/patterns/keybind-editor";
import { TransferList } from "../src/patterns/transfer-list";
import { TallyCounter } from "../src/patterns/tally-counter";
import { Markdown } from "../src/patterns/markdown";
import { reduceMotion, resetMedia } from "./helpers/media";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetMedia();
});

describe("TilingHandle in right-to-left", () => {
  const setup = (dir: "ltr" | "rtl") => {
    const onResize = vi.fn();
    render(
      <div dir={dir}>
        <TilingHandle direction="row" sizes={[0.5, 0.5]} index={0} min={0.1} step={0.05} label="Resize" onResize={onResize} onEqualize={() => {}} />
      </div>
    );
    return { onResize, sep: screen.getByRole("separator") };
  };

  it("arrow keys follow the reading order", () => {
    const rtl = setup("rtl");
    fireEvent.keyDown(rtl.sep, { key: "ArrowRight" });
    expect(rtl.onResize).toHaveBeenLastCalledWith(0, -0.05);
    fireEvent.keyDown(rtl.sep, { key: "ArrowLeft" });
    expect(rtl.onResize).toHaveBeenLastCalledWith(0, 0.05);
  });

  it("keeps the physical keys in left-to-right", () => {
    const ltr = setup("ltr");
    fireEvent.keyDown(ltr.sep, { key: "ArrowRight" });
    expect(ltr.onResize).toHaveBeenLastCalledWith(0, 0.05);
  });

  it("drags towards the inline end: a leftward drag grows the first pane in RTL", () => {
    const { onResize, sep } = setup("rtl");
    vi.spyOn(sep.parentElement!, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, width: 1000, height: 400, right: 1000, bottom: 400, toJSON: () => ({}),
    } as DOMRect);
    const pointer = { pointerId: 1, pointerType: "mouse", button: 0 };
    fireEvent.pointerDown(sep, { ...pointer, clientX: 500 });
    fireEvent.pointerMove(sep, { ...pointer, clientX: 300 });
    expect(onResize.mock.calls.at(-1)![1]).toBeCloseTo(0.2);
  });
});

describe("SelectionArea", () => {
  const Items = ({ role }: { role?: string }) => (
    <SelectionArea role={role} items={["a", "b", "c"]}>
      {(api) => ["a", "b", "c"].map((id) => <div key={id} {...api.getItemProps(id)}>{id}</div>)}
    </SelectionArea>
  );

  it("gives items the role that fits the container", () => {
    const { unmount } = render(<Items />);
    expect(screen.getAllByRole("option")).toHaveLength(3);
    unmount();
    const grid = render(<Items role="grid" />);
    expect(grid.container.querySelectorAll('[role="gridcell"]')).toHaveLength(3);
    grid.unmount();
    const tree = render(<Items role="tree" />);
    expect(tree.container.querySelectorAll('[role="treeitem"]')).toHaveLength(3);
  });

  it("ArrowLeft moves to the next item in RTL", () => {
    render(
      <div dir="rtl">
        <Items />
      </div>
    );
    const [a, b] = screen.getAllByRole("option");
    act(() => a!.focus());
    fireEvent.keyDown(a!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(b);
  });
});

describe("FadeText", () => {
  it("fades the end side in RTL", () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(300);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
    render(
      <div dir="rtl">
        <FadeText>A very long title that overflows the box</FadeText>
      </div>
    );
    const el = screen.getByText(/A very long title/);
    expect(el.getAttribute("style")).toMatch(/to left/);
    expect(el).toHaveAttribute("data-slot", "fade-text");
  });
});

describe("CoachmarkTour", () => {
  it("is modal, keeps focus inside and does not steal it when the parent re-renders with a new steps array", () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const Host = ({ n }: { n: number }) => (
      <div>
        <button id="target">Target</button>
        <button id="outside">Outside {n}</button>
        <CoachmarkTour
          open
          steps={[
            { id: "one", target: "#target", title: "One" },
            { id: "two", title: "Two" },
          ]}
        />
      </div>
    );
    const { rerender } = render(<Host n={0} />);
    const card = screen.getByRole("dialog");
    expect(card).toHaveAttribute("aria-modal", "true");
    expect(document.activeElement).toBe(card);
    const scrolls = scroll.mock.calls.length;

    // Tab wraps inside the card.
    const buttons = Array.from(card.querySelectorAll("button"));
    buttons.at(-1)!.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(buttons[0]);

    // A parent render with a fresh `steps` literal leaves focus and scroll alone.
    const outside = document.getElementById("outside")!;
    outside.focus();
    rerender(<Host n={1} />);
    expect(document.activeElement).toBe(document.getElementById("outside"));
    expect(scroll.mock.calls.length).toBe(scrolls);
  });

  it("translates the footer texts through labels", () => {
    render(
      <CoachmarkTour
        open
        steps={[{ title: "One" }, { title: "Two" }]}
        labels={{ skipShort: "Passer", step: (n, total) => `Étape ${n} sur ${total}` }}
      />
    );
    expect(screen.getByText("Passer")).toBeInTheDocument();
    expect(screen.getByText("Étape 1 sur 2")).toBeInTheDocument();
  });
});

describe("RotatingNoticeBar", () => {
  const notices = [
    { id: "a", message: "First" },
    { id: "b", message: "Second" },
  ];

  it("has a pause button that stops the rotation (WCAG 2.2.2)", () => {
    vi.useFakeTimers();
    render(<RotatingNoticeBar notices={notices} interval={2} />);
    const pause = screen.getByRole("button", { name: "Pause rotation" });
    fireEvent.click(pause);
    expect(screen.getByRole("button", { name: "Start rotation" })).toHaveAttribute("aria-pressed", "true");
    act(() => void vi.advanceTimersByTime(10_000));
    expect(screen.getByText("First")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start rotation" }));
    act(() => void vi.advanceTimersByTime(2_100));
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("has no pause button under reduced motion, and takes labels", () => {
    reduceMotion(true);
    render(<RotatingNoticeBar notices={notices} labels={{ next: "Suivant", dismiss: "Fermer" }} />);
    expect(screen.queryByRole("button", { name: "Pause rotation" })).toBeNull();
    expect(screen.getByRole("button", { name: "Suivant" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
  });

  it("dismisses through the queue and reports it", () => {
    reduceMotion(true);
    const onDismiss = vi.fn();
    render(<RotatingNoticeBar notices={notices} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }));
    expect(onDismiss).toHaveBeenCalledWith("a");
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});

describe("SchemaForm autosave", () => {
  const schema = { type: "object" as const, properties: { name: { type: "string" as const, title: "Name" } } };

  it("saves an edit made just before unmount instead of dropping it", () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    const { unmount } = render(<SchemaForm schema={schema} autosave autosaveDelay={500} onSave={onSave} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Ada" } });
    expect(onSave).not.toHaveBeenCalled();
    unmount();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ name: "Ada" }, ["name"]);
  });

  it("an older save that settles late does not overwrite the newer status", async () => {
    vi.useFakeTimers();
    const settles: { resolve: () => void; reject: (e: Error) => void }[] = [];
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          settles.push({ resolve, reject });
        })
    );
    render(<SchemaForm schema={schema} autosave autosaveDelay={100} onSave={onSave} />);
    const input = screen.getByRole("textbox", { name: "Name" });
    fireEvent.change(input, { target: { value: "A" } });
    await act(async () => void vi.advanceTimersByTime(100));
    fireEvent.change(input, { target: { value: "Ab" } });
    await act(async () => void vi.advanceTimersByTime(100));
    expect(onSave).toHaveBeenCalledTimes(2);
    await act(async () => settles[1]!.resolve());
    expect(screen.getByText("Saved")).toBeInTheDocument();
    await act(async () => settles[0]!.reject(new Error("late")));
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.queryByText("Not saved")).toBeNull();
  });

  it("takes labels for the chrome", () => {
    const wide = { type: "object" as const, properties: { tags: { type: "array" as const, title: "Tags", items: { type: "string" as const } } } };
    render(<SchemaForm schema={wide} labels={{ add: (item) => `Ajouter ${item}` }} />);
    expect(screen.getByRole("button", { name: "Ajouter Tag" })).toBeInTheDocument();
  });
});

describe("ReorderableList", () => {
  const items = ["a", "b", "c"];
  const renderList = (onReorder = vi.fn(), labels?: React.ComponentProps<typeof ReorderableList<string>>["labels"]) => {
    render(<ReorderableList items={items} getKey={(i) => i} renderItem={(i) => <span>{i}</span>} onReorder={onReorder} labels={labels} />);
    return onReorder;
  };

  it("Escape cancels a pointer drag", () => {
    const onReorder = renderList();
    const handle = screen.getByRole("button", { name: "Reorder a" });
    const pointer = { pointerId: 1, pointerType: "mouse", button: 0 };
    fireEvent.pointerDown(handle, { ...pointer, clientY: 10 });
    fireEvent.pointerMove(handle, { ...pointer, clientY: 400 });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerUp(handle, { ...pointer, clientY: 400 });
    expect(onReorder).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/Reorder canceled/);
  });

  it("takes labels for names and announcements", () => {
    renderList(vi.fn(), { reorder: (n) => `Déplacer ${n}`, pickedUp: (n) => `${n} saisi` });
    const handle = screen.getByRole("button", { name: "Déplacer a" });
    handle.focus();
    fireEvent.keyDown(handle, { key: " " });
    expect(screen.getByRole("status")).toHaveTextContent("a saisi");
  });

  it("does not drop after unmount when the handle blurs", () => {
    vi.useFakeTimers();
    const onReorder = vi.fn();
    const { unmount } = render(<ReorderableList items={items} getKey={(i) => i} renderItem={(i) => <span>{i}</span>} onReorder={onReorder} />);
    const handle = screen.getByRole("button", { name: "Reorder a" });
    handle.focus();
    fireEvent.keyDown(handle, { key: " " });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    fireEvent.blur(handle);
    unmount();
    act(() => void vi.advanceTimersByTime(10));
    expect(onReorder).not.toHaveBeenCalled();
  });
});

describe("Presence", () => {
  it("settles from enter to idle on the child's own animationend and, failing that, after enterDuration", () => {
    vi.useFakeTimers();
    const Box = ({ present }: { present: boolean }) => (
      <Presence present={present}>
        <div data-testid="box" />
      </Presence>
    );
    const { rerender } = render(<Box present={false} />);
    rerender(<Box present />);
    expect(screen.getByTestId("box")).toHaveAttribute("data-presence", "enter");
    fireEvent.animationEnd(screen.getByTestId("box"));
    expect(screen.getByTestId("box")).toHaveAttribute("data-presence", "idle");

    rerender(<Box present={false} />);
    act(() => void vi.advanceTimersByTime(500));
    rerender(<Box present />);
    expect(screen.getByTestId("box")).toHaveAttribute("data-presence", "enter");
    act(() => void vi.advanceTimersByTime(700));
    expect(screen.getByTestId("box")).toHaveAttribute("data-presence", "idle");
  });
});

describe("shortcut fallbacks without a ShortcutProvider", () => {
  it("the command menu shortcut needs the exact modifiers", () => {
    const Probe = () => {
      const [open, setOpen] = React.useState(false);
      useCommandMenuShortcut(setOpen);
      return <output>{open ? "open" : "closed"}</output>;
    };
    render(<Probe />);
    fireEvent.keyDown(document, { key: "k", code: "KeyK", ctrlKey: true, shiftKey: true });
    expect(screen.getByRole("status")).toHaveTextContent("closed");
    fireEvent.keyDown(document, { key: "k", code: "KeyK", ctrlKey: true });
    expect(screen.getByRole("status")).toHaveTextContent("open");
  });

  it("the sidebar shortcut ignores text fields in both paths, and fires elsewhere", () => {
    const onCollapsedChange = vi.fn();
    render(
      <SidebarProvider onCollapsedChange={onCollapsedChange}>
        <input aria-label="Search" />
      </SidebarProvider>
    );
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "b", code: "KeyB", ctrlKey: true });
    expect(onCollapsedChange).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "b", code: "KeyB", ctrlKey: true });
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });
});

describe("KeybindEditor", () => {
  it("onValueChange gets the overrides; onChange (deprecated) keeps working", () => {
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    render(<KeybindEditor platform="other" shortcuts={[{ id: "a", label: "Alpha", keys: "mod+k" }]} onValueChange={onValueChange} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit shortcut for Alpha" }));
    fireEvent.keyDown(screen.getByRole("button", { name: /Recording shortcut/ }), { key: "j", code: "KeyJ", ctrlKey: true });
    expect(onValueChange).toHaveBeenCalledWith({ a: "mod+j" });
    expect(onChange).toHaveBeenCalledWith("a", "mod+j");
  });

  it("takes labels", () => {
    render(<KeybindEditor platform="other" shortcuts={[]} labels={{ noShortcuts: "Aucun raccourci", resetAll: "Tout réinitialiser" }} />);
    expect(screen.getByText("Aucun raccourci")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tout réinitialiser" })).toBeInTheDocument();
  });
});

describe("labels", () => {
  it("TransferList translates statuses, actions and the clear button", () => {
    render(
      <TransferList
        items={[{ id: "1", name: "a.zip", status: "completed", total: 10 }]}
        onClearCompleted={() => {}}
        onRemove={() => {}}
        labels={{ status: { completed: "Terminé" }, clearCompleted: "Effacer", remove: (n) => `Retirer ${n}`, count: { completed: (n) => `${n} fini` } }}
      />
    );
    expect(screen.getByText("Terminé")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Effacer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirer a.zip" })).toBeInTheDocument();
    expect(screen.getByText("1 fini")).toBeInTheDocument();
  });

  it("TallyCounter translates its buttons and log", () => {
    render(<TallyCounter label="Compteur" labels={{ increase: (s) => `Ajouter ${s}`, undo: "Annuler", history: "Historique", noEntries: "Rien" }} />);
    expect(screen.getByRole("button", { name: "Ajouter 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Annuler/ })).toBeInTheDocument();
    expect(screen.getByText("Historique")).toBeInTheDocument();
    expect(screen.getByText("Rien")).toBeInTheDocument();
  });
});

describe("data-slot on roots", () => {
  it("is set on parts that had none", () => {
    const { container } = render(
      <div>
        <TallyCounter />
        <Markdown>{"```ts\nconst a = 1;\n```"}</Markdown>
      </div>
    );
    expect(container.querySelector('[data-slot="tally-counter"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="markdown-code-block"]')).not.toBeNull();
  });
});
