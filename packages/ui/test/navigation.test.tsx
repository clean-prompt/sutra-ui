import { act, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../src/components/tabs";
import { TabMenu } from "../src/components/tab-menu";
import { Pagination, getPaginationRange, usePagination } from "../src/components/pagination";
import { Breadcrumbs } from "../src/components/breadcrumbs";
import { TreeView, type TreeNode } from "../src/components/tree-view";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "../src/components/sidebar-navigation";
import {
  HeaderNav,
  HeaderNavActions,
  HeaderNavBrand,
  HeaderNavContent,
  HeaderNavItem,
  HeaderNavLink,
  HeaderNavMenu,
  HeaderNavMobile,
  HeaderNavTrigger,
} from "../src/components/header-navigation";
import { PageHeader, SectionHeader } from "../src/components/section-header";
import { axeViolations } from "./a11y";

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

function BasicTabs(props: { onValueChange?: (v: string) => void }) {
  return (
    <Tabs defaultValue="one" onValueChange={props.onValueChange}>
      <TabsList aria-label="Example tabs">
        <TabsTrigger value="one">One</TabsTrigger>
        <TabsTrigger value="two" badge={3}>
          Two
        </TabsTrigger>
        <TabsTrigger value="three">Three</TabsTrigger>
      </TabsList>
      <TabsContent value="one">Panel one</TabsContent>
      <TabsContent value="two">Panel two</TabsContent>
      <TabsContent value="three">Panel three</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("switches panels on click", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<BasicTabs onValueChange={onValueChange} />);
    const one = screen.getByRole("tab", { name: "One" });
    const two = screen.getByRole("tab", { name: /Two/ });
    expect(one).toHaveAttribute("aria-selected", "true");
    expect(two).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel one");

    await user.click(two);
    expect(onValueChange).toHaveBeenCalledWith("two");
    expect(two).toHaveAttribute("aria-selected", "true");
    expect(one).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
  });

  it("moves selection with arrow keys (wrapping)", async () => {
    const user = userEvent.setup();
    render(<BasicTabs />);
    await user.tab();
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /Two/ })).toHaveFocus();
    expect(screen.getByRole("tab", { name: /Two/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel three");
  });

  it("has no axe violations", async () => {
    const { container } = render(<BasicTabs />);
    // Let the indicator's animation-frame state update settle inside act().
    await act(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* TabMenu                                                             */
/* ------------------------------------------------------------------ */

describe("TabMenu", () => {
  const items = [
    { value: "overview", label: "Overview" },
    { value: "activity", label: "Activity", count: 4 },
    { value: "settings", label: "Settings", disabled: true },
  ];

  it("marks the active item with aria-current and switches on click", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TabMenu items={items} onValueChange={onValueChange} />);
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(within(nav).getByRole("button", { name: "Overview" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: /Activity/ }));
    expect(onValueChange).toHaveBeenCalledWith("activity");
    expect(screen.getByRole("button", { name: /Activity/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("ignores disabled items", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TabMenu items={items} onValueChange={onValueChange} />);
    const settings = screen.getByRole("button", { name: "Settings" });
    expect(settings).toBeDisabled();
    await user.click(settings);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("renders links for items with href", () => {
    render(
      <TabMenu
        aria-label="Project"
        value="b"
        items={[
          { value: "a", label: "A", href: "/a" },
          { value: "b", label: "B", href: "/b" },
        ]}
      />
    );
    expect(screen.getByRole("link", { name: "B" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute("href", "/a");
  });

  it("has no axe violations", async () => {
    const { container } = render(<TabMenu items={items} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

describe("getPaginationRange", () => {
  it("returns nothing for zero (or negative) pages", () => {
    expect(getPaginationRange({ page: 1, totalPages: 0 })).toEqual([]);
    expect(getPaginationRange({ page: 1, totalPages: -3 })).toEqual([]);
  });

  it("returns a single page for total 1", () => {
    expect(getPaginationRange({ page: 1, totalPages: 1 })).toEqual([1]);
  });

  it("lists every page without ellipsis when the total fits the slots", () => {
    expect(getPaginationRange({ page: 3, totalPages: 5 })).toEqual([1, 2, 3, 4, 5]);
    expect(getPaginationRange({ page: 1, totalPages: 7 })).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("floors fractional totals", () => {
    expect(getPaginationRange({ page: 1, totalPages: 3.7 })).toEqual([1, 2, 3]);
  });

  it("collapses the end when current is at the start", () => {
    expect(getPaginationRange({ page: 1, totalPages: 10 })).toEqual([1, 2, 3, 4, 5, "ellipsis-end", 10]);
    expect(getPaginationRange({ page: 4, totalPages: 10 })).toEqual([1, 2, 3, 4, 5, "ellipsis-end", 10]);
  });

  it("collapses the start when current is at the end", () => {
    expect(getPaginationRange({ page: 10, totalPages: 10 })).toEqual([1, "ellipsis-start", 6, 7, 8, 9, 10]);
  });

  it("collapses both sides in the middle", () => {
    expect(getPaginationRange({ page: 5, totalPages: 10 })).toEqual([1, "ellipsis-start", 4, 5, 6, "ellipsis-end", 10]);
  });

  it("clamps out-of-range current pages", () => {
    expect(getPaginationRange({ page: 99, totalPages: 10 })).toEqual(getPaginationRange({ page: 10, totalPages: 10 }));
    expect(getPaginationRange({ page: -4, totalPages: 10 })).toEqual(getPaginationRange({ page: 1, totalPages: 10 }));
  });

  it("respects siblingCount and boundaryCount", () => {
    expect(getPaginationRange({ page: 10, totalPages: 20, siblingCount: 2 })).toEqual([
      1,
      "ellipsis-start",
      8,
      9,
      10,
      11,
      12,
      "ellipsis-end",
      20,
    ]);
    expect(getPaginationRange({ page: 10, totalPages: 20, boundaryCount: 2 })).toEqual([
      1,
      2,
      "ellipsis-start",
      9,
      10,
      11,
      "ellipsis-end",
      19,
      20,
    ]);
    expect(getPaginationRange({ page: 10, totalPages: 20, siblingCount: 0 })).toEqual([
      1,
      "ellipsis-start",
      10,
      "ellipsis-end",
      20,
    ]);
  });

  it("always produces a strictly increasing, in-range list with a constant length once collapsed", () => {
    for (let page = 1; page <= 30; page++) {
      const items = getPaginationRange({ page, totalPages: 30 });
      expect(items).toHaveLength(7);
      const nums = items.filter((i): i is number => typeof i === "number");
      expect(nums).toContain(page);
      expect(nums[0]).toBe(1);
      expect(nums[nums.length - 1]).toBe(30);
      for (let i = 1; i < nums.length; i++) expect(nums[i]!).toBeGreaterThan(nums[i - 1]!);
    }
  });
});

describe("usePagination", () => {
  it("memoizes and recomputes on change", () => {
    const { result, rerender } = renderHook((p: { page: number }) => usePagination({ page: p.page, totalPages: 10 }), {
      initialProps: { page: 1 },
    });
    const first = result.current;
    rerender({ page: 1 });
    expect(result.current).toBe(first);
    rerender({ page: 10 });
    expect(result.current).toEqual([1, "ellipsis-start", 6, 7, 8, 9, 10]);
  });
});

describe("Pagination", () => {
  it("navigates with next / prev / page buttons and sets aria-current", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination totalPages={10} onPageChange={onPageChange} />);
    const prev = screen.getByRole("button", { name: "Previous page" });
    const next = screen.getByRole("button", { name: "Next page" });
    expect(prev).toBeDisabled();
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");

    await user.click(next);
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Page 1" })).not.toHaveAttribute("aria-current");
    expect(prev).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Page 10" }));
    expect(onPageChange).toHaveBeenLastCalledWith(10);
    expect(next).toBeDisabled();

    await user.click(prev);
    expect(onPageChange).toHaveBeenLastCalledWith(9);
  });

  it("does not fire onPageChange when clicking the current page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination totalPages={5} defaultPage={3} onPageChange={onPageChange} />);
    await user.click(screen.getByRole("button", { name: "Page 3" }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("clamps an out-of-range controlled page and disables both nav buttons for a single page", () => {
    const { rerender } = render(<Pagination totalPages={5} page={42} />);
    expect(screen.getByRole("button", { name: "Page 5" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    rerender(<Pagination totalPages={1} page={1} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("disables everything when disabled", () => {
    render(<Pagination totalPages={5} defaultPage={3} disabled />);
    for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled();
  });

  it("dots variant navigates", async () => {
    const user = userEvent.setup();
    render(<Pagination variant="dots" totalPages={4} />);
    await user.click(screen.getByRole("button", { name: "Page 3" }));
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
  });

  it("calls onPageSizeChange from the page size selector", async () => {
    const user = userEvent.setup();
    const onPageSizeChange = vi.fn();
    render(<Pagination totalPages={5} pageSize={10} pageSizeOptions={[10, 25]} onPageSizeChange={onPageSizeChange} />);
    await user.selectOptions(screen.getByRole("combobox", { name: /Rows per page/ }), "25");
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Pagination totalPages={20} defaultPage={10} pageSize={10} pageSizeOptions={[10, 25]} />
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Breadcrumbs                                                         */
/* ------------------------------------------------------------------ */

describe("Breadcrumbs", () => {
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Projects", href: "/projects" },
    { label: "Sutra", href: "/projects/sutra" },
    { label: "Settings", href: "/projects/sutra/settings" },
    { label: "Members" },
  ];

  it("renders every crumb and marks the last as the current page", () => {
    render(<Breadcrumbs items={crumbs} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getAllByRole("link")).toHaveLength(4);
    expect(within(nav).getByText("Members").closest("[aria-current]")).toHaveAttribute("aria-current", "page");
  });

  it("marks the last crumb current even when it has an href", () => {
    render(<Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Docs", href: "/docs" }]} />);
    expect(screen.queryByRole("link", { name: "Docs" })).not.toBeInTheDocument();
    expect(screen.getByText("Docs").closest("[aria-current]")).toHaveAttribute("aria-current", "page");
  });

  it("collapses middle crumbs with maxItems and reveals them in a menu", async () => {
    const user = userEvent.setup();
    render(<Breadcrumbs items={crumbs} maxItems={3} />);
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Projects" })).not.toBeInTheDocument();
    expect(screen.getByText("Members").closest("[aria-current]")).toHaveAttribute("aria-current", "page");

    const more = screen.getByRole("button", { name: "Show 3 more" });
    await user.click(more);
    const menu = await screen.findByRole("menu");
    const hidden = within(menu).getAllByRole("menuitem");
    expect(hidden.map((el) => el.textContent)).toEqual(["Projects", "Sutra", "Settings"]);
    expect(hidden[0]).toHaveAttribute("href", "/projects");
  });

  it("honours itemsBeforeCollapse / itemsAfterCollapse", () => {
    render(<Breadcrumbs items={crumbs} maxItems={4} itemsBeforeCollapse={2} itemsAfterCollapse={1} />);
    expect(screen.getByRole("link", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show 2 more" })).toBeInTheDocument();
  });

  it("does not collapse when within maxItems", () => {
    render(<Breadcrumbs items={crumbs} maxItems={5} />);
    expect(screen.queryByRole("button", { name: /more/ })).not.toBeInTheDocument();
  });

  it("has no axe violations (collapsed, menu open)", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Breadcrumbs items={crumbs} maxItems={3} />);
    expect(await axeViolations(baseElement)).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Show 3 more" }));
    await screen.findByRole("menu");
    expect(await axeViolations(baseElement)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* TreeView                                                            */
/* ------------------------------------------------------------------ */

const treeNodes: TreeNode[] = [
  {
    id: "src",
    label: "src",
    children: [
      { id: "index", label: "index.ts" },
      { id: "utils", label: "utils.ts" },
    ],
  },
  { id: "readme", label: "README.md" },
];

const item = (name: string) => screen.getByRole("treeitem", { name: new RegExp(`^${name.replace(".", "\\.")}`) });

describe("TreeView", () => {
  it("moves focus with ArrowDown / ArrowUp / Home / End", async () => {
    const user = userEvent.setup();
    render(<TreeView aria-label="Files" nodes={treeNodes} defaultExpanded={["src"]} />);
    await user.tab();
    expect(item("src")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("index.ts")).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(item("README.md")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("README.md")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(item("utils.ts")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("src")).toHaveFocus();
    await user.keyboard("{End}");
    expect(item("README.md")).toHaveFocus();
  });

  it("ArrowRight expands then enters, ArrowLeft collapses / goes to parent", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    render(<TreeView aria-label="Files" nodes={treeNodes} onExpandedChange={onExpandedChange} />);
    await user.tab();
    const src = item("src");
    expect(src).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("treeitem", { name: "index.ts" })).not.toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(src).toHaveAttribute("aria-expanded", "true");
    expect(onExpandedChange).toHaveBeenLastCalledWith(["src"]);
    expect(src).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(item("index.ts")).toHaveFocus();
    expect(item("index.ts")).toHaveAttribute("aria-level", "2");

    await user.keyboard("{ArrowLeft}");
    expect(src).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(src).toHaveAttribute("aria-expanded", "false");
    expect(onExpandedChange).toHaveBeenLastCalledWith([]);
  });

  it("selects on click / Enter and fires onNodeAction", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    const onNodeAction = vi.fn();
    render(
      <TreeView aria-label="Files" nodes={treeNodes} onSelectedChange={onSelectedChange} onNodeAction={onNodeAction} />
    );
    await user.click(screen.getByText("README.md"));
    expect(item("README.md")).toHaveAttribute("aria-selected", "true");
    expect(onSelectedChange).toHaveBeenLastCalledWith(["readme"]);
    expect(onNodeAction).toHaveBeenLastCalledWith(expect.objectContaining({ id: "readme" }));

    await user.keyboard("{ArrowUp}{Enter}");
    expect(item("src")).toHaveAttribute("aria-selected", "true");
    expect(item("README.md")).toHaveAttribute("aria-selected", "false");
  });

  it("checking a parent checks every child; checking some children makes the parent mixed", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <TreeView
        aria-label="Files"
        nodes={treeNodes}
        defaultExpanded={["src"]}
        checkable
        onCheckedChange={onCheckedChange}
      />
    );
    await user.tab();
    expect(item("src")).toHaveAttribute("aria-checked", "false");

    // Space on the parent checks it and all descendants.
    await user.keyboard(" ");
    expect(item("src")).toHaveAttribute("aria-checked", "true");
    expect(item("index.ts")).toHaveAttribute("aria-checked", "true");
    expect(item("utils.ts")).toHaveAttribute("aria-checked", "true");
    expect(onCheckedChange).toHaveBeenLastCalledWith(expect.arrayContaining(["src", "index", "utils"]));

    // Unchecking one child makes the parent mixed.
    await user.keyboard("{ArrowDown} ");
    expect(item("index.ts")).toHaveAttribute("aria-checked", "false");
    expect(item("src")).toHaveAttribute("aria-checked", "mixed");
    expect(onCheckedChange).toHaveBeenLastCalledWith(["utils"]);

    // Checking it again makes the parent fully checked.
    await user.keyboard(" ");
    expect(item("src")).toHaveAttribute("aria-checked", "true");

    // Toggling a fully-checked parent unchecks everything.
    await user.keyboard("{ArrowUp} ");
    expect(item("src")).toHaveAttribute("aria-checked", "false");
    expect(item("utils.ts")).toHaveAttribute("aria-checked", "false");
  });

  it("derives mixed state from defaultChecked leaves", () => {
    render(<TreeView aria-label="Files" nodes={treeNodes} defaultExpanded={["src"]} checkable defaultChecked={["utils"]} />);
    expect(item("src")).toHaveAttribute("aria-checked", "mixed");
    expect(item("README.md")).toHaveAttribute("aria-checked", "false");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <TreeView aria-label="Files" nodes={treeNodes} defaultExpanded={["src"]} checkable defaultChecked={["utils"]} />
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

function SidebarHarness(props: { onCollapsedChange?: (c: boolean) => void }) {
  return (
    <SidebarProvider onCollapsedChange={props.onCollapsedChange}>
      <Sidebar aria-label="Main">
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive>Dashboard</SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton badge={3}>Inbox</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger />
      </SidebarInset>
    </SidebarProvider>
  );
}

describe("Sidebar", () => {
  const aside = () => document.querySelector('aside[data-sidebar="sidebar"]')!;

  it("SidebarTrigger toggles collapsed state", async () => {
    const user = userEvent.setup();
    const onCollapsedChange = vi.fn();
    render(<SidebarHarness onCollapsedChange={onCollapsedChange} />);
    const trigger = screen.getByRole("button", { name: "Toggle sidebar" });
    expect(aside()).toHaveAttribute("data-state", "expanded");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(trigger);
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
    expect(aside()).toHaveAttribute("data-state", "collapsed");
    expect(aside()).toHaveAttribute("data-collapsible", "icon");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(aside()).toHaveAttribute("data-state", "expanded");
  });

  it("Ctrl+B and Meta+B toggle collapsed state", async () => {
    const user = userEvent.setup();
    render(<SidebarHarness />);
    await user.keyboard("{Control>}b{/Control}");
    expect(aside()).toHaveAttribute("data-state", "collapsed");
    await user.keyboard("{Meta>}b{/Meta}");
    expect(aside()).toHaveAttribute("data-state", "expanded");
    // Plain "b" does nothing.
    await user.keyboard("b");
    expect(aside()).toHaveAttribute("data-state", "expanded");
  });

  it("marks the active menu button with aria-current", () => {
    render(<SidebarHarness />);
    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /Inbox/ })).not.toHaveAttribute("aria-current");
  });

  it("has no axe violations", async () => {
    const { container } = render(<SidebarHarness />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* HeaderNavigation                                                    */
/* ------------------------------------------------------------------ */

function HeaderHarness() {
  return (
    <HeaderNav>
      <HeaderNavBrand href="/">Sutra</HeaderNavBrand>
      <HeaderNavMenu aria-label="Main">
        <HeaderNavItem>
          <HeaderNavTrigger>Products</HeaderNavTrigger>
          <HeaderNavContent>
            <HeaderNavLink variant="panel" href="/ui">
              UI kit
            </HeaderNavLink>
          </HeaderNavContent>
        </HeaderNavItem>
        <HeaderNavItem>
          <HeaderNavLink href="/pricing">Pricing</HeaderNavLink>
        </HeaderNavItem>
      </HeaderNavMenu>
      <HeaderNavActions>
        <HeaderNavMobile
          items={[
            // Hash links: jsdom does not implement full navigation.
            { label: "Pricing", href: "#pricing" },
            { label: "Products", children: [{ label: "UI kit", href: "#ui" }] },
          ]}
        />
      </HeaderNavActions>
    </HeaderNav>
  );
}

describe("HeaderNavigation", () => {
  it("renders a banner with brand and links", () => {
    render(<HeaderHarness />);
    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("link", { name: "Sutra" })).toHaveAttribute("href", "/");
    expect(within(banner).getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
  });

  it("opens a mega-menu panel from the trigger", async () => {
    const user = userEvent.setup();
    render(<HeaderHarness />);
    const trigger = screen.getByRole("button", { name: "Products" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByRole("link", { name: "UI kit" })).toHaveAttribute("href", "/ui");
  });

  it("mobile menu opens a dialog, expands sections, and closes on link click", async () => {
    const user = userEvent.setup();
    render(<HeaderHarness />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Products" }));
    expect(within(dialog).getByRole("link", { name: "UI kit" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("link", { name: "Pricing" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mobile menu closes with the close button", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<HeaderNavMobile items={[{ label: "Home", href: "/" }]} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.click(await screen.findByRole("button", { name: "Close menu" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has no axe violations (closed and mobile open)", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<HeaderHarness />);
    expect(await axeViolations(baseElement)).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await screen.findByRole("dialog");
    expect(await axeViolations(baseElement)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* SectionHeader                                                       */
/* ------------------------------------------------------------------ */

describe("SectionHeader", () => {
  it("renders heading level, eyebrow, description, actions and tabs", () => {
    render(
      <SectionHeader
        as="h3"
        eyebrow="Team"
        title="Members"
        description="Manage who has access."
        actions={<button type="button">Invite</button>}
        tabs={<span>Tabs slot</span>}
      />
    );
    expect(screen.getByRole("heading", { level: 3, name: "Members" })).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Manage who has access.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite" })).toBeInTheDocument();
    expect(screen.getByText("Tabs slot")).toBeInTheDocument();
  });

  it("defaults to h2", () => {
    render(<SectionHeader title="Overview" />);
    expect(screen.getByRole("heading", { level: 2, name: "Overview" })).toBeInTheDocument();
  });

  it("PageHeader renders an h1 and a back button", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<PageHeader title="Settings" onBack={onBack} breadcrumbs={<Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Settings" }]} />} />);
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <PageHeader title="Settings" onBack={() => {}} description="Workspace settings" />
        <SectionHeader title="Members" eyebrow="Team" actions={<button type="button">Invite</button>} divider />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
