import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DividedGrid, DividedGridItem, type DividedGridItemData } from "../src/patterns/divided-grid";
import { axeViolations } from "./a11y";

const Icon = () => <svg data-testid="icon" />;

const tools: DividedGridItemData[] = [
  { id: "merge", title: "Merge files", description: "Combine PDFs.", icon: <Icon />, href: "/merge", meta: "Up to 20 files" },
  { id: "split", title: "Split pages", description: "Pull out a range.", href: "/split", badge: "New" },
  { id: "rotate", title: "Rotate", description: "Turn pages." },
];

const busy = (c: HTMLElement) => c.querySelector('[aria-busy="true"]');

describe("DividedGrid structure", () => {
  it("renders a named list with one item per cell", () => {
    render(
      <DividedGrid label="File tools">
        {tools.map(({ id, ...tool }) => (
          <DividedGridItem key={id} {...tool} />
        ))}
      </DividedGrid>
    );
    const list = screen.getByRole("list", { name: "File tools" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });

  it("takes data through `items` and mixes it with children", () => {
    render(
      <DividedGrid label="Tools" items={tools.slice(0, 2)}>
        <DividedGridItem title="From children" />
      </DividedGrid>
    );
    const rows = within(screen.getByRole("list", { name: "Tools" })).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining("Merge files"), expect.stringContaining("Split pages"), "From children"]);
  });

  it("numbers the cells in order and hides the numbers from assistive tech", () => {
    const { container } = render(<DividedGrid items={tools} numbered label="Tools" />);
    const numbers = [...container.querySelectorAll('[data-slot="divided-grid-number"]')];
    expect(numbers.map((n) => n.textContent)).toEqual(["01", "02", "03"]);
    expect(numbers.every((n) => n.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(screen.getByRole("link", { name: /Merge files/ })).toHaveAccessibleName(/^Merge files/);
  });

  it("does not number the cells by default, and skips conditional children when counting", () => {
    const { container, rerender } = render(<DividedGrid items={tools} label="Tools" />);
    expect(container.querySelector('[data-slot="divided-grid-number"]')).toBeNull();
    rerender(
      <DividedGrid numbered label="Tools">
        {false}
        <DividedGridItem title="First" />
        {null}
        <DividedGridItem title="Second" />
      </DividedGrid>
    );
    expect([...container.querySelectorAll('[data-slot="divided-grid-number"]')].map((n) => n.textContent)).toEqual(["01", "02"]);
  });

  it("draws the hairlines with a clipped box, a pulled-in grid and cell borders (any item count)", () => {
    const { container } = render(<DividedGrid items={tools} label="Tools" columns={4} />);
    const root = container.firstElementChild!;
    expect(root).toHaveClass("overflow-hidden", "rounded-box", "border");
    const ul = root.querySelector("ul")!;
    expect(ul).toHaveClass("-me-px", "-mb-px", "grid");
    expect(ul.className).toContain("lg:grid-cols-4");
    for (const li of ul.children) expect(li).toHaveClass("border-e", "border-b");
  });

  it("measures its own width with query=container", () => {
    const { container } = render(<DividedGrid items={tools} label="Tools" columns={3} query="container" />);
    expect(container.firstElementChild).toHaveClass("@container");
    expect(container.querySelector("ul")!.className).toContain("@min-[40rem]:grid-cols-3");
  });

  it("clamps long descriptions to three lines and shows a string badge in a Badge", () => {
    const { container } = render(<DividedGrid items={tools} label="Tools" />);
    expect(container.querySelector('[data-slot="divided-grid-description"]')).toHaveClass("line-clamp-3");
    expect(container.querySelector('[data-slot="divided-grid-badge"]')).toHaveTextContent("New");
    expect(screen.getAllByTestId("icon")[0]!.parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps a custom badge node as given", () => {
    render(<DividedGrid label="Tools" items={[{ title: "Pro", badge: <em data-testid="b">Soon</em> }]} />);
    expect(screen.getByTestId("b")).toHaveTextContent("Soon");
  });
});

describe("DividedGridItem kinds", () => {
  it("is a link with `href` and calls onSelect on click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DividedGrid label="Tools">
        <DividedGridItem title="Merge files" description="Combine PDFs." href="#merge" onSelect={onSelect} />
      </DividedGrid>
    );
    const link = screen.getByRole("link", { name: /Merge files/ });
    expect(link).toHaveAttribute("href", "#merge");
    await user.click(link);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("is a button with `onSelect` alone: Enter and Space select it", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DividedGrid label="Tools">
        <DividedGridItem title="Settings" onSelect={onSelect} />
      </DividedGrid>
    );
    const button = screen.getByRole("button", { name: "Settings" });
    expect(button).toHaveAttribute("type", "button");
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("lets a handler stop onSelect by preventing the click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DividedGridItem title="Settings" onSelect={onSelect} onClick={(e) => e.preventDefault()} />);
    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("is static without href or onSelect: no link, no button, not focusable", async () => {
    const user = userEvent.setup();
    render(<DividedGrid label="Tools" items={[{ title: "Rotate", description: "Turn pages." }]} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it("treats an unsafe href as no link", () => {
    render(<DividedGridItem title="Evil" href="javascript:alert(1)" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Evil")).toBeInTheDocument();
  });

  it("disables a button cell: not clickable, not focusable", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DividedGridItem title="Settings" onSelect={onSelect} disabled />);
    const button = screen.getByRole("button", { name: "Settings" });
    expect(button).toBeDisabled();
    await user.click(button);
    await user.tab();
    expect(onSelect).not.toHaveBeenCalled();
    expect(button).not.toHaveFocus();
  });

  it("disables a link cell: announced as a disabled link, no href, not tabbable", async () => {
    const user = userEvent.setup();
    render(<DividedGridItem title="Merge files" href="/merge" disabled />);
    const link = screen.getByRole("link", { name: /Merge files/ });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).not.toHaveAttribute("href");
    await user.tab();
    expect(link).not.toHaveFocus();
  });

  it("marks a static disabled cell with aria-disabled", () => {
    const { container } = render(<DividedGridItem title="Soon" disabled />);
    expect(container.querySelector('[data-slot="divided-grid-cell"]')).toHaveAttribute("aria-disabled", "true");
  });

  it("opens external links safely and passes target and rel on", () => {
    render(<DividedGridItem title="Docs" href="https://example.com" target="_blank" />);
    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer noopener");
  });

  it("hands links to renderLink with the cell's class and content", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const renderLink = vi.fn(({ href, className, children, onClick }: Parameters<NonNullable<React.ComponentProps<typeof DividedGrid>["renderLink"]>>[0]) => (
      <a data-router href={href} className={className} onClick={(e) => { onClick?.(e); e.preventDefault(); }}>
        {children}
      </a>
    ));
    render(
      <DividedGrid label="Tools" renderLink={renderLink}>
        <DividedGridItem title="Merge files" href="/merge" onSelect={onSelect} />
        <DividedGridItem title="Settings" onSelect={() => {}} />
      </DividedGrid>
    );
    const link = screen.getByRole("link", { name: "Merge files" });
    expect(link).toHaveAttribute("data-router");
    expect(link.className).toContain("hover:bg-accent");
    await user.click(link);
    expect(onSelect).toHaveBeenCalled();
    expect(renderLink).toHaveBeenCalled();
    // Buttons never go through renderLink.
    expect(screen.getByRole("button", { name: "Settings" })).not.toHaveAttribute("data-router");
  });

  it("gives interactive cells an inset focus ring and a hover fill", () => {
    render(<DividedGrid label="Tools" items={tools} />);
    const link = screen.getByRole("link", { name: /Merge files/ });
    expect(link.className).toContain("hover:bg-accent");
    expect(link.className).toContain("focus-visible:ring-inset");
  });

  it("forwards the ref and extra props to the cell", () => {
    const ref = React.createRef<HTMLElement>();
    render(<DividedGridItem ref={ref} title="Merge files" href="/merge" data-testid="cell" aria-label="Merge PDFs" />);
    expect(ref.current).toBe(screen.getByTestId("cell"));
    expect(screen.getByRole("link", { name: "Merge PDFs" })).toBe(ref.current);
  });
});

describe("DividedGrid loading and empty states", () => {
  it("shows placeholder cells with one hidden loading text, and never the empty state", () => {
    const { container } = render(<DividedGrid items={[]} loading loadingCells={4} label="File tools" emptyState="Nothing here" />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading File tools…")).toHaveClass("sr-only");
    expect(screen.queryByText("Nothing here")).toBeNull();
    expect(container.querySelector('[data-slot="divided-grid-skeleton"]')!.children).toHaveLength(4);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("falls back to two rows of placeholders and a generic loading text", () => {
    const { container } = render(<DividedGrid loading columns={4} />);
    expect(container.querySelector('[data-slot="divided-grid-skeleton"]')!.children).toHaveLength(8);
    expect(screen.getByText("Loading items…")).toBeInTheDocument();
  });

  it("keeps the cells while refreshing: busy, no placeholders", () => {
    const { container } = render(<DividedGrid items={tools} loading label="Tools" />);
    expect(busy(container)).not.toBeNull();
    expect(screen.getByRole("link", { name: /Merge files/ })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="divided-grid-skeleton"]')).toBeNull();
    expect(screen.queryByText(/^Loading/)).toBeNull();
  });

  it("shows the empty state when there are no cells and nothing is loading", () => {
    const { container } = render(<DividedGrid items={[]} emptyState="No tools match" label="Tools" />);
    expect(screen.getByText("No tools match")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="divided-grid-empty"]')).not.toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
    expect(busy(container)).toBeNull();
  });

  it("has a default empty text", () => {
    render(<DividedGrid />);
    expect(screen.getByText("No items")).toBeInTheDocument();
  });

  it("renders the same markup with loading={false} as without the prop", () => {
    for (const make of [
      (extra: object) => <DividedGrid items={tools} label="Tools" {...extra} />,
      (extra: object) => <DividedGrid emptyState="None" {...extra} />,
    ]) {
      const { container, unmount } = render(make({}));
      const before = container.innerHTML;
      unmount();
      const second = render(make({ loading: false }));
      expect(second.container.innerHTML).toBe(before);
      expect(busy(second.container)).toBeNull();
      second.unmount();
    }
  });
});

describe("DividedGrid accessibility", () => {
  it("has no axe violations: links, buttons, static and disabled cells", async () => {
    const { container } = render(
      <DividedGrid label="File tools" numbered columns={3}>
        <DividedGridItem title="Merge files" description="Combine PDFs." icon={<Icon />} href="/merge" meta="Up to 20 files" badge="New" />
        <DividedGridItem title="Settings" onSelect={() => {}} />
        <DividedGridItem title="Rotate" description="Turn pages." />
        <DividedGridItem title="Scan" disabled />
        <DividedGridItem title="Send" href="/send" disabled />
      </DividedGrid>
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  it("has no axe violations while loading or empty", async () => {
    const loading = render(<DividedGrid loading label="Tools" />);
    expect(await axeViolations(loading.container)).toEqual([]);
    loading.unmount();
    const empty = render(<DividedGrid emptyState="Nothing" label="Tools" />);
    expect(await axeViolations(empty.container)).toEqual([]);
  });
});
