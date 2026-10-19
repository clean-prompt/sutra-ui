import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeoMarkerLayer, WorldMap, type GeoArc, type GeoMarker, type WorldMapDatum } from "../src/entries/geo";
import { axeViolations } from "./a11y";

const data: WorldMapDatum[] = [
  { code: "us", value: 1200 },
  { code: "FR", value: 300 },
  { code: "uk", value: 640, label: "640 visits" },
  { code: "SG", value: 90 },
  { code: "nope", value: 5 },
];

const markers: GeoMarker[] = [
  { id: "seoul", point: { lat: 37.57, lng: 126.98 }, label: "Ana in Seoul", description: "Chrome · 3 min", tone: "success" },
  { id: "incheon", point: [126.7, 37.45], label: "Ben in Incheon" },
  { id: "nyc", point: { lat: 40.71, lng: -74 }, label: "Cleo in New York", badge: <span>G</span> },
];

const arcs: GeoArc[] = [
  { id: "a1", from: { lat: 35.68, lng: 139.69 }, to: { lat: 37.77, lng: -122.42 }, label: "Tokyo to San Francisco", animated: true, tone: "destructive" },
  { id: "a2", from: [-0.13, 51.5], to: [-74, 40.71] },
];

const countryPath = (container: HTMLElement, code: string) => container.querySelector(`path[data-code="${code}"]`) as SVGPathElement;

afterEach(() => vi.restoreAllMocks());

describe("WorldMap: countries and choropleth", () => {
  it("draws every country but Antarctica, with data fills", () => {
    const { container } = render(<WorldMap data={data} />);
    const paths = container.querySelectorAll('[data-slot="world-map-countries"] path');
    expect(paths).toHaveLength(176);
    expect(countryPath(container, "AQ")).toBeNull();
    expect(countryPath(container, "US").getAttribute("fill")).toBe("var(--primary)");
    expect(countryPath(container, "FR").getAttribute("fill")).toContain("color-mix(in oklab, var(--primary)");
    expect(countryPath(container, "BR").getAttribute("fill")).toBe("var(--muted)");
    expect(container.querySelector('[data-slot="world-map-borders"]')?.getAttribute("d")).toMatch(/^M/);
    expect(render(<WorldMap hideAntarctica={false} />).container.querySelectorAll('[data-slot="world-map-countries"] path')).toHaveLength(177);
  });

  it("uses the colour prop, no-data fill and quantile scale", () => {
    const { container } = render(<WorldMap data={data} color="#ff0000" noDataColor="gray" scale="quantile" steps={2} />);
    expect(countryPath(container, "US").getAttribute("fill")).toBe("#ff0000");
    expect(countryPath(container, "FR").getAttribute("fill")).toBe("color-mix(in oklab, #ff0000 30%, gray)");
    expect(countryPath(container, "BR").getAttribute("fill")).toBe("gray");
  });

  it("shows a tooltip with the name and formatted value on hover", () => {
    const { container } = render(<WorldMap data={data} valueLabel="Visits" valueFormatter={(v) => `${v} v`} />);
    fireEvent.pointerMove(countryPath(container, "FR"), { clientX: 100, clientY: 80 });
    const tip = container.querySelector('[data-slot="world-map-tooltip"]') as HTMLElement;
    expect(tip).toHaveTextContent("France");
    expect(tip).toHaveTextContent("300 v");
    expect(tip).toHaveTextContent("Visits");
    expect(container.querySelector('[data-slot="world-map-hover"]')).not.toBeNull();
    fireEvent.pointerMove(countryPath(container, "GB"));
    expect(container.querySelector('[data-slot="world-map-tooltip"]')).toHaveTextContent("640 visits");
    fireEvent.pointerMove(countryPath(container, "BR"));
    expect(container.querySelector('[data-slot="world-map-tooltip"]')).toHaveTextContent("No data");
    fireEvent.pointerLeave(container.querySelector('[data-slot="world-map-countries"]')!);
    expect(container.querySelector('[data-slot="world-map-tooltip"]')).toBeNull();
  });

  it("selects countries on click and reports them", () => {
    const onCountrySelect = vi.fn();
    const { container } = render(<WorldMap data={data} onCountrySelect={onCountrySelect} />);
    fireEvent.click(countryPath(container, "FR"));
    expect(onCountrySelect).toHaveBeenLastCalledWith("FR", { code: "FR", name: "France", value: 300 });
    expect(container.querySelector('[data-slot="world-map-selected"]')?.getAttribute("d")).toBe(countryPath(container, "FR").getAttribute("d"));
    fireEvent.click(countryPath(container, "FR"));
    expect(onCountrySelect).toHaveBeenLastCalledWith(null, undefined);
    expect(container.querySelector('[data-slot="world-map-selected"]')).toBeNull();
  });

  it("highlights a controlled selection and ignores clicks on display-only maps", () => {
    const { container, rerender } = render(<WorldMap selectedCountry="de" />);
    expect(container.querySelector('[data-slot="world-map-selected"]')?.getAttribute("d")).toBe(countryPath(container, "DE").getAttribute("d"));
    rerender(<WorldMap />);
    fireEvent.click(countryPath(container, "FR"));
    expect(container.querySelector('[data-slot="world-map-selected"]')).toBeNull();
  });

  it("renders the stepped legend", () => {
    const { container } = render(<WorldMap data={data} legend valueLabel="Visits" />);
    const legend = container.querySelector('[data-slot="geo-legend"]') as HTMLElement;
    expect(legend).toHaveTextContent("Visits");
    expect(legend).toHaveTextContent("90");
    expect(legend).toHaveTextContent("1,200");
    expect(legend).toHaveTextContent("No data");
  });
});

describe("WorldMap: markers", () => {
  it("renders marker buttons with names and selection state", () => {
    const onMarkerSelect = vi.fn();
    const onSelect = vi.fn();
    render(<WorldMap markers={markers.map((m) => (m.id === "nyc" ? { ...m, onSelect } : m))} onMarkerSelect={onMarkerSelect} />);
    const nyc = screen.getByRole("button", { name: "Cleo in New York" });
    expect(nyc).toHaveAttribute("aria-pressed", "false");
    expect(nyc.parentElement!.querySelector('[data-slot="geo-marker-badge"]')).toHaveTextContent("G");
    expect(nyc).toHaveTextContent("");
    fireEvent.click(nyc);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onMarkerSelect).toHaveBeenLastCalledWith("nyc", expect.objectContaining({ id: "nyc" }));
    expect(nyc).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(nyc);
    expect(onMarkerSelect).toHaveBeenLastCalledWith(null, undefined);
    expect(nyc).toHaveAttribute("aria-pressed", "false");
  });

  it("follows a controlled selection", () => {
    const { rerender } = render(<WorldMap markers={markers} selectedMarkerId="seoul" />);
    expect(screen.getByRole("button", { name: "Ana in Seoul" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Cleo in New York" }));
    expect(screen.getByRole("button", { name: "Ana in Seoul" })).toHaveAttribute("aria-pressed", "true");
    rerender(<WorldMap markers={markers} selectedMarkerId={null} />);
    expect(screen.getByRole("button", { name: "Ana in Seoul" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows a tooltip on marker hover and focus", () => {
    const { container } = render(<WorldMap markers={markers} />);
    const seoul = screen.getByRole("button", { name: "Ana in Seoul" });
    fireEvent.focus(seoul);
    const tip = container.querySelector('[data-slot="geo-marker-tooltip"]');
    expect(tip).toHaveTextContent("Ana in Seoul");
    expect(tip).toHaveTextContent("Chrome · 3 min");
    fireEvent.blur(seoul);
    expect(container.querySelector('[data-slot="geo-marker-tooltip"]')).toBeNull();
  });

  it("clusters nearby markers into a count bubble", () => {
    const onClusterSelect = vi.fn();
    const { container } = render(<WorldMap markers={markers} cluster onClusterSelect={onClusterSelect} />);
    const bubble = screen.getByRole("button", { name: /^2 markers: Ana in Seoul and Ben in Incheon$/ });
    expect(bubble).toHaveAttribute("data-count", "2");
    expect(bubble.parentElement!.querySelector('[data-slot="geo-marker-visual"]')).toHaveTextContent("2");
    expect(screen.queryByRole("button", { name: "Ana in Seoul" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cleo in New York" })).toBeInTheDocument();
    fireEvent.click(bubble);
    expect(onClusterSelect.mock.calls[0]![0].map((m: GeoMarker) => m.id)).toEqual(["seoul", "incheon"]);
    expect(container.querySelectorAll('[data-slot="geo-marker-cluster"]')).toHaveLength(1);
  });

  it("keeps the selected marker out of clusters", () => {
    render(<WorldMap markers={markers} cluster defaultSelectedMarkerId="seoul" />);
    expect(screen.getByRole("button", { name: "Ana in Seoul" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Ben in Incheon" })).toBeInTheDocument();
  });

  it("scales marker size by value and renders custom content", () => {
    render(
      <WorldMap
        markers={[
          { id: "big", point: [0, 10], label: "Big", value: 100 },
          { id: "small", point: [60, 10], label: "Small", value: 1 },
          { id: "avatar", point: [-60, 10], label: "Avatar", render: ({ selected }) => <span data-testid="avatar">{selected ? "on" : "off"}</span> },
        ]}
      />
    );
    const dot = (name: string) => screen.getByRole("button", { name }).parentElement!.querySelector('[data-slot="geo-marker-visual"]') as HTMLElement;
    expect(dot("Big").style.width).toBe("28px");
    expect(parseFloat(dot("Small").style.width)).toBeLessThan(12);
    expect(screen.getByTestId("avatar")).toHaveTextContent("off");
    fireEvent.click(screen.getByRole("button", { name: "Avatar" }));
    expect(screen.getByTestId("avatar")).toHaveTextContent("on");
  });

  it("GeoMarkerLayer skips markers the projection hides", () => {
    render(
      <div style={{ position: "relative" }}>
        <GeoMarkerLayer markers={markers} project={(p) => (Array.isArray(p) ? null : [10, 10])} width={100} height={100} />
      </div>
    );
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Ben in Incheon" })).toBeNull();
  });
});

describe("WorldMap: arcs", () => {
  it("draws arcs, splitting antimeridian crossings, with a dash flow", () => {
    const { container } = render(<WorldMap arcs={arcs} />);
    const arcEls = container.querySelectorAll('[data-slot="world-map-arc"]');
    expect(arcEls).toHaveLength(2);
    const pacific = arcEls[0]!.querySelector("path")!.getAttribute("d")!;
    expect(pacific.match(/M/g)).toHaveLength(2);
    expect(arcEls[0]!.querySelector("path")!.getAttribute("stroke")).toBe("var(--destructive)");
    expect(arcEls[0]!.querySelector("animate")).not.toBeNull();
    expect(arcEls[1]!.querySelector("animate")).toBeNull();
    expect(arcEls[1]!.querySelector("path")!.getAttribute("stroke")).toBe("var(--primary)");
  });

  it("stops the flow under reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList
    );
    const { container } = render(<WorldMap arcs={arcs} />);
    expect(container.querySelector("animate")).toBeNull();
    expect(container.querySelector('[data-slot="world-map-arc"] path[stroke-dasharray]')).not.toBeNull();
  });
});

describe("WorldMap: accessibility and loading", () => {
  it("labels the figure with a summary and renders hidden tables", () => {
    const { container } = render(<WorldMap data={data} markers={markers} arcs={arcs} valueLabel="Visits" defaultSelectedMarkerId="nyc" />);
    const figure = screen.getByRole("figure");
    expect(figure).toHaveAttribute("aria-label", "World map: 4 countries with data, 3 markers, 2 arcs");
    const countries = container.querySelector('[data-slot="geo-table-countries"]') as HTMLElement;
    const rows = within(countries).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.textContent)).toEqual(["United States1,200", "United Kingdom640 visits", "France300", "Singapore90"]);
    const markerTable = container.querySelector('[data-slot="geo-table-markers"]') as HTMLElement;
    expect(markerTable).toHaveTextContent("Cleo in New York (selected)");
    expect(markerTable).toHaveTextContent("37.57° N, 126.98° E");
    expect(markerTable).toHaveTextContent("Chrome · 3 min");
    expect(container.querySelector('[data-slot="geo-table-arcs"]')).toHaveTextContent("Tokyo to San Francisco");
    expect(container.querySelector('[data-slot="geo-table-arcs"]')).toHaveTextContent("Arc 2");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("accepts a label override and singular counts", () => {
    render(<WorldMap data={[{ code: "FR", value: 1 }]} markers={[markers[0]!]} />);
    expect(screen.getByRole("figure")).toHaveAttribute("aria-label", "World map: 1 country with data, 1 marker");
    render(<WorldMap label="Sign-ins by country" />);
    expect(screen.getByRole("figure", { name: "Sign-ins by country" })).toBeInTheDocument();
    render(<WorldMap aria-label="Attack origins" />);
    expect(screen.getByRole("figure", { name: "Attack origins" })).toBeInTheDocument();
  });

  it("shows a pulsing silhouette while loading with no data", () => {
    const { container } = render(<WorldMap loading legend />);
    const figure = screen.getByRole("figure");
    expect(figure).toHaveAttribute("aria-busy", "true");
    expect(within(figure).getAllByText("Loading…")).toHaveLength(1);
    expect(container.querySelector('[data-slot="world-map-skeleton"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="geo-legend-skeleton"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="world-map-countries"]')).toBeNull();
    expect(container.querySelector("table")).toBeNull();
  });

  it("keeps data on refresh while loading", () => {
    const { container } = render(<WorldMap loading data={data} markers={markers} legend />);
    expect(screen.getByRole("figure")).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector('[data-slot="world-map-skeleton"]')).toBeNull();
    expect(countryPath(container, "US").getAttribute("fill")).toBe("var(--primary)");
    expect(screen.getByRole("button", { name: "Ana in Seoul" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="geo-legend"]')).not.toBeNull();
    expect(screen.queryByText("Loading…")).toBeNull();
  });

  it("forwards refs, className and props", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<WorldMap ref={ref} className="custom" data-testid="map" height={300} />);
    expect(ref.current).toBe(screen.getByTestId("map"));
    expect(ref.current).toHaveClass("custom");
    expect((ref.current!.querySelector('[data-slot="world-map-canvas"]') as HTMLElement).style.height).toBe("300px");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <WorldMap data={data} markers={markers} arcs={arcs} legend cluster graticule sphere defaultSelectedMarkerId="nyc" />
    );
    expect(await axeViolations(container)).toEqual([]);
    const loading = render(<WorldMap loading legend />);
    expect(await axeViolations(loading.container)).toEqual([]);
  });
});
