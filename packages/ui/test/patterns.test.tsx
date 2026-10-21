import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlogContent, BlogTableOfContents } from "../src/patterns/blog-content";
import { DecodeText } from "../src/patterns/decode-text";
import { FadeText } from "../src/patterns/fade-text";
import { FanMenu } from "../src/patterns/fan-menu";
import { SparkBar, Sparkline } from "../src/patterns/sparkline";
import { ZoomPan } from "../src/patterns/zoom-pan";
import { axeViolations } from "./helpers/a11y";

/* Patterns that have no page-specific test file of their own. */

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Sparkline", () => {
  it("is an image labelled with the trend and draws one line path", async () => {
    const { container } = render(<Sparkline data={[3, 5, 4, 9]} />);
    const img = screen.getByRole("img", { name: "Trend from 3 to 9" });
    expect(img.querySelectorAll("path")).toHaveLength(1);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("adds a filled area for type=area and honours a custom label", () => {
    render(<Sparkline type="area" data={[1, 2]} label="Requests per minute" />);
    const img = screen.getByRole("img", { name: "Requests per minute" });
    expect(img.querySelectorAll("path")).toHaveLength(2);
    expect(img.querySelector("linearGradient")).not.toBeNull();
  });

  it("renders an empty, labelled chart without data and delegates type=bar to SparkBar", () => {
    const { rerender } = render(<Sparkline data={[]} />);
    expect(screen.getByRole("img", { name: "No data" }).querySelector("path")).toBeNull();
    rerender(<Sparkline type="bar" data={[1, 2, 3]} />);
    expect(screen.getByRole("img", { name: "3 values, latest 3" }).querySelectorAll("rect")).toHaveLength(3);
  });
});

describe("SparkBar", () => {
  it("draws one bar per value and fades all but the last when highlightLast is on", () => {
    render(<SparkBar data={[4, 8, 2, 6]} highlightLast color="#ff0000" />);
    const bars = Array.from(screen.getByRole("img", { name: "4 values, latest 6" }).querySelectorAll("rect"));
    expect(bars).toHaveLength(4);
    expect(bars[3]!.style.fill).toBe("#ff0000");
    expect(bars[0]!.style.fill).toContain("color-mix");
  });
});

describe("BlogContent", () => {
  it("renders prose as the requested element with headings and links", async () => {
    const { container } = render(
      <BlogContent as="article" size="lg" aria-label="Post">
        <h2>Why local-first</h2>
        <p>
          Read the <a href="/docs">docs</a>.
        </p>
      </BlogContent>
    );
    const article = screen.getByRole("article", { name: "Post" });
    expect(within(article).getByRole("heading", { level: 2, name: "Why local-first" })).toBeInTheDocument();
    expect(within(article).getByRole("link", { name: "docs" })).toHaveAttribute("href", "/docs");
    expect(article).toHaveClass("text-lg");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("table of contents marks the clicked heading as current", async () => {
    const user = userEvent.setup();
    render(
      <>
        <BlogTableOfContents
          headings={[
            { id: "intro", title: "Intro" },
            { id: "setup", title: "Setup", level: 3 },
          ]}
        />
        <h2 id="intro">Intro</h2>
        <h3 id="setup">Setup</h3>
      </>
    );
    const nav = screen.getByRole("navigation", { name: "Table of contents" });
    expect(within(nav).getByRole("link", { name: "Intro" })).toHaveAttribute("aria-current", "location");
    await user.click(within(nav).getByRole("link", { name: "Setup" }));
    expect(within(nav).getByRole("link", { name: "Setup" })).toHaveAttribute("aria-current", "location");
    expect(within(nav).getByRole("link", { name: "Intro" })).not.toHaveAttribute("aria-current");
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
