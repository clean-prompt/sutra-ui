import * as React from "react";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatCard, TopItemCard } from "../src/patterns/stat-card";
import { SettingsGroup, SettingsRow, SettingsSection } from "../src/patterns/settings";
import { PageHeader } from "../src/patterns/section-header";
import { SidebarMenuSub, SidebarProvider, sidebarMenuButtonVariants } from "../src/patterns/sidebar-navigation";
import { FileUploadItem, type UploadFile } from "../src/patterns/file-upload";
import { SchemaForm, type SchemaFormSchema } from "../src/patterns/schema-form";
import { TallyCounter } from "../src/patterns/tally-counter";
import { CoachmarkTour, type CoachmarkStep } from "../src/patterns/coachmarks";
import { AdaptiveTabs, BottomTabBar, BottomTabBarItem } from "../src/patterns/bottom-tab-bar";
import { EmojiReaction } from "../src/assets/emoji-reactions";
import { TreeView, type TreeNode } from "../src/patterns/tree-view";
import { JsonViewer } from "../src/patterns/json-viewer";
import { HeaderNav, HeaderNavContent, HeaderNavItem, HeaderNavLink, HeaderNavMenu, HeaderNavTrigger } from "../src/patterns/header-navigation";

const SRC = path.resolve(__dirname, "../src");
const sources = ["patterns", "assets"].flatMap((dir) =>
  readdirSync(path.join(SRC, dir))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => ({ file: `${dir}/${f}`, text: readFileSync(path.join(SRC, dir, f), "utf8") }))
);
const source = (file: string) => sources.find((s) => s.file === file)!.text;

const Icon = () => <svg aria-hidden viewBox="0 0 1 1" />;

/* ------------------------------------------------------------------ */
/* Hover nudges                                                        */
/* ------------------------------------------------------------------ */

describe("hover nudges", () => {
  it("StatCard: the chevron of an interactive card nudges right with the card", () => {
    const { container } = render(<StatCard label="CPU" value="25" href="/cpu" />);
    const root = container.querySelector('[data-slot="stat-card"]')!;
    const chevron = container.querySelector('[data-slot="stat-chevron"]')!;
    expect(root).toHaveClass("group/stat");
    expect(chevron).toHaveClass("transition-transform", "group-hover/stat:translate-x-0.5");
  });

  it("StatCard: a card that is not interactive is not a hover group (nothing moves)", () => {
    const { container } = render(<StatCard label="CPU" value="25" chevron />);
    expect(container.querySelector('[data-slot="stat-card"]')).not.toHaveClass("group/stat");
  });

  it("TopItemCard: its chevron nudges with the card", () => {
    const { container } = render(<TopItemCard label="Top page" item="/pricing" value="1.2k" onClick={() => {}} />);
    expect(container.querySelector('[data-slot="stat-card"]')).toHaveClass("group/stat");
    expect(container.querySelector('[data-slot="stat-chevron"]')).toHaveClass("group-hover/stat:translate-x-0.5");
  });

  it("SettingsRow nav: the row is a hover group and its chevron nudges", () => {
    render(
      <SettingsSection title="Editor">
        <SettingsGroup>
          <SettingsRow type="nav" title="Font" value="Inter" onClick={() => {}} />
        </SettingsGroup>
      </SettingsSection>
    );
    const row = screen.getByRole("button", { name: /Font/ });
    expect(row).toHaveClass("group/row");
    expect(row.querySelector("svg")).toHaveClass("transition-transform", "group-hover/row:translate-x-0.5");
  });

  it("PageHeader: the back arrow nudges left with its button", () => {
    render(<PageHeader title="Billing" onBack={() => {}} />);
    const back = screen.getByRole("button", { name: "Back" });
    expect(back).toHaveClass("group/back");
    expect(back.querySelector("svg")).toHaveClass("transition-transform", "group-hover/back:-translate-x-0.5");
  });
});

/* ------------------------------------------------------------------ */
/* Consistency swaps                                                   */
/* ------------------------------------------------------------------ */

describe("sidebar active state", () => {
  it("fades the active shadow and ring along with the fill", () => {
    const cls = sidebarMenuButtonVariants();
    expect(cls).toMatch(/transition-\[[^\]]*background-color[^\]]*box-shadow[^\]]*\]/);
    expect(cls).toContain("data-[active=true]:shadow-xs");
    expect(cls).toContain("data-[active=true]:ring-1");
  });
});

describe("chevrons turn with the shared utility", () => {
  it("SidebarMenuSub", () => {
    const { container } = render(
      <SidebarProvider>
        <SidebarMenuSub label="Projects" />
      </SidebarProvider>
    );
    const chevron = container.querySelector("button svg:last-of-type")!;
    expect(chevron).toHaveClass("chevron-turn", "group-data-[state=open]/menu-sub:rotate-90");
    expect(chevron.getAttribute("class")).not.toMatch(/duration-|ease-/);
  });

  it("TreeView", () => {
    const nodes: TreeNode[] = [{ id: "src", label: "src", children: [{ id: "a", label: "a.ts" }] }];
    render(<TreeView aria-label="Files" nodes={nodes} defaultExpanded={["src"]} />);
    const row = screen.getByRole("treeitem", { name: /^src/ });
    const chevron = row.querySelector("span[aria-hidden] > svg")!;
    expect(chevron).toHaveClass("chevron-turn", "rotate-90");
    expect(chevron.getAttribute("class")).not.toMatch(/duration-|ease-/);
  });

  it("JsonViewer", () => {
    render(<JsonViewer data={{ a: { b: 1 } }} />);
    const toggle = document.querySelector("button[aria-expanded]")!;
    expect(toggle.querySelector("svg")).toHaveClass("chevron-turn");
    expect(toggle.querySelector("svg")!.getAttribute("class")).not.toMatch(/duration-|ease-|\btransition-transform\b/);
  });

  it("HeaderNavTrigger", () => {
    render(
      <HeaderNav>
        <HeaderNavMenu aria-label="Main">
          <HeaderNavItem>
            <HeaderNavTrigger>Products</HeaderNavTrigger>
            <HeaderNavContent>
              <HeaderNavLink variant="panel" href="/ui">
                UI kit
              </HeaderNavLink>
            </HeaderNavContent>
          </HeaderNavItem>
        </HeaderNavMenu>
      </HeaderNav>
    );
    const chevron = screen.getByRole("button", { name: "Products" }).querySelector("svg")!;
    expect(chevron).toHaveClass("chevron-turn", "group-data-[state=open]/nav:rotate-180");
  });

  it("no rotating chevron in patterns/ or assets/ keeps its own transition", () => {
    const own = sources.flatMap(({ file, text }) =>
      text.split("\n").flatMap((line, i) => {
        if (!/\b(group-data-\[state=open\][^ "]*:)?rotate-(90|180)\b/.test(line)) return [];
        // Rotation of a static or custom-engine element (the theme toggle) is not a disclosure chevron.
        if (file === "patterns/theme-toggle.tsx" || /-rotate-90/.test(line) || /\brotate-0\b/.test(line)) return [];
        return /chevron-turn/.test(line) ? [] : [`${file}:${i + 1}`];
      })
    );
    expect(own).toEqual([]);
  });

  it("sources of the touched chevrons use chevron-turn and no per-site transition", () => {
    for (const file of ["patterns/header-navigation.tsx", "patterns/sidebar-navigation.tsx", "patterns/tree-view.tsx", "patterns/json-viewer.tsx"]) {
      expect(source(file), file).toContain("chevron-turn");
    }
    // the mobile header section chevron
    expect(source("patterns/header-navigation.tsx")).toMatch(/chevron-turn group-data-\[state=open\]\/mobile-section:rotate-180/);
  });
});

describe("one scale, one ease in patterns/ and assets/", () => {
  it("has no cubic-bezier or ease-[ literal", () => {
    const hits = sources.filter(({ text }) => /cubic-bezier\(|ease-\[/.test(text)).map((s) => s.file);
    expect(hits).toEqual([]);
  });

  it("takes plain ease-out only where a chart runs its own engine", () => {
    const hits = sources.filter(({ text }) => /\bease-out(?!-)/.test(text)).map((s) => s.file).sort();
    expect(hits).toEqual(["patterns/chart-cartesian-internal.tsx", "patterns/chart-donut.tsx"]);
  });

  it("uses the 150 / 200 / 300 / 500 scale (tiling drag zone keeps 100)", () => {
    const odd = sources.flatMap(({ file, text }) =>
      [...text.matchAll(/\bduration-(\d+)\b/g)].filter((m) => !["150", "200", "300", "500"].includes(m[1]!)).map((m) => `${file}: duration-${m[1]}`)
    );
    expect(odd).toEqual(["patterns/tiling-layout-group-internal.tsx: duration-100"]);
  });

  it("the tree row hover is on the 150 ms step", () => {
    expect(source("patterns/tree-view.tsx")).not.toContain("duration-100");
  });

  it("the notice dots tween width and opacity, not everything", () => {
    expect(source("patterns/notice-bar.tsx")).toContain("transition-[width,opacity]");
    expect(source("patterns/notice-bar.tsx")).not.toContain("transition-all");
  });

  it("the coachmark card glides on the shared ease", () => {
    expect(source("patterns/coachmarks.tsx")).toContain("transition-[top,left] duration-200 ease-out-quart");
  });

  it("the loading-screen shake reads the shared ease token instead of a literal curve", () => {
    expect(source("patterns/loading-screen.tsx")).toContain('getPropertyValue("--sutra-ease")');
  });
});

/* ------------------------------------------------------------------ */
/* Pops on change, never on first render                               */
/* ------------------------------------------------------------------ */

describe("FileUploadItem tick", () => {
  const file = new File(["x"], "a.txt", { type: "text/plain" });
  const item = (status: UploadFile["status"]): UploadFile => ({ id: "1", file, status });
  const tick = () => screen.getByLabelText("Uploaded");

  it("does not pop for a row that is already complete when it first renders", () => {
    render(<FileUploadItem file={item("succeeded")} hideRemove />);
    expect(tick()).not.toHaveClass("animate-pop");
  });

  it("pops when the upload finishes", () => {
    const { rerender } = render(<FileUploadItem file={{ ...item("uploading"), progress: 80 }} hideRemove />);
    expect(screen.queryByLabelText("Uploaded")).toBeNull();
    rerender(<FileUploadItem file={item("succeeded")} hideRemove />);
    expect(tick()).toHaveClass("animate-pop");
  });
});

describe("SchemaForm saved tick", () => {
  const schema: SchemaFormSchema = { type: "object", properties: { port: { type: "integer", default: 8080 } } };

  it("pops the check when a field is saved", async () => {
    vi.useFakeTimers();
    try {
      render(<SchemaForm schema={schema} defaultValue={{ port: 8080 }} autosave autosaveDelay={100} onSave={async () => {}} />);
      fireEvent.change(screen.getByLabelText(/^Port/), { target: { value: "9000" } });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      const saved = document.querySelector('[data-save-status="saved"]')!;
      expect(saved).toHaveTextContent("Saved");
      expect(saved.querySelector("svg")).toHaveClass("animate-pop");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("TallyCounter tick", () => {
  const valueEl = () => document.querySelector("[data-tally-value]") as HTMLElement;
  const inner = () => valueEl().firstElementChild as HTMLElement;

  it("does not tick on first render, and keeps the value on the <output>", () => {
    render(<TallyCounter defaultValue={5} />);
    expect(valueEl().tagName).toBe("OUTPUT");
    expect(valueEl()).toHaveTextContent("5");
    expect(inner()).not.toHaveClass("animate-tick");
    expect(valueEl()).not.toHaveClass("animate-tick");
  });

  it("slides the new number up when it changes (on an inline-block span inside the output)", () => {
    render(<TallyCounter defaultValue={5} />);
    const before = inner();
    fireEvent.click(screen.getByRole("button", { name: "Increase by 1" }));
    expect(valueEl()).toHaveTextContent("6");
    expect(inner()).toHaveClass("animate-tick", "inline-block");
    expect(inner()).not.toBe(before); // keyed: the animation restarts on every change
    fireEvent.click(screen.getByRole("button", { name: "Decrease by 1" }));
    expect(valueEl()).toHaveTextContent("5");
    expect(inner()).toHaveClass("animate-tick");
  });

  it("stays still while a hold repeats every 90 ms, ticks again on the next click", () => {
    vi.useFakeTimers();
    try {
      render(<TallyCounter defaultValue={0} />);
      const plus = screen.getByRole("button", { name: "Increase by 1" });
      fireEvent.pointerDown(plus, { button: 0 });
      act(() => vi.advanceTimersByTime(450 + 90 * 3));
      expect(Number(valueEl().textContent)).toBeGreaterThan(2);
      expect(inner()).not.toHaveClass("animate-tick");
      fireEvent.pointerUp(plus);
      fireEvent.click(plus); // the click that ends a hold is swallowed
      expect(inner()).not.toHaveClass("animate-tick");
      fireEvent.click(plus);
      expect(inner()).toHaveClass("animate-tick");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("CoachmarkTour step text", () => {
  const steps: CoachmarkStep[] = [
    { title: "Search", body: "Find anything." },
    { title: "Create", body: "Make something." },
  ];

  it("fades in when the step changes, not when the tour opens", () => {
    render(<CoachmarkTour defaultOpen steps={steps} />);
    expect(screen.getByRole("heading", { name: "Search" })).not.toHaveClass("animate-fade-in");
    expect(screen.getByText("Find anything.")).not.toHaveClass("animate-fade-in");
    const first = screen.getByRole("heading", { name: "Search" });
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    const second = screen.getByRole("heading", { name: "Create" });
    expect(second).toHaveClass("animate-fade-in");
    expect(second).not.toBe(first);
    expect(screen.getByText("Make something.")).toHaveClass("animate-fade-in");
    // the dialog is still labelled by the (re-created) title
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby", second.id);
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: "Search" })).toHaveClass("animate-fade-in");
  });
});

describe("tab badges", () => {
  it("BottomTabBar: a count pops when it changes and a dot pops when it appears, never on mount", () => {
    const bar = (inbox: number | boolean | undefined) => (
      <BottomTabBar defaultValue="home" aria-label="Sections">
        <BottomTabBarItem value="home" label="Home" icon={<Icon />} />
        <BottomTabBarItem value="inbox" label="Inbox" icon={<Icon />} badge={inbox} />
      </BottomTabBar>
    );
    const { container, rerender } = render(bar(3));
    const count = () => container.querySelector('[data-slot="badge-count"]')!;
    expect(count()).toHaveTextContent("3");
    expect(count()).not.toHaveClass("animate-pop");
    rerender(bar(3));
    expect(count()).not.toHaveClass("animate-pop");
    rerender(bar(4));
    expect(count()).toHaveTextContent("4");
    expect(count()).toHaveClass("animate-pop");
    rerender(bar(true));
    expect(container.querySelector('[data-slot="badge-dot"]')).toHaveClass("animate-pop");
    rerender(bar(undefined));
    expect(container.querySelector('[data-slot="badge-dot"]')).toBeNull();
  });

  it("BottomTabBar: a badge present on first render does not pop (dot)", () => {
    const { container } = render(
      <BottomTabBar defaultValue="home" aria-label="Sections">
        <BottomTabBarItem value="home" label="Home" icon={<Icon />} badge />
      </BottomTabBar>
    );
    expect(container.querySelector('[data-slot="badge-dot"]')).not.toHaveClass("animate-pop");
  });

  it("AdaptiveTabs inline pills follow the same rule", () => {
    const tabs = (n: number) => (
      <AdaptiveTabs
        label="Translate"
        items={[
          { value: "text", label: "Text", icon: <Icon />, badge: n },
          { value: "images", label: "Images", icon: <Icon /> },
        ]}
      />
    );
    const { rerender } = render(tabs(2));
    const inline = screen.getByRole("navigation", { name: "Translate" });
    const pill = () => within(inline).getByText("2");
    expect(pill()).not.toHaveClass("animate-pop");
    rerender(tabs(2));
    expect(pill()).not.toHaveClass("animate-pop");
    rerender(tabs(5));
    expect(within(inline).getByText("5")).toHaveClass("animate-pop");
  });
});

describe("EmojiReaction", () => {
  it("pops the emoji when you react, on the shared pop utility, not on mount", () => {
    render(<EmojiReaction emoji="👍" count={2} />);
    const button = screen.getByRole("button");
    const emoji = () => button.querySelector("span.inline-block")!;
    expect(emoji()).not.toHaveClass("animate-pop");
    fireEvent.click(button);
    expect(emoji()).toHaveClass("animate-pop");
    expect(emoji().getAttribute("class")).not.toMatch(/zoom-in-50|duration-|ease-/);
    const popped = emoji();
    fireEvent.click(button);
    expect(emoji()).toBe(popped); // un-reacting keeps the same node, so nothing replays
  });
});

/* ------------------------------------------------------------------ */
/* Drag overlay                                                        */
/* ------------------------------------------------------------------ */

describe("ReorderableList drag overlay", () => {
  it("lifts in with a quick fade and scale, without a transition on the pointer-tracked position", () => {
    const overlay = /pointer-events-none fixed z-50 flex animate-in [^"]*fade-in-0 zoom-in-95/.exec(source("patterns/reorderable-list.tsx"))?.[0];
    expect(overlay).toBeDefined();
    // animate-in already runs 150 ms; a duration-* class would also set transition-duration and make top/left lag the pointer.
    expect(overlay).not.toMatch(/duration-|transition/);
  });
});
