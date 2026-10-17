import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import {
  EmbedConsent,
  EmbedConsentProvider,
  LinkPreviewCard,
  RichEmbed,
  SandboxedFrame,
  SvgEmbed,
  embedProviders,
  resolveEmbed,
} from "../src/components/embeds";
import {
  ChatMessageAction,
  ChatMessageActions,
  ChatReactions,
  MessageTimestampHover,
  formatMessageRelativeTime,
  toggleChatReaction,
} from "../src/components/chat-message-actions";
import { QueuedMessages } from "../src/components/agent-composer";
import { PromptInput, PromptInputRestoredDraft, PromptInputTextarea } from "../src/components/prompt-input";
import { ApprovalStack } from "../src/components/approval-stack";
import {
  ClarifySettled,
  DecodeText,
  FadeText,
  FanMenu,
  GlyphSpinner,
  SplitButton,
  TabDropdown,
  UndeliveredNotice,
  ZoomPan,
  glyphSpinnerFrames,
} from "../src/components/primitives-extra";
import { axeViolations } from "./a11y";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const openMenu = (trigger: HTMLElement) => {
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
  if (trigger.getAttribute("aria-expanded") !== "true") fireEvent.keyDown(trigger, { key: "Enter" });
};

/* ------------------------------------------------------------------ */

describe("EmbedConsent", () => {
  it("gates the embed until Load and renders a SandboxedFrame with a sandbox", async () => {
    const onConsent = vi.fn();
    const { container } = render(
      <EmbedConsent provider="YouTube" providerId="youtube" domain="youtube.com" onConsent={onConsent}>
        <SandboxedFrame src="about:blank" title="Video" />
      </EmbedConsent>
    );
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByText(/This will load content from/)).toHaveTextContent("youtube.com");
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Load" }));
    expect(onConsent).toHaveBeenCalled();
    const frame = container.querySelector("iframe")!;
    expect(frame).toHaveAttribute("sandbox", expect.stringContaining("allow-scripts"));
    expect(frame.getAttribute("sandbox")).not.toContain("allow-top-navigation");
    expect(frame).toHaveAttribute("title", "Video");
    expect(frame).toHaveAttribute("loading", "lazy");
    expect(frame).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  });

  it("Always allow calls the callback, remembers in the provider and skips the gate", () => {
    const onAllowAlways = vi.fn();
    const onAllowedChange = vi.fn();
    const { container } = render(
      <EmbedConsentProvider onAllowedChange={onAllowedChange}>
        <EmbedConsent provider="Spotify" providerId="spotify" domain="spotify.com" onAllowAlways={onAllowAlways}>
          <SandboxedFrame src="about:blank" title="Track A" />
        </EmbedConsent>
        <EmbedConsent provider="Spotify" providerId="spotify" domain="spotify.com">
          <SandboxedFrame src="about:blank" title="Track B" />
        </EmbedConsent>
      </EmbedConsentProvider>
    );
    expect(container.querySelectorAll("iframe")).toHaveLength(0);
    openMenu(screen.getAllByRole("button", { name: "More Spotify options" })[0]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Always allow Spotify" }));
    expect(onAllowAlways).toHaveBeenCalledWith("spotify");
    expect(onAllowedChange).toHaveBeenCalledWith(["spotify"]);
    expect(container.querySelectorAll("iframe")).toHaveLength(2);
  });

  it("provider with pre-allowed ids renders immediately", () => {
    const { container } = render(
      <EmbedConsentProvider allowed={["vimeo"]}>
        <RichEmbed url="https://vimeo.com/76979871" title="Clip" />
      </EmbedConsentProvider>
    );
    expect(container.querySelector("iframe")).toHaveAttribute("src", "https://player.vimeo.com/video/76979871?dnt=1");
  });
});

describe("RichEmbed", () => {
  const cases: [string, string, string][] = [
    ["youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=42"],
    ["youtube", "https://youtu.be/dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["vimeo", "https://vimeo.com/76979871", "https://player.vimeo.com/video/76979871?dnt=1"],
    ["spotify", "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC", "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC"],
    ["soundcloud", "https://soundcloud.com/artist/song", "https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartist%2Fsong&visual=false&show_comments=false"],
    ["x", "https://x.com/user/status/1234567890", "https://platform.twitter.com/embed/Tweet.html?dnt=true&id=1234567890"],
    ["x", "https://twitter.com/user/status/42", "https://platform.twitter.com/embed/Tweet.html?dnt=true&id=42"],
    ["mastodon", "https://mastodon.social/@alice/109876543210", "https://mastodon.social/@alice/109876543210/embed"],
    ["gist", "https://gist.github.com/octocat/6cad326836d38bd3a7ae", "https://gist.github.com/octocat/6cad326836d38bd3a7ae.pibb"],
    ["figma", "https://www.figma.com/file/abc123/Design", "https://www.figma.com/embed?embed_host=sutra&url=https%3A%2F%2Fwww.figma.com%2Ffile%2Fabc123%2FDesign"],
    ["codepen", "https://codepen.io/team/pen/xyzAB", "https://codepen.io/team/embed/xyzAB?default-tab=result"],
  ];

  it("covers every registry entry", () => {
    expect(new Set(cases.map((c) => c[0]))).toEqual(new Set(embedProviders.map((p) => p.id)));
  });

  it.each(cases)("%s: %s → embed src (after consent only)", (id, url, src) => {
    expect(resolveEmbed(url)).toMatchObject({ provider: { id }, src });
    const { container } = render(<RichEmbed url={url} title="Item" />);
    expect(container.querySelector(`[data-provider="${id}"]`)).not.toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Load" }));
    expect(container.querySelector("iframe")).toHaveAttribute("src", src);
  });

  it("falls back to a link card for unknown URLs and ignores non-http schemes", async () => {
    expect(resolveEmbed("javascript:alert(1)")).toBeNull();
    expect(resolveEmbed("not a url")).toBeNull();
    const { container } = render(<RichEmbed url="https://example.com/post" title="A post" description="Hello" />);
    expect(container.querySelector('[data-provider="link"]')).not.toBeNull();
    expect(screen.getByRole("link", { name: /A post/ })).toHaveAttribute("href", "https://example.com/post");
    expect(container.querySelector("iframe")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("local preview shows domain and title without fetching", async () => {
    const { container } = render(<RichEmbed url="https://youtu.be/dQw4w9WgXcQ" title="Never gonna" />);
    expect(screen.getByText("Never gonna")).toBeInTheDocument();
    expect(screen.getByText("youtu.be")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("LinkPreviewCard & SvgEmbed", () => {
  it("renders title, description, domain and image slot", async () => {
    const { container } = render(
      <LinkPreviewCard
        href="https://www.example.org/a"
        title="Example"
        description="Description here"
        image={<span data-testid="img-slot" />}
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
    expect(link).toHaveTextContent("example.org");
    expect(link).toHaveTextContent("Description here");
    expect(screen.getByTestId("img-slot")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("SvgEmbed uses an img data URL, never inline markup", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script><circle r="4" cx="5" cy="5"/></svg>';
    const { container } = render(<SvgEmbed svg={svg} title="A circle" caption="Figure 1" />);
    const img = screen.getByRole("img", { name: "A circle" });
    expect(img.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */

describe("ChatReactions", () => {
  it("toggles counts and adds from the picker", async () => {
    const onReact = vi.fn();
    const { container } = render(
      <ChatReactions defaultReactions={[{ emoji: "👍", count: 2 }, { emoji: "🎉", count: 1, reacted: true }]} onReact={onReact} />
    );
    const group = screen.getByRole("group", { name: "Reactions" });
    expect(await axeViolations(container)).toEqual([]);
    const thumbs = within(group).getAllByRole("button")[0];
    fireEvent.click(thumbs);
    expect(onReact).toHaveBeenLastCalledWith("👍", true);
    expect(thumbs).toHaveAttribute("aria-pressed", "true");
    expect(thumbs).toHaveTextContent("3");
    // Un-react the only 🎉 → removed.
    fireEvent.click(within(group).getAllByRole("button")[1]);
    expect(onReact).toHaveBeenLastCalledWith("🎉", false);
    expect(within(group).getAllByRole("button")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Add reaction" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getAllByRole("button", { name: /fire|🔥/i })[0]);
    expect(onReact).toHaveBeenLastCalledWith("🔥", true);
    expect(within(group).getAllByRole("button")).toHaveLength(3);
  });

  it("toggleChatReaction is pure", () => {
    const list = [{ emoji: "👍", count: 1 }];
    expect(toggleChatReaction(list, "👍", false).list).toBe(list);
    expect(toggleChatReaction(list, "👍").list).toEqual([{ emoji: "👍", count: 2, reacted: true }]);
  });

  it("ChatMessageActions opt-in reactions row + toolbar button", async () => {
    const onReact = vi.fn();
    const { container } = render(
      <ChatMessageActions defaultReactions={[{ emoji: "👍", count: 1 }]} onReact={onReact}>
        <ChatMessageAction label="Copy">c</ChatMessageAction>
      </ChatMessageActions>
    );
    expect(screen.getByRole("toolbar")).toContainElement(screen.getByRole("button", { name: "Add reaction" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Reactions" })).getAllByRole("button")[0]);
    expect(onReact).toHaveBeenCalledWith("👍", true);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("ChatMessageActions without reaction props is unchanged", () => {
    render(<ChatMessageActions><ChatMessageAction label="Copy">c</ChatMessageAction></ChatMessageActions>);
    expect(screen.queryByRole("button", { name: "Add reaction" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Reactions" })).toBeNull();
  });
});

describe("MessageTimestampHover", () => {
  it("shows relative time with the full date for assistive tech and a tooltip on focus", async () => {
    const now = new Date(2026, 9, 18, 12, 0, 0);
    const date = new Date(2026, 9, 18, 11, 55, 0);
    const { container } = render(<MessageTimestampHover date={date} now={now} formatFull={() => "Sunday, October 18, 2026 at 11:55"} />);
    const time = container.querySelector("time")!;
    expect(time).toHaveTextContent("5m ago");
    expect(time).toHaveAttribute("datetime", date.toISOString());
    expect(time).toHaveTextContent("Sunday, October 18, 2026 at 11:55");
    fireEvent.focus(time);
    expect((await screen.findAllByText("Sunday, October 18, 2026 at 11:55")).length).toBeGreaterThan(1);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("formats ranges", () => {
    const now = new Date(2026, 9, 18, 12).getTime();
    expect(formatMessageRelativeTime(now - 10_000, now)).toBe("just now");
    expect(formatMessageRelativeTime(now - 3 * 3600_000, now)).toBe("3h ago");
    expect(formatMessageRelativeTime(now - 26 * 3600_000, now)).toBe("Yesterday");
    expect(formatMessageRelativeTime(now - 3 * 86400_000, now)).toBe("3d ago");
  });
});

/* ------------------------------------------------------------------ */

describe("QueuedMessages steer", () => {
  it("adds a Steer action next to Send now", async () => {
    const onSteer = vi.fn();
    const onSendNow = vi.fn();
    const { container } = render(
      <QueuedMessages items={[{ id: "a", text: "Use pnpm instead" }]} onSteer={onSteer} onSendNow={onSendNow} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Steer" }));
    expect(onSteer).toHaveBeenCalledWith("a");
    expect(onSendNow).not.toHaveBeenCalled();
    fireEvent.focus(screen.getByRole("button", { name: "Steer" }));
    expect((await screen.findAllByText(/without stopping/)).length).toBeGreaterThan(0);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("omits Steer when onSteer is unset", () => {
    render(<QueuedMessages items={[{ id: "a", text: "x" }]} onSendNow={() => {}} />);
    expect(screen.queryByRole("button", { name: "Steer" })).toBeNull();
  });
});

describe("PromptInput large paste", () => {
  const paste = (el: HTMLElement, text: string) =>
    fireEvent.paste(el, { clipboardData: { files: [], getData: (t: string) => (t === "text/plain" ? text : "") } });

  it("routes long pastes to onLargePaste and undoes inline", async () => {
    vi.useFakeTimers();
    const onLargePaste = vi.fn();
    const onLargePasteUndo = vi.fn();
    const big = "x".repeat(3500);
    const { container } = render(
      <PromptInput largePasteThreshold={3000} onLargePaste={onLargePaste} onLargePasteUndo={onLargePasteUndo}>
        <PromptInputTextarea />
      </PromptInput>
    );
    const ta = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement;
    paste(ta, "short");
    expect(onLargePaste).not.toHaveBeenCalled();
    paste(ta, big);
    expect(onLargePaste).toHaveBeenCalledWith(big);
    expect(ta.value).toBe("");
    expect(screen.getByRole("status")).toHaveTextContent("Pasted 3,500 characters as an attachment");
    vi.useRealTimers();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Paste inline" }));
    expect(ta.value).toBe(big);
    expect(onLargePasteUndo).toHaveBeenCalledWith(big, undefined);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("falls back to onFilesAdded with a .txt File and auto-hides the notice", () => {
    vi.useFakeTimers();
    const onFilesAdded = vi.fn();
    render(
      <PromptInput largePasteThreshold={10} onFilesAdded={onFilesAdded} largePasteNoticeDuration={1000}>
        <PromptInputTextarea />
      </PromptInput>
    );
    paste(screen.getByRole("textbox"), "this is more than ten characters");
    const file = onFilesAdded.mock.calls[0][0][0] as File;
    expect(file.name).toMatch(/\.txt$/);
    expect(file.type).toBe("text/plain");
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1100));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("is off by default", () => {
    const onFilesAdded = vi.fn();
    render(
      <PromptInput onFilesAdded={onFilesAdded}>
        <PromptInputTextarea />
      </PromptInput>
    );
    paste(screen.getByRole("textbox"), "y".repeat(10000));
    expect(onFilesAdded).not.toHaveBeenCalled();
  });
});

describe("PromptInputRestoredDraft", () => {
  it("Discard clears the composer, Keep dismisses", async () => {
    const onDiscard = vi.fn();
    const { container, unmount } = render(
      <PromptInput defaultValue="half-written idea">
        <PromptInputRestoredDraft savedAt="2h ago" onDiscard={onDiscard} />
        <PromptInputTextarea />
      </PromptInput>
    );
    expect(screen.getByRole("status")).toHaveTextContent("Restored your unsent draft");
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onDiscard).toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.queryByRole("status")).toBeNull();
    unmount();

    const onKeep = vi.fn();
    render(<PromptInputRestoredDraft onKeep={onKeep} />);
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(onKeep).toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */

describe("ApprovalStack", () => {
  const items = ["Run npm test", "Write package.json", "Fetch example.com", "Delete tmp/"];
  it("shows count, navigates with buttons and keys", async () => {
    const onApproveAll = vi.fn();
    const { container } = render(
      <ApprovalStack
        items={items}
        onApproveAll={onApproveAll}
        renderItem={(item, { index, total }) => (
          <div>
            <p>{item}</p>
            <span>
              {index + 1}/{total}
            </span>
          </div>
        )}
      />
    );
    const region = screen.getByRole("region", { name: "Pending approvals" });
    expect(region).toHaveTextContent("Approval 1 of 4");
    expect(region).toHaveTextContent("+3 more");
    expect(screen.getByText("Run npm test")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-slot=approval-stack-shell]")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Previous approval" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next approval" }));
    expect(screen.getByText("Write package.json")).toBeInTheDocument();
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(screen.getByText("Fetch example.com")).toBeInTheDocument();
    fireEvent.keyDown(region, { key: "ArrowRight" });
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(region).toHaveTextContent("Approval 4 of 4");
    expect(screen.getByRole("button", { name: "Next approval" })).toBeDisabled();
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(screen.getByText("Fetch example.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve all" }));
    expect(onApproveAll).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("renders the empty slot when there are no items", () => {
    render(<ApprovalStack items={[]} renderItem={() => null} empty={<p>All clear</p>} />);
    expect(screen.getByText("All clear")).toBeInTheDocument();
  });
});

describe("SplitButton", () => {
  it("runs the primary action and opens the secondary menu", async () => {
    const onClick = vi.fn();
    const onDraft = vi.fn();
    const { container } = render(
      <SplitButton onClick={onClick} actions={[{ id: "draft", label: "Save as draft", onSelect: onDraft }]}>
        Publish
      </SplitButton>
    );
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(onClick).toHaveBeenCalled();
    openMenu(screen.getByRole("button", { name: "More options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Save as draft" }));
    expect(onDraft).toHaveBeenCalled();
  });
});

describe("FanMenu", () => {
  const items = [
    { id: "dictate", label: "Dictate", icon: <span>D</span> },
    { id: "talk", label: "Talk", icon: <span>T</span> },
    { id: "translate", label: "Translate", icon: <span>L</span>, disabled: true },
    { id: "listen", label: "Listen", icon: <span>H</span> },
  ];
  it("opens as a menu, roves with arrows, selects and closes with Escape", async () => {
    const onSelect = vi.fn();
    const { container } = render(<FanMenu items={items} icon={<span>M</span>} label="Voice modes" onSelect={onSelect} />);
    const hub = screen.getByRole("button", { name: "Voice modes" });
    expect(hub).toHaveAttribute("aria-haspopup", "menu");
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(hub);
    expect(hub).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("menu", { name: "Voice modes" });
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(4);
    expect(document.activeElement).toBe(within(menu).getByRole("menuitem", { name: "Dictate" }));
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement).toHaveAccessibleName("Talk");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement).toHaveAccessibleName("Listen");
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(hub);
    fireEvent.keyDown(hub, { key: "ArrowUp" });
    expect(document.activeElement).toHaveAccessibleName("Listen");
    fireEvent.click(document.activeElement!);
    expect(onSelect).toHaveBeenCalledWith("listen");
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("DecodeText", () => {
  it("exposes the final text as its label and settles on it", async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const { container } = render(<DecodeText text="Hello world" duration={200} interval={20} onComplete={onComplete} />);
    const el = screen.getByLabelText("Hello world");
    act(() => vi.advanceTimersByTime(260));
    expect(el).toHaveTextContent("Hello world");
    expect(el).not.toHaveAttribute("data-decoding");
    expect(onComplete).toHaveBeenCalled();
    vi.useRealTimers();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("hover trigger renders the final text until hovered", () => {
    render(<DecodeText text="Agent" trigger="hover" />);
    expect(screen.getByLabelText("Agent")).toHaveTextContent("Agent");
  });
});

describe("ZoomPan", () => {
  it("zooms with keys and buttons, resets with 0 and double-click", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <ZoomPan label="Diagram" onChange={onChange} className="h-40">
        <svg role="img" aria-label="Boxes" viewBox="0 0 10 10" />
      </ZoomPan>
    );
    const vp = screen.getByRole("group", { name: /Diagram/ });
    expect(vp).toHaveAttribute("data-scale", "1");
    fireEvent.keyDown(vp, { key: "+" });
    expect(vp).toHaveAttribute("data-scale", "1.25");
    expect(screen.getByRole("toolbar", { name: "Zoom controls" })).toHaveTextContent("125%");
    fireEvent.keyDown(vp, { key: "-" });
    fireEvent.keyDown(vp, { key: "-" });
    expect(vp).toHaveAttribute("data-scale", "0.8");
    fireEvent.keyDown(vp, { key: "0" });
    expect(vp).toHaveAttribute("data-scale", "1");
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.keyDown(vp, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith({ scale: 1.25, x: 40, y: 0 });
    fireEvent.doubleClick(vp);
    expect(vp).toHaveAttribute("data-scale", "1");
    for (let i = 0; i < 20; i++) fireEvent.keyDown(vp, { key: "=" });
    expect(vp).toHaveAttribute("data-scale", "4");
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("TabDropdown", () => {
  it("collapses overflowing tabs into More", async () => {
    const desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth")!;
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get(this: HTMLElement) {
        if (this.hasAttribute("data-tab-dropdown-root")) return 330;
        if (this.hasAttribute("data-tab-measure") || this.hasAttribute("data-tab-measure-more")) return 100;
        return 0;
      },
    });
    try {
      const onValueChange = vi.fn();
      const items = ["Overview", "Files", "Activity", "Settings", "Billing"].map((l) => ({ value: l.toLowerCase(), label: l }));
      const { container } = render(<TabDropdown items={items} label="Project" onValueChange={onValueChange} />);
      const list = screen.getByRole("tablist", { name: "Project" });
      expect(within(list).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Overview", "Files"]);
      const more = screen.getByRole("button", { name: "More tabs" });
      expect(more).toHaveTextContent("3");
      expect(await axeViolations(container)).toEqual([]);
      openMenu(more);
      fireEvent.click(screen.getByRole("menuitemradio", { name: "Billing" }));
      expect(onValueChange).toHaveBeenCalledWith("billing");
      expect(screen.getByRole("button", { name: "More tabs, current: Billing" })).toHaveAttribute("data-state", "active");
      fireEvent.keyDown(within(list).getAllByRole("tab")[0], { key: "ArrowRight" });
      expect(onValueChange).toHaveBeenLastCalledWith("files");
    } finally {
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", desc);
    }
  });

  it("shows all tabs when they fit", () => {
    const items = ["A", "B"].map((l) => ({ value: l, label: l }));
    render(<TabDropdown items={items} />);
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /More/ })).toBeNull();
  });
});

describe("GlyphSpinner", () => {
  it("cycles frames with a status label", async () => {
    vi.useFakeTimers();
    const { container } = render(<GlyphSpinner variant="line" interval={100} label="Thinking" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Thinking");
    expect(status).toHaveTextContent(glyphSpinnerFrames.line[0]);
    act(() => vi.advanceTimersByTime(100));
    expect(status).toHaveAttribute("data-frame", "1");
    act(() => vi.advanceTimersByTime(300));
    expect(status).toHaveAttribute("data-frame", "0");
    vi.useRealTimers();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("holds still under reduced motion", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "matchMedia").mockImplementation(
      (q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList
    );
    render(<GlyphSpinner interval={50} />);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole("status")).toHaveAttribute("data-frame", "0");
  });
});

describe("FadeText", () => {
  it("applies the fade only when overflowing", async () => {
    const sw = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(300);
    const cw = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
    const { container, rerender } = render(<FadeText>A very long conversation title that overflows</FadeText>);
    const el = screen.getByText(/A very long/);
    expect(el).toHaveAttribute("data-overflowing");
    expect(el).toHaveAttribute("title", "A very long conversation title that overflows");
    expect(el.style.maskImage || el.getAttribute("style")).toMatch(/linear-gradient/);
    expect(await axeViolations(container)).toEqual([]);
    sw.mockReturnValue(50);
    cw.mockReturnValue(100);
    rerender(<FadeText>Short</FadeText>);
    expect(screen.getByText("Short")).not.toHaveAttribute("data-overflowing");
  });
});

describe("ClarifySettled & UndeliveredNotice", () => {
  it("summarizes answers and expands", async () => {
    const { container } = render(
      <ClarifySettled
        items={[
          { id: "1", question: "Which DB?", answer: "Postgres" },
          { id: "2", question: "Add tests?", answer: "", skipped: true },
        ]}
      />
    );
    const toggle = screen.getByRole("button", { name: /Answered 1 question · 1 skipped/ });
    expect(screen.queryByText("Postgres")).toBeNull();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Postgres")).toBeInTheDocument();
    expect(screen.getByText("Skipped")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("retries an undelivered answer", async () => {
    const onRetry = vi.fn();
    const { container } = render(<UndeliveredNotice description="The agent session ended." onRetry={onRetry} onDismiss={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Your answer couldn't be delivered");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });
});

