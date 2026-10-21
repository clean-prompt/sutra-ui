import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveVisitorsMap, type LiveVisitor, type LiveVisitorsMapProps } from "../src/entries/geo";
import { axeViolations } from "./helpers/a11y";

const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);
const Icon = () => <svg data-testid="src-icon" />;
const google = { id: "google", label: "Google", icon: <Icon />, color: "#4285f4" };
const github = { id: "github", label: "GitHub", icon: <Icon /> };

/* Default globe view centres 10° E, 20° N: London and Lagos face the viewer, Sydney is on the far side. */
const visitors: LiveVisitor[] = [
  { id: "ana", name: "Ana Lima", point: { lat: 51.5, lng: -0.13 }, city: "London", country: "GB", source: google, page: "/pricing", device: "phone", os: "iOS", browser: "Safari", lastSeen: NOW - 5_000, loadTime: 1240 },
  { id: "ben", point: [3.38, 6.52], city: "Lagos", country: "NG", source: github, page: "/docs", device: "desktop", lastSeen: NOW - 70_000 },
  { id: "cleo", name: "Cleo Park", point: { lat: -33.87, lng: 151.21 }, city: "Sydney", country: "AU", source: "Newsletter", page: "/", device: "tablet", lastSeen: NOW - 180_000 },
  { id: "dev", point: { lat: 48.86, lng: 2.35 }, city: "Paris", country: "FR", source: google, lastSeen: NOW - 20_000 },
];

let clock = 0;
let frames = new Map<number, FrameRequestCallback>();
let nextFrame = 1;
beforeEach(() => {
  clock = 0;
  frames = new Map();
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    const id = nextFrame++;
    frames.set(id, cb);
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => void frames.delete(id));
});
afterEach(() => vi.restoreAllMocks());

function advance(ms: number) {
  const end = clock + ms;
  while (clock < end) {
    clock += 16;
    const due = [...frames.values()];
    frames.clear();
    act(() => due.forEach((cb) => cb(clock)));
  }
}

const renderMap = (props: Partial<LiveVisitorsMapProps> = {}) => render(<LiveVisitorsMap visitors={visitors} now={NOW} autoRotate={false} {...props} />);
const list = () => screen.getByRole("listbox", { name: "Visitors" });
const row = (name: RegExp) => within(list()).getByRole("option", { name });
const marker = (name: RegExp) => screen.queryAllByRole("button", { name }).find((b) => b.getAttribute("data-slot") === "geo-marker") ?? null;
const card = () => screen.queryByRole("region", { name: /^Visitor details/ });

describe("LiveVisitorsMap: header and list", () => {
  it("shows the live, country and source counts and the window text", () => {
    renderMap({ windowLabel: "Last 30 minutes" });
    const header = screen.getByRole("region", { name: "Live visitors" }).querySelector("header")!;
    expect(header).toHaveTextContent("4live");
    expect(header).toHaveTextContent("4 countries");
    expect(header).toHaveTextContent("Last 30 minutes");
    const sources = within(header).getByRole("list", { name: "Top sources" });
    expect(within(sources).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Google2", "GitHub1", "Newsletter1"]);
  });

  it("takes sources and a total from props, and folds extra sources into +N", () => {
    renderMap({ total: 12_480, sources: [{ label: "A", count: 9 }, { label: "B", count: 5 }, { label: "C", count: 2 }], maxSources: 2 });
    const header = screen.getByRole("region", { name: "Live visitors" }).querySelector("header")!;
    expect(header).toHaveTextContent("12.5klive");
    const items = within(within(header).getByRole("list", { name: "Top sources" })).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[2]).toHaveTextContent("+1 more source");
  });

  it("lists city, source, page, device and a narrow relative time", () => {
    renderMap();
    const ana = row(/^Ana Lima, London, United Kingdom/);
    expect(ana).toHaveAccessibleName("Ana Lima, London, United Kingdom, from Google, viewing /pricing, phone, just now");
    expect(ana).toHaveTextContent("now");
    expect(row(/Lagos/)).toHaveTextContent("1m");
    expect(row(/Sydney/)).toHaveTextContent("3m");
    expect(row(/Sydney/)).toHaveTextContent("Newsletter");
  });

  it("moves through rows with the arrow keys and keeps one tab stop", () => {
    renderMap();
    const rows = within(list()).getAllByRole("option");
    expect(rows.map((r) => r.tabIndex)).toEqual([0, -1, -1, -1]);
    act(() => rows[0]!.focus());
    fireEvent.keyDown(rows[0]!, { key: "ArrowDown" });
    expect(rows[1]).toHaveFocus();
    fireEvent.keyDown(rows[1]!, { key: "End" });
    expect(rows[3]).toHaveFocus();
    expect(rows.map((r) => r.tabIndex)).toEqual([-1, -1, -1, 0]);
    fireEvent.keyDown(rows[3]!, { key: "Home" });
    expect(rows[0]).toHaveFocus();
  });
});

describe("LiveVisitorsMap: selection", () => {
  it("selecting a row selects the marker, opens the card and flies the globe there", () => {
    const onSelectedIdChange = vi.fn();
    renderMap({ onSelectedIdChange });
    expect(marker(/Cleo Park in Sydney/)).toBeNull(); // far side
    fireEvent.click(row(/Sydney/));
    expect(onSelectedIdChange).toHaveBeenLastCalledWith("cleo", visitors[2]);
    expect(row(/Sydney/)).toHaveAttribute("aria-selected", "true");
    advance(1000);
    const m = marker(/Cleo Park in Sydney/)!;
    expect(m).toHaveAttribute("aria-pressed", "true");
    const item = m.closest('[data-slot="geo-marker-item"]') as HTMLElement;
    const [, x, y] = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(item.style.transform)!;
    expect(Math.abs(Number(x) + 16 - 240)).toBeLessThan(4);
    expect(Math.abs(Number(y) + 16 - 240)).toBeLessThan(4);
    expect(card()).toHaveAccessibleName("Visitor details: Cleo Park");
  });

  it("selecting a marker selects the row; the same row again clears it", () => {
    renderMap();
    // London and Paris share a cluster bubble; Lagos stands alone.
    expect(marker(/Ana Lima in London/)).toBeNull();
    fireEvent.click(marker(/Visitor in Lagos/)!);
    expect(row(/Lagos/)).toHaveAttribute("aria-selected", "true");
    expect(card()).toBeInTheDocument();
    fireEvent.keyDown(row(/Lagos/), { key: "Enter" });
    expect(row(/Lagos/)).toHaveAttribute("aria-selected", "false");
    expect(card()).toBeNull();
  });

  it("shows the visitor card with details and actions, and closes it back to the row", () => {
    const renderVisitorActions = vi.fn((v: LiveVisitor) => <button type="button">View history of {v.id}</button>);
    renderMap({ defaultSelectedId: "ana", renderVisitorActions });
    const c = card()!;
    expect(c).toHaveTextContent("London, United Kingdom");
    expect(c).toHaveTextContent("SourceGoogle");
    expect(c).toHaveTextContent("DevicePhone · iOS · Safari");
    expect(c).toHaveTextContent("Page/pricing");
    expect(c).toHaveTextContent("Load time1.2s");
    expect(c).toHaveTextContent("Last seenjust now");
    expect(c).toHaveTextContent("Location51.50° N, 0.13° W");
    expect(within(c).getByRole("button", { name: "View history of ana" })).toBeInTheDocument();
    fireEvent.click(within(c).getByRole("button", { name: "Close visitor details" }));
    expect(card()).toBeNull();
    expect(row(/London/)).toHaveFocus();
  });

  it("names anonymous visitors by city", () => {
    renderMap({ defaultSelectedId: "ben" });
    expect(card()).toHaveAccessibleName("Visitor details: Visitor in Lagos");
    expect(marker(/Visitor in Lagos, from GitHub/)).toBeInTheDocument();
  });

  it("is controlled", () => {
    const onSelectedIdChange = vi.fn();
    const { rerender } = renderMap({ selectedId: null, onSelectedIdChange });
    fireEvent.click(row(/Paris/));
    expect(onSelectedIdChange).toHaveBeenCalledWith("dev", visitors[3]);
    expect(card()).toBeNull();
    rerender(<LiveVisitorsMap visitors={visitors} now={NOW} autoRotate={false} selectedId="dev" onSelectedIdChange={onSelectedIdChange} />);
    expect(card()).toBeInTheDocument();
  });
});

describe("LiveVisitorsMap: view toggle", () => {
  it("switches between the globe and the flat map, keeping the selection", () => {
    const onViewChange = vi.fn();
    const { container } = renderMap({ defaultSelectedId: "ana", onViewChange });
    expect(container.querySelector('[data-slot="globe"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Map" }));
    expect(onViewChange).toHaveBeenCalledWith("flat");
    expect(container.querySelector('[data-slot="globe"]')).toBeNull();
    expect(container.querySelector('[data-slot="world-map"]')).toBeInTheDocument();
    expect(marker(/Ana Lima in London/)).toHaveAttribute("aria-pressed", "true");
    expect(card()).toBeInTheDocument();
  });

  it("follows a controlled view", () => {
    const { container, rerender } = renderMap({ view: "flat" });
    expect(container.querySelector('[data-slot="world-map"]')).toBeInTheDocument();
    rerender(<LiveVisitorsMap visitors={visitors} now={NOW} autoRotate={false} view="globe" />);
    expect(container.querySelector('[data-slot="globe"]')).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Globe" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("LiveVisitorsMap: loading and empty", () => {
  it("shows skeletons with no visitors yet, one Loading text and no empty state", () => {
    const { container } = renderMap({ visitors: [], loading: true });
    const root = screen.getByRole("region", { name: "Live visitors" });
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByText("Loading…")).toHaveLength(1);
    expect(container.querySelector('[data-slot="live-visitors-list-skeleton"]')).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByText("No visitors right now")).toBeNull();
    expect(screen.queryByRole("list", { name: "Top sources" })).toBeNull();
  });

  it("keeps the visitors on a refresh", () => {
    const { container } = renderMap({ loading: true });
    expect(screen.getByRole("region", { name: "Live visitors" })).toHaveAttribute("aria-busy", "true");
    expect(within(list()).getAllByRole("option")).toHaveLength(4);
    expect(container.querySelector('[data-slot="live-visitors-list-skeleton"]')).toBeNull();
    expect(screen.queryByText("Loading…")).toBeNull();
  });

  it("shows the empty state, or a custom one", () => {
    const { rerender } = renderMap({ visitors: [] });
    expect(screen.getByText("No visitors right now")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Live visitors" }).querySelector("header")).toHaveTextContent("0live");
    rerender(<LiveVisitorsMap visitors={[]} now={NOW} emptyState={<p>Quiet day</p>} />);
    expect(screen.getByText("Quiet day")).toBeInTheDocument();
  });
});

describe("LiveVisitorsMap: accessibility", () => {
  it("has no axe violations on the globe and the flat map, with a card open", async () => {
    const { container } = renderMap({ defaultSelectedId: "ana", windowLabel: "Last 30 minutes" });
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("radio", { name: "Map" }));
    expect(await axeViolations(container)).toEqual([]);
  });

  it("has no axe violations while loading or empty", async () => {
    const { container, rerender } = renderMap({ visitors: [], loading: true });
    expect(await axeViolations(container)).toEqual([]);
    rerender(<LiveVisitorsMap visitors={[]} now={NOW} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
