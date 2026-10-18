import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AdaptiveTabs, BottomTabBar, BottomTabBarItem } from "../src/patterns/bottom-tab-bar";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  useSwipe,
} from "../src/primitives/drawer";
import { ImageWithFallback, Lightbox, LightboxTrigger, type LightboxItem } from "../src/patterns/lightbox";
import { FilePreviewCard, FileViewer, getFilePreviewKind } from "../src/patterns/file-viewer";
import { SplitPane, SplitPaneHandle, SplitPanePanel } from "../src/patterns/split-pane";
import {
  PresenceAvatars,
  PresenceIndicator,
  RemoteCursor,
  TypingIndicator,
  formatTypingText,
  type PresenceUser,
} from "../src/kits/social/presence";
import { axeViolations } from "./a11y";

// jsdom may lack PointerEvent; without it fireEvent.pointer* drops clientX/clientY.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
    }
  }
  (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill;
}

const pointer = { pointerId: 1, pointerType: "touch", button: 0 };

/* ------------------------------------------------------------------ */
/* BottomTabBar                                                        */
/* ------------------------------------------------------------------ */

const Icon = () => <svg aria-hidden viewBox="0 0 1 1" />;

describe("BottomTabBar", () => {
  it("selects tabs, sets aria-current and announces badges", async () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <BottomTabBar defaultValue="home" onValueChange={onValueChange} aria-label="Sections">
        <BottomTabBarItem value="home" label="Home" icon={<Icon />} />
        <BottomTabBarItem value="inbox" label="Inbox" icon={<Icon />} badge={3} />
        <BottomTabBarItem value="me" label="Me" icon={<Icon />} badge />
      </BottomTabBar>
    );
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(nav.className).toContain("md:hidden");
    expect(nav.className).toContain("pb-[env(safe-area-inset-bottom)]");
    const home = screen.getByRole("button", { name: /Home/ });
    const inbox = screen.getByRole("button", { name: "Inbox (3 new)" });
    expect(home).toHaveAttribute("aria-current", "page");
    expect(inbox).not.toHaveAttribute("aria-current");
    expect(container.querySelector('[data-slot="badge-count"]')).toHaveTextContent("3");
    expect(container.querySelector('[data-slot="badge-dot"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Me (new)" })).toBeInTheDocument();

    fireEvent.click(inbox);
    expect(onValueChange).toHaveBeenCalledWith("inbox");
    expect(inbox).toHaveAttribute("aria-current", "page");
    expect(home).not.toHaveAttribute("aria-current");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("supports items, links via renderLink, hideAbove and a primary action", () => {
    const onAction = vi.fn();
    render(
      <BottomTabBar
        value="b"
        hideAbove="lg"
        primaryAction={{ icon: <Icon />, label: "New note", onClick: onAction }}
        renderLink={({ href, children, ...rest }) => (
          <a data-router href={href} {...rest}>
            {children}
          </a>
        )}
        items={[
          { value: "a", label: "Alpha", icon: <Icon />, href: "/a" },
          { value: "b", label: "Beta", icon: <Icon />, href: "/b" },
        ]}
      />
    );
    expect(screen.getByRole("navigation").className).toContain("lg:hidden");
    expect(screen.getByRole("link", { name: "Beta" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Alpha" })).toHaveAttribute("data-router");
    fireEvent.click(screen.getByRole("button", { name: "New note" }));
    expect(onAction).toHaveBeenCalled();
  });

  it("asChild merges tab props into the child element", () => {
    render(
      <BottomTabBar defaultValue="x">
        <BottomTabBarItem value="x" label="Custom" icon={<Icon />} asChild>
          <a href="/custom" data-testid="custom" />
        </BottomTabBarItem>
      </BottomTabBar>
    );
    const link = screen.getByTestId("custom");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveTextContent("Custom");
  });

  it("AdaptiveTabs keeps the inline pills and the bottom bar in sync", async () => {
    const { container } = render(
      <AdaptiveTabs
        label="Translate"
        items={[
          { value: "text", label: "Text", icon: <Icon /> },
          { value: "images", label: "Images", icon: <Icon /> },
        ]}
      />
    );
    const inline = screen.getByRole("navigation", { name: "Translate" });
    const bar = screen.getByRole("navigation", { name: "Translate tab bar" });
    expect(inline.className).toContain("md:flex");
    expect(bar.className).toContain("md:hidden");
    fireEvent.click(within(inline).getByRole("button", { name: /Images/ }));
    expect(within(bar).getByRole("button", { name: /Images/ })).toHaveAttribute("aria-current", "page");
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Drawer                                                              */
/* ------------------------------------------------------------------ */

function TestDrawer(props: Partial<React.ComponentProps<typeof Drawer>> & { scrolled?: boolean }) {
  const { scrolled, ...rest } = props;
  return (
    <Drawer {...rest}>
      <DrawerTrigger>Open drawer</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription>Narrow the list</DrawerDescription>
        </DrawerHeader>
        <DrawerBody data-testid="body" ref={(el) => { if (el && scrolled) el.scrollTop = 40; }}>
          <p>Content</p>
          <input type="range" aria-label="Volume" />
        </DrawerBody>
        <DrawerClose>Done</DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}

function drag(el: Element, distance: number) {
  fireEvent.pointerDown(el, { ...pointer, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(el, { ...pointer, clientX: 100, clientY: 100 + distance / 2 });
  fireEvent.pointerMove(el, { ...pointer, clientX: 100, clientY: 100 + distance });
  fireEvent.pointerUp(el, { ...pointer, clientX: 100, clientY: 100 + distance });
}

describe("Drawer", () => {
  it("opens from the trigger and closes with Escape, returning focus", async () => {
    render(<TestDrawer />);
    const trigger = screen.getByRole("button", { name: "Open drawer" });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Filters" });
    expect(dialog).toHaveAccessibleDescription("Narrow the list");
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("closes from DrawerClose", async () => {
    const onOpenChange = vi.fn();
    render(<TestDrawer defaultOpen onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("dismisses when dragged down past the threshold", async () => {
    render(<TestDrawer defaultOpen />);
    const dialog = screen.getByRole("dialog");
    drag(screen.getByText("Filters"), 150);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(dialog).not.toBeInTheDocument();
  });

  it("snaps back after a short drag", () => {
    render(<TestDrawer defaultOpen />);
    drag(screen.getByText("Filters"), 12);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("follows the finger while dragging", () => {
    render(<TestDrawer defaultOpen />);
    const dialog = screen.getByRole("dialog");
    const title = screen.getByText("Filters");
    fireEvent.pointerDown(title, { ...pointer, clientY: 100 });
    fireEvent.pointerMove(title, { ...pointer, clientY: 160 });
    expect(dialog).toHaveAttribute("data-dragging", "true");
    expect(dialog.style.translate).toBe("0 60px");
    fireEvent.pointerUp(title, { ...pointer, clientY: 110 });
  });

  it("never starts a drag from a range input or a scrolled-down body", () => {
    render(<TestDrawer defaultOpen scrolled />);
    drag(screen.getByRole("slider", { name: "Volume" }), 200);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    drag(screen.getByText("Content"), 200);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("ignores drag, Escape and scrim when dismissible={false}", async () => {
    render(<TestDrawer defaultOpen dismissible={false} />);
    drag(screen.getByText("Filters"), 300);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("moves between snap points", () => {
    const onSnap = vi.fn();
    render(
      <Drawer defaultOpen snapPoints={[0.5, 1]} onSnapPointChange={onSnap}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Snap</DrawerTitle>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-snap", "0.5");
    fireEvent.click(screen.getByRole("button", { name: "Expand sheet" }));
    expect(onSnap).toHaveBeenLastCalledWith(1);
    expect(dialog).toHaveAttribute("data-snap", "1");
    drag(screen.getByText("Snap"), 60);
    expect(onSnap).toHaveBeenLastCalledWith(0.5);
  });
});

describe("useSwipe", () => {
  function Swiper({ onLeft, onDown }: { onLeft: () => void; onDown: () => void }) {
    const handlers = useSwipe({ onSwipeLeft: onLeft, onSwipeDown: onDown, mouse: true });
    return <div data-testid="swipe" {...handlers} />;
  }
  it("detects direction past the threshold", () => {
    const onLeft = vi.fn();
    const onDown = vi.fn();
    render(<Swiper onLeft={onLeft} onDown={onDown} />);
    const el = screen.getByTestId("swipe");
    fireEvent.pointerDown(el, { ...pointer, clientX: 200, clientY: 100 });
    fireEvent.pointerUp(el, { ...pointer, clientX: 100, clientY: 110 });
    expect(onLeft).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(el, { ...pointer, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(el, { ...pointer, clientX: 100, clientY: 130 });
    expect(onDown).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* Lightbox + ImageWithFallback                                        */
/* ------------------------------------------------------------------ */

const gallery: LightboxItem[] = [
  { src: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", alt: "Mountains", caption: "Alps at dawn" },
  { src: "data:image/gif;base64,R0lGODlhAQABAAAAACx=", alt: "Lake" },
  { src: "data:image/gif;base64,R0lGODlhAQABAAAAACy=", alt: "Forest" },
];

describe("Lightbox", () => {
  it("navigates with buttons and arrow keys and shows a counter", async () => {
    const onIndexChange = vi.fn();
    render(
      <Lightbox items={gallery} onIndexChange={onIndexChange}>
        {gallery.map((g, i) => (
          <LightboxTrigger key={g.src} index={i}>
            <img src={g.src} alt="" />
          </LightboxTrigger>
        ))}
      </Lightbox>
    );
    fireEvent.click(screen.getByRole("button", { name: "Open Lake" }));
    const dialog = await screen.findByRole("dialog", { name: "Image viewer" });
    expect(within(dialog).getByText("2 / 3")).toBeInTheDocument();
    expect(within(dialog).getByRole("img", { name: "Lake" })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Next" }));
    expect(within(dialog).getByText("3 / 3")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Next" })).toBeDisabled();

    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(within(dialog).getByText("2 / 3")).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(within(dialog).getByText("1 / 3")).toBeInTheDocument();
    expect(within(dialog).getByText("Alps at dawn")).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(within(dialog).getByText("2 / 3")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Previous" }));
    expect(within(dialog).getByText("1 / 3")).toBeInTheDocument();
    expect(onIndexChange).toHaveBeenLastCalledWith(0);

    fireEvent.click(within(dialog).getByRole("button", { name: /View 3 of 3/ }));
    expect(within(dialog).getByText("3 / 3")).toBeInTheDocument();

    expect(await axeViolations(document.body)).toEqual([]);

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("zooms with double-click and keyboard", async () => {
    render(<Lightbox items={gallery} defaultOpen loop />);
    const dialog = await screen.findByRole("dialog");
    const img = within(dialog).getByRole("img", { name: "Mountains" });
    fireEvent.doubleClick(img);
    expect(img).toHaveAttribute("data-zoom", "2");
    fireEvent.keyDown(dialog, { key: "0" });
    expect(img).toHaveAttribute("data-zoom", "1");
    // loop: previous from the first goes to the last
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(within(dialog).getByText("3 / 3")).toBeInTheDocument();
  });
});

describe("ImageWithFallback", () => {
  it("reserves the aspect ratio, shows a skeleton and an error state", async () => {
    const { container } = render(<ImageWithFallback src="/broken.png" alt="Chart" width={400} height={200} />);
    const wrapper = container.querySelector('[data-slot="image"]') as HTMLElement;
    expect(wrapper.style.aspectRatio).toBe("2");
    expect(container.querySelector('[data-slot="image-skeleton"]')).toBeInTheDocument();
    fireEvent.error(screen.getByRole("img", { name: "Chart" }));
    expect(screen.getByText("Image unavailable")).toBeInTheDocument();
    expect(wrapper).toHaveAttribute("data-status", "error");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("loads through a fetcher into an object URL and revokes it on unmount", async () => {
    const create = vi.fn(() => "blob:mock-1");
    const revoke = vi.fn();
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
    try {
      const fetcher = vi.fn(async () => new Blob(["x"], { type: "image/png" }));
      const { unmount } = render(<ImageWithFallback src="/private/a.png" alt="Private" ratio={1} fetcher={fetcher} />);
      const img = await screen.findByRole("img", { name: "Private" });
      expect(fetcher).toHaveBeenCalledWith("/private/a.png");
      expect(img).toHaveAttribute("src", "blob:mock-1");
      fireEvent.load(img);
      expect(img.closest('[data-slot="image"]')).toHaveAttribute("data-status", "loaded");
      unmount();
      expect(revoke).toHaveBeenCalledWith("blob:mock-1");
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });

  it("shows the error state when the fetcher rejects", async () => {
    render(<ImageWithFallback src="/x.png" alt="Nope" fetcher={() => Promise.reject(new Error("401"))} />);
    expect(await screen.findByText("Image unavailable")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* FileViewer                                                          */
/* ------------------------------------------------------------------ */

describe("FileViewer", () => {
  it("detects the preview kind", () => {
    expect(getFilePreviewKind({ name: "a.png" })).toBe("image");
    expect(getFilePreviewKind({ name: "report.pdf" })).toBe("pdf");
    expect(getFilePreviewKind({ name: "clip.mp4" })).toBe("video");
    expect(getFilePreviewKind({ name: "song.mp3" })).toBe("audio");
    expect(getFilePreviewKind({ name: "README.md" })).toBe("markdown");
    expect(getFilePreviewKind({ name: "data.json" })).toBe("json");
    expect(getFilePreviewKind({ name: "notes.txt" })).toBe("text");
    expect(getFilePreviewKind({ name: "blob", mimeType: "image/webp" })).toBe("image");
    expect(getFilePreviewKind({ name: "archive.zip" })).toBe("unknown");
  });

  it.each([
    ["photo.png", "image", "img"],
    ["report.pdf", "pdf", "object"],
    ["clip.mp4", "video", "video"],
    ["song.mp3", "audio", "audio"],
  ])("renders %s with the %s renderer", (name, kind, tag) => {
    const { container } = render(<FileViewer inline file={{ name, url: `/files/${name}`, size: 2048 }} />);
    const body = container.querySelector(`[data-renderer="${kind}"]`);
    expect(body).toBeInTheDocument();
    expect(body!.querySelector(tag)).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Download ${name}` })).toHaveAttribute("href", `/files/${name}`);
    expect(screen.getByRole("link", { name: "Open in new tab" })).toHaveAttribute("target", "_blank");
  });

  it("uses #view=FitH for PDFs", () => {
    const { container } = render(<FileViewer inline file={{ name: "r.pdf", url: "/r.pdf" }} />);
    expect(container.querySelector("object")).toHaveAttribute("data", "/r.pdf#view=FitH");
  });

  it("pretty-prints JSON from the text prop", () => {
    const { container } = render(<FileViewer inline file={{ name: "data.json" }} text='{"a":1,"b":[2]}' />);
    expect(container.querySelector('[data-renderer="json"] pre')?.textContent).toBe('{\n  "a": 1,\n  "b": [\n    2\n  ]\n}');
  });

  it("renders markdown loaded with loadText and can show the source", async () => {
    const loadText = vi.fn(async () => "# Hello\n\nWorld");
    render(<FileViewer inline file={{ name: "README.md", url: "/readme" }} loadText={loadText} />);
    expect(await screen.findByRole("heading", { name: "Hello" })).toBeInTheDocument();
    expect(loadText).toHaveBeenCalledWith(expect.objectContaining({ name: "README.md" }));
    fireEvent.click(screen.getByRole("radio", { name: "Source" }));
    expect(screen.getByLabelText("README.md contents")).toHaveTextContent("# Hello");
  });

  it("falls back to a download card for unknown types", async () => {
    const { container } = render(<FileViewer inline file={{ name: "backup.zip", url: "/backup.zip", size: 5_242_880 }} />);
    const card = container.querySelector('[data-renderer="unknown"]')!;
    expect(card).toHaveTextContent("No preview available");
    expect(within(card as HTMLElement).getByRole("link", { name: "Download" })).toHaveAttribute("download", "backup.zip");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("opens as a modal with a close button", async () => {
    const onOpenChange = vi.fn();
    render(<FileViewer file={{ name: "notes.txt" }} text="hello" defaultOpen onOpenChange={onOpenChange} />);
    const dialog = screen.getByRole("dialog", { name: "notes.txt" });
    expect(within(dialog).getByText("hello")).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Close preview" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("FilePreviewCard shows an icon tile and is clickable", () => {
    const onClick = vi.fn();
    render(<FilePreviewCard file={{ name: "deck.pptx", size: 1500 }} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview deck.pptx" }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByText("1.5 KB")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* SplitPane                                                           */
/* ------------------------------------------------------------------ */

describe("SplitPane", () => {
  beforeEach(() => window.localStorage.clear());

  function Split(props: Partial<React.ComponentProps<typeof SplitPane>>) {
    return (
      <SplitPane min={20} max={80} step={10} {...props}>
        <SplitPanePanel label="Editor">Editor</SplitPanePanel>
        <SplitPaneHandle />
        <SplitPanePanel label="Preview">Preview</SplitPanePanel>
      </SplitPane>
    );
  }

  it("resizes with the keyboard, clamps and persists", async () => {
    const onSizeChange = vi.fn();
    const { container } = render(<Split storageKey="split-test" onSizeChange={onSizeChange} />);
    const sep = screen.getByRole("separator", { name: "Resize panels" });
    expect(sep).toHaveAttribute("aria-valuenow", "50");
    expect(sep).toHaveAttribute("aria-valuemin", "20");
    expect(sep).toHaveAttribute("aria-valuemax", "80");
    expect(sep).toHaveAttribute("aria-orientation", "vertical");

    fireEvent.keyDown(sep, { key: "ArrowRight" });
    expect(sep).toHaveAttribute("aria-valuenow", "60");
    expect(onSizeChange).toHaveBeenLastCalledWith(60);
    for (let i = 0; i < 5; i++) fireEvent.keyDown(sep, { key: "ArrowRight" });
    expect(sep).toHaveAttribute("aria-valuenow", "80");
    fireEvent.keyDown(sep, { key: "Home" });
    expect(sep).toHaveAttribute("aria-valuenow", "20");
    fireEvent.keyDown(sep, { key: "ArrowLeft" });
    expect(sep).toHaveAttribute("aria-valuenow", "20");
    fireEvent.keyDown(sep, { key: "End" });
    expect(sep).toHaveAttribute("aria-valuenow", "80");
    expect(window.localStorage.getItem("split-test")).toBe("80");

    const first = container.querySelector('[data-panel="0"]') as HTMLElement;
    expect(first.style.flexBasis).toBe("80%");
    expect(sep).toHaveAttribute("aria-controls", first.id);

    fireEvent.keyDown(sep, { key: "Enter" });
    expect(sep).toHaveAttribute("aria-valuenow", "0");
    expect(first).toHaveAttribute("hidden");
    fireEvent.keyDown(sep, { key: "Enter" });
    expect(sep).toHaveAttribute("aria-valuenow", "80");

    fireEvent.doubleClick(sep);
    expect(sep).toHaveAttribute("aria-valuenow", "50");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("restores a persisted size and survives broken storage", () => {
    window.localStorage.setItem("split-restore", "35");
    const { unmount } = render(<Split storageKey="split-restore" />);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "35");
    unmount();

    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    render(<Split storageKey="split-broken" defaultSize={40} />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-valuenow", "40");
    fireEvent.keyDown(sep, { key: "ArrowRight" });
    expect(sep).toHaveAttribute("aria-valuenow", "50");
    spy.mockRestore();
    setSpy.mockRestore();
  });

  it("is controllable and uses vertical keys when stacked vertically", () => {
    function Controlled() {
      const [size, setSize] = React.useState(30);
      return (
        <SplitPane orientation="vertical" size={size} onSizeChange={setSize} step={5}>
          <SplitPanePanel>Top</SplitPanePanel>
          <SplitPanePanel>Bottom</SplitPanePanel>
        </SplitPane>
      );
    }
    render(<Controlled />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-orientation", "horizontal");
    fireEvent.keyDown(sep, { key: "ArrowDown" });
    expect(sep).toHaveAttribute("aria-valuenow", "35");
    fireEvent.keyDown(sep, { key: "ArrowRight" });
    expect(sep).toHaveAttribute("aria-valuenow", "35");
  });
});

/* ------------------------------------------------------------------ */
/* Presence                                                            */
/* ------------------------------------------------------------------ */

const people: PresenceUser[] = [
  { id: "u1", name: "Aiko Tanaka", status: "active" },
  { id: "u2", name: "Ben Ortiz", status: "idle" },
  { id: "u3", name: "Chen Wei", status: "active" },
  { id: "u4", name: "Dana Fox" },
  { id: "u5", name: "Eli Stone", status: "active" },
];

describe("Presence", () => {
  it("PresenceAvatars collapses overflow into a +N popover listing everyone", async () => {
    const user = userEvent.setup();
    const { container } = render(<PresenceAvatars users={people} max={3} />);
    expect(screen.getByRole("group", { name: "5 people here" })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="presence-avatar"]')).toHaveLength(3);
    const more = screen.getByRole("button", { name: "Show all 5 people" });
    expect(more).toHaveTextContent("+2");
    expect(await axeViolations(container)).toEqual([]);
    await user.click(more);
    const list = await screen.findByRole("list", { name: "Everyone here" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(within(list).getByText("Eli Stone")).toBeInTheDocument();
  });

  it("PresenceIndicator shows live / offline / reconnecting", () => {
    const { rerender } = render(<PresenceIndicator status="live" />);
    expect(screen.getByRole("status")).toHaveTextContent("Live");
    rerender(<PresenceIndicator status="offline" pending={3} />);
    expect(screen.getByRole("status")).toHaveTextContent("Offline · changes saved locally· 3 changes pending");
    rerender(<PresenceIndicator status="reconnecting" />);
    expect(screen.getByRole("status")).toHaveTextContent("Reconnecting…");
  });

  it("TypingIndicator pluralizes", () => {
    expect(formatTypingText(["Aiko"])).toBe("Aiko is typing…");
    expect(formatTypingText(["Aiko", "Ben"])).toBe("Aiko and Ben are typing…");
    expect(formatTypingText(["Aiko", "Ben", "Chen"])).toBe("Aiko, Ben and Chen are typing…");
    expect(formatTypingText(["Aiko", "Ben", "Chen", "Dana", "Eli"])).toBe("Aiko, Ben and 3 others are typing…");
    render(<TypingIndicator users={[{ name: "Aiko" }]} />);
    expect(screen.getByRole("status")).toHaveTextContent("Aiko is typing…");
  });

  it("RemoteCursor positions itself and fades its label when idle", async () => {
    const { container, rerender } = render(<RemoteCursor x={10} y={20} name="Aiko" idleTimeout={30} />);
    const cursor = container.querySelector('[data-slot="remote-cursor"]') as HTMLElement;
    expect(cursor.style.left).toBe("10px");
    expect(cursor.style.top).toBe("20px");
    expect(cursor).toHaveTextContent("Aiko");
    await waitFor(() => expect(cursor).toHaveAttribute("data-idle", "true"));
    rerender(<RemoteCursor x={40} y={20} name="Aiko" idleTimeout={30} />);
    expect(cursor).not.toHaveAttribute("data-idle");
  });
});

// Silence act() warnings from Radix presence timers that settle after a test ends.
afterEach(async () => {
  await act(async () => {});
});
