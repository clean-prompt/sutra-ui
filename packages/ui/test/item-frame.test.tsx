import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "../src/primitives/item";
import { Frame, FrameAction, FrameDescription, FrameFooter, FrameHeader, FramePanel, FrameTitle } from "../src/primitives/frame";
import { axeViolations } from "./helpers/a11y";

const row = (n: number) => (
  <Item key={n}>
    <ItemMedia variant="icon">i</ItemMedia>
    <ItemContent>
      <ItemTitle>Row {n}</ItemTitle>
      <ItemDescription>About row {n}</ItemDescription>
    </ItemContent>
    <ItemActions>
      <button type="button">Act {n}</button>
    </ItemActions>
  </Item>
);

describe("Item", () => {
  it("renders media, a text column and actions with their slots", () => {
    const { container } = render(row(1));
    const item = container.querySelector('[data-slot="item"]')!;
    expect(item.tagName).toBe("DIV");
    expect(item).toHaveClass("flex", "min-w-0", "gap-3");
    expect(item).not.toHaveAttribute("role");
    expect(item.querySelector('[data-slot="item-media"]')).toHaveAttribute("data-variant", "icon");
    expect(item.querySelector('[data-slot="item-content"]')).toHaveClass("min-w-0", "flex-1");
    expect(screen.getByText("Row 1")).toHaveAttribute("title", "Row 1");
    expect(screen.getByText("Row 1")).toHaveClass("truncate");
    expect(screen.getByText("About row 1")).toHaveClass("truncate");
    expect(item.querySelector('[data-slot="item-actions"]')).toHaveClass("shrink-0");
  });

  it("supports sizes, variants and orientation", () => {
    const { container } = render(
      <>
        <Item size="sm" variant="outline">a</Item>
        <Item size="xs" variant="muted">b</Item>
        <Item orientation="vertical">c</Item>
      </>
    );
    const [a, b, c] = [...container.querySelectorAll('[data-slot="item"]')];
    expect(a).toHaveClass("gap-2.5", "rounded-box", "border");
    expect(b).toHaveClass("gap-2", "bg-muted/50");
    expect(c).toHaveClass("flex-col", "items-start");
  });

  it("media variants and description lines", () => {
    const { container } = render(
      <>
        <ItemMedia variant="avatar">a</ItemMedia>
        <ItemMedia variant="image">b</ItemMedia>
        <ItemMedia>c</ItemMedia>
        <ItemDescription lines={2}>two lines</ItemDescription>
        <ItemDescription lines="none">free</ItemDescription>
      </>
    );
    const media = [...container.querySelectorAll('[data-slot="item-media"]')];
    expect(media[0]).toHaveClass("rounded-full");
    expect(media[1]).toHaveClass("size-10");
    expect(media[2]).not.toHaveClass("size-9");
    expect(screen.getByText("two lines")).toHaveClass("line-clamp-2");
    expect(screen.getByText("free")).not.toHaveClass("truncate");
    expect(screen.getByText("free")).not.toHaveAttribute("title");
  });

  it("is a link with href: focusable, chevron, disabled state", () => {
    const { rerender } = render(
      <Item href="/a" chevron>
        <ItemContent><ItemTitle>Go</ItemTitle></ItemContent>
      </Item>
    );
    const link = screen.getByRole("link", { name: "Go" });
    expect(link).toHaveAttribute("href", "/a");
    expect(link.querySelector("svg")).not.toBeNull();
    expect(link).toHaveClass("hover:bg-accent", "focus-visible:ring-[3px]");
    rerender(
      <Item href="/a" disabled target="_blank">
        <ItemContent><ItemTitle>Go</ItemTitle></ItemContent>
      </Item>
    );
    const off = screen.getByText("Go").closest("a")!;
    expect(off).not.toHaveAttribute("href");
    expect(off).toHaveAttribute("aria-disabled", "true");
    expect(off).toHaveAttribute("rel", "noreferrer noopener");
  });

  it("is a button with onClick: click and keyboard, disabled blocks it", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(
      <Item onClick={onClick}>
        <ItemContent><ItemTitle>Open</ItemTitle></ItemContent>
      </Item>
    );
    const btn = screen.getByRole("button", { name: "Open" });
    expect(btn).toHaveAttribute("type", "button");
    await user.click(btn);
    btn.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(3);
    rerender(
      <Item onClick={onClick} disabled>
        <ItemContent><ItemTitle>Open</ItemTitle></ItemContent>
      </Item>
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("asChild renders the child as the row", () => {
    render(
      <Item asChild>
        <a href="/router" data-testid="r">Router link</a>
      </Item>
    );
    const el = screen.getByTestId("r");
    expect(el.tagName).toBe("A");
    expect(el).toHaveAttribute("data-slot", "item");
    expect(el).toHaveClass("hover:bg-accent");
  });

  it("forwards ref, className and props", () => {
    const ref = React.createRef<HTMLElement>();
    render(<Item ref={ref} className="x" data-testid="i">a</Item>);
    expect(ref.current).toBe(screen.getByTestId("i"));
    expect(ref.current).toHaveClass("x");
  });
});

describe("ItemGroup", () => {
  it("is a list: static rows are list items, link and button rows sit in a list item wrapper", () => {
    render(
      <ItemGroup variant="outline" divided aria-label="Things">
        {row(1)}
        <Item href="/x"><ItemContent><ItemTitle>Link row</ItemTitle></ItemContent></Item>
        <Item onClick={() => {}}><ItemContent><ItemTitle>Button row</ItemTitle></ItemContent></Item>
      </ItemGroup>
    );
    const list = screen.getByRole("list", { name: "Things" });
    expect(list).toHaveAttribute("data-variant", "outline");
    expect(list).toHaveClass("rounded-box", "divide-y");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getByRole("link", { name: "Link row" })).toBeInTheDocument();
    expect(within(list).getByRole("button", { name: "Button row" })).toBeInTheDocument();
  });

  it("separator is presentational", () => {
    const { container } = render(
      <ItemGroup>
        {row(1)}
        <ItemSeparator />
        {row(2)}
      </ItemGroup>
    );
    expect(container.querySelector('[data-slot="item-separator"]')).toHaveAttribute("role", "presentation");
  });

  it("loading shows placeholder rows and no children; empty shows the empty state", () => {
    const { rerender } = render(
      <ItemGroup loading loadingRows={4} aria-label="Rows">
        {row(1)}
      </ItemGroup>
    );
    const list = screen.getByRole("list", { name: "Rows" });
    expect(list).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Row 1")).toBeNull();
    expect(list.querySelectorAll('[data-slot="item"]')).toHaveLength(4);
    rerender(<ItemGroup emptyState="No rows" aria-label="Rows">{[]}</ItemGroup>);
    expect(screen.getByText("No rows")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toBeInTheDocument();
    rerender(<ItemGroup aria-label="Rows">{[]}</ItemGroup>);
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  it("has no axe violations (static, interactive, loading, empty)", async () => {
    const { container, rerender } = render(
      <ItemGroup variant="outline" aria-label="Things">
        {row(1)}
        <ItemSeparator />
        <Item href="/x" chevron><ItemContent><ItemTitle>Link row</ItemTitle></ItemContent></Item>
        <Item onClick={() => {}}><ItemContent><ItemTitle>Button row</ItemTitle></ItemContent></Item>
      </ItemGroup>
    );
    expect(await axeViolations(container)).toEqual([]);
    rerender(<ItemGroup loading aria-label="Things" />);
    expect(await axeViolations(container)).toEqual([]);
    rerender(<ItemGroup aria-label="Things" emptyState="Nothing" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Frame", () => {
  it("builds a header, a panel of rows and a footer, per variant", () => {
    const { container, rerender } = render(
      <Frame>
        <FrameHeader>
          <FrameTitle>Devices</FrameTitle>
          <FrameAction><button type="button">Add</button></FrameAction>
          <FrameDescription>Signed-in devices</FrameDescription>
        </FrameHeader>
        <FramePanel aria-label="Devices">{row(1)}{row(2)}</FramePanel>
        <FrameFooter>2 devices</FrameFooter>
      </Frame>
    );
    expect(screen.getByRole("heading", { level: 3, name: "Devices" })).toBeInTheDocument();
    const panel = screen.getByRole("list", { name: "Devices" });
    expect(panel).toHaveClass("divide-y");
    expect(within(panel).getAllByRole("listitem")).toHaveLength(2);
    expect(container.firstElementChild).toHaveAttribute("data-variant", "default");
    expect(container.firstElementChild).toHaveClass("rounded-box", "p-1");
    expect(panel.className).toContain("group-data-[variant=default]/frame:rounded-[calc(var(--radius-box)-0.25rem)]");
    for (const v of ["band", "inset", "plain"] as const) {
      rerender(<Frame variant={v}><FramePanel>{row(1)}</FramePanel></Frame>);
      expect(container.firstElementChild).toHaveAttribute("data-variant", v);
    }
  });

  it("title element is configurable, panel dividers optional", () => {
    render(
      <Frame>
        <FrameHeader><FrameTitle as="h2">Top</FrameTitle></FrameHeader>
        <FramePanel divided={false} aria-label="P">{row(1)}</FramePanel>
      </Frame>
    );
    expect(screen.getByRole("heading", { level: 2, name: "Top" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "P" })).not.toHaveClass("divide-y");
  });

  it("panel loading and empty states", () => {
    const { rerender } = render(<Frame><FramePanel loading loadingRows={2} aria-label="P" /></Frame>);
    expect(screen.getByRole("list", { name: "P" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    rerender(<Frame><FramePanel emptyState="Nothing here" aria-label="P">{[]}</FramePanel></Frame>);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("forwards refs and has no axe violations", async () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(
      <Frame ref={ref} variant="band">
        <FrameHeader><FrameTitle>Title</FrameTitle></FrameHeader>
        <FramePanel aria-label="Rows">{row(1)}</FramePanel>
        <FrameFooter>Footer</FrameFooter>
      </Frame>
    );
    expect(ref.current).toBe(container.firstElementChild);
    expect(await axeViolations(container)).toEqual([]);
  });
});
