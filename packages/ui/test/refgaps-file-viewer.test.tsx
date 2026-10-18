import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileViewer, type FileRenderer, type ViewerFile } from "../src/patterns/file-viewer";
import { axeViolations } from "./a11y";

const photos: ViewerFile[] = [
  { name: "one.png", url: "/one.png" },
  { name: "two.png", url: "/two.png" },
  { name: "three.png", url: "/three.png" },
  { name: "notes.txt", text: "hello" },
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("FileViewer custom renderers", () => {
  it("lets a matching renderer win over the built-in kind and gives it the context", () => {
    const render1 = vi.fn((file: ViewerFile, ctx: Parameters<FileRenderer["render"]>[1]) => (
      <div data-testid="pdfjs">
        {file.name} {ctx.url} {ctx.kind} {ctx.index}/{ctx.count}
      </div>
    ));
    const renderers: FileRenderer[] = [
      { label: "Office", match: (f) => f.name.endsWith(".docx"), render: () => <div>office</div> },
      { label: "PDF viewer", match: (_f, kind) => kind === "pdf", render: render1 },
    ];
    const { container } = render(<FileViewer inline file={{ name: "r.pdf", url: "/r.pdf" }} renderers={renderers} />);
    expect(screen.getByTestId("pdfjs")).toHaveTextContent("r.pdf /r.pdf pdf 0/1");
    expect(container.querySelector("object")).toBeNull();
    expect(container.querySelector('[data-renderer="custom"]')).toHaveAttribute("data-renderer-label", "PDF viewer");
  });

  it("falls back to the built-in view when a renderer reports an error", () => {
    function Failing({ onError }: { onError: () => void }) {
      React.useEffect(() => onError(), [onError]);
      return <div>trying</div>;
    }
    const renderers: FileRenderer[] = [{ match: () => true, render: (_f, ctx) => <Failing onError={ctx.onError} /> }];
    const { container } = render(<FileViewer inline file={{ name: "r.pdf", url: "/r.pdf" }} renderers={renderers} />);
    expect(screen.queryByText("trying")).toBeNull();
    expect(container.querySelector("object")).toHaveAttribute("data", "/r.pdf#view=FitH");
  });

  it("falls back to the next renderer, then the built-in view, when renderers throw", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Boom = () => {
      throw new Error("pdf.js failed");
    };
    const renderers: FileRenderer[] = [
      { match: () => true, render: () => <Boom /> },
      { match: () => true, render: () => <div>second</div> },
    ];
    const { rerender, container } = render(<FileViewer inline file={{ name: "r.pdf", url: "/r.pdf" }} renderers={renderers} />);
    expect(screen.getByText("second")).toBeInTheDocument();

    rerender(<FileViewer inline file={{ name: "s.pdf", url: "/s.pdf" }} renderers={[{ match: () => true, render: () => <Boom /> }]} />);
    expect(container.querySelector("object")).toHaveAttribute("data", "/s.pdf#view=FitH");
  });

  it("can fall back straight to the download card, and treats a throwing match as no match", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Boom = () => {
      throw new Error("nope");
    };
    const { container, rerender } = render(
      <FileViewer inline file={{ name: "r.pdf", url: "/r.pdf" }} renderers={[{ match: () => true, fallback: "download", render: () => <Boom /> }]} />
    );
    expect(container.querySelector("object")).toBeNull();
    expect(container.querySelector('[data-renderer="unknown"]')).toHaveTextContent("Couldn’t show a preview.");

    rerender(
      <FileViewer
        inline
        file={{ name: "a.png", url: "/a.png" }}
        renderers={[
          {
            match: () => {
              throw new Error("bad match");
            },
            render: () => <div>never</div>,
          },
        ]}
      />
    );
    expect(container.querySelector('[data-renderer="image"]')).toBeInTheDocument();
  });

  it("shows a loading overlay while the renderer says it is loading", () => {
    let setLoading: (v: boolean) => void = () => {};
    function Slow({ ctx }: { ctx: Parameters<FileRenderer["render"]>[1] }) {
      setLoading = ctx.setLoading;
      return <div>{ctx.renderBuiltin()}</div>;
    }
    const { container } = render(
      <FileViewer inline file={{ name: "a.png", url: "/a.png" }} renderers={[{ label: "viewer", match: () => true, render: (_f, ctx) => <Slow ctx={ctx} /> }]} />
    );
    expect(container.querySelector('[data-renderer="image"]')).toBeInTheDocument();
    act(() => setLoading(true));
    expect(screen.getByText("Loading viewer…")).toBeInTheDocument();
    expect(container.querySelector('[data-renderer="custom"]')).toHaveAttribute("aria-busy", "true");
    act(() => setLoading(false));
    expect(screen.queryByText("Loading viewer…")).toBeNull();
  });

  it("resolves a blob to an object URL for renderers and built-ins, and revokes it", () => {
    const create = vi.fn(() => "blob:fake");
    const revoke = vi.fn();
    vi.stubGlobal("URL", Object.assign(class extends URL {}, { createObjectURL: create, revokeObjectURL: revoke }));
    const blob = new Blob(["x"], { type: "image/png" });
    const seen: Array<string | undefined> = [];
    const { unmount } = render(
      <FileViewer
        inline
        file={{ name: "a.png", blob }}
        renderers={[{ match: () => true, render: (_f, ctx) => (seen.push(ctx.url), <span>{ctx.blob === blob ? "has blob" : "no blob"}</span>) }]}
      />
    );
    expect(screen.getByText("has blob")).toBeInTheDocument();
    expect(seen.at(-1)).toBe("blob:fake");
    const live = create.mock.calls.length - revoke.mock.calls.length;
    expect(live).toBe(1);
    unmount();
    expect(revoke.mock.calls.length).toBe(create.mock.calls.length);
    expect(revoke).toHaveBeenCalledWith("blob:fake");
  });
});

describe("FileViewer gallery", () => {
  it("navigates with the buttons and shows the position (uncontrolled)", () => {
    const onIndexChange = vi.fn();
    render(<FileViewer inline files={photos} defaultIndex={1} onIndexChange={onIndexChange} />);
    expect(screen.getByRole("heading", { name: "two.png" })).toBeInTheDocument();
    expect(screen.getByText("2 of 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next file" }));
    expect(onIndexChange).toHaveBeenLastCalledWith(2, photos[2]);
    expect(screen.getByRole("heading", { name: "three.png" })).toBeInTheDocument();
    expect(screen.getByText("3 of 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous file" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous file" }));
    expect(screen.getByText("1 of 4")).toBeInTheDocument();
    // At the start without `loop` the previous button is inert but stays focusable.
    const prev = screen.getByRole("button", { name: "Previous file" });
    expect(prev).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(prev);
    expect(screen.getByText("1 of 4")).toBeInTheDocument();
  });

  it("follows a controlled index and only reports requests", () => {
    const onIndexChange = vi.fn();
    const { rerender } = render(<FileViewer inline files={photos} index={0} onIndexChange={onIndexChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Next file" }));
    expect(onIndexChange).toHaveBeenCalledWith(1, photos[1]);
    expect(screen.getByText("1 of 4")).toBeInTheDocument();
    rerender(<FileViewer inline files={photos} index={3} onIndexChange={onIndexChange} />);
    expect(screen.getByText("4 of 4")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
    // An index past the end (e.g. after a delete) is clamped.
    rerender(<FileViewer inline files={photos.slice(0, 2)} index={3} onIndexChange={onIndexChange} />);
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
  });

  it("wraps around with loop", () => {
    render(<FileViewer inline files={photos} loop />);
    fireEvent.click(screen.getByRole("button", { name: "Previous file" }));
    expect(screen.getByText("4 of 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next file" }));
    expect(screen.getByText("1 of 4")).toBeInTheDocument();
  });

  it("navigates with ←/→ but not while typing, in code views or in arrow widgets", () => {
    const files: ViewerFile[] = [{ name: "a.md", text: "# A" }, ...photos];
    render(
      <FileViewer
        inline
        files={files}
        actions={<input aria-label="Rename" defaultValue="x" />}
        panel={<textarea aria-label="Comment" />}
      />
    );
    const next = screen.getByRole("button", { name: "Next file" });
    fireEvent.keyDown(next, { key: "ArrowRight" });
    expect(screen.getByText("2 of 5")).toBeInTheDocument();
    fireEvent.keyDown(next, { key: "ArrowLeft" });
    expect(screen.getByText("1 of 5")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Rename" }), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Comment" }), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("radio", { name: "Preview" }), { key: "ArrowRight" });
    expect(screen.getByText("1 of 5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Source" }));
    fireEvent.keyDown(screen.getByLabelText("a.md contents"), { key: "ArrowRight" });
    expect(screen.getByText("1 of 5")).toBeInTheDocument();
    // Modifier combos are left to the browser.
    fireEvent.keyDown(next, { key: "ArrowRight", altKey: true });
    expect(screen.getByText("1 of 5")).toBeInTheDocument();
  });

  it("works in the modal and announces the file", async () => {
    render(<FileViewer files={photos} defaultOpen />);
    const dialog = screen.getByRole("dialog", { name: "one.png" });
    fireEvent.keyDown(within(dialog).getByRole("button", { name: "Next file" }), { key: "ArrowRight" });
    expect(screen.getByRole("dialog", { name: "two.png" })).toBeInTheDocument();
    expect(within(dialog).getByText("two.png, 2 of 4")).toHaveAttribute("aria-live", "polite");
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("preloads the neighbouring images", () => {
    const loaded: string[] = [];
    vi.stubGlobal(
      "Image",
      class {
        set src(v: string) {
          loaded.push(v);
        }
      }
    );
    render(<FileViewer inline files={photos} defaultIndex={1} />);
    expect(new Set(loaded)).toEqual(new Set(["/one.png", "/three.png"]));
    loaded.length = 0;
    fireEvent.click(screen.getByRole("button", { name: "Next file" }));
    // three.png's neighbours: two.png (image) and notes.txt (not an image).
    expect(new Set(loaded)).toEqual(new Set(["/two.png"]));
  });

  it("renders an optional thumbnail strip with roving focus", () => {
    const files = [...photos.slice(0, 3), { name: "deck.pptx", url: "/deck.pptx" }];
    const { container } = render(<FileViewer inline files={files} thumbnails />);
    const strip = screen.getByRole("group", { name: "Files" });
    const thumbs = within(strip).getAllByRole("button");
    expect(thumbs).toHaveLength(4);
    expect(thumbs[0]).toHaveAttribute("aria-current", "true");
    expect(thumbs[0]).toHaveAttribute("tabindex", "0");
    expect(thumbs[1]).toHaveAttribute("tabindex", "-1");
    expect(thumbs[1]!.querySelector("img")).toHaveAttribute("src", "/two.png");
    expect(thumbs[3]!.querySelector("img")).toBeNull();
    thumbs[0]!.focus();
    fireEvent.keyDown(thumbs[0]!, { key: "ArrowRight" });
    expect(screen.getByText("2 of 4")).toBeInTheDocument();
    expect(document.activeElement).toBe(thumbs[1]);
    fireEvent.click(thumbs[3]!);
    expect(container.querySelector('[data-renderer="unknown"]')).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Files" })).toBeInTheDocument();
  });

  it("has no thumbnail strip or navigation for a single file", () => {
    render(<FileViewer inline files={[photos[0]!]} thumbnails />);
    expect(screen.queryByRole("button", { name: "Next file" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Files" })).toBeNull();
  });
});

describe("FileViewer header and panel slots", () => {
  it("renders app actions and title/subtitle overrides, per file in a gallery", () => {
    const onDelete = vi.fn();
    render(
      <FileViewer
        inline
        files={photos}
        title={(f) => `Photo: ${f.name}`}
        subtitle="Shared with you"
        download={false}
        actions={(f, i) => (
          <button type="button" onClick={() => onDelete(f.name, i)}>
            Delete
          </button>
        )}
      />
    );
    expect(screen.getByRole("heading", { name: "Photo: one.png" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Photo: one.png" })).toBeInTheDocument();
    expect(screen.getByText("Shared with you")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Download/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next file" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("two.png", 1);
  });

  it("toggles the side panel (uncontrolled) and keeps its content mounted", async () => {
    const onPanelOpenChange = vi.fn();
    const { container } = render(
      <FileViewer
        inline
        file={{ name: "a.png", url: "/a.png", size: 1024 }}
        panel={(f) => <p>Details for {f.name}</p>}
        onPanelOpenChange={onPanelOpenChange}
      />
    );
    const toggle = screen.getByRole("button", { name: "Details" });
    const panel = screen.getByRole("complementary", { name: "Details" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveTextContent("Details for a.png");
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(toggle);
    expect(onPanelOpenChange).toHaveBeenCalledWith(false);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector('[data-slot="file-viewer-panel"]')).not.toBeVisible();
  });

  it("supports a controlled panel with a custom label", () => {
    const onPanelOpenChange = vi.fn();
    const { rerender } = render(
      <FileViewer inline file={photos[0]} panel="Comments here" panelLabel="Comments" panelOpen={false} onPanelOpenChange={onPanelOpenChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Comments" }));
    expect(onPanelOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: "Comments" })).toHaveAttribute("aria-expanded", "false");
    rerender(<FileViewer inline file={photos[0]} panel="Comments here" panelLabel="Comments" panelOpen onPanelOpenChange={onPanelOpenChange} />);
    expect(screen.getByRole("complementary", { name: "Comments" })).toBeVisible();
  });
});

describe("FileViewer loading and empty states", () => {
  it("shows skeletons while loading with no file, then the file", () => {
    const { container, rerender } = render(<FileViewer inline files={[]} loading emptyState="Nothing here" />);
    const root = container.querySelector('[data-slot="file-viewer"]')!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector('[data-renderer="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByText("Nothing here")).toBeNull();
    expect(screen.getAllByText("Loading file…")).toHaveLength(1);

    rerender(<FileViewer inline files={[]} emptyState="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();

    rerender(<FileViewer inline files={photos} loading />);
    expect(container.querySelector('[data-renderer="image"]')).toBeInTheDocument();
    expect(root).toHaveAttribute("aria-busy", "true");
  });

  it("keeps a skeleton body while the file has nothing to show yet", async () => {
    const { container } = render(<FileViewer inline file={{ name: "big.mov" }} loading />);
    expect(screen.getByRole("heading", { name: "big.mov" })).toBeInTheDocument();
    expect(container.querySelector('[data-renderer="skeleton"]')).toBeInTheDocument();
    expect(container.querySelector('[data-renderer="unknown"]')).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("leaves single-file usage unchanged", () => {
    const { container } = render(<FileViewer inline file={{ name: "a.png", url: "/a.png", size: 2048 }} />);
    expect(container.querySelector('[data-slot="file-viewer"]')).not.toHaveAttribute("aria-busy");
    expect(screen.queryByRole("group", { name: "Browse files" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Details" })).toBeNull();
    expect(screen.getByRole("link", { name: "Download a.png" })).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
  });

  it("passes axe in a full gallery with actions, panel and thumbnails", async () => {
    const { container } = render(
      <FileViewer
        inline
        files={photos}
        thumbnails
        actions={<button type="button">Share</button>}
        panel={<dl><dt>Size</dt><dd>1 KB</dd></dl>}
      />
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
