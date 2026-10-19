import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Globe, type GeoArc, type GeoMarker, type GlobeApi, type WorldMapDatum } from "../src/entries/geo";
import { axeViolations } from "./a11y";

/* Default view centres 10° E, 20° N: Europe and Africa face the viewer, Australia and the Pacific are hidden. */
const markers: GeoMarker[] = [
  { id: "london", point: { lat: 51.5, lng: -0.13 }, label: "Ana in London", description: "Chrome" },
  { id: "lagos", point: [3.38, 6.52], label: "Ben in Lagos" },
  { id: "sydney", point: { lat: -33.87, lng: 151.21 }, label: "Cleo in Sydney" },
];
const data: WorldMapDatum[] = [
  { code: "FR", value: 300 },
  { code: "NG", value: 120 },
  { code: "AU", value: 50 },
];
const arcs: GeoArc[] = [{ id: "a1", from: { lat: 51.5, lng: -0.13 }, to: { lat: 40.71, lng: -74 }, label: "London to New York", animated: true }];

// jsdom has no PointerEvent; without it fireEvent drops clientX and pointerId.
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
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

/* ---- rAF and clock ---- */

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
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id);
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Run animation frames for `ms` of simulated time. */
function advance(ms: number) {
  const end = clock + ms;
  while (clock < end) {
    clock += 16;
    const due = [...frames.values()];
    frames.clear();
    act(() => due.forEach((cb) => cb(clock)));
  }
}

function reducedMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList
  );
}

/** The marker button on the globe (the hidden table has a button with the same name). */
const markerButton = (name: string) => screen.getAllByRole("button", { name }).find((b) => b.getAttribute("data-slot") === "geo-marker")!;
const queryMarkerButton = (name: string) => screen.queryAllByRole("button", { name }).find((b) => b.getAttribute("data-slot") === "geo-marker") ?? null;
const globe = () => screen.getByRole("group", { name: /globe|visitors/i });
const canvas = (container: HTMLElement) => container.querySelector('[data-slot="globe-canvas"]') as HTMLElement;
const countryPath = (container: HTMLElement, code: string) => container.querySelector(`[data-slot="globe-countries"] path[data-code="${code}"]`) as SVGPathElement;
const close = (a: readonly number[], b: readonly number[], digits = 1) => a.every((v, i) => Math.abs(v - b[i]!) < 10 ** -digits);

function renderGlobe(props: React.ComponentProps<typeof Globe> = {}) {
  const api = React.createRef<GlobeApi>();
  const utils = render(<Globe apiRef={api} {...props} />);
  return { ...utils, api };
}

/* ---- tests ---- */

describe("Globe: drawing", () => {
  it("draws every country, leaving the far side empty", () => {
    const { container } = renderGlobe({ data });
    const paths = container.querySelectorAll('[data-slot="globe-countries"] path');
    expect(paths).toHaveLength(177);
    expect(countryPath(container, "FR").getAttribute("d")).toMatch(/^M/);
    expect(countryPath(container, "AU").getAttribute("d")).toBe("");
    expect(countryPath(container, "FR").getAttribute("fill")).toBe("var(--primary)");
    expect(container.querySelector('[data-slot="globe-borders"]')?.getAttribute("d")).toMatch(/^M/);
    expect(Number(container.querySelector('[data-slot="globe-rim"]')?.getAttribute("r"))).toBeCloseTo(232);
    expect(container.querySelector('[data-slot="globe-graticule"]')).toBeNull();
    expect(renderGlobe({ graticule: true }).container.querySelector('[data-slot="globe-graticule"]')).not.toBeNull();
  });

  it("hides markers on the far side and fades none in the middle", () => {
    renderGlobe({ markers });
    expect(markerButton("Ana in London")).toBeInTheDocument();
    expect(markerButton("Ben in Lagos").parentElement!.style.opacity).toBe("");
    expect(queryMarkerButton("Cleo in Sydney")).toBeNull();
  });

  it("fades markers close to the horizon", () => {
    // 85° from the centre: still on the visible side, in the fade band.
    renderGlobe({ markers: [{ id: "edge", point: { lat: 0, lng: 85 }, label: "Edge" }], defaultRotation: [0, 0, 0] });
    const opacity = Number(markerButton("Edge").parentElement!.style.opacity);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(0.6);
  });

  it("clips arcs at the horizon and animates them unless motion is reduced", () => {
    const { container } = renderGlobe({ arcs });
    const arc = container.querySelector('[data-slot="globe-arc"]')!;
    expect(arc.querySelector("path")!.getAttribute("d")).toMatch(/^M/);
    expect(arc.querySelector("animate")).not.toBeNull();
    // From the far side the whole arc is hidden.
    const hidden = renderGlobe({ arcs, defaultRotation: [-170, 0, 0] }).container.querySelectorAll('[data-slot="globe-arc"]')[0]!;
    expect(hidden.querySelector("path")!.getAttribute("d")).toBe("");
  });

  it("follows the view when it changes, without re-rendering the countries", () => {
    const { container, api } = renderGlobe({ data });
    const before = countryPath(container, "FR").getAttribute("d");
    act(() => api.current!.flyTo({ lat: -25, lng: 135 }, { duration: 0 }));
    advance(32);
    expect(countryPath(container, "FR").getAttribute("d")).toBe("");
    expect(countryPath(container, "AU").getAttribute("d")).toMatch(/^M/);
    expect(before).toMatch(/^M/);
  });
});

describe("Globe: interaction", () => {
  it("rotates and zooms from the keyboard and resets with Home", () => {
    const onRotationChange = vi.fn();
    const onZoomChange = vi.fn();
    const { api } = renderGlobe({ onRotationChange, onZoomChange });
    const root = globe();
    expect(root).toHaveAttribute("tabindex", "0");
    expect(root).toHaveAttribute("aria-roledescription", "globe");
    fireEvent.keyDown(root, { key: "ArrowLeft" });
    expect(onRotationChange).toHaveBeenLastCalledWith([0, -20, 0]);
    fireEvent.keyDown(root, { key: "ArrowUp" });
    expect(onRotationChange).toHaveBeenLastCalledWith([0, -30, 0]);
    fireEvent.keyDown(root, { key: "+" });
    expect(onZoomChange).toHaveBeenLastCalledWith(1.25);
    expect(api.current!.getView().zoom).toBe(1.25);
    fireEvent.keyDown(root, { key: "-" });
    expect(api.current!.getView().zoom).toBe(1);
    fireEvent.keyDown(root, { key: "Home" });
    advance(900);
    expect(api.current!.getView()).toEqual({ rotation: [-10, -20, 0], zoom: 1 });
    // Keys aimed at buttons inside the globe are left alone.
    const calls = onRotationChange.mock.calls.length;
    fireEvent.keyDown(root.querySelector("[data-slot=globe-canvas]")!, { key: "ArrowLeft" });
    expect(onRotationChange).toHaveBeenCalledTimes(calls);
  });

  it("clamps zoom and pitch", () => {
    const { api } = renderGlobe({ maxZoom: 2 });
    const root = globe();
    for (let i = 0; i < 6; i++) fireEvent.keyDown(root, { key: "+" });
    expect(api.current!.getView().zoom).toBe(2);
    for (let i = 0; i < 12; i++) fireEvent.keyDown(root, { key: "ArrowDown", shiftKey: true });
    expect(api.current!.getView().rotation[1]).toBe(85);
  });

  it("rotates on drag after a small threshold", () => {
    const onRotationChange = vi.fn();
    const { container, api } = renderGlobe({ onRotationChange });
    const el = canvas(container);
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 100, clientY: 100, button: 0, pointerType: "mouse" });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 102, clientY: 100, pointerType: "mouse" });
    expect(api.current!.getView().rotation[0]).toBe(-10);
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 140, clientY: 100, pointerType: "mouse" });
    expect(el).toHaveAttribute("data-dragging");
    expect(api.current!.getView().rotation[0]).toBeGreaterThan(-10);
    clock += 200;
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 140, clientY: 100, pointerType: "mouse" });
    expect(el).not.toHaveAttribute("data-dragging");
    expect(onRotationChange).toHaveBeenCalledTimes(1);
  });

  it("is controlled: jumps to new rotation and zoom props without reporting them back", () => {
    const onRotationChange = vi.fn();
    const { api, rerender, container } = renderGlobe({ rotation: [0, 0], zoom: 1, onRotationChange });
    expect(api.current!.getView()).toEqual({ rotation: [0, 0, 0], zoom: 1 });
    const before = countryPath(container, "FR").getAttribute("d");
    rerender(<Globe apiRef={api} rotation={[90, 0, 0]} zoom={3} onRotationChange={onRotationChange} />);
    expect(api.current!.getView()).toEqual({ rotation: [90, 0, 0], zoom: 3 });
    advance(32);
    expect(countryPath(container, "FR").getAttribute("d")).not.toBe(before);
    expect(onRotationChange).not.toHaveBeenCalled();
  });

  it("flies to a point through the handle, eased over time, and reports on arrival", () => {
    const onRotationChange = vi.fn();
    const { api } = renderGlobe({ onRotationChange });
    act(() => api.current!.flyTo({ lat: 37.57, lng: 126.98 }, { zoom: 2 }));
    expect(api.current!.getView().rotation).toEqual([-10, -20, 0]);
    advance(400);
    const mid = api.current!.getView();
    expect(mid.rotation[0]).toBeLessThan(-10);
    expect(mid.rotation[0]).toBeGreaterThan(-126.98);
    expect(onRotationChange).not.toHaveBeenCalled();
    advance(500);
    expect(close(api.current!.getView().rotation, [-126.98, -37.57, 0], 2)).toBe(true);
    expect(api.current!.getView().zoom).toBe(2);
    expect(onRotationChange).toHaveBeenCalledTimes(1);
  });

  it("flies when the focus prop changes and stops when a drag interrupts", () => {
    const { api, rerender, container } = renderGlobe({ focus: { lat: 0, lng: 0 } });
    expect(api.current!.getView().rotation).toEqual([0, 0, 0]);
    rerender(<Globe apiRef={api} focus={{ lat: 10, lng: 100 }} />);
    advance(900);
    expect(close(api.current!.getView().rotation, [-100, -10, 0])).toBe(true);
    rerender(<Globe apiRef={api} focus={{ lat: 0, lng: -60 }} />);
    advance(200);
    fireEvent.pointerDown(canvas(container), { pointerId: 1, clientX: 50, clientY: 50, button: 0, pointerType: "mouse" });
    const stopped = api.current!.getView().rotation;
    advance(900);
    expect(api.current!.getView().rotation).toEqual(stopped);
    expect(close(stopped, [60, 0, 0])).toBe(false);
  });

  it("flies to a marker when it is selected", () => {
    const onMarkerSelect = vi.fn();
    const { api } = renderGlobe({ markers, onMarkerSelect });
    fireEvent.click(markerButton("Ben in Lagos"));
    expect(onMarkerSelect).toHaveBeenLastCalledWith("lagos", expect.objectContaining({ id: "lagos" }));
    advance(900);
    expect(close(api.current!.getView().rotation, [-3.38, -6.52, 0])).toBe(true);
    expect(markerButton("Ben in Lagos")).toHaveAttribute("aria-pressed", "true");
  });

  it("zooms into a cluster when it is activated", () => {
    const onClusterSelect = vi.fn();
    const near: GeoMarker[] = [
      { id: "a", point: { lat: 48.85, lng: 2.35 }, label: "Paris" },
      { id: "b", point: { lat: 48.9, lng: 2.4 }, label: "Saint-Denis" },
    ];
    const { api } = renderGlobe({ markers: near, cluster: true, onClusterSelect });
    fireEvent.click(screen.getByRole("button", { name: /^2 markers/ }));
    expect(onClusterSelect).toHaveBeenCalledTimes(1);
    advance(900);
    expect(api.current!.getView().zoom).toBe(2);
  });
});

describe("Globe: auto-rotate and motion", () => {
  it("auto-rotates, pauses on pointer down and resumes after the idle delay", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { api, container } = renderGlobe({ autoRotate: 10, autoRotateDelay: 100 });
    advance(1000);
    const spun = api.current!.getView().rotation[0];
    expect(spun).toBeGreaterThan(-10 + 8);
    const el = canvas(container);
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 50, clientY: 50, button: 0, pointerType: "mouse" });
    advance(500);
    expect(api.current!.getView().rotation[0]).toBe(spun);
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 50, clientY: 50, pointerType: "mouse" });
    clock += 200;
    act(() => vi.advanceTimersByTime(200));
    advance(500);
    expect(api.current!.getView().rotation[0]).toBeGreaterThan(spun);
  });

  it("holds auto-rotation while a marker is selected", () => {
    const { api } = renderGlobe({ autoRotate: true, markers, defaultSelectedMarkerId: "london", flyToSelection: false });
    const before = api.current!.getView().rotation[0];
    advance(1000);
    expect(api.current!.getView().rotation[0]).toBe(before);
  });

  it("starts centred on the selected marker", () => {
    const { api } = renderGlobe({ markers, defaultSelectedMarkerId: "sydney" });
    expect(close(api.current!.getView().rotation, [-151.21, 33.87, 0])).toBe(true);
    expect(markerButton("Cleo in Sydney")).toHaveAttribute("aria-pressed", "true");
  });

  it("under reduced motion: no auto-rotation, instant fly-to, play still works", () => {
    reducedMotion();
    const onAutoRotateChange = vi.fn();
    const { api, container } = renderGlobe({ autoRotate: true, controls: true, onAutoRotateChange, arcs });
    advance(1000);
    expect(api.current!.getView().rotation).toEqual([-10, -20, 0]);
    const play = screen.getByRole("button", { name: "Auto-rotate" });
    expect(play).toHaveAttribute("aria-pressed", "false");
    act(() => api.current!.flyTo({ lat: 0, lng: 50 }));
    expect(api.current!.getView().rotation).toEqual([-50, 0, 0]);
    expect(container.querySelector('[data-slot="globe-arc"] animate')).toBeNull();
    fireEvent.click(play);
    expect(onAutoRotateChange).toHaveBeenLastCalledWith(true);
    expect(play).toHaveAttribute("aria-pressed", "true");
    advance(500);
    expect(api.current!.getView().rotation[0]).toBeGreaterThan(-50);
  });
});

describe("Globe: controls", () => {
  it("renders named controls with pressed state and zoom limits", () => {
    const onAutoRotateChange = vi.fn();
    const { api } = renderGlobe({ controls: true, autoRotate: true, onAutoRotateChange, maxZoom: 2 });
    const bar = screen.getByRole("group", { name: "Globe controls" });
    const play = within(bar).getByRole("button", { name: "Auto-rotate" });
    expect(play).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(play);
    expect(play).toHaveAttribute("aria-pressed", "false");
    expect(onAutoRotateChange).toHaveBeenLastCalledWith(false);
    const zoomOut = within(bar).getByRole("button", { name: "Zoom out" });
    expect(zoomOut).toBeDisabled();
    fireEvent.click(within(bar).getByRole("button", { name: "Zoom in" }));
    advance(300);
    expect(api.current!.getView().zoom).toBe(1.5);
    expect(zoomOut).toBeEnabled();
    fireEvent.click(within(bar).getByRole("button", { name: "Zoom in" }));
    advance(300);
    expect(within(bar).getByRole("button", { name: "Zoom in" })).toBeDisabled();
    act(() => api.current!.flyTo({ lat: 0, lng: 90 }, { duration: 0 }));
    fireEvent.click(within(bar).getByRole("button", { name: "Reset view" }));
    advance(900);
    expect(api.current!.getView()).toEqual({ rotation: [-10, -20, 0], zoom: 1 });
  });

  it("has no controls unless asked", () => {
    renderGlobe();
    expect(screen.queryByRole("group", { name: "Globe controls" })).toBeNull();
  });
});

describe("Globe: accessibility and loading", () => {
  it("labels the globe, describes the keys and renders the hidden tables", () => {
    const { container } = renderGlobe({ data, markers, arcs, valueLabel: "Visits" });
    const root = screen.getByRole("group", { name: "Globe: 3 countries with data, 3 markers, 1 arc" });
    expect(document.getElementById(root.getAttribute("aria-describedby")!)).toHaveTextContent(/arrow keys/);
    expect(container.querySelector('[data-slot="geo-table-countries"]')).toHaveTextContent("France300");
    expect(container.querySelector('[data-slot="geo-table-arcs"]')).toHaveTextContent("London to New York");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(renderGlobe({ label: "Sign-ins" }).container.querySelector('[role="group"]')).toHaveAttribute("aria-label", "Sign-ins");
  });

  it("gives hidden-table rows buttons that select markers on the far side and fly to them", () => {
    const onMarkerSelect = vi.fn();
    const { container, api } = renderGlobe({ markers, onMarkerSelect });
    const table = container.querySelector('[data-slot="geo-table-markers"]') as HTMLElement;
    const sydney = within(table).getByRole("button", { name: "Cleo in Sydney" });
    expect(sydney).toHaveAttribute("aria-pressed", "false");
    fireEvent.focus(sydney);
    advance(900);
    // Focusing turns the marker into view (and shows it as active) without selecting it.
    expect(close(api.current!.getView().rotation, [-151.21, 33.87, 0])).toBe(true);
    expect(onMarkerSelect).not.toHaveBeenCalled();
    const marker = screen.getAllByRole("button", { name: "Cleo in Sydney" }).find((b) => b.getAttribute("data-slot") === "geo-marker")!;
    expect(marker.parentElement!.querySelector('[data-slot="geo-marker-tooltip"], .ring-ring')).not.toBeNull();
    fireEvent.click(sydney);
    expect(onMarkerSelect).toHaveBeenLastCalledWith("sydney", expect.objectContaining({ id: "sydney" }));
    expect(sydney).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(sydney);
    expect(onMarkerSelect).toHaveBeenLastCalledWith(null, undefined);
  });

  it("shows a pulsing silhouette while loading with no data", () => {
    const { container } = renderGlobe({ loading: true, legend: true, controls: true });
    const root = globe();
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(within(root).getAllByText("Loading…")).toHaveLength(1);
    expect(container.querySelector('[data-slot="globe-skeleton"]')?.getAttribute("d")).toMatch(/^M/);
    expect(container.querySelector('[data-slot="geo-legend-skeleton"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="globe-countries"]')).toBeNull();
    expect(container.querySelector('[data-slot="globe-controls"]')).toBeNull();
    expect(container.querySelector("table")).toBeNull();
  });

  it("keeps data on refresh while loading", () => {
    const { container } = renderGlobe({ loading: true, data, markers, legend: true });
    expect(globe()).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector('[data-slot="globe-skeleton"]')).toBeNull();
    expect(countryPath(container, "FR").getAttribute("fill")).toBe("var(--primary)");
    expect(markerButton("Ana in London")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="geo-legend"]')).not.toBeNull();
    expect(screen.queryByText("Loading…")).toBeNull();
  });

  it("selects countries on click", () => {
    const onCountrySelect = vi.fn();
    const { container } = renderGlobe({ data, onCountrySelect });
    fireEvent.click(countryPath(container, "FR"));
    expect(onCountrySelect).toHaveBeenLastCalledWith("FR", { code: "FR", name: "France", value: 300 });
    expect(container.querySelector('[data-slot="globe-selected"]')?.getAttribute("d")).toBe(countryPath(container, "FR").getAttribute("d"));
    fireEvent.pointerMove(countryPath(container, "NG"), { clientX: 100, clientY: 100 });
    expect(container.querySelector('[data-slot="globe-tooltip"]')).toHaveTextContent("Nigeria");
  });

  it("forwards refs, className and props and uses compact markers when narrow", () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(<Globe ref={ref} className="custom" data-testid="g" height={300} defaultWidth={360} markers={markers} />);
    expect(ref.current).toBe(screen.getByTestId("g"));
    expect(ref.current).toHaveClass("custom");
    expect(canvas(container).style.height).toBe("300px");
    expect(container.querySelector('[data-slot="geo-marker-layer"]')).toHaveAttribute("data-compact", "true");
    const wide = render(<Globe defaultWidth={600} markers={markers} compactMarkers={false} />);
    expect(wide.container.querySelector('[data-slot="geo-marker-layer"]')).not.toHaveAttribute("data-compact");
  });

  it("has no axe violations", async () => {
    const { container } = renderGlobe({ data, markers, arcs, legend: true, cluster: true, controls: true, graticule: true, defaultSelectedMarkerId: "london" });
    expect(await axeViolations(container)).toEqual([]);
    const loading = render(<Globe loading legend />);
    expect(await axeViolations(loading.container)).toEqual([]);
  });

  it("cleans up its frames on unmount", () => {
    const { unmount } = renderGlobe({ autoRotate: true });
    advance(100);
    unmount();
    expect(frames.size).toBe(0);
  });
});
