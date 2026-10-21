import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  RegionStatusMap,
  countRegionStatuses,
  normalizeRegionStatus,
  regionLinkArcs,
  regionMarkerSize,
  sortRegions,
  worstRegionStatus,
  type RegionLink,
  type StatusRegion,
} from "../src/entries/ops";
import { axeViolations } from "./helpers/a11y";

const regions: StatusRegion[] = [
  { id: "use1", name: "Virginia", code: "us-east-1", country: "US", point: { lat: 38.9, lng: -77.4 }, status: "healthy", latencyMs: 38, load: 71, nodes: 48 },
  { id: "euc1", name: "Frankfurt", code: "eu-central-1", point: { lat: 50.11, lng: 8.68 }, status: "degraded", latencyMs: 210, load: 93, nodes: 40, incident: "Slow disks" },
  { id: "mes1", name: "Bahrain", code: "me-south-1", point: { lat: 26.07, lng: 50.56 }, status: "down", latencyMs: null, load: null, nodes: 6, incident: "Power event" },
  { id: "apne1", name: "Tokyo", code: "ap-northeast-1", point: { lat: 35.68, lng: 139.69 }, status: "maintenance", latencyMs: 58, load: 20, nodes: 30 },
  { id: "apse2", name: "Sydney", code: "ap-southeast-2", point: { lat: -33.87, lng: 151.21 }, status: "healthy", latencyMs: 96, load: 49 },
];
const links: RegionLink[] = [
  { id: "l1", from: "use1", to: "euc1", kind: "replication" },
  { id: "l2", from: "euc1", to: "mes1", kind: "traffic" },
  { id: "l3", from: "use1", to: "apse2" },
  { id: "l4", from: "use1", to: "nowhere" },
];

/** The map's marker button (the hidden screen-reader table may have one with the same name). */
const marker = (name: RegExp) => screen.getAllByRole("button", { name }).find((b) => b.getAttribute("data-slot") === "geo-marker")!;
const rowButton = (name: RegExp) => within(screen.getByRole("table", { name: "Regions" })).getByRole("button", { name });
const rowNames = () =>
  [...screen.getByRole("table", { name: "Regions" }).querySelectorAll('[data-slot="region-status-row-button"]')].map(
    (b) => b.querySelector('[data-slot="region-status-row-name"]')!.textContent
  );

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

describe("region status model", () => {
  it("normalizes statuses and aliases", () => {
    expect(normalizeRegionStatus("healthy")).toBe("healthy");
    expect(normalizeRegionStatus("operational")).toBe("healthy");
    expect(normalizeRegionStatus("Major_Outage")).toBe("down");
    expect(normalizeRegionStatus("partial")).toBe("degraded");
    expect(normalizeRegionStatus("under_maintenance")).toBe("maintenance");
    expect(normalizeRegionStatus("bogus")).toBe("healthy");
    expect(normalizeRegionStatus(undefined, "down")).toBe("down");
  });

  it("counts statuses and finds the worst", () => {
    expect(countRegionStatuses(regions)).toEqual({ healthy: 2, degraded: 1, down: 1, maintenance: 1 });
    expect(worstRegionStatus([])).toBe("healthy");
    expect(worstRegionStatus(["healthy", "maintenance"])).toBe("maintenance");
    expect(worstRegionStatus(["maintenance", "degraded", "outage"])).toBe("down");
  });

  it("sorts by severity, metrics and name with missing values last", () => {
    const ids = (sort: Parameters<typeof sortRegions>[1]) => sortRegions(regions, sort).map((r) => r.id);
    expect(ids({ key: "status", direction: "desc" })).toEqual(["mes1", "euc1", "apne1", "apse2", "use1"]);
    expect(ids({ key: "status", direction: "asc" })).toEqual(["apse2", "use1", "apne1", "euc1", "mes1"]);
    expect(ids({ key: "latency", direction: "desc" })).toEqual(["euc1", "apse2", "apne1", "use1", "mes1"]);
    expect(ids({ key: "latency", direction: "asc" })).toEqual(["use1", "apne1", "apse2", "euc1", "mes1"]);
    expect(ids({ key: "nodes", direction: "asc" })).toEqual(["mes1", "apne1", "euc1", "use1", "apse2"]);
    expect(ids({ key: "name", direction: "asc" })).toEqual(["mes1", "euc1", "apse2", "apne1", "use1"]);
    expect(ids(null)).toEqual(regions.map((r) => r.id));
  });

  it("sizes markers by load", () => {
    expect(regionMarkerSize(0)).toBe(10);
    expect(regionMarkerSize(100)).toBe(22);
    expect(regionMarkerSize(250)).toBe(22);
    expect(regionMarkerSize(null)).toBe(12);
    expect(regionMarkerSize(25)).toBe(16);
  });

  it("builds arcs toned by the worse endpoint, skipping unknown regions", () => {
    const arcs = regionLinkArcs(links, regions, { selectedId: "mes1" });
    expect(arcs.map((a) => a.id)).toEqual(["l1", "l2", "l3"]);
    expect(arcs[0]).toMatchObject({ tone: "warning", animated: true, width: 1.5, label: "Virginia to Frankfurt (replication), degraded" });
    expect(arcs[1]).toMatchObject({ tone: "destructive", animated: false, width: 2.5 });
    expect(arcs[2]).toMatchObject({ tone: "success", label: "Virginia to Sydney, healthy" });
    const own = regionLinkArcs([{ id: "x", from: "use1", to: "apse2", status: "maintenance", animated: false, label: "Custom" }], regions);
    expect(own[0]).toMatchObject({ tone: "info", animated: false, label: "Custom" });
  });
});

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

describe("RegionStatusMap", () => {
  it("renders markers, the legend with counts and the overview", () => {
    const { container } = render(<RegionStatusMap regions={regions} links={links} />);
    const legend = screen.getByRole("list", { name: "Regions by status" });
    expect(within(legend).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Healthy2", "Degraded1", "Down1", "Maintenance1"]);
    expect(screen.getByRole("figure", { name: "Region map: 5 regions, 1 down, 1 degraded, 1 in maintenance" })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="geo-marker"]')).toHaveLength(5);
    expect(container.querySelectorAll('[data-slot="world-map-arc"]')).toHaveLength(3);
    const bahrain = marker(/^Bahrain/);
    expect(bahrain).toHaveAccessibleName("Bahrain (me-south-1), down");
    const visual = (b: HTMLElement) => b.parentElement!.querySelector('[data-slot="geo-marker-visual"]') as HTMLElement;
    expect(visual(marker(/^Frankfurt/)).style.backgroundColor).toBe("var(--warning)");
    expect(visual(marker(/^Virginia/)).style.width).toBe(`${regionMarkerSize(71)}px`);
    const overview = container.querySelector('[data-slot="region-status-overview"]') as HTMLElement;
    expect(within(overview).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Bahrain, downPower event",
      "Frankfurt, degradedSlow disks",
      "Tokyo, maintenance",
    ]);
  });

  it("sorts the table, worst first by default, and cycles a column", () => {
    const onSortChange = vi.fn();
    render(<RegionStatusMap regions={regions} onSortChange={onSortChange} />);
    expect(rowNames()).toEqual(["Bahrain", "Frankfurt", "Tokyo", "Sydney", "Virginia"]);
    const latency = screen.getByRole("columnheader", { name: /Latency/ });
    fireEvent.click(within(latency).getByRole("button"));
    expect(latency).toHaveAttribute("aria-sort", "descending");
    expect(onSortChange).toHaveBeenLastCalledWith({ key: "latency", direction: "desc" });
    expect(rowNames()).toEqual(["Frankfurt", "Sydney", "Tokyo", "Virginia", "Bahrain"]);
    fireEvent.click(within(latency).getByRole("button"));
    expect(latency).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(within(latency).getByRole("button"));
    expect(latency).toHaveAttribute("aria-sort", "none");
    expect(onSortChange).toHaveBeenLastCalledWith(null);
    expect(rowNames()).toEqual(regions.map((r) => r.name));
    const name = screen.getByRole("columnheader", { name: /Region/ });
    fireEvent.click(within(name).getByRole("button"));
    expect(name).toHaveAttribute("aria-sort", "ascending");
  });

  it("selects from a row: marker pressed, detail shown, close returns to the overview", () => {
    const onSelectedIdChange = vi.fn();
    const { container } = render(
      <RegionStatusMap
        regions={regions}
        links={links}
        onSelectedIdChange={onSelectedIdChange}
        renderRegionActions={(r) => <button type="button">{`Drain ${r.name}`}</button>}
      />
    );
    fireEvent.click(rowButton(/Frankfurt/));
    expect(onSelectedIdChange).toHaveBeenLastCalledWith("euc1", expect.objectContaining({ id: "euc1" }));
    expect(marker(/^Frankfurt/)).toHaveAttribute("aria-pressed", "true");
    expect(rowButton(/Frankfurt/)).toHaveAttribute("aria-pressed", "true");
    expect(rowButton(/Frankfurt/).closest("tr")).toHaveAttribute("data-state", "selected");
    const detail = screen.getByRole("group", { name: "Frankfurt" });
    expect(detail).toHaveTextContent("eu-central-1");
    expect(detail).toHaveTextContent("Slow disks");
    expect(within(detail).getByRole("meter", { name: "Load" })).toHaveAttribute("aria-valuenow", "93");
    expect(within(detail).getByText("Latency 210 ms, slow")).toBeInTheDocument();
    expect(within(detail).getByRole("button", { name: "Drain Frankfurt" })).toBeInTheDocument();
    // Links touching the selection are thicker.
    const widths = [...container.querySelectorAll('[data-slot="world-map-arc"] path')].map((p) => p.getAttribute("stroke-width"));
    expect(widths).toContain("2.5");
    // A link in the detail selects the peer region.
    fireEvent.click(within(detail).getByRole("button", { name: /Bahrain/ }));
    expect(screen.getByRole("group", { name: "Bahrain" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close region details" }));
    expect(onSelectedIdChange).toHaveBeenLastCalledWith(null, undefined);
    expect(container.querySelector('[data-slot="region-status-overview"]')).not.toBeNull();
  });

  it("selects from a marker and from a plain row click; activating again clears", () => {
    render(<RegionStatusMap regions={regions} />);
    fireEvent.click(marker(/^Tokyo/));
    expect(rowButton(/Tokyo/)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: "Tokyo" })).toBeInTheDocument();
    fireEvent.click(rowButton(/Sydney/).closest("tr")!.querySelector("td:last-child")!);
    expect(marker(/^Sydney/)).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(rowButton(/Sydney/));
    expect(marker(/^Sydney/)).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("group", { name: "Sydney" })).toBeNull();
  });

  it("moves focus to the panel heading when its buttons swap the panel", () => {
    const { container } = render(<RegionStatusMap regions={regions} />);
    const overview = container.querySelector('[data-slot="region-status-overview"]') as HTMLElement;
    fireEvent.click(within(overview).getByRole("button", { name: /Frankfurt/ }));
    expect(screen.getByRole("heading", { name: "Frankfurt" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Close region details" }));
    expect(screen.getByRole("heading", { name: "Overview" })).toHaveFocus();
  });

  it("follows a controlled selection", () => {
    const { rerender } = render(<RegionStatusMap regions={regions} selectedId="use1" />);
    expect(screen.getByRole("group", { name: "Virginia" })).toBeInTheDocument();
    fireEvent.click(rowButton(/Tokyo/));
    expect(screen.getByRole("group", { name: "Virginia" })).toBeInTheDocument();
    rerender(<RegionStatusMap regions={regions} selectedId={null} />);
    expect(screen.queryByRole("group", { name: "Virginia" })).toBeNull();
  });

  it("switches between the flat map and the globe", () => {
    const onViewChange = vi.fn();
    const { container } = render(<RegionStatusMap regions={regions} onViewChange={onViewChange} />);
    expect(container.querySelector('[data-slot="world-map"]')).not.toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Globe" }));
    expect(onViewChange).toHaveBeenLastCalledWith("globe");
    expect(container.querySelector('[data-slot="world-map"]')).toBeNull();
    expect(container.querySelector('[data-slot="globe"]')).not.toBeNull();
  });

  it("starts on the globe through `view` and can hide the toggle", () => {
    const { container } = render(<RegionStatusMap regions={regions} view="globe" viewToggle={false} />);
    expect(container.querySelector('[data-slot="globe"]')).not.toBeNull();
    expect(screen.queryByRole("radio", { name: "Globe" })).toBeNull();
  });

  it("shows skeletons while loading with no data, without the empty state", () => {
    const { container } = render(<RegionStatusMap regions={[]} loading />);
    const root = container.querySelector('[data-slot="region-status-map"]')!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading regions…")).toHaveClass("sr-only");
    expect(screen.queryByText("No regions")).toBeNull();
    expect(container.querySelectorAll('[data-slot="geo-marker"]')).toHaveLength(0);
    expect(screen.getByRole("table", { name: "Regions" }).querySelectorAll("tbody tr")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: /Latency/ })).toBeNull();
    expect(container.querySelector('[data-slot="region-status-map-canvas"]')).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps data on a refresh", () => {
    const { container } = render(<RegionStatusMap regions={regions} loading />);
    expect(container.querySelector('[data-slot="region-status-map"]')).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Loading regions…")).toBeNull();
    expect(rowNames()).toHaveLength(5);
    expect(container.querySelectorAll('[data-slot="geo-marker"]')).toHaveLength(5);
  });

  it("shows an empty state, or a custom one", () => {
    const { rerender } = render(<RegionStatusMap regions={[]} />);
    expect(screen.getByText("No regions")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    rerender(<RegionStatusMap regions={[]} emptyState={<p>Connect a provider</p>} />);
    expect(screen.getByText("Connect a provider")).toBeInTheDocument();
  });

  it("says all healthy when nothing needs attention", () => {
    render(<RegionStatusMap regions={regions.filter((r) => r.status === "healthy" && !r.incident)} />);
    expect(screen.getByText("All regions healthy")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container, rerender } = render(<RegionStatusMap regions={regions} links={links} defaultSelectedId="euc1" />);
    expect(await axeViolations(container)).toEqual([]);
    rerender(<RegionStatusMap regions={[]} loading />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
