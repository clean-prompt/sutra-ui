import * as React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Extension } from "@tiptap/react";
import { undoDepth } from "@codemirror/commands";
import type { KeyBinding } from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import { CodeEditor, type CodeEditorHandle } from "../src/kits/editor/code-editor";
import { RichTextEditor, RichTextToolbar, type RichTextEditorInstance } from "../src/kits/editor/rich-text-editor";
import { axeViolations } from "./helpers/a11y";

/* jsdom has no layout: CodeMirror and ProseMirror measure through Range/Element rects. */
const emptyRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) } as DOMRect;
const emptyRects = Object.assign([], { item: () => null }) as unknown as DOMRectList;
Range.prototype.getClientRects ??= () => emptyRects;
Range.prototype.getBoundingClientRect ??= () => emptyRect;
Element.prototype.getClientRects ??= () => emptyRects;
(document as unknown as { elementFromPoint: () => null }).elementFromPoint ??= () => null;

/** Mod-Z as ProseMirror/CodeMirror see it in jsdom (not a Mac, so Mod is Ctrl). */
const modZ = (el: Element) => fireEvent.keyDown(el, { key: "z", code: "KeyZ", keyCode: 90, ctrlKey: true });

/* ------------------------------------------------------------------ */
/* RichTextEditor                                                      */
/* ------------------------------------------------------------------ */

describe("RichTextEditor history, starterKit and extensions", () => {
  function setup(props: Partial<React.ComponentProps<typeof RichTextEditor>> = {}) {
    const editorRef = React.createRef<RichTextEditorInstance | null>();
    const utils = render(<RichTextEditor defaultValue="<p>Hello</p>" toolbar="fixed" editorRef={editorRef} {...props} />);
    const editor = editorRef.current!;
    const type = (text: string) =>
      act(() => {
        editor.commands.focus("end");
        editor.commands.insertContent(text);
      });
    return { ...utils, editor, type, textbox: screen.getByRole("textbox", { name: "Rich text editor" }) };
  }

  it("keeps undo by default: Mod-Z and the toolbar buttons undo", async () => {
    const { editor, type, textbox, container } = setup();
    type(" world");
    expect(editor.getText()).toBe("Hello world");
    modZ(textbox);
    expect(editor.getText()).toBe("Hello");
    type(" again");
    const undo = screen.getByRole("button", { name: "Undo" });
    await waitFor(() => expect(undo).toBeEnabled());
    fireEvent.click(undo);
    expect(editor.getText()).toBe("Hello");
    expect(screen.getByRole("button", { name: "Redo" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("history={false} drops StarterKit's undo: Mod-Z does nothing and the undo buttons are hidden", async () => {
    const { editor, type, textbox, container } = setup({ history: false });
    expect(editor.extensionManager.extensions.some((e) => e.name === "undoRedo")).toBe(false);
    type(" world");
    modZ(textbox);
    expect(editor.getText()).toBe("Hello world");
    // The toolbar follows the editor through a subscription; let it settle.
    await waitFor(() => expect(textbox).toHaveFocus());
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Redo" })).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("history={false} wins over starterKit.undoRedo", () => {
    const { editor } = setup({ history: false, starterKit: { undoRedo: { depth: 5 } } });
    expect(editor.extensionManager.extensions.some((e) => e.name === "undoRedo")).toBe(false);
  });

  it("appends extra extensions after the built-ins", () => {
    const shortcut = vi.fn(() => true);
    const Probe = Extension.create({ name: "probe", addKeyboardShortcuts: () => ({ "Mod-j": shortcut }) });
    const { editor, textbox } = setup({ extensions: [Probe] });
    const names = editor.extensionManager.extensions.map((e) => e.name);
    expect(names).toContain("probe");
    expect(names.indexOf("probe")).toBeGreaterThan(names.indexOf("placeholder"));
    fireEvent.keyDown(textbox, { key: "j", code: "KeyJ", keyCode: 74, ctrlKey: true });
    expect(shortcut).toHaveBeenCalled();
  });

  it("keeps the toolbar undo buttons when a replacement extension brings undo/redo (e.g. Collaboration)", async () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const ExternalUndo = Extension.create({
      name: "externalUndo",
      addCommands: () => ({
        undo: () => () => (undo(), true),
        redo: () => () => (redo(), true),
      }),
    });
    setup({ history: false, extensions: [ExternalUndo] });
    const button = screen.getByRole("button", { name: "Undo" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(undo).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(redo).toHaveBeenCalled();
  });

  it("merges starterKit options over the defaults and keeps link: false", () => {
    const { editor } = setup({ starterKit: { codeBlock: false, heading: { levels: [1] } }, defaultValue: "<h2>Two</h2><pre><code>x</code></pre>" });
    const names = editor.extensionManager.extensions.map((e) => e.name);
    expect(names).not.toContain("codeBlock");
    expect(names.filter((n) => n === "link")).toHaveLength(1);
    expect(names).toContain("undoRedo");
    expect(editor.getHTML()).not.toContain("<h2>");
    act(() => {
      editor.commands.setContent("<h1>One</h1>");
    });
    expect(editor.getHTML()).toContain("<h1>One</h1>");
  });
});

/* ------------------------------------------------------------------ */
/* CodeEditor                                                          */
/* ------------------------------------------------------------------ */

describe("CodeEditor history", () => {
  function type(ref: React.RefObject<CodeEditorHandle | null>, text: string) {
    act(() => {
      const view = ref.current!.view!;
      view.dispatch({ selection: { anchor: view.state.doc.length } });
      ref.current!.insert(text);
    });
  }

  it("undoes with Mod-Z by default", async () => {
    const ref = React.createRef<CodeEditorHandle>();
    const { container } = render(<CodeEditor ref={ref} defaultValue="one" />);
    type(ref, " two");
    expect(undoDepth(ref.current!.view!.state)).toBeGreaterThan(0);
    modZ(container.querySelector(".cm-content")!);
    expect(ref.current!.getValue()).toBe("one");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("history={false} drops history and its keymap, and custom key bindings (a Yjs undo keymap) take Mod-Z", () => {
    const ref = React.createRef<CodeEditorHandle>();
    const customUndo = vi.fn(() => true);
    const keys: KeyBinding[] = [{ key: "Mod-z", run: customUndo }];
    const { container } = render(<CodeEditor ref={ref} defaultValue="one" history={false} />);
    const content = container.querySelector(".cm-content")!;
    type(ref, " two");
    expect(undoDepth(ref.current!.view!.state)).toBe(0);
    modZ(content);
    expect(ref.current!.getValue()).toBe("one two");

    // Same for a remount with the keymap supplied up front.
    const ref2 = React.createRef<CodeEditorHandle>();
    const second = render(<CodeEditor ref={ref2} defaultValue="a" history={false} keyBindings={keys} />);
    type(ref2, "b");
    modZ(second.container.querySelector(".cm-content")!);
    expect(customUndo).toHaveBeenCalledTimes(1);
    expect(ref2.current!.getValue()).toBe("ab");
  });

  it("applies extra extensions alongside history={false} and reconfigures when history toggles", () => {
    const ref = React.createRef<CodeEditorHandle>();
    const updates = vi.fn();
    const extensions = [EditorView.updateListener.of((u) => u.docChanged && updates())];
    const { container, rerender } = render(<CodeEditor ref={ref} defaultValue="x" history={false} extensions={extensions} />);
    type(ref, "y");
    expect(updates).toHaveBeenCalled();
    expect(undoDepth(ref.current!.view!.state)).toBe(0);

    rerender(<CodeEditor ref={ref} defaultValue="x" history extensions={extensions} />);
    type(ref, "z");
    expect(undoDepth(ref.current!.view!.state)).toBe(1);
    modZ(container.querySelector(".cm-content")!);
    expect(ref.current!.getValue()).toBe("xy");

    rerender(<CodeEditor ref={ref} defaultValue="x" history={false} extensions={extensions} />);
    type(ref, "w");
    modZ(container.querySelector(".cm-content")!);
    expect(ref.current!.getValue()).toBe("xyw");
  });
});

describe("RichTextToolbar before the editor exists", () => {
  it("renders with a null editor (the first browser render) instead of crashing", () => {
    expect(() => render(<RichTextToolbar editor={null} />)).not.toThrow();
  });
});
