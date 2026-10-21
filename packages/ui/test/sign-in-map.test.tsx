import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignInMap, analyzeSignIns, detectImpossibleTravel, detectNewLocations, type SignInEvent } from "../src/entries/identity";
import * as security from "../src/entries/security";
import { axeViolations } from "./helpers/a11y";

const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);
const h = (n: number) => NOW - n * 3_600_000;

const SEOUL = { lat: 37.57, lng: 126.98 };
const LONDON = { lat: 51.51, lng: -0.13 };
const BUSAN = { lat: 35.18, lng: 129.08 };

const ev = (id: string, point: SignInEvent["point"], hoursAgo: number, extra: Partial<SignInEvent> = {}): SignInEvent => ({
  id,
  point,
  time: h(hoursAgo),
  outcome: "success",
  ...extra,
});

const events: SignInEvent[] = [
  ev("home1", SEOUL, 30, {
    city: "Seoul",
    country: "KR",
    browser: "Safari",
    os: "macOS",
    current: true,
    ip: "1.2.3.4",
    method: "Passkey",
  }),
  ev("home2", SEOUL, 4, { city: "Seoul", country: "kr" }),
  ev("london", LONDON, 1, {
    city: "London",
    country: "GB",
    browser: "Chrome",
    os: "Windows",
  }),
  ev("fail", { lat: 6.52, lng: 3.38 }, 9, {
    city: "Lagos",
    country: "NG",
    outcome: "failed",
  }),
  ev("block", [37.62, 55.76], 5, {
    city: "Moscow",
    country: "RU",
    outcome: "blocked",
  }),
];

/* ------------------------------------------------------------------------------------------------
 * Pure helpers
 * ----------------------------------------------------------------------------------------------*/

describe("detectImpossibleTravel", () => {
  it("flags consecutive successful sign-ins faster than maxKmh", () => {
    const [t, ...rest] = detectImpossibleTravel(events);
    expect(rest).toHaveLength(0);
    expect(t!.id).toBe("home2->london");
    expect(t!.from.id).toBe("home2");
    expect(t!.to.id).toBe("london");
    expect(t!.elapsedMs).toBe(3 * 3_600_000);
    expect(t!.distanceKm).toBeGreaterThan(8800);
    expect(t!.distanceKm).toBeLessThan(9000);
    expect(t!.speedKmh).toBeCloseTo(t!.distanceKm / 3, 6);
  });

  it("ignores failed and blocked attempts", () => {
    const list = [ev("a", SEOUL, 3), ev("b", LONDON, 2, { outcome: "failed" }), ev("c", LONDON, 1.5, { outcome: "blocked" })];
    expect(detectImpossibleTravel(list)).toEqual([]);
  });

  it("never flags the same place, even at the same instant", () => {
    expect(detectImpossibleTravel([ev("a", SEOUL, 1), ev("b", SEOUL, 1), ev("c", [126.98, 37.57], 1)])).toEqual([]);
    expect(
      detectImpossibleTravel([ev("a", SEOUL, 1), ev("b", SEOUL, 1)], {
        minDistanceKm: 0,
      }),
    ).toEqual([]);
  });

  it("treats a shared timestamp far apart as infinite speed", () => {
    const [t] = detectImpossibleTravel([ev("a", SEOUL, 1), ev("b", LONDON, 1)]);
    expect(t!.elapsedMs).toBe(0);
    expect(t!.speedKmh).toBe(Infinity);
  });

  it("skips events with missing or invalid times and points", () => {
    const list: SignInEvent[] = [
      ev("a", SEOUL, 3),
      { ...ev("b", LONDON, 2), time: "not a date" },
      { ...ev("c", LONDON, 2), time: undefined as unknown as number },
      { ...ev("d", { lat: NaN, lng: 0 }, 2) },
      ev("e", SEOUL, 1),
    ];
    expect(detectImpossibleTravel(list)).toEqual([]);
  });

  it("sorts unsorted input by time first", () => {
    const sorted = [ev("a", SEOUL, 5), ev("b", LONDON, 4), ev("c", SEOUL, 0.5)];
    const shuffled = [sorted[2]!, sorted[0]!, sorted[1]!];
    expect(detectImpossibleTravel(shuffled).map((t) => t.id)).toEqual(["a->b", "b->c"]);
    // ISO strings and Dates work too.
    const mixed = [
      { ...sorted[1]!, time: new Date(h(4)).toISOString() },
      { ...sorted[0]!, time: new Date(h(5)) },
    ];
    expect(detectImpossibleTravel(mixed).map((t) => t.id)).toEqual(["a->b"]);
  });

  it("compares sign-ins per account", () => {
    const list = [ev("a", SEOUL, 3, { account: "x" }), ev("b", LONDON, 2, { account: "y" }), ev("c", SEOUL, 1, { account: "y" })];
    const out = detectImpossibleTravel(list);
    expect(out.map((t) => t.id)).toEqual(["b->c"]);
    expect(out[0]!.account).toBe("y");
  });

  it("uses the threshold exclusively and honours options", () => {
    // Seoul to Busan is about 325 km.
    const pair = [ev("a", SEOUL, 1), ev("b", BUSAN, 0)];
    const km = detectImpossibleTravel(pair, { maxKmh: 1 })[0]!.distanceKm;
    expect(detectImpossibleTravel(pair, { maxKmh: km })).toEqual([]);
    expect(detectImpossibleTravel(pair, { maxKmh: km - 1 })).toHaveLength(1);
    expect(detectImpossibleTravel(pair)).toEqual([]);
    expect(detectImpossibleTravel(pair, { maxKmh: 100, minDistanceKm: 400 })).toEqual([]);
    // Invalid options fall back to the defaults.
    expect(
      detectImpossibleTravel([ev("a", SEOUL, 3), ev("b", LONDON, 1)], {
        maxKmh: -5,
        minDistanceKm: NaN,
      }),
    ).toHaveLength(1);
  });

  it("returns nothing for empty or tiny input", () => {
    expect(detectImpossibleTravel([])).toEqual([]);
    expect(detectImpossibleTravel([ev("a", SEOUL, 1)])).toEqual([]);
  });
});

describe("detectNewLocations and analyzeSignIns", () => {
  it("flags the first successful sign-in from a country beyond the baseline", () => {
    const list = [
      ...events,
      ev("london2", LONDON, 0.5, { country: "GB" }),
      ev("tokyo", [139.69, 35.68], 2, { country: "JP", outcome: "failed" }),
    ];
    expect([...detectNewLocations(list)]).toEqual(["london"]);
    expect([...detectNewLocations(list, { knownCountries: ["gb"] })].sort()).toEqual(["home1"]);
  });

  it("analyses events into flags, a newest-first list and summary counts", () => {
    const a = analyzeSignIns([...events, { ...ev("bad", SEOUL, 1), time: "nope" }]);
    expect(a.events.map((e) => e.id)).toEqual(["london", "home2", "block", "fail", "home1"]);
    expect(a.flagged.map((e) => e.id)).toEqual(["london"]);
    expect(a.flags.get("london")!.map((f) => f.kind)).toEqual(["impossible-travel", "new-location"]);
    expect(a.summary).toEqual({
      total: 5,
      success: 3,
      failed: 1,
      blocked: 1,
      countries: 4,
      alerts: 1,
    });
  });

  it("is exported from the identity and security entries", () => {
    expect(security.SignInMap).toBe(SignInMap);
    expect(security.detectImpossibleTravel).toBe(detectImpossibleTravel);
  });
});

/* ------------------------------------------------------------------------------------------------
 * Component
 * ----------------------------------------------------------------------------------------------*/

const markerButton = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-slot="geo-marker"][data-id="${id}"]`) as HTMLButtonElement | null;

describe("SignInMap", () => {
  it("renders the summary, outcome-toned markers, travel arcs and the flagged list", () => {
    const { container } = render(<SignInMap events={events} now={NOW} windowLabel="Last 7 days" />);
    expect(screen.getAllByRole("group", { name: "Sign-in activity" })[0]).toBeInTheDocument();
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    const stat = (key: string) => container.querySelector(`[data-slot="sign-in-map-stat"][data-key="${key}"] dd`)!.textContent;
    expect([stat("total"), stat("failed"), stat("blocked"), stat("countries"), stat("alerts")]).toEqual(["5", "1", "1", "4", "1"]);

    expect(
      screen.getByRole("figure", {
        name: /5 sign-ins from 4 countries, 1 alert/,
      }),
    ).toBeInTheDocument();
    const london = markerButton(container, "london")!;
    expect(london).toHaveAccessibleName("London, United Kingdom: success sign-in, flagged");
    expect(london.parentElement!.querySelector('[data-slot="geo-marker-badge"]')).not.toBeNull();
    const failed = screen.getByRole("button", {
      name: /Lagos, Nigeria: failed sign-in/,
    });
    expect((failed.parentElement!.querySelector('[data-slot="geo-marker-visual"]') as HTMLElement).style.backgroundColor).toBe(
      "var(--warning)",
    );
    expect(container.querySelectorAll('[data-slot="world-map-arc"]').length).toBeGreaterThan(0);

    const rows = container.querySelectorAll('[data-slot="sign-in-map-flag-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Impossible travel from Seoul");
    expect(rows[0]).toHaveTextContent("in 3h");
    expect(rows[0]).toHaveTextContent("First sign-in from United Kingdom");
    expect(rows[0]).toHaveTextContent("1 hour ago");
  });

  it("selects the marker from a list row and shows the detail, and back", () => {
    const onSelectedIdChange = vi.fn();
    const { container } = render(<SignInMap events={events} now={NOW} onSelectedIdChange={onSelectedIdChange} />);
    const row = within(container.querySelector('[data-slot="sign-in-map-flagged"]') as HTMLElement).getByRole("button", { pressed: false });
    fireEvent.click(row);
    expect(onSelectedIdChange).toHaveBeenLastCalledWith("london", expect.objectContaining({ id: "london" }));
    expect(row).toHaveAttribute("aria-pressed", "true");
    expect(markerButton(container, "london")).toHaveAttribute("aria-pressed", "true");
    const detail = container.querySelector('[data-slot="sign-in-map-detail"]') as HTMLElement;
    expect(detail).toHaveAttribute("data-id", "london");
    expect(within(detail).getByRole("heading")).toHaveTextContent("London, United Kingdom");
    expect(detail).toHaveTextContent("Chrome on Windows");

    fireEvent.click(within(detail).getByRole("button", { name: "Close sign-in details" }));
    expect(onSelectedIdChange).toHaveBeenLastCalledWith(null, undefined);
    expect(container.querySelector('[data-slot="sign-in-map-detail"]')).toBeNull();

    // Marker → detail and list.
    fireEvent.click(markerButton(container, "fail")!);
    expect(container.querySelector('[data-slot="sign-in-map-detail"]')).toHaveTextContent("Lagos, Nigeria");
    expect(row).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(markerButton(container, "london")!);
    expect(row).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-pressed", "false");
  });

  it("follows a controlled selection and ignores unknown ids", () => {
    const { container, rerender } = render(<SignInMap events={events} now={NOW} selectedId="fail" />);
    expect(container.querySelector('[data-slot="sign-in-map-detail"]')).toHaveAttribute("data-id", "fail");
    rerender(<SignInMap events={events} now={NOW} selectedId="nope" />);
    expect(container.querySelector('[data-slot="sign-in-map-detail"]')).toBeNull();
  });

  it("calls review and revoke, offering revoke only for other successful sign-ins", async () => {
    let resolve!: () => void;
    const onRevoke = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const onReview = vi.fn();
    render(<SignInMap events={events} now={NOW} onReview={onReview} onRevoke={onRevoke} defaultSelectedId="home1" />);
    // The current session can be reviewed but not revoked.
    expect(document.querySelector('[data-slot="sign-in-map-detail"]')).toHaveTextContent("This session");
    expect(document.querySelector('[data-slot="sign-in-map-detail"]')).toHaveTextContent("1.2.3.4");
    expect(
      screen.getByRole("button", {
        name: "Review sign-in from Seoul, South Korea",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Revoke session from Seoul/ })).toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Review sign-in from London, United Kingdom",
      }),
    );
    expect(onReview).toHaveBeenCalledWith(expect.objectContaining({ id: "london" }), [
      expect.objectContaining({ kind: "impossible-travel" }),
      expect.objectContaining({ kind: "new-location" }),
    ]);
    const revoke = screen.getByRole("button", {
      name: "Revoke session from London, United Kingdom",
    });
    fireEvent.click(revoke);
    expect(onRevoke).toHaveBeenCalledWith(expect.objectContaining({ id: "london" }));
    expect(revoke).toHaveAttribute("aria-busy", "true");
    await act(async () => resolve());
    expect(revoke).not.toHaveAttribute("aria-busy");
  });

  it("switches between map and globe", () => {
    const onViewChange = vi.fn();
    const { container } = render(<SignInMap events={events} now={NOW} onViewChange={onViewChange} />);
    expect(container.querySelector('[data-slot="world-map"]')).not.toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Globe" }));
    expect(onViewChange).toHaveBeenCalledWith("globe");
    expect(container.querySelector('[data-slot="world-map"]')).toBeNull();
    expect(container.querySelector('[data-slot="globe"]')).not.toBeNull();
    expect(screen.getAllByRole("button", { name: /flagged/ }).length).toBeGreaterThan(0);

    const controlled = render(<SignInMap events={events} now={NOW} view="globe" viewToggle={false} />);
    expect(controlled.container.querySelector('[data-slot="globe"]')).not.toBeNull();
    expect(within(controlled.container).queryByRole("radio")).toBeNull();
  });

  it("selects the newest flagged member of a cluster", () => {
    const close = [
      ev("x1", SEOUL, 3, { country: "KR" }),
      ev("x2", [127.0, 37.6], 2, { country: "KR" }),
      ev("x3", [126.9, 37.5], 1, { country: "KR", outcome: "failed" }),
    ];
    const onSelectedIdChange = vi.fn();
    render(<SignInMap events={close} now={NOW} onSelectedIdChange={onSelectedIdChange} />);
    fireEvent.click(screen.getByRole("button", { name: /^3 markers/ }));
    expect(onSelectedIdChange).toHaveBeenLastCalledWith("x3", expect.objectContaining({ id: "x3" }));
  });

  it("follows the loading rule", () => {
    const { container, rerender } = render(<SignInMap events={[]} loading now={NOW} />);
    const root = container.querySelector('[data-slot="sign-in-map"]')!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector('[data-slot="sign-in-map-canvas"]')).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector('[data-slot="world-map-skeleton"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="sign-in-map-empty"]')).toBeNull();
    expect(container.querySelectorAll('[data-slot="sign-in-map-flag-row"]')).toHaveLength(0);
    // One "Loading…" for assistive tech (the map's own sits inside the hidden canvas).
    const visible = [...container.querySelectorAll(".sr-only")].filter((n) => n.textContent === "Loading…" && !n.closest("[aria-hidden]"));
    expect(visible).toHaveLength(1);

    rerender(<SignInMap events={events} loading now={NOW} />);
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector('[data-slot="sign-in-map-canvas"]')).not.toHaveAttribute("aria-hidden");
    expect(container.querySelectorAll('[data-slot="sign-in-map-flag-row"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-slot="geo-marker"]').length).toBeGreaterThan(0);

    rerender(<SignInMap events={events} now={NOW} />);
    expect(root).not.toHaveAttribute("aria-busy");
    expect(screen.queryByText("Loading…")).toBeNull();
  });

  it("shows the empty state, a custom one, and the no-alerts note", () => {
    const { container, rerender } = render(<SignInMap events={[]} now={NOW} />);
    expect(screen.getByText("No sign-ins")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="world-map"]')).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
    rerender(<SignInMap events={null} now={NOW} emptyState={<p>Nothing yet</p>} />);
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
    rerender(<SignInMap events={[ev("a", SEOUL, 2, { country: "KR" }), ev("b", BUSAN, 1, { country: "KR" })]} now={NOW} />);
    expect(screen.getByText("No suspicious sign-ins")).toBeInTheDocument();
  });

  it("has no axe violations (data, selected, loading, empty)", async () => {
    const { container, rerender } = render(
      <SignInMap events={events} now={NOW} onReview={() => {}} onRevoke={() => {}} defaultSelectedId="london" />,
    );
    expect(await axeViolations(container)).toEqual([]);
    rerender(<SignInMap events={[]} loading now={NOW} />);
    expect(await axeViolations(container)).toEqual([]);
    rerender(<SignInMap events={[]} now={NOW} />);
    expect(await axeViolations(container)).toEqual([]);
    const globe = render(<SignInMap events={events} now={NOW} view="globe" />);
    expect(await axeViolations(globe.container)).toEqual([]);
  });
});
